#!/usr/bin/env python3
"""Serve a local dashboard for monitoring long-running downloads."""

from __future__ import annotations

import argparse
import json
import mimetypes
import platform
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field, replace
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from download_monitor import (
    DownloadCandidate,
    ProbeResult,
    Sample,
    discover_download_candidates,
    ensure_dependencies,
    filter_external_connections,
    human_bytes,
    probe_process,
    resolve_pid,
)


STATIC_DIR = Path(__file__).with_name("download_monitor_ui")


@dataclass
class SessionState:
    pid: int | None = None
    file_path: str | None = None
    stall_count: int = 0
    samples: list[Sample] = field(default_factory=list)
    last_payload: dict[str, Any] | None = None


SESSIONS: dict[str, SessionState] = {}
TARGET_CACHE: dict[str, dict[str, Any]] = {}
DISCOVERY_TRACKS: dict[str, dict[str, Any]] = {}


def session_key(pid: int | None, match: str | None, file_path: str | None) -> str:
    return json.dumps({"pid": pid, "match": match or "", "path": file_path or ""}, sort_keys=True)


def serialize_probe(result: ProbeResult) -> dict[str, Any]:
    status = "active"
    message = "Sampling normally."
    if result.stall_count >= 3:
        status = "stalled"
        message = "No file growth across recent samples."
    elif result.rate == "-":
        status = "warming"
        message = "Gathering initial samples."

    target = infer_target(result.info.command, result.file_path)

    return {
        "ok": True,
        "timestamp": result.timestamp,
        "status": status,
        "message": message,
        "process": {
            "pid": result.info.pid,
            "ppid": result.info.ppid,
            "state": result.info.state,
            "elapsed": result.info.elapsed,
            "cpu": result.info.cpu,
            "mem": result.info.mem,
            "command": result.info.command,
        },
        "file": {
            "path": str(result.file_path) if result.file_path else "",
            "sizeBytes": result.size,
            "sizeHuman": human_bytes(result.size),
        },
        "network": result.connections,
        "target": target,
        "rateHuman": result.rate,
        "stallCount": result.stall_count,
        "samples": [
            {"timestamp": sample.timestamp, "sizeBytes": sample.size}
            for sample in result.samples
        ],
    }


def serialize_completed(state: SessionState, reason: str) -> dict[str, Any]:
    payload = dict(state.last_payload or {})
    payload["ok"] = True
    payload["status"] = "completed"
    payload["timestamp"] = payload.get("timestamp")
    process = dict(payload.get("process") or {})
    if process:
        process["state"] = "EXITED"
    payload["process"] = process
    payload["network"] = []
    payload["rateHuman"] = "0.0B/s"
    payload["message"] = reason
    return payload


def infer_target(command: str, file_path: Path | None) -> dict[str, Any]:
    lower_command = command.lower()
    lower_path = str(file_path).lower() if file_path else ""

    if "camoufox-js fetch" in lower_command or "camoufox" in lower_path:
        return infer_camoufox_target()

    return {
        "sizeBytes": None,
        "sizeHuman": "-",
        "source": "unknown",
        "label": "",
    }


def infer_camoufox_target() -> dict[str, Any]:
    cache_key = "camoufox"
    if cache_key in TARGET_CACHE:
        return TARGET_CACHE[cache_key]

    os_name = {
        "darwin": "mac",
        "linux": "lin",
        "win32": "win",
    }.get(sys.platform)
    arch = {
        "arm64": "arm64",
        "aarch64": "arm64",
        "x86_64": "x86_64",
        "amd64": "x86_64",
        "i386": "i686",
    }.get(platform.machine().lower())

    if not os_name or not arch:
        payload = {
            "sizeBytes": None,
            "sizeHuman": "-",
            "source": "unsupported-platform",
            "label": "",
        }
        TARGET_CACHE[cache_key] = payload
        return payload

    pattern = re.compile(rf"camoufox-(.+)-(.+)-{os_name}\.{arch}\.zip$")
    try:
        releases = fetch_github_release_json("https://api.github.com/repos/daijro/camoufox/releases?per_page=5")
        for release in releases:
            for asset in release.get("assets", []):
                name = asset.get("name", "")
                if pattern.search(name):
                    payload = {
                        "sizeBytes": asset.get("size"),
                        "sizeHuman": human_bytes(asset.get("size")),
                        "source": "github-release",
                        "label": name,
                    }
                    TARGET_CACHE[cache_key] = payload
                    return payload
    except Exception:
        pass

    payload = {
        "sizeBytes": None,
        "sizeHuman": "-",
        "source": "unavailable",
        "label": "",
    }
    TARGET_CACHE[cache_key] = payload
    return payload


def fetch_github_release_json(url: str) -> Any:
    if shutil.which("curl"):
        result = subprocess.run(
            [
                "curl",
                "-L",
                "--fail",
                "-sS",
                "-H",
                "Accept: application/vnd.github+json",
                "-H",
                "User-Agent: download-monitor",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=20,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
        raise RuntimeError(result.stderr.strip() or "curl request failed")

    raise RuntimeError("curl is not available")


class MonitorHandler(BaseHTTPRequestHandler):
    server_version = "DownloadMonitor/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/discover":
            self.handle_discover(parsed.query)
            return
        if parsed.path == "/api/probe":
            self.handle_probe(parsed.query)
            return
        self.serve_static(parsed.path)

    def serve_static(self, request_path: str) -> None:
        relative = "index.html" if request_path in ("", "/") else request_path.lstrip("/")
        target = (STATIC_DIR / relative).resolve()
        if STATIC_DIR.resolve() not in target.parents and target != STATIC_DIR.resolve():
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not target.exists() or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        mime_type, _ = mimetypes.guess_type(str(target))
        content = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def handle_probe(self, query_string: str) -> None:
        params = parse_qs(query_string)
        pid = self.parse_optional_int(params.get("pid", [None])[0])
        match = params.get("match", [""])[0] or None
        file_path = params.get("path", [""])[0] or None
        history = self.parse_optional_int(params.get("history", ["18"])[0]) or 18
        key = session_key(pid, match, file_path)
        state = SESSIONS.setdefault(key, SessionState())

        if pid is None and not match:
            self.write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Provide pid or match."})
            return

        try:
            resolved_pid = resolve_pid(pid, match)
        except SystemExit as exc:
            if state.last_payload:
                self.write_json(HTTPStatus.OK, serialize_completed(state, "Process exited after the last successful sample."))
                return
            self.write_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": str(exc)})
            return
        except RuntimeError as exc:
            self.write_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(exc)})
            return

        if state.pid not in (None, resolved_pid):
            state.samples = []
            state.stall_count = 0
            state.file_path = None
            state.last_payload = None
        state.pid = resolved_pid

        result = probe_process(
            pid=resolved_pid,
            explicit_path=file_path,
            samples=state.samples,
            stall_count=state.stall_count,
            history=history,
            current_file_path=Path(state.file_path) if state.file_path else None,
        )
        if result is None:
            if state.last_payload:
                self.write_json(HTTPStatus.OK, serialize_completed(state, f"Process {resolved_pid} is no longer running."))
                return
            self.write_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": f"Process {resolved_pid} is no longer running."})
            return

        state.samples = result.samples
        state.stall_count = result.stall_count
        state.file_path = str(result.file_path) if result.file_path else None
        payload = serialize_probe(result)
        state.last_payload = payload
        self.write_json(HTTPStatus.OK, payload)

    def handle_discover(self, query_string: str) -> None:
        params = parse_qs(query_string)
        limit = self.parse_optional_int(params.get("limit", ["8"])[0]) or 8
        raw_candidates = discover_download_candidates(limit=32)
        candidates = rank_discovery_tasks(raw_candidates)[: max(1, min(limit, 20))]
        payload = {
            "ok": True,
            "candidates": [serialize_candidate(candidate) for candidate in candidates],
        }
        self.write_json(HTTPStatus.OK, payload)

    def parse_optional_int(self, value: str | None) -> int | None:
        if value in (None, ""):
            return None
        try:
            return int(value)
        except ValueError:
            return None

    def write_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Serve the download monitor dashboard.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Default: 127.0.0.1")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind. Default: 8765")
    return parser


def serialize_candidate(candidate: DownloadCandidate) -> dict[str, Any]:
    return {
        "pid": candidate.pid,
        "score": round(candidate.score, 2),
        "taskId": getattr(candidate, "task_id", ""),
        "growthRateHuman": getattr(candidate, "growth_rate_human", "-"),
        "growthBytes": getattr(candidate, "growth_bytes", None),
        "kind": candidate.kind,
        "label": candidate.label,
        "process": {
            "pid": candidate.info.pid,
            "ppid": candidate.info.ppid,
            "state": candidate.info.state,
            "elapsed": candidate.info.elapsed,
            "cpu": candidate.info.cpu,
            "mem": candidate.info.mem,
            "command": candidate.info.command,
        },
        "file": {
            "path": str(candidate.file_path) if candidate.file_path else "",
            "sizeBytes": candidate.size,
            "sizeHuman": human_bytes(candidate.size),
        },
        "network": candidate.connections,
    }


def normalize_command_label(command: str) -> str:
    lower = command.lower()
    if "camoufox" in lower:
        return "camoufox"
    if "playwright" in lower or "chromium" in lower or "chrome" in lower:
        return "playwright"
    if "curl" in lower:
        return "curl"
    if "wget" in lower:
        return "wget"
    if "brew" in lower:
        return "brew"
    if "pip" in lower or "python" in lower or re.search(r"\buv\b", lower):
        return "python"
    if "cargo" in lower:
        return "cargo"
    if re.search(r"\bgo\b", lower):
        return "go"
    if "npm" in lower or "pnpm" in lower or "yarn" in lower or "bun" in lower or "node" in lower:
        return "node"
    return "download"


def task_key_for_candidate(candidate: DownloadCandidate) -> str:
    if candidate.file_path:
        return f"file:{candidate.file_path}"
    if candidate.kind in {"brew", "fetch"} and candidate.info.ppid:
        return f"proc:brew-chain:{candidate.info.ppid}"
    return f"proc:{normalize_command_label(candidate.info.command)}:{candidate.pid}"


def attach_discovery_track(candidate: DownloadCandidate) -> DownloadCandidate:
    task_id = task_key_for_candidate(candidate)
    now = time.time()
    track = DISCOVERY_TRACKS.get(task_id)
    growth_bytes = None
    growth_rate_human = "-"
    score_bonus = 0.0
    stagnant_rounds = 0
    external_active = bool(filter_external_connections(candidate.connections))
    last_growth_ts = now if external_active else None

    if track and track.get("size") is not None and candidate.size is not None:
        delta_bytes = candidate.size - track["size"]
        delta_seconds = now - track["timestamp"]
        if delta_bytes > 0 and delta_seconds > 0:
            growth_bytes = delta_bytes
            growth_rate_human = human_bytes(int(delta_bytes / delta_seconds)) + "/s"
            score_bonus += min(delta_bytes / (1024 * 1024), 60)
            score_bonus += min((delta_bytes / max(delta_seconds, 1)) / (1024 * 1024), 50)
            stagnant_rounds = 0
            last_growth_ts = now
        elif delta_bytes == 0:
            score_bonus -= 12
            stagnant_rounds = int(track.get("stagnant_rounds", 0)) + 1
            last_growth_ts = track.get("last_growth_ts")
        else:
            stagnant_rounds = int(track.get("stagnant_rounds", 0))
            last_growth_ts = track.get("last_growth_ts")
    elif track:
        stagnant_rounds = int(track.get("stagnant_rounds", 0))
        last_growth_ts = track.get("last_growth_ts")

    if external_active:
        score_bonus += 10

    DISCOVERY_TRACKS[task_id] = {
        "timestamp": now,
        "last_seen_ts": now,
        "size": candidate.size,
        "pid": candidate.pid,
        "stagnant_rounds": stagnant_rounds,
        "last_growth_ts": last_growth_ts,
        "external_active": external_active,
        "snapshot": replace(candidate),
    }

    candidate.task_id = task_id  # type: ignore[attr-defined]
    candidate.growth_bytes = growth_bytes  # type: ignore[attr-defined]
    candidate.growth_rate_human = growth_rate_human  # type: ignore[attr-defined]
    candidate.stagnant_rounds = stagnant_rounds  # type: ignore[attr-defined]
    candidate.external_active = external_active  # type: ignore[attr-defined]
    candidate.score += score_bonus
    return candidate


def rank_discovery_tasks(candidates: list[DownloadCandidate]) -> list[DownloadCandidate]:
    grouped: dict[str, DownloadCandidate] = {}
    seen_task_ids: set[str] = set()
    now = time.time()
    for candidate in candidates:
        candidate = attach_discovery_track(candidate)
        seen_task_ids.add(candidate.task_id)  # type: ignore[attr-defined]
        external_active = getattr(candidate, "external_active", False)
        if getattr(candidate, "stagnant_rounds", 0) >= 5 and getattr(candidate, "growth_bytes", None) is None and not external_active:
            continue
        task_id = candidate.task_id  # type: ignore[attr-defined]
        existing = grouped.get(task_id)
        if existing is None or candidate.score > existing.score:
            grouped[task_id] = candidate

    for task_id, track in list(DISCOVERY_TRACKS.items()):
        last_seen_ts = float(track.get("last_seen_ts", 0))
        if now - last_seen_ts > 120:
            DISCOVERY_TRACKS.pop(task_id, None)
            continue
        if task_id in seen_task_ids:
            continue
        snapshot = track.get("snapshot")
        if snapshot is None:
            continue
        last_growth_ts = float(track.get("last_growth_ts") or 0)
        external_active = bool(track.get("external_active"))
        if now - last_seen_ts > 12:
            continue
        if last_growth_ts and now - last_growth_ts > 30 and not external_active:
            continue

        retained = replace(snapshot)
        retained.score = max(retained.score - 18, 0)
        retained.task_id = task_id  # type: ignore[attr-defined]
        retained.growth_bytes = None  # type: ignore[attr-defined]
        retained.growth_rate_human = "-"  # type: ignore[attr-defined]
        retained.stagnant_rounds = int(track.get("stagnant_rounds", 0))  # type: ignore[attr-defined]
        retained.external_active = external_active  # type: ignore[attr-defined]
        existing = grouped.get(task_id)
        if existing is None or retained.score > existing.score:
            grouped[task_id] = retained

    ranked = sorted(grouped.values(), key=lambda item: item.score, reverse=True)
    return ranked


def main() -> int:
    ensure_dependencies()
    args = build_parser().parse_args()
    httpd = ThreadingHTTPServer((args.host, args.port), MonitorHandler)
    print(f"Serving download monitor at http://{args.host}:{args.port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

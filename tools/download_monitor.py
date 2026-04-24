#!/usr/bin/env python3
"""Monitor a download by watching a process and its open file/network handles."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import time
import shlex
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


PS_COLUMNS = "pid=,ppid=,state=,etime=,%cpu=,%mem=,command="
ARCHIVE_DOWNLOAD_FILE_TOKENS = (
    ".zip",
    ".tar",
    ".tgz",
    ".tar.gz",
    ".dmg",
    ".pkg",
    ".whl",
    ".crate",
    ".gz",
    ".xz",
    ".bz2",
    ".part",
    ".download",
    ".crdownload",
)
MODEL_DOWNLOAD_FILE_TOKENS = (
    ".safetensors",
    ".gguf",
    ".ckpt",
    ".pt",
    ".pth",
    ".onnx",
    ".tflite",
    ".mlmodel",
)
BINARY_DOWNLOAD_FILE_TOKENS = (
    ".node",
    ".so",
    ".dll",
    ".exe",
    ".bin",
)
DISCOVERY_COMMAND_RE = re.compile(
    r"(camoufox|playwright|chromium|chrome|browser|download|install|"
    r"\bnpm\b|\bpnpm\b|\byarn\b|\bnode\b|\bbun\b|"
    r"\bpython\b|\bpip\b|\buv\b|\bpoetry\b|"
    r"\bcurl\b|\bwget\b|"
    r"\bbrew\b|\bport\b|"
    r"\bcargo\b|\bgo\b|\bgo mod\b|\bgit\b|git-lfs|lfs\b)",
    re.IGNORECASE,
)
ACTIVE_DOWNLOAD_COMMAND_RE = re.compile(
    r"(camoufox|playwright|chromium|chrome.*arm64|browser.*install|"
    r"\binstall\b|\bdownload\b|\bfetch\b|"
    r"\bcurl\b|\bwget\b|"
    r"\bpip\b|\buv\b|\bpoetry\b|"
    r"\bbrew\b|\bport\b|"
    r"\bcargo\b|\bgo\b|\bgo mod\b|git-lfs|lfs\b|"
    r"\bnpm\b|\bpnpm\b|\byarn\b|\bbun\b)",
    re.IGNORECASE,
)
GIT_TRANSFER_COMMAND_RE = re.compile(
    r"\bgit\b.*\b(clone|fetch|pull|submodule update|lfs)\b",
    re.IGNORECASE,
)
HUGGINGFACE_PATH_TOKENS = (
    "/.cache/huggingface/",
    "/huggingface/download/",
    "/huggingface/xet/",
    "/hf_xet/",
)
HOMEBREW_PATH_TOKENS = (
    "/library/caches/homebrew/",
    "/homebrew/downloads/",
    "/cache/homebrew/",
)
PYTHON_PACKAGE_PATH_TOKENS = (
    "/pip-",
    "/pip/cache/",
    "/.cache/pip/",
    "/uv/cache/",
    "/pypoetry/",
)
NODE_PACKAGE_PATH_TOKENS = (
    "/.npm/",
    "/npm/",
    "/pnpm/",
    "/yarn/",
    "/node_modules/",
)
NODE_DOWNLOAD_CACHE_PATH_TOKENS = (
    "/.npm/_cacache/",
    "/.npm/_npx/",
    "/.pnpm-store/",
    "/pnpm/store/",
    "/yarn/cache/",
    "/yarn/v6/",
    "/bun/install/cache/",
)
CARGO_PATH_TOKENS = (
    "/.cargo/",
    "/cargo/registry/",
    "/cargo/git/",
)
GO_PATH_TOKENS = (
    "/go/pkg/mod/",
    "/pkg/mod/cache/",
    "/gomodcache/",
)
GIT_LFS_PATH_TOKENS = (
    "/.git/lfs/",
    "/lfs/objects/",
)
GIT_OBJECT_PATH_TOKENS = (
    "/.git/objects/pack/",
    ".pack",
    ".idx",
)


@dataclass
class ProcessInfo:
    pid: int
    ppid: int
    state: str
    elapsed: str
    cpu: str
    mem: str
    command: str


@dataclass
class Sample:
    timestamp: float
    size: int | None


@dataclass
class ProbeResult:
    timestamp: float
    info: ProcessInfo
    file_path: Path | None
    size: int | None
    connections: list[str]
    rate: str
    stall_count: int
    samples: list[Sample]


@dataclass
class DownloadCandidate:
    pid: int
    info: ProcessInfo
    file_path: Path | None
    size: int | None
    connections: list[str]
    score: float
    kind: str
    label: str


@dataclass
class OpenFileEntry:
    fd: str
    kind: str
    path: str


def run_command(args: list[str]) -> str:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise RuntimeError(stderr or f"Command failed: {' '.join(args)}")
    return result.stdout


def human_bytes(size: int | None) -> str:
    if size is None:
        return "-"
    units = ["B", "KB", "MB", "GB", "TB"]
    value = float(size)
    for unit in units:
        if value < 1024.0 or unit == units[-1]:
            return f"{value:.1f}{unit}"
        value /= 1024.0
    return f"{size}B"


def human_rate(delta_bytes: float, delta_seconds: float) -> str:
    if delta_seconds <= 0:
        return "-"
    return f"{human_bytes(int(delta_bytes / delta_seconds))}/s"


def find_pids_by_match(pattern: str) -> list[int]:
    output = run_command(["ps", "-axo", "pid=,command="])
    regex = re.compile(pattern)
    pids: list[int] = []
    for line in output.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        pid_text, _, command = stripped.partition(" ")
        if not pid_text.isdigit():
            continue
        pid = int(pid_text)
        if regex.search(command):
            pids.append(pid)
    return pids


def get_process_info(pid: int) -> ProcessInfo | None:
    result = subprocess.run(
        ["ps", "-o", PS_COLUMNS, "-p", str(pid)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    line = result.stdout.strip()
    return parse_process_info_line(line)


def parse_process_info_line(line: str) -> ProcessInfo | None:
    if not line:
        return None

    match = re.match(
        r"^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$",
        line,
    )
    if not match:
        return None

    return ProcessInfo(
        pid=int(match.group(1)),
        ppid=int(match.group(2)),
        state=match.group(3),
        elapsed=match.group(4),
        cpu=match.group(5),
        mem=match.group(6),
        command=match.group(7).strip(),
    )


def list_process_infos() -> list[ProcessInfo]:
    output = run_command(["ps", "-axo", PS_COLUMNS])
    processes: list[ProcessInfo] = []
    for line in output.splitlines():
        info = parse_process_info_line(line.strip())
        if info is not None:
            processes.append(info)
    return processes


def iter_open_files(pid: int) -> Iterable[OpenFileEntry]:
    output = run_command(["lsof", "-p", str(pid), "-nP"])
    for line in output.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 9:
            continue
        yield OpenFileEntry(
            fd=parts[3],
            kind=parts[4],
            path=" ".join(parts[8:]),
        )


def iter_open_paths(pid: int) -> Iterable[str]:
    for entry in iter_open_files(pid):
        yield entry.path


def is_writable_fd(fd: str) -> bool:
    return "w" in fd.lower() or "u" in fd.lower()


def contains_any(text: str, tokens: tuple[str, ...]) -> bool:
    return any(token in text for token in tokens)


def looks_like_staging_path(lower: str) -> bool:
    return contains_any(
        lower,
        (
            "/tmp/",
            "/t/",
            "/var/folders/",
            "/cache/",
            "/caches/",
            *HOMEBREW_PATH_TOKENS,
            *HUGGINGFACE_PATH_TOKENS,
            "/downloads/",
            "/.openclaw-",
            "/node_modules/.",
            *NODE_DOWNLOAD_CACHE_PATH_TOKENS,
            "/models/",
        ),
    )


def is_noise_file_path(lower: str) -> bool:
    return any(
        token in lower
        for token in (
            ".lock",
            ".jsonl",
            ".jsonl.lock",
            ".ogg",
            "/state.db",
            ".db-wal",
            ".db-shm",
            ".sqlite",
            ".sqlite3",
            "/library/frameworks/python.framework/",
            "/system/library/frameworks/",
            "/applications/google chrome.app/",
            "/applications/chromium.app/",
            "/contents/frameworks/google chrome framework.framework/",
            "/resources/v8_context_snapshot",
            "/.hermes/hermes-agent/venv/",
            "/site-packages/",
        )
    )


def looks_like_download_artifact_path(lower: str) -> bool:
    return (
        looks_like_staging_path(lower)
        or contains_any(lower, ARCHIVE_DOWNLOAD_FILE_TOKENS)
        or contains_any(lower, MODEL_DOWNLOAD_FILE_TOKENS)
        or contains_any(lower, BINARY_DOWNLOAD_FILE_TOKENS)
        or contains_any(lower, NODE_DOWNLOAD_CACHE_PATH_TOKENS)
        or contains_any(lower, PYTHON_PACKAGE_PATH_TOKENS)
        or contains_any(lower, CARGO_PATH_TOKENS)
        or contains_any(lower, GO_PATH_TOKENS)
        or contains_any(lower, GIT_LFS_PATH_TOKENS)
        or contains_any(lower, GIT_OBJECT_PATH_TOKENS)
    )


def detect_download_file(pid: int, explicit_path: str | None) -> Path | None:
    if explicit_path:
        path = Path(explicit_path).expanduser()
        return path

    candidates: list[str] = []
    writable_regulars: list[str] = []
    for entry in iter_open_files(pid):
        path = entry.path
        lower = path.lower()
        if path.startswith("/") and any(token in lower for token in ARCHIVE_DOWNLOAD_FILE_TOKENS):
            candidates.append(path)
        if (
            path.startswith("/")
            and (any(token in lower for token in BINARY_DOWNLOAD_FILE_TOKENS) or any(token in lower for token in MODEL_DOWNLOAD_FILE_TOKENS))
            and (is_writable_fd(entry.fd) or looks_like_staging_path(lower))
            and not is_noise_file_path(lower)
        ):
            candidates.append(path)
        if (
            path.startswith("/")
            and entry.kind == "REG"
            and is_writable_fd(entry.fd)
            and looks_like_download_artifact_path(lower)
            and not lower.endswith(".log")
            and "/logs/" not in lower
            and "/.npm/_logs/" not in lower
            and "/library/preferences/logging/" not in lower
            and not is_noise_file_path(lower)
        ):
            writable_regulars.append(path)

    if not candidates and writable_regulars:
        candidates = writable_regulars

    if not candidates:
        info = get_process_info(pid)
        if info is not None:
            return detect_download_path_from_command(info.command)
        return None

    def rank(candidate: str) -> tuple[int, int]:
        lower = candidate.lower()
        score = 0
        if "/tmp/" in lower or "/t/" in lower or "/var/folders/" in lower:
            score += 2
        if contains_any(lower, NODE_DOWNLOAD_CACHE_PATH_TOKENS):
            score += 6
        if lower.endswith(".zip"):
            score += 2
        if lower.endswith(".dmg") or lower.endswith(".pkg") or lower.endswith(".whl"):
            score += 1
        if lower.endswith(".node") or lower.endswith(".dll") or lower.endswith(".so") or lower.endswith(".exe") or lower.endswith(".bin"):
            score += 3
        if contains_any(lower, HUGGINGFACE_PATH_TOKENS) or any(token in lower for token in MODEL_DOWNLOAD_FILE_TOKENS):
            score += 4
        if "/models/" in lower:
            score += 2
        if "camoufox" in lower or "playwright" in lower or "browser" in lower:
            score += 3
        if "/node_modules/" in lower:
            score -= 5
        if "/node_modules/" in lower and lower.endswith(".node"):
            score -= 6
        if "/site-packages/" in lower and not contains_any(lower, PYTHON_PACKAGE_PATH_TOKENS):
            score -= 4
        if ".openclaw/" in lower and "/.openclaw-" not in lower:
            score -= 8
        if lower.endswith(".log"):
            score -= 10
        return (score, len(candidate))

    return Path(sorted(candidates, key=rank, reverse=True)[0])


def detect_download_path_from_command(command: str) -> Path | None:
    try:
        args = shlex.split(command)
    except ValueError:
        return None

    for index, arg in enumerate(args):
        if arg in ("-o", "--output") and index + 1 < len(args):
            candidate = args[index + 1]
            if candidate.startswith("/"):
                return Path(candidate)
        if arg.startswith("--output="):
            candidate = arg.split("=", 1)[1]
            if candidate.startswith("/"):
                return Path(candidate)
    return None


def detect_connections(pid: int) -> list[str]:
    result = subprocess.run(
        ["lsof", "-a", "-p", str(pid), "-i", "-nP"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return []

    connections: list[str] = []
    for line in result.stdout.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 9:
            continue
        connections.append(" ".join(parts[8:]))
    return connections


def filter_external_connections(connections: list[str]) -> list[str]:
    filtered: list[str] = []
    for connection in connections:
        lower = connection.lower()
        if "listen" in lower:
            continue
        if any(state in lower for state in ("close_wait", "time_wait", "fin_wait", "last_ack", "closing")):
            continue
        if "127.0.0.1" in lower or "[::1]" in lower or "localhost" in lower:
            continue
        if "*:5353" in lower:
            continue
        if "->" not in connection:
            continue
        filtered.append(connection)
    return filtered


def tail_rate(samples: list[Sample]) -> str:
    if len(samples) < 2:
        return "-"
    start = samples[0]
    end = samples[-1]
    if start.size is None or end.size is None:
        return "-"
    return human_rate(end.size - start.size, end.timestamp - start.timestamp)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Monitor a download by PID or by matching a command line."
    )
    parser.add_argument("--pid", type=int, help="PID to monitor.")
    parser.add_argument(
        "--match",
        help="Regex used against ps command lines to find a PID, e.g. 'camoufox-js fetch'.",
    )
    parser.add_argument(
        "--path",
        help="Optional file path to monitor. If omitted, the tool tries to infer it from lsof.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Sampling interval in seconds. Default: 5.",
    )
    parser.add_argument(
        "--history",
        type=int,
        default=6,
        help="Number of samples used for moving speed. Default: 6.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Print one snapshot and exit.",
    )
    parser.add_argument(
        "--stop-after-stall",
        type=int,
        default=0,
        help="Exit after N consecutive no-growth samples. Disabled by default.",
    )
    return parser


def resolve_pid(pid: int | None, match: str | None) -> int:
    if pid is not None:
        return pid
    if not match:
        raise SystemExit("Provide either --pid or --match.")

    pids = find_pids_by_match(match)
    if not pids:
        raise SystemExit(f"No process matched regex: {match}")
    if len(pids) == 1:
        return pids[0]

    ranked: list[tuple[int, int]] = []
    for candidate in pids:
        if candidate == os.getpid():
            continue
        info = get_process_info(candidate)
        if info is None:
            continue

        score = 0
        command = info.command.lower()
        if "node " in command:
            score += 6
        if "python" in command:
            score -= 4
        if "npm " in command:
            score -= 2
        if "sh -c" in command:
            score -= 3
        if detect_download_file(candidate, None) is not None:
            score += 10
        if detect_connections(candidate):
            score += 3
        ranked.append((score, candidate))

    if not ranked:
        joined = ", ".join(str(value) for value in pids)
        raise SystemExit(f"Multiple processes matched regex: {joined}. Use --pid.")

    ranked.sort(reverse=True)
    return ranked[0][1]


def infer_candidate_kind(command: str, file_path: Path | None) -> tuple[str, str]:
    lower_command = command.lower()
    lower_path = str(file_path).lower() if file_path else ""

    if contains_any(lower_path, HUGGINGFACE_PATH_TOKENS):
        return ("model", "Hugging Face Model Download")
    if "huggingface" in lower_command or "hf_xet" in lower_command:
        return ("model", "Hugging Face Model Download")
    if any(token in lower_path for token in MODEL_DOWNLOAD_FILE_TOKENS):
        return ("model", "Model Download")
    if "curl" in lower_command or "wget" in lower_command:
        if contains_any(lower_path, HOMEBREW_PATH_TOKENS):
            return ("brew", "Homebrew Download")
        if contains_any(lower_path, HUGGINGFACE_PATH_TOKENS) or any(token in lower_path for token in MODEL_DOWNLOAD_FILE_TOKENS):
            return ("model", "Hugging Face Model Download" if contains_any(lower_path, HUGGINGFACE_PATH_TOKENS) else "Model Download")
        return ("fetch", "Curl / Wget Download")
    if "camoufox" in lower_command or "camoufox" in lower_path:
        return ("hermes", "Hermes Browser")
    if "playwright" in lower_command or "playwright" in lower_path or "chromium" in lower_command or "chrome" in lower_path:
        return ("playwright", "Playwright / Chromium")
    if "brew" in lower_command or "port " in lower_command or contains_any(lower_path, HOMEBREW_PATH_TOKENS):
        return ("brew", "Homebrew Download")
    if contains_any(lower_path, PYTHON_PACKAGE_PATH_TOKENS) or lower_path.endswith(".whl"):
        return ("python", "Python Package Download")
    if "pip" in lower_command or "python" in lower_command or re.search(r"\buv\b", lower_command) or "poetry" in lower_command:
        return ("python", "Python Package Download")
    if contains_any(lower_path, CARGO_PATH_TOKENS) or lower_path.endswith(".crate"):
        return ("build", "Cargo Download")
    if "cargo" in lower_command:
        return ("build", "Cargo Download")
    if contains_any(lower_path, GO_PATH_TOKENS):
        return ("build", "Go Module Download")
    if re.search(r"\bgo\b", lower_command):
        return ("build", "Go Module Download")
    if contains_any(lower_path, GIT_LFS_PATH_TOKENS):
        return ("git", "Git LFS Download")
    if contains_any(lower_path, GIT_OBJECT_PATH_TOKENS):
        return ("git", "Git Object Transfer")
    if "git-lfs" in lower_command or " lfs" in lower_command:
        return ("git", "Git LFS Download")
    if GIT_TRANSFER_COMMAND_RE.search(lower_command):
        return ("git", "Git Download")
    if "git" in lower_command:
        return ("git", "Git Download")
    if contains_any(lower_path, NODE_PACKAGE_PATH_TOKENS):
        return ("node", "Node Download")
    if any(token in lower_command for token in ("npm", "pnpm", "yarn", "node", "bun")):
        return ("node", "Node Download")
    return ("generic", "General Download")


def is_noise_candidate(info: ProcessInfo, file_path: Path | None, connections: list[str]) -> bool:
    command = info.command.lower()
    lower_path = str(file_path).lower() if file_path else ""
    external_connections = filter_external_connections(connections)

    if "download_monitor_web.py" in command or "download_monitor.py" in command:
        return True
    if any(token in command for token in ("openclaw", "open-gateway", "clawpilot")) and not ACTIVE_DOWNLOAD_COMMAND_RE.search(command):
        return True
    if "git" in command and not GIT_TRANSFER_COMMAND_RE.search(command) and not contains_any(lower_path, GIT_LFS_PATH_TOKENS) and not contains_any(lower_path, GIT_OBJECT_PATH_TOKENS):
        return True

    if "google chrome helper" in command or command.endswith("/google chrome"):
        if "playwright" not in command and "install" not in command and "download" not in command:
            return True

    if lower_path:
        if is_noise_file_path(lower_path):
            return True
        if ".openclaw/" in lower_path and "/.openclaw-" not in lower_path:
            return True
        if "/applications/google chrome.app/" in lower_path or "/applications/chromium.app/" in lower_path:
            return True
        if "/system/library/frameworks/" in lower_path:
            return True
        if "/library/frameworks/python.framework/" in lower_path and not ACTIVE_DOWNLOAD_COMMAND_RE.search(command):
            return True
        if "/.hermes/hermes-agent/venv/" in lower_path and not ACTIVE_DOWNLOAD_COMMAND_RE.search(command):
            return True
        if "/site-packages/" in lower_path and not ACTIVE_DOWNLOAD_COMMAND_RE.search(command):
            return True

    if not external_connections and not ACTIVE_DOWNLOAD_COMMAND_RE.search(command):
        return True

    return False


def score_download_candidate(info: ProcessInfo, file_path: Path | None, connections: list[str]) -> float:
    score = 0.0
    command = info.command.lower()
    external_connections = filter_external_connections(connections)
    if file_path is not None:
        score += 120
        if file_path.exists():
            try:
                score += min(file_path.stat().st_size / (1024 * 1024), 180)
            except OSError:
                pass
    if external_connections:
        score += 90
    if DISCOVERY_COMMAND_RE.search(command):
        score += 50
    if any(token in command for token in ("curl", "wget", "npm", "pnpm", "yarn", "node", "python", "pip", "brew", "cargo", "go")):
        score += 25
    if info.state != "EXITED":
        score += 30
    if "download" in command or "install" in command:
        score += 15
    return score


def discover_download_candidates(limit: int = 8) -> list[DownloadCandidate]:
    candidates: list[DownloadCandidate] = []
    for info in list_process_infos():
        if info.pid == os.getpid():
            continue
        command = info.command.lower()
        if not DISCOVERY_COMMAND_RE.search(command):
            continue

        try:
            file_path = detect_download_file(info.pid, None)
            connections = detect_connections(info.pid)
        except RuntimeError:
            continue

        if is_noise_candidate(info, file_path, connections):
            continue

        external_connections = filter_external_connections(connections)
        if file_path is None and not external_connections:
            continue
        if file_path is None and not ACTIVE_DOWNLOAD_COMMAND_RE.search(command):
            continue

        size = None
        if file_path is not None and file_path.exists():
            try:
                size = file_path.stat().st_size
            except OSError:
                size = None

        kind, label = infer_candidate_kind(info.command, file_path)
        score = score_download_candidate(info, file_path, connections)
        candidates.append(
            DownloadCandidate(
                pid=info.pid,
                info=info,
                file_path=file_path,
                size=size,
                connections=connections,
                score=score,
                kind=kind,
                label=label,
            )
        )

    candidates.sort(key=lambda item: item.score, reverse=True)
    return candidates[:limit]


def print_snapshot(
    info: ProcessInfo,
    file_path: Path | None,
    size: int | None,
    connections: list[str],
    rate: str,
    stall_count: int,
) -> None:
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] pid={info.pid} state={info.state} elapsed={info.elapsed} cpu={info.cpu}% mem={info.mem}%")
    print(f"  cmd:   {info.command}")
    print(f"  file:  {file_path if file_path else '-'}")
    print(f"  size:  {human_bytes(size)}")
    print(f"  rate:  {rate}")
    print(f"  stall: {stall_count}")
    if connections:
        print(f"  net:   {connections[0]}")
        for extra in connections[1:3]:
            print(f"         {extra}")
    else:
        print("  net:   -")
    print()


def ensure_dependencies() -> None:
    for name in ("ps", "lsof"):
        if shutil.which(name) is None:
            raise SystemExit(f"Required command not found: {name}")


def probe_process(
    pid: int,
    explicit_path: str | None,
    samples: list[Sample] | None = None,
    stall_count: int = 0,
    history: int = 6,
    current_file_path: Path | None = None,
) -> ProbeResult | None:
    info = get_process_info(pid)
    if info is None:
        return None

    if explicit_path:
        file_path = detect_download_file(pid, explicit_path)
    else:
        file_path = detect_download_file(pid, None) or current_file_path
    size = None
    if file_path and file_path.exists():
        size = file_path.stat().st_size

    next_samples = list(samples or [])
    next_samples.append(Sample(timestamp=time.time(), size=size))
    next_samples = next_samples[-max(history, 2) :]

    next_stall_count = stall_count
    if len(next_samples) >= 2 and next_samples[-2].size is not None and size is not None:
        next_stall_count = next_stall_count + 1 if size == next_samples[-2].size else 0

    return ProbeResult(
        timestamp=next_samples[-1].timestamp,
        info=info,
        file_path=file_path,
        size=size,
        connections=detect_connections(pid),
        rate=tail_rate(next_samples),
        stall_count=next_stall_count,
        samples=next_samples,
    )


def main() -> int:
    ensure_dependencies()
    parser = build_parser()
    args = parser.parse_args()
    pid = resolve_pid(args.pid, args.match)
    file_path = detect_download_file(pid, args.path)
    samples: list[Sample] = []
    stall_count = 0

    while True:
        result = probe_process(
            pid=pid,
            explicit_path=args.path,
            samples=samples,
            stall_count=stall_count,
            history=args.history,
            current_file_path=file_path,
        )
        if result is None:
            print(f"Process {pid} is no longer running.")
            return 0

        file_path = result.file_path
        samples = result.samples
        stall_count = result.stall_count
        print_snapshot(
            result.info,
            result.file_path,
            result.size,
            result.connections,
            result.rate,
            result.stall_count,
        )

        if args.once:
            return 0

        if args.stop_after_stall and stall_count >= args.stop_after_stall:
            print(f"Stopped after {stall_count} consecutive stalled samples.")
            return 0

        time.sleep(max(args.interval, 0.2))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nStopped.")
        raise SystemExit(130)

#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8765}"
LOG_FILE="${LOG_FILE:-/tmp/download_monitor_web.log}"

cd "$PROJECT_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found"
  exit 1
fi

if command -v lsof >/dev/null 2>&1; then
  existing_pid="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$existing_pid" ]]; then
    echo "Service already running on http://$HOST:$PORT/ (PID: $existing_pid)"
    exit 0
  fi
fi

nohup python3 "$PROJECT_DIR/tools/download_monitor_web.py" --host "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &

sleep 1

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Started download monitor at http://$HOST:$PORT/"
  echo "Log file: $LOG_FILE"
  exit 0
fi

echo "Service may have failed to start. Check log: $LOG_FILE"
exit 1

#!/usr/bin/env python3
"""Formats JSON docker logs into readable colored one-liners."""

from __future__ import annotations

import json
import sys

RESET = "\033[0m"
RED = "\033[31m"
YELLOW = "\033[33m"
GREEN = "\033[32m"
CYAN = "\033[36m"
GRAY = "\033[90m"

LEVEL_COLORS = {
    "error": (RED, "ERROR"),
    "warn": (YELLOW, "WARN "),
    "warning": (YELLOW, "WARN "),
    "info": (GREEN, "INFO "),
    "debug": (CYAN, "DEBUG"),
}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        print(line)
        continue

    level = entry.get("level", "").lower()
    color, label = LEVEL_COLORS.get(level, (CYAN, level.upper().ljust(5)))
    timestamp = entry.get("timestamp", "")[11:19]
    message = entry.get("message", "")

    extra = ""
    if entry.get("path"):
        method = entry.get("method", "")
        path = entry.get("path", "")
        status = entry.get("status", "")
        db = entry.get("db", "")
        extra = f" ({method} {path} {status} {db}ms)"

    print(f"{color}{label}{RESET} {GRAY}{timestamp}{RESET} {message}{extra}")

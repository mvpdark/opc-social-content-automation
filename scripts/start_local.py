from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV_PYTHON = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
BACKEND_LOG = BACKEND / "uvicorn-8010.log"
FRONTEND_LOG = FRONTEND / "next-3000.log"


def port_is_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def open_log(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    return path.open("ab")


def start_process(command: list[str], *, cwd: Path, log_path: Path) -> int:
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    log_file = open_log(log_path)
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=flags,
    )
    log_file.close()
    return process.pid


def start_backend() -> None:
    if port_is_open(8010):
        print("Backend already appears to be running on http://127.0.0.1:8010")
        return
    if not VENV_PYTHON.exists():
        raise SystemExit("Missing .venv. Run: python scripts/setup_local.py")
    pid = start_process(
        [
            str(VENV_PYTHON),
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8010",
        ],
        cwd=BACKEND,
        log_path=BACKEND_LOG,
    )
    print(f"Started backend pid={pid}; log={BACKEND_LOG}")


def start_frontend() -> None:
    if port_is_open(3000):
        print("Frontend already appears to be running on http://127.0.0.1:3000")
        return
    npm = shutil.which("npm")
    if not npm:
        raise SystemExit("npm is missing. Install Node.js 20 LTS or newer.")
    pid = start_process(
        [npm, "run", "dev:lan"],
        cwd=FRONTEND,
        log_path=FRONTEND_LOG,
    )
    print(f"Started frontend pid={pid}; log={FRONTEND_LOG}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Start local OPC backend and frontend dev servers.")
    parser.add_argument("--backend-only", action="store_true", help="Only start the backend API.")
    parser.add_argument("--frontend-only", action="store_true", help="Only start the frontend app.")
    args = parser.parse_args()

    if args.backend_only and args.frontend_only:
        raise SystemExit("Choose at most one of --backend-only or --frontend-only.")

    if not args.frontend_only:
        start_backend()
    if not args.backend_only:
        start_frontend()

    print("Local URLs:")
    print("  PC/mobile app: http://127.0.0.1:3000")
    print("  Backend API:    http://127.0.0.1:8010")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()

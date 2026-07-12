from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV_PYTHON = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
BACKEND_LOG = BACKEND / "uvicorn-60001.log"
FRONTEND_LOG = FRONTEND / "next-60000.log"
LEGACY_TEXT_BOMS = (b"\xff\xfe", b"\xfe\xff")


def port_is_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def process_ids_on_port(port: int) -> set[int]:
    if os.name == "nt":
        result = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
            check=False,
            capture_output=True,
            text=True,
        )
        pids: set[int] = set()
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) < 5:
                continue
            local_address, state, pid_text = parts[1], parts[3], parts[4]
            if state.upper() == "LISTENING" and local_address.endswith(f":{port}"):
                try:
                    pids.add(int(pid_text))
                except ValueError:
                    continue
        return pids

    lsof = shutil.which("lsof")
    if not lsof:
        return set()
    result = subprocess.run(
        [lsof, "-ti", f"tcp:{port}", "-sTCP:LISTEN"],
        check=False,
        capture_output=True,
        text=True,
    )
    pids = set()
    for pid_text in result.stdout.splitlines():
        try:
            pids.add(int(pid_text.strip()))
        except ValueError:
            continue
    return pids


def stop_processes_on_port(port: int) -> None:
    pids = {pid for pid in process_ids_on_port(port) if pid != os.getpid()}
    if not pids:
        print(f"No process is listening on port {port}.")
        return

    for pid in sorted(pids):
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/F", "/T"], check=False)
        else:
            try:
                os.kill(pid, 15)
            except OSError:
                pass
        print(f"Stopped process pid={pid} on port {port}.")

    for _ in range(20):
        if not port_is_open(port):
            return
        time.sleep(0.25)


def open_log(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes()[:2] in LEGACY_TEXT_BOMS:
        legacy_path = path.with_suffix(path.suffix + ".legacy")
        if legacy_path.exists():
            legacy_path.unlink()
        path.replace(legacy_path)
    return path.open("ab")


def start_process(command: list[str], *, cwd: Path, log_path: Path) -> int:
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    log_file = open_log(log_path)
    env = os.environ.copy()
    env.setdefault("PYTHONUTF8", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=flags,
    )
    log_file.close()
    return process.pid


def start_backend() -> None:
    if port_is_open(60001):
        print("Backend already appears to be running on http://127.0.0.1:60001")
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
            "60001",
        ],
        cwd=BACKEND,
        log_path=BACKEND_LOG,
    )
    print(f"Started backend pid={pid}; log={BACKEND_LOG}")


def start_frontend() -> None:
    if port_is_open(60000):
        print("Frontend already appears to be running on http://127.0.0.1:60000")
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


def print_status() -> None:
    backend_status = "running" if port_is_open(60001) else "stopped"
    frontend_status = "running" if port_is_open(60000) else "stopped"
    print("Local service status:")
    print(f"  Backend  60001: {backend_status}")
    print(f"  Frontend 60000: {frontend_status}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Start local OPC backend and frontend dev servers.")
    parser.add_argument("--backend-only", action="store_true", help="Only start the backend API.")
    parser.add_argument("--frontend-only", action="store_true", help="Only start the frontend app.")
    parser.add_argument("--restart-backend", action="store_true", help="Stop the backend port before starting.")
    parser.add_argument("--restart-frontend", action="store_true", help="Stop the frontend port before starting.")
    parser.add_argument("--status", action="store_true", help="Only print whether local services are running.")
    args = parser.parse_args()

    if args.backend_only and args.frontend_only:
        raise SystemExit("Choose at most one of --backend-only or --frontend-only.")
    if args.status and (
        args.backend_only or args.frontend_only or args.restart_backend or args.restart_frontend
    ):
        raise SystemExit(
            "--status cannot be combined with --backend-only, --frontend-only, or restart flags."
        )

    if args.status:
        print_status()
        return

    if args.restart_backend and not args.frontend_only:
        stop_processes_on_port(60001)
    if args.restart_frontend and not args.backend_only:
        stop_processes_on_port(60000)

    if not args.frontend_only:
        start_backend()
    if not args.backend_only:
        start_frontend()

    print("Local URLs:")
    print("  PC/mobile app: http://127.0.0.1:60000")
    print("  Backend API:    http://127.0.0.1:60001")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()

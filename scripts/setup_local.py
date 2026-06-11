from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = ROOT / ".venv"
VENV_PYTHON = VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def run(command: list[str], *, cwd: Path = ROOT, required: bool = True) -> bool:
    executable = shutil.which(command[0]) or command[0]
    resolved_command = [executable, *command[1:]]
    print(f"\n$ {' '.join(command)}")
    result = subprocess.run(resolved_command, cwd=cwd, text=True, check=False)
    if result.returncode != 0:
        message = f"Command failed with exit code {result.returncode}: {' '.join(command)}"
        if required:
            raise SystemExit(message)
        print(message)
        return False
    return True


def command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def ensure_python_version() -> None:
    if sys.version_info < (3, 11):
        raise SystemExit("Python 3.11 or newer is required.")


def ensure_venv() -> None:
    if VENV_PYTHON.exists():
        print(f"Using existing virtual environment: {VENV}")
        return
    run([sys.executable, "-m", "venv", str(VENV)])


def ensure_env_file() -> None:
    env_path = ROOT / ".env"
    example_path = ROOT / ".env.example"
    if env_path.exists():
        print(".env already exists; leaving it unchanged.")
        return
    if example_path.exists():
        text = example_path.read_text(encoding="utf-8")
        text = text.replace(
            "DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/opc",
            "DATABASE_URL=sqlite:///./artifacts/dev/opc-dev.db",
        )
        env_path.write_text(text, encoding="utf-8")
        print("Created .env with local SQLite database mode.")


def install_backend() -> None:
    ensure_venv()
    run([str(VENV_PYTHON), "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"])
    run([str(VENV_PYTHON), "-m", "pip", "install", "-e", ".[dev,collector]"], cwd=BACKEND)


def install_frontend() -> None:
    if not command_exists("node"):
        raise SystemExit("Node.js is missing. Install Node.js 20 LTS or newer, then rerun this script.")
    if not command_exists("npm"):
        raise SystemExit("npm is missing. Install Node.js 20 LTS or newer, then rerun this script.")
    run(["npm", "install"], cwd=FRONTEND)


def prepare_local_state() -> None:
    (ROOT / "artifacts" / "dev").mkdir(parents=True, exist_ok=True)
    ensure_env_file()


def main() -> None:
    ensure_python_version()
    prepare_local_state()
    install_backend()
    install_frontend()
    print("\nLocal setup finished.")
    print("Next steps:")
    print(r"  backend:  cd backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8010")
    print("  frontend: cd frontend && npm run dev:lan")


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


def run_step(name: str, command: list[str], cwd: Path = ROOT) -> None:
    print(f"\n== {name} ==")
    print(" ".join(command))
    completed = subprocess.run(command, cwd=cwd)
    if completed.returncode != 0:
        raise SystemExit(f"{name} failed with exit code {completed.returncode}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the release gate for the OPC workspace."
    )
    parser.add_argument(
        "--skip-frontend",
        action="store_true",
        help="Skip the frontend typecheck/build step when Node dependencies are unavailable.",
    )
    args = parser.parse_args()

    run_step(
        "project contracts",
        [sys.executable, str(ROOT / "scripts" / "verify_project.py")],
    )
    run_step(
        "backend tests",
        [sys.executable, "-m", "pytest", str(ROOT / "backend" / "tests")],
    )
    if not args.skip_frontend:
        npm = shutil.which("npm") or shutil.which("npm.cmd")
        if npm is None:
            raise SystemExit("npm was not found on PATH; cannot run frontend verification.")
        run_step("frontend typecheck and build", [npm, "run", "verify"], cwd=FRONTEND)

    print("\nrelease_gate=passed")


if __name__ == "__main__":
    main()

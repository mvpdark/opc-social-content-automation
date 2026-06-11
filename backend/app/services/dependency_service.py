from __future__ import annotations

import importlib.metadata
import json
import shutil
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings


PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ROOT = PROJECT_ROOT / "frontend"
BACKEND_ROOT = PROJECT_ROOT / "backend"


def _version_tuple(value: str | None) -> tuple[int, ...]:
    if not value:
        return ()
    parts: list[int] = []
    current = ""
    for char in value:
        if char.isdigit():
            current += char
        elif current:
            parts.append(int(current))
            current = ""
    if current:
        parts.append(int(current))
    return tuple(parts)


def _meets_minimum(detected: str | None, minimum: str | None) -> bool:
    if not minimum:
        return True
    detected_tuple = _version_tuple(detected)
    minimum_tuple = _version_tuple(minimum)
    if not detected_tuple:
        return False
    max_len = max(len(detected_tuple), len(minimum_tuple))
    return detected_tuple + (0,) * (max_len - len(detected_tuple)) >= minimum_tuple + (
        0,
    ) * (max_len - len(minimum_tuple))


def _run_version_command(command: list[str]) -> str | None:
    executable = shutil.which(command[0])
    if executable is None:
        return None
    try:
        result = subprocess.run(
            [executable, *command[1:]],
            cwd=PROJECT_ROOT,
            text=True,
            capture_output=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    output = (result.stdout or result.stderr).strip()
    return output or None


def _port_is_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.4):
            return True
    except OSError:
        return False


def _item(
    *,
    name: str,
    category: str,
    required: bool,
    status: str,
    detected: str | None = None,
    minimum: str | None = None,
    message: str,
    fix: str | None = None,
) -> dict[str, object]:
    return {
        "name": name,
        "category": category,
        "required": required,
        "status": status,
        "detected": detected,
        "minimum": minimum,
        "message": message,
        "fix": fix,
    }


def _version_item(
    *,
    name: str,
    category: str,
    command: list[str],
    minimum: str,
    required: bool,
    fix: str,
) -> dict[str, object]:
    detected = _run_version_command(command)
    if detected is None:
        return _item(
            name=name,
            category=category,
            required=required,
            status="missing" if required else "warning",
            detected=None,
            minimum=minimum,
            message=f"{name} 未安装或不在 PATH 中。",
            fix=fix,
        )
    status = "ok" if _meets_minimum(detected, minimum) else "outdated"
    return _item(
        name=name,
        category=category,
        required=required,
        status=status,
        detected=detected,
        minimum=minimum,
        message=(
            f"{name} 版本满足项目要求。"
            if status == "ok"
            else f"{name} 版本低于项目建议版本。"
        ),
        fix=None if status == "ok" else fix,
    )


def _python_package_item(distribution: str, minimum: str) -> dict[str, object]:
    try:
        detected = importlib.metadata.version(distribution)
    except importlib.metadata.PackageNotFoundError:
        return _item(
            name=distribution,
            category="Python 包",
            required=True,
            status="missing",
            detected=None,
            minimum=minimum,
            message=f"Python 包 {distribution} 未安装在当前后端环境。",
            fix=r'cd backend && ..\.venv\Scripts\python.exe -m pip install -e ".[dev,collector]"',
        )
    status = "ok" if _meets_minimum(detected, minimum) else "outdated"
    return _item(
        name=distribution,
        category="Python 包",
        required=True,
        status=status,
        detected=detected,
        minimum=minimum,
        message=(
            f"{distribution} 满足最低版本。"
            if status == "ok"
            else f"{distribution} 低于项目最低版本。"
        ),
        fix=None
        if status == "ok"
        else r'cd backend && ..\.venv\Scripts\python.exe -m pip install -e ".[dev,collector]"',
    )


def _node_package_item(package_name: str, minimum: str) -> dict[str, object]:
    package_json = FRONTEND_ROOT / "node_modules" / package_name / "package.json"
    if not package_json.exists():
        return _item(
            name=package_name,
            category="前端包",
            required=True,
            status="missing",
            detected=None,
            minimum=minimum,
            message=f"前端包 {package_name} 未安装。",
            fix="cd frontend && npm install",
        )
    try:
        detected = json.loads(package_json.read_text(encoding="utf-8")).get("version")
    except (json.JSONDecodeError, OSError):
        detected = None
    status = "ok" if _meets_minimum(str(detected or ""), minimum) else "outdated"
    return _item(
        name=package_name,
        category="前端包",
        required=True,
        status=status,
        detected=str(detected or ""),
        minimum=minimum,
        message=(
            f"{package_name} 满足最低版本。"
            if status == "ok"
            else f"{package_name} 低于项目最低版本或版本无法读取。"
        ),
        fix=None if status == "ok" else "cd frontend && npm install",
    )


def _database_items() -> list[dict[str, object]]:
    if settings.is_sqlite:
        database_path = settings.database_url.removeprefix("sqlite:///")
        path = Path(database_path)
        writable = path.parent.exists()
        return [
            _item(
                name="本地 SQLite 测试数据库",
                category="数据库",
                required=True,
                status="ok" if writable else "missing",
                detected=str(path),
                minimum=None,
                message=(
                    "已启用本地 SQLite 测试数据库。"
                    if writable
                    else "SQLite 数据库目录不存在或不可写。"
                ),
                fix=None
                if writable
                else "mkdir artifacts\\dev，并确认 DATABASE_URL 指向可写 SQLite 文件。",
            )
        ]

    postgres_open = _port_is_open("127.0.0.1", 5432)
    redis_open = _port_is_open("127.0.0.1", 6379)
    return [
        _item(
            name="PostgreSQL",
            category="数据库",
            required=True,
            status="ok" if postgres_open else "missing",
            detected="127.0.0.1:5432" if postgres_open else None,
            minimum="16",
            message=(
                "PostgreSQL 端口可连接。"
                if postgres_open
                else "PostgreSQL 未运行；内容生成、知识库和工作台会不可用。"
            ),
            fix=(
                None
                if postgres_open
                else "安装 Docker 后运行 docker compose up -d postgres redis；或将 DATABASE_URL 切到 sqlite:///./artifacts/dev/opc-dev.db。"
            ),
        ),
        _item(
            name="Redis",
            category="缓存/队列",
            required=False,
            status="ok" if redis_open else "warning",
            detected="127.0.0.1:6379" if redis_open else None,
            minimum="7",
            message=(
                "Redis 端口可连接。"
                if redis_open
                else "Redis 未运行；趋势任务队列相关能力会受限。"
            ),
            fix=None if redis_open else "安装 Docker 后运行 docker compose up -d redis。",
        ),
    ]


def dependency_report() -> dict[str, object]:
    items: list[dict[str, object]] = [
        _item(
            name="Python",
            category="运行时",
            required=True,
            status="ok"
            if sys.version_info >= (3, 11)
            else "outdated",
            detected=sys.version.split()[0],
            minimum="3.11",
            message=(
                "Python 版本满足项目要求。"
                if sys.version_info >= (3, 11)
                else "Python 版本低于项目最低要求。"
            ),
            fix="安装 Python 3.11 或更高版本，并重新创建 .venv。",
        ),
        _version_item(
            name="Node.js",
            category="运行时",
            command=["node", "--version"],
            minimum="20.0.0",
            required=True,
            fix="安装 Node.js 20 LTS 或更高版本。",
        ),
        _version_item(
            name="npm",
            category="运行时",
            command=["npm", "--version"],
            minimum="10.0.0",
            required=True,
            fix="随 Node.js LTS 安装 npm，或运行 npm install -g npm。",
        ),
        _version_item(
            name="Git",
            category="工具",
            command=["git", "--version"],
            minimum="2.40.0",
            required=True,
            fix="安装 Git for Windows 2.40 或更高版本。",
        ),
        _version_item(
            name="Docker",
            category="工具",
            command=["docker", "--version"],
            minimum="24.0.0",
            required=False,
            fix="安装 Docker Desktop；无 Docker 时可使用 SQLite 本地测试数据库。",
        ),
        *_database_items(),
    ]

    for distribution, minimum in [
        ("fastapi", "0.115.0"),
        ("SQLAlchemy", "2.0.0"),
        ("alembic", "1.13.0"),
        ("pydantic-settings", "2.4.0"),
        ("pgvector", "0.3.0"),
        ("psycopg", "3.2.0"),
        ("uvicorn", "0.30.0"),
        ("pytest", "8.0.0"),
    ]:
        items.append(_python_package_item(distribution, minimum))

    for package_name, minimum in [
        ("next", "15.0.0"),
        ("react", "19.0.0"),
        ("typescript", "5.7.0"),
        ("tailwindcss", "3.4.17"),
    ]:
        items.append(_node_package_item(package_name, minimum))

    blocking = [
        item
        for item in items
        if item["required"] and item["status"] in {"missing", "outdated"}
    ]
    warnings = [
        item
        for item in items
        if item["status"] == "warning"
        or (not item["required"] and item["status"] in {"missing", "outdated"})
    ]
    overall_status = "blocked" if blocking else "attention" if warnings else "ok"
    repair_steps = ["python scripts/setup_local.py"]
    seen_steps: set[str] = set(repair_steps)
    for item in items:
        if item["status"] == "ok":
            continue
        fix = item.get("fix")
        if isinstance(fix, str) and fix and fix not in seen_steps:
            repair_steps.append(fix)
            seen_steps.add(fix)
    repair_steps.extend(
        [
            "cd frontend && npm outdated",
            r'cd backend && ..\.venv\Scripts\python.exe -m pip list --outdated',
        ]
    )

    return {
        "generated_at": datetime.now(timezone.utc),
        "status": overall_status,
        "summary": {
            "ok": sum(1 for item in items if item["status"] == "ok"),
            "warning": len(warnings),
            "blocking": len(blocking),
            "total": len(items),
        },
        "items": items,
        "repair_steps": repair_steps,
    }

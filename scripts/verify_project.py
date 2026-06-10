from __future__ import annotations

import argparse
import json
import py_compile
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", ".venv", "node_modules", ".next"}


def compile_backend() -> int:
    py_files = sorted((ROOT / "backend").rglob("*.py"))
    for file in py_files:
        py_compile.compile(str(file), doraise=True)
    return len(py_files)


def validate_json_configs() -> int:
    files = [
        ROOT / "frontend" / "package.json",
        ROOT / "frontend" / "tsconfig.json",
    ]
    for file in files:
        json.loads(file.read_text(encoding="utf-8"))
    return len(files)


def validate_required_files() -> int:
    required = [
        ROOT / "README.md",
        ROOT / ".env.example",
        ROOT / "docker-compose.yml",
        ROOT / "backend" / "app" / "main.py",
        ROOT / "backend" / "alembic" / "versions" / "0007_trend_collection_jobs.py",
        ROOT / "frontend" / "app" / "page.tsx",
        ROOT / "docs" / "RUNBOOK.md",
        ROOT / "docs" / "SECURITY_NOTES.md",
        ROOT / "scripts" / "run_trend_collection_job.py",
        ROOT / "scripts" / "smoke_public_image_text_search.py",
        ROOT / "prompts" / "draft_generation.md",
        ROOT / "prompts" / "humanization.md",
        ROOT / "prompts" / "review.md",
        ROOT / "prompts" / "image_generation.md",
    ]
    missing = [str(file.relative_to(ROOT)) for file in required if not file.exists()]
    if missing:
        raise SystemExit("Missing required files: " + ", ".join(missing))
    return len(required)


def validate_migration_chain() -> int:
    versions_dir = ROOT / "backend" / "alembic" / "versions"
    versions = sorted(versions_dir.glob("*.py"))
    expected_pairs = [
        ('revision = "0001_initial"', "down_revision = None"),
        ('revision = "0002_publish_records"', 'down_revision = "0001_initial"'),
        (
            'revision = "0003_knowledge_embedding_index"',
            'down_revision = "0002_publish_records"',
        ),
        (
            'revision = "0004_generation_log_metadata"',
            'down_revision = "0003_knowledge_embedding_index"',
        ),
        ('revision = "0005_content_reviews"', 'down_revision = "0004_generation_log_metadata"'),
        (
            'revision = "0006_generated_image_metadata"',
            'down_revision = "0005_content_reviews"',
        ),
        (
            'revision = "0007_trend_collection_jobs"',
            'down_revision = "0006_generated_image_metadata"',
        ),
    ]
    for expected_revision, expected_parent in expected_pairs:
        if not any(
            expected_revision in file.read_text(encoding="utf-8")
            and expected_parent in file.read_text(encoding="utf-8")
            for file in versions
        ):
            raise SystemExit(f"Migration chain is missing {expected_revision}")
    return len(expected_pairs)


def validate_safety_gates() -> int:
    checks = {
        "backend/app/api/v1/endpoints/workspace.py": [
            "Only human-approved content can be recorded as published.",
            'content.status = "published"',
        ],
        "backend/app/services/image_service.py": [
            "Only human-approved content can be used for image generation.",
            "provider_not_configured",
        ],
        "backend/app/services/trend_service.py": [
            "human_like_scrolling",
            "account_safety_first",
            "cookie_persistence",
            "video_collection_enabled",
            "public_first_visible_browser",
            "content_kind",
            "build_platform_search_target",
            "create_trend_knowledge_digest",
            "source_reviewed",
            "ensure_trend_sources_reviewed",
        ],
        "backend/app/services/trend_browser_collector.py": [
            "operator_wait_seconds",
            "operator_wait_seconds: int = 0",
            "headless: bool = False",
            "No collected public image-text items were found",
            "VIDEO_MARKERS",
            "BLOCKED_MARKERS",
        ],
        "scripts/smoke_public_image_text_search.py": [
            "extract_image_text_candidates",
            "serial_anonymous_no_cookie",
            "storage_state=None",
            "VIDEO_MARKERS",
            "BLOCKED_MARKERS",
            "without storing results",
        ],
        "scripts/run_trend_collection_job.py": [
            "--operator-wait-seconds",
            "default=0",
            "Backend dependencies are not installed",
        ],
        "backend/app/services/model_router.py": [
            "load_prompt",
            "Review model provider is not configured yet.",
        ],
        "backend/app/services/workspace_service.py": [
            "provider_status_items",
            "missing_key",
        ],
    }
    total = 0
    for rel_path, snippets in checks.items():
        text = (ROOT / rel_path).read_text(encoding="utf-8")
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing safety gate {snippet!r} in {rel_path}")
    return total


def clean_pycache() -> int:
    count = 0
    for cache_dir in ROOT.rglob("__pycache__"):
        if SKIP_DIRS.intersection(cache_dir.relative_to(ROOT).parts):
            continue
        resolved = cache_dir.resolve()
        if ROOT == resolved or ROOT not in resolved.parents:
            raise SystemExit(f"Refusing to remove outside project: {resolved}")
        shutil.rmtree(resolved)
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify OPC project structure.")
    parser.add_argument("--keep-cache", action="store_true")
    args = parser.parse_args()

    results = {
        "python_files_compiled": compile_backend(),
        "json_configs_valid": validate_json_configs(),
        "required_files_present": validate_required_files(),
        "migration_chain_checked": validate_migration_chain(),
        "safety_gates_checked": validate_safety_gates(),
    }
    if not args.keep_cache:
        results["removed_pycache_dirs"] = clean_pycache()

    for key, value in results.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()

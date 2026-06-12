from __future__ import annotations

import argparse
import json
import py_compile
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", ".venv", "node_modules", ".next", ".next-build"}


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
        ROOT / "frontend" / "middleware.ts",
        ROOT / "frontend" / "lib" / "api-base.ts",
        ROOT / "docs" / "RUNBOOK.md",
        ROOT / "docs" / "CLOUDFLARE_OPC.md",
        ROOT / "docs" / "SECURITY_NOTES.md",
        ROOT / "infra" / "cloudflare" / "opc-tunnel.example.yml",
        ROOT / "scripts" / "run_trend_collection_job.py",
        ROOT / "scripts" / "smoke_public_image_text_search.py",
        ROOT / "prompts" / "draft_generation.md",
        ROOT / "prompts" / "humanization.md",
        ROOT / "prompts" / "review.md",
        ROOT / "prompts" / "image_generation.md",
        ROOT / "prompts" / "xiaohongshu_style_reference.md",
        ROOT / "docs" / "XIAOHONGSHU_STYLE_REFERENCE.md",
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
            "Only draft, rewritten, review-pending, or approved content can be used for image generation.",
            'status="generated" if content.status == "approved" else "needs_review"',
            "provider_not_configured",
            "load_platform_style_reference",
        ],
        "backend/app/services/trend_service.py": [
            "human_like_scrolling",
            "account_safety_first",
            "cookie_persistence",
            "video_collection_enabled",
            "Video collection is disabled",
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
            "Video collection is disabled",
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
            "load_platform_style_reference",
            "Review model provider is not configured yet.",
        ],
        "prompts/image_generation.md": [
            "primary cover headline must copy the content title verbatim",
            "High-attraction Xiaohongshu cover formula",
            "visual_direction",
            "Draft and rewritten content may produce cover previews",
        ],
        "backend/app/services/workspace_service.py": [
            "provider_status_items",
            "missing_key",
        ],
        "backend/app/api/deps.py": [
            "settings.auth_required",
            "PLANNER_TEST_USER",
            "Missing bearer token.",
        ],
        "backend/app/main.py": [
            "allow_origin_regex=settings.cors_origin_regex",
        ],
        "backend/app/core/config.py": [
            "cors_origin_regex",
            "opc\\.mvpdark\\.top",
            "192\\.168",
            "10\\.",
            "172\\.",
        ],
        "frontend/lib/api-base.ts": [
            "NEXT_PUBLIC_API_BASE_URL",
            "NEXT_PUBLIC_API_PORT",
            "window.location",
            "hostname",
            "isLocalOrPrivateHostname",
            "return `${origin}/api`",
        ],
        "frontend/package.json": [
            '"dev:lan": "next dev -H 0.0.0.0"',
        ],
        "scripts/setup_local.py": [
            "--host 0.0.0.0",
            "npm run dev:lan",
        ],
        "infra/cloudflare/opc-tunnel.example.yml": [
            "hostname: opc.mvpdark.top",
            "path: ^/api($|/.*)",
            "path: ^/static($|/.*)",
            "service: http://localhost:8010",
            "service: http://localhost:3000",
            "service: http_status:404",
        ],
        "docs/CLOUDFLARE_OPC.md": [
            "https://opc.mvpdark.top",
            "cloudflared tunnel route dns opc-social-content-automation opc.mvpdark.top",
            "opc.mvpdark.top/api",
            "opc.mvpdark.top/static",
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


def _extract_ts_array(name: str, text: str) -> list[str]:
    match = re.search(rf"export const {name}[^=]*=\s*\[(.*?)\];", text, re.S)
    if not match:
        raise SystemExit(f"Could not find frontend array {name}")
    return re.findall(r'"([^"]+)"', match.group(1))


def validate_frontend_design_contract() -> int:
    data_text = (ROOT / "frontend" / "lib" / "dashboard-data.ts").read_text(encoding="utf-8")
    css_text = (ROOT / "frontend" / "app" / "globals.css").read_text(encoding="utf-8")
    workspace_text = (
        ROOT / "frontend" / "components" / "workspace-client.tsx"
    ).read_text(encoding="utf-8")
    middleware_text = (ROOT / "frontend" / "middleware.ts").read_text(encoding="utf-8")

    tab_ids = _extract_ts_array("workspaceTabIds", data_text)
    style_ids = [
        style_id
        for style_id in _extract_ts_array("interfaceStyles", data_text)
        if style_id.isascii()
    ]
    css_theme_ids = set(re.findall(r"\.theme-([a-z-]+)\s*\{", css_text))
    referenced_styles = set(re.findall(r'style: "([^"]+)"', data_text))

    missing_theme_classes = sorted(set(style_ids) - css_theme_ids)
    if missing_theme_classes:
        raise SystemExit("Missing CSS theme classes: " + ", ".join(missing_theme_classes))

    unknown_referenced_styles = sorted(referenced_styles - set(style_ids))
    if unknown_referenced_styles:
        raise SystemExit("Unknown referenced interface styles: " + ", ".join(unknown_referenced_styles))

    for tab_id in tab_ids:
        if f'{{ id: "{tab_id}"' not in data_text:
            raise SystemExit(f"Missing navigation entry for tab {tab_id}")
        object_key_count = len(re.findall(rf"\n  {re.escape(tab_id)}: \{{", data_text))
        if object_key_count < 2:
            raise SystemExit(f"Missing tab metadata or theme recommendation for tab {tab_id}")

    generation_flow_snippets = [
        "/content/generate",
        "/content/rewrite",
        "Humanization rewrite",
        "本次未走 DeepSeek",
        "DEFAULT_WRITING_STYLE_STORAGE_KEY",
        "defaultWritingStyle={defaultWritingStyle}",
        "onDefaultWritingStyleChange={setDefaultWritingStyle}",
        'data-testid={`dashboard-writing-style-${style.id}`}',
        "setStylePreset(defaultWritingStyle)",
    ]
    for snippet in generation_flow_snippets:
        if snippet not in workspace_text:
            raise SystemExit(f"Missing frontend generation flow snippet: {snippet}")

    terminal_routing_snippets = [
        "mobileUserAgentPattern",
        'request.nextUrl.pathname !== "/"',
        'nextUrl.pathname = "/android"',
        "sec-ch-ua-mobile",
        'forcedTerminal === "pc"',
        'forcedTerminal === "android"',
        'matcher: ["/"]',
    ]
    for snippet in terminal_routing_snippets:
        if snippet not in middleware_text:
            raise SystemExit(f"Missing terminal routing snippet: {snippet}")

    return (
        len(tab_ids)
        + len(style_ids)
        + len(referenced_styles)
        + len(generation_flow_snippets)
        + len(terminal_routing_snippets)
    )


def validate_content_production_contract() -> int:
    workspace_text = (
        ROOT / "frontend" / "components" / "workspace-client.tsx"
    ).read_text(encoding="utf-8")
    image_service_text = (
        ROOT / "backend" / "app" / "services" / "image_service.py"
    ).read_text(encoding="utf-8")

    frontend_contract_snippets = [
        "latestContent={previewContent}",
        "const exportContent = lastContent ?? latestContent;",
        "onImageGenerated={onImageGenerated}",
        "onRefreshProviderStatuses={refreshProviderStatuses}",
        "fetchProviderStatuses",
        "hasLiveImageProvider",
        'data-testid="cover-generate-button"',
        'data-testid="cover-generate-button-secondary"',
        'data-testid="xhs-preview-real-cover"',
        "const canGenerateImage = canCopy && !imageBusy;",
        "检测并生成封面",
        "/image/generate",
        "/image/list?content_id=",
        "coverImageAsset",
        "isGeneratedImageAsset",
        "/content/rewrite",
        "Humanization rewrite",
        "本次未走 DeepSeek",
    ]
    backend_contract_snippets = [
        'IMAGE_GENERATABLE_STATUSES = {"draft", "rewritten", "review_pending", "approved"}',
        'status="generated" if content.status == "approved" else "needs_review"',
        "model_router.image_model",
    ]

    total = 0
    for snippet in frontend_contract_snippets:
        total += 1
        if snippet not in workspace_text:
            raise SystemExit(f"Missing content production frontend contract: {snippet}")
    for snippet in backend_contract_snippets:
        total += 1
        if snippet not in image_service_text:
            raise SystemExit(f"Missing content production backend contract: {snippet}")

    stale_gate_snippets = [
        "Only human-approved content can be used for image generation.",
        "canCopy && imageProviderReady && !imageBusy",
        "封面仍是版式预览，真实图片生成后会在这里替换。\" :",
    ]
    for snippet in stale_gate_snippets:
        total += 1
        if snippet in workspace_text or snippet in image_service_text:
            raise SystemExit(f"Stale content production gate still present: {snippet}")

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
        "frontend_design_contract_checked": validate_frontend_design_contract(),
        "content_production_contract_checked": validate_content_production_contract(),
    }
    if not args.keep_cache:
        results["removed_pycache_dirs"] = clean_pycache()

    for key, value in results.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()

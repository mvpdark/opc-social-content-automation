from __future__ import annotations

from ._helpers import ROOT


def validate_required_files() -> int:
    required = [
        ROOT / "AGENTS.md",
        ROOT / "PROJECT_MAP.md",
        ROOT / "LOOP_LOG.md",
        ROOT / "README.md",
        ROOT / ".env.example",
        ROOT / "docker-compose.yml",
        ROOT / "backend" / "app" / "main.py",
        ROOT / "backend" / "app" / "services" / "promotion_brief.py",
        ROOT / "backend" / "alembic" / "versions" / "0008_content_source_context.py",
        ROOT / "frontend" / "app" / "page.tsx",
        ROOT / "frontend" / "app" / "error.tsx",
        ROOT / "frontend" / "app" / "global-error.tsx",
        ROOT / "frontend" / "playwright.config.ts",
        ROOT / "frontend" / "middleware.ts",
        ROOT / "frontend" / "public" / "mobile-assets" / "collection-collage.png",
        ROOT / "frontend" / "public" / "mobile-assets" / "create-card-bg.png",
        ROOT / "frontend" / "public" / "mobile-assets" / "paper-texture.png",
        ROOT / "frontend" / "lib" / "api-base.ts",
        ROOT / "frontend" / "lib" / "asset-url.ts",
        ROOT / "frontend" / "lib" / "generated-assets.ts",
        ROOT / "frontend" / "lib" / "status-labels.ts",
        ROOT / "frontend" / "lib" / "tags.ts",
        ROOT / "frontend" / "lib" / "xhs-stickers.tsx",
        ROOT / "frontend" / "components" / "promotion-brief-summary.tsx",
        ROOT / "frontend" / "components" / "promotion-readiness-summary.tsx",
        ROOT / "frontend" / "components" / "source-card-summary.tsx",
        ROOT / "docs" / "RUNBOOK.md",
        ROOT / "docs" / "CLOUDFLARE_OPC.md",
        ROOT / "docs" / "SECURITY_NOTES.md",
        ROOT / "docs" / "COMPETITOR_PLATFORM_RESEARCH.md",
        ROOT / "docs" / "loop-engineering" / "README.md",
        ROOT / "docs" / "loop-engineering" / "BACKLOG_SEEDS.md",
        ROOT / "docs" / "loop-engineering" / "CODEX_MASTER_PROMPT.md",
        ROOT / "docs" / "loop-engineering" / "EVAL_MATRIX.md",
        ROOT / "docs" / "loop-engineering" / "LOOP_ENGINEERING_RUNBOOK.md",
        ROOT / "docs" / "loop-engineering" / "LOOP_LOG_TEMPLATE.md",
        ROOT / "docs" / "loop-engineering" / "PLAYWRIGHT_E2E_SPEC.md",
        ROOT / "docs" / "loop-engineering" / "PROMOTION_PRECISION.md",
        ROOT / "docs" / "loop-engineering" / "PRODUCT_ACCEPTANCE.md",
        ROOT / "infra" / "cloudflare" / "opc-tunnel.example.yml",
        ROOT / "scripts" / "open_collection_login_browser.py",
        ROOT / "scripts" / "opc-loop-check.sh",
        ROOT / "scripts" / "run_trend_collection_job.py",
        ROOT / "scripts" / "smoke_public_image_text_search.py",
        ROOT / "frontend" / "tests" / "e2e" / "opc.smoke.spec.ts",
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

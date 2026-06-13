from __future__ import annotations

import argparse
import json
import py_compile
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", ".venv", "node_modules", ".next", ".next-build"}
TEXT_HYGIENE_EXTENSIONS = {".md", ".py", ".ts", ".tsx"}
TEXT_HYGIENE_ROOTS = [
    ROOT / "README.md",
    ROOT / "backend" / "app",
    ROOT / "docs",
    ROOT / "frontend" / "app",
    ROOT / "frontend" / "components",
    ROOT / "frontend" / "lib",
    ROOT / "frontend" / "middleware.ts",
    ROOT / "prompts",
]
FORBIDDEN_TEXT_MARKERS = {
    "\ufffd": "replacement character",
    "\u951f": "mojibake marker",
    "\u9225": "mojibake marker",
    "\u6d93": "mojibake marker",
    "\u00c2": "mojibake marker",
    "debugger": "debugger statement",
    "console.log": "console logging",
}


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
        ROOT / "frontend" / "public" / "mobile-assets" / "collection-collage.png",
        ROOT / "frontend" / "public" / "mobile-assets" / "create-card-bg.png",
        ROOT / "frontend" / "public" / "mobile-assets" / "paper-texture.png",
        ROOT / "frontend" / "lib" / "api-base.ts",
        ROOT / "frontend" / "lib" / "asset-url.ts",
        ROOT / "frontend" / "lib" / "generated-assets.ts",
        ROOT / "frontend" / "lib" / "status-labels.ts",
        ROOT / "frontend" / "lib" / "tags.ts",
        ROOT / "frontend" / "lib" / "xhs-stickers.tsx",
        ROOT / "docs" / "RUNBOOK.md",
        ROOT / "docs" / "CLOUDFLARE_OPC.md",
        ROOT / "docs" / "SECURITY_NOTES.md",
        ROOT / "docs" / "COMPETITOR_PLATFORM_RESEARCH.md",
        ROOT / "infra" / "cloudflare" / "opc-tunnel.example.yml",
        ROOT / "scripts" / "open_collection_login_browser.py",
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
            "只有人工批准后的内容可以记录为已发布。",
            'content.status = "published"',
        ],
        "backend/app/services/image_service.py": [
            "只有草稿、已改写、待审核或人工批准后的内容可以生成封面图。",
            'status="generated" if content.status == "approved" else "needs_review"',
            "provider_not_configured",
            "load_platform_style_reference",
        ],
        "backend/app/services/trend_service.py": [
            "human_like_scrolling",
            "account_safety_first",
            "cookie_persistence",
            "video_collection_enabled",
            "视频采集暂未启用",
            "这里只提取并分类链接，不抓取笔记详情或媒体文件。",
            "默认不下载媒体",
            "public_first_visible_browser",
            "content_kind",
            "build_platform_search_target",
            "create_trend_knowledge_digest",
            "source_reviewed",
            "ensure_trend_sources_reviewed",
        ],
        "backend/app/services/trend_browser_collector.py": [
            "operator_wait_seconds",
            "operator_wait_seconds: int | None = None",
            "raw_candidates",
            "blocked_candidates",
            "headless: bool = False",
            "未找到可采集的公开图文素材",
            "视频采集暂未启用",
            "采集浏览器已启动",
            "collection_session_dir",
            "VIDEO_MARKERS",
            "BLOCKED_MARKERS",
        ],
        "scripts/open_collection_login_browser.py": [
            "collection_session_dir",
            "VENV_PYTHON",
            "os.execv",
            'default="xiaohongshu"',
            "--print-session-dir",
            "launch_persistent_context",
            "headless=False",
            "operator-owned login",
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
            "default=30",
            "Backend dependencies are not installed",
        ],
        "backend/app/services/model_router.py": [
            "load_prompt",
            "load_platform_style_reference",
            "确认服务尚未配置。",
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
            "DEFAULT_PLANNER_USER",
            "默认运营员",
            "请先登录。",
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
            "browserOrigin",
            "configuredIsLocalOrPrivate",
            "export function isLocalOrPrivateHostname",
            "normalizedHostname(hostname)",
            'normalized === "[::1]"',
            "172\\.(1[6-9]|2\\d|3[0-1])\\.",
            "return `${origin}/api`",
            "return `${browserOrigin}/api`",
        ],
        "frontend/package.json": [
            '"dev:lan": "next dev -H 0.0.0.0"',
        ],
        "scripts/start_local.py": [
            "0.0.0.0",
            "dev:lan",
            "8010",
            "3000",
            "port_is_open",
            "process_ids_on_port",
            "--restart-frontend",
            "--status",
            "LEGACY_TEXT_BOMS",
            "PYTHONIOENCODING",
        ],
        "scripts/setup_local.py": [
            "python scripts/start_local.py",
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
    dashboard_data_file = ROOT / "frontend" / "lib" / "dashboard-data.ts"
    data_text = dashboard_data_file.read_text(encoding="utf-8")
    dashboard_consumers = []
    for folder in [
        ROOT / "frontend" / "app",
        ROOT / "frontend" / "components",
        ROOT / "frontend" / "lib",
    ]:
        for file in sorted(folder.rglob("*")):
            if file == dashboard_data_file or file.suffix not in {".ts", ".tsx"}:
                continue
            dashboard_consumers.append(file.read_text(encoding="utf-8"))
    dashboard_consumer_text = "\n".join(dashboard_consumers)
    css_text = (ROOT / "frontend" / "app" / "globals.css").read_text(encoding="utf-8")
    workspace_text = (
        ROOT / "frontend" / "components" / "workspace-client.tsx"
    ).read_text(encoding="utf-8")
    app_shell_text = (
        ROOT / "frontend" / "components" / "app-shell.tsx"
    ).read_text(encoding="utf-8")
    android_text = (ROOT / "frontend" / "app" / "android" / "page.tsx").read_text(
        encoding="utf-8"
    )
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

    template_block = data_text.split("export const themeTemplates", 1)[1].split(
        "export const tabThemeRecommendations", 1
    )[0]
    template_styles = set(re.findall(r'style: "([^"]+)"', template_block))
    missing_template_styles = sorted(set(style_ids) - template_styles)
    if missing_template_styles:
        raise SystemExit(
            "Missing recommended theme templates: " + ", ".join(missing_template_styles)
        )

    for tab_id in tab_ids:
        if f'{{ id: "{tab_id}"' not in data_text:
            raise SystemExit(f"Missing navigation entry for tab {tab_id}")
        object_key_count = len(re.findall(rf"\n  {re.escape(tab_id)}: \{{", data_text))
        if object_key_count < 2:
            raise SystemExit(f"Missing tab metadata or theme recommendation for tab {tab_id}")

    dashboard_exports = re.findall(r"^export const (\w+)", data_text, flags=re.MULTILINE)
    for export_name in dashboard_exports:
        if re.search(rf"\b{re.escape(export_name)}\b", dashboard_consumer_text) is None:
            raise SystemExit(f"Unused dashboard data export: {export_name}")

    generation_flow_snippets = [
        "/content/generate",
        "/content/rewrite",
        "Humanization rewrite",
        "本次未走改写服务",
        "normalizeRewriteServiceMessage",
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

    pc_login_snippets = [
        "PC_AUTH_STORAGE_KEY",
        "readStoredWorkspaceAccount",
        "saveStoredWorkspaceAccount(account)",
        "clearStoredWorkspaceAccount",
        "authenticateWorkspaceLogin",
        "<PcLoginPage",
        'data-testid="pc-login-form"',
        'data-testid="pc-login-account"',
        'data-testid="pc-login-password"',
        'data-testid="pc-login-submit"',
        "登录 OPC 工作台",
    ]
    for snippet in pc_login_snippets:
        if snippet not in workspace_text:
            raise SystemExit(f"Missing PC login contract snippet: {snippet}")

    app_shell_login_snippets = [
        "accountLabel?: string",
        "onLogout?: () => void",
        "{accountLabel ?",
        "{onLogout ?",
        "退出",
    ]
    for snippet in app_shell_login_snippets:
        if snippet not in app_shell_text:
            raise SystemExit(f"Missing app shell login contract snippet: {snippet}")

    one_click_entry_contracts = [
        (app_shell_text, ["创作项目"], "topbar creation project entry"),
        (
            data_text,
            [
                '{ id: "content", label: "创作项目"',
                'title: "创作项目"',
                "先选择项目，再进入对应的一键生成流程",
            ],
            "navigation creation project entry",
        ),
        (
            workspace_text,
            [
                "登录后即可启动小红书获客任务。",
                "点击这张卡片，进入原来的图文创作、一键生成、预览和复制页面。",
                "可在创作项目中细调",
                "一键生成图文+封面",
                "数据库暂时不可用：安装包或本地运行请重新启动",
            ],
            "workspace creation project entry",
        ),
    ]
    for text, snippets, contract_name in one_click_entry_contracts:
        for snippet in snippets:
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    mobile_focus_contracts = [
        (
            css_text,
            [
                ".opc-mobile-shell :where(a, button):focus-visible",
                "outline: 2px solid rgb(var(--moss) / 0.72)",
                "box-shadow: 0 0 0 4px rgb(var(--moss) / 0.16)",
            ],
            "mobile focus visible style",
        ),
        (
            android_text,
            [
                "opc-mobile-shell",
                "focus-visible:ring-2 focus-visible:ring-moss/[0.35]",
                'data-testid="mobile-status"',
                'aria-live="polite"',
            ],
            "mobile focus visible controls",
        ),
    ]
    for text, snippets, contract_name in mobile_focus_contracts:
        for snippet in snippets:
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    hidden_focus_markers = [
        "focus-visible:outline-none focus-visible:ring-0",
        ".opc-mobile-shell :where(a, button):focus-visible {\n  outline: none;\n  box-shadow: none;",
    ]
    for marker in hidden_focus_markers:
        if marker in android_text or marker in css_text:
            raise SystemExit(f"Hidden mobile focus marker is not allowed: {marker}")

    mobile_shell_contracts = [
        "pt-[calc(12px+env(safe-area-inset-top))]",
        "opc-mobile-shell",
        "MOBILE_CREATE_CARD_BG",
        "create-card-bg.png",
        "style={{ backgroundImage: `url(${MOBILE_CREATE_CARD_BG})` }}",
        "MOBILE_HEADER_ICON_BUTTON_CLASS",
        "className={MOBILE_HEADER_ICON_BUTTON_CLASS}",
    ]
    for snippet in mobile_shell_contracts:
        if snippet not in android_text:
            raise SystemExit(f"Missing mobile shell contract: {snippet}")

    fake_mobile_status_markers = [
        "function StatusBar()",
        "9:41",
        "5G  82%",
    ]
    for marker in fake_mobile_status_markers:
        if marker in android_text:
            raise SystemExit(f"Fake mobile status marker is not allowed: {marker}")

    return (
        len(tab_ids)
        + len(style_ids)
        + len(referenced_styles)
        + len(template_styles)
        + len(generation_flow_snippets)
        + len(terminal_routing_snippets)
        + len(pc_login_snippets)
        + len(app_shell_login_snippets)
        + sum(len(snippets) for _text, snippets, _name in one_click_entry_contracts)
        + sum(len(snippets) for _text, snippets, _name in mobile_focus_contracts)
        + len(mobile_shell_contracts)
    )


def validate_content_production_contract() -> int:
    workspace_text = (
        ROOT / "frontend" / "components" / "workspace-client.tsx"
    ).read_text(encoding="utf-8")
    android_text = (ROOT / "frontend" / "app" / "android" / "page.tsx").read_text(
        encoding="utf-8"
    )
    mobile_draft_storage_text = (
        ROOT / "frontend" / "lib" / "mobile-draft-storage.ts"
    ).read_text(encoding="utf-8")
    mobile_draft_contract_text = f"{android_text}\n{mobile_draft_storage_text}"
    public_preview_text = (
        ROOT / "frontend" / "components" / "public-preview-client.tsx"
    ).read_text(encoding="utf-8")
    trend_collector_text = (
        ROOT / "frontend" / "components" / "trend-collector-panel.tsx"
    ).read_text(encoding="utf-8")
    image_service_text = (
        ROOT / "backend" / "app" / "services" / "image_service.py"
    ).read_text(encoding="utf-8")
    model_router_text = (
        ROOT / "backend" / "app" / "services" / "model_router.py"
    ).read_text(encoding="utf-8")
    workspace_service_text = (
        ROOT / "backend" / "app" / "services" / "workspace_service.py"
    ).read_text(encoding="utf-8")
    dependency_service_text = (
        ROOT / "backend" / "app" / "services" / "dependency_service.py"
    ).read_text(encoding="utf-8")
    status_labels_text = (ROOT / "frontend" / "lib" / "status-labels.ts").read_text(
        encoding="utf-8"
    )
    collection_job_status_text = (
        ROOT / "frontend" / "lib" / "collection-job-status.ts"
    ).read_text(encoding="utf-8")
    dashboard_data_text = (ROOT / "frontend" / "lib" / "dashboard-data.ts").read_text(
        encoding="utf-8"
    )
    app_shell_text = (ROOT / "frontend" / "components" / "app-shell.tsx").read_text(
        encoding="utf-8"
    )
    service_error_text = (
        ROOT / "frontend" / "lib" / "service-error-copy.ts"
    ).read_text(encoding="utf-8")
    api_deps_text = (ROOT / "backend" / "app" / "api" / "deps.py").read_text(
        encoding="utf-8"
    )
    asset_url_text = (ROOT / "frontend" / "lib" / "asset-url.ts").read_text(
        encoding="utf-8"
    )
    clipboard_text = (ROOT / "frontend" / "lib" / "clipboard.ts").read_text(
        encoding="utf-8"
    )
    generated_assets_text = (
        ROOT / "frontend" / "lib" / "generated-assets.ts"
    ).read_text(encoding="utf-8")
    xhs_stickers_text = (ROOT / "frontend" / "lib" / "xhs-stickers.tsx").read_text(
        encoding="utf-8"
    )
    tags_text = (ROOT / "frontend" / "lib" / "tags.ts").read_text(
        encoding="utf-8"
    )
    topic_presets_text = (ROOT / "frontend" / "lib" / "topic-presets.ts").read_text(
        encoding="utf-8"
    )
    draft_prompt_text = (ROOT / "prompts" / "draft_generation.md").read_text(
        encoding="utf-8"
    )
    humanization_prompt_text = (ROOT / "prompts" / "humanization.md").read_text(
        encoding="utf-8"
    )
    image_prompt_text = (ROOT / "prompts" / "image_generation.md").read_text(
        encoding="utf-8"
    )
    xhs_style_reference_text = (
        ROOT / "prompts" / "xiaohongshu_style_reference.md"
    ).read_text(encoding="utf-8")
    xhs_style_doc_text = (ROOT / "docs" / "XIAOHONGSHU_STYLE_REFERENCE.md").read_text(
        encoding="utf-8"
    )

    frontend_contract_snippets = [
        "latestContent={previewContent}",
        "latestImageAsset={previewImageAsset}",
        "const exportContent = lastContent ?? latestContent;",
        "onImageGenerated={onImageGenerated}",
        "onRefreshProviderStatuses={refreshProviderStatuses}",
        "fetchProviderStatuses",
        "hasLiveImageProvider",
        "一键生成图文+封面",
        'data-flow="one-click-generate"',
        "generateCoverForContent",
        "generatedImageAsset={latestImageAsset}",
        "generationBusy={busyAction !== null}",
        "generationBusy: boolean",
        "一键生成还在继续",
        "文案和封面图已",
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
        "本次未走改写服务",
        "generatedContentStatusLabel",
        "generatedImageStatusLabel",
        'data-testid="pc-export-manual-copy-text"',
        'data-testid="pc-preview-modal-manual-copy-text"',
        "复制被浏览器拦截了；下方已展开正文，可直接全选复制。",
        "setManualCopyText(copyPayload)",
        "setManualCopyText(null)",
        "manualCopyRef.current?.select()",
        "targetRef.current?.select()",
        "generationTopicPresets",
        "function applyTopicPreset(preset: GenerationTopicPreset)",
        'data-testid="topic-preset-list"',
        'data-testid={`topic-preset-${preset.key}`}',
        "preset.desktopLabel",
        "preset.desktopHelper",
        "buildTopicCoverStyleNotes(",
        "也可以直接修改为自定义选题",
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

    topic_preset_contract_snippets = [
        "export const generationTopicPresets",
        'key: "ranking"',
        'topic: "全球水博排名必看"',
        'knowledgeQuery: "全球 水博 博士 项目 排名 认证 预算 在职"',
        "desktopLabel",
        "desktopHelper",
        "mobileLabel",
        "mobileHelper",
        "coverDirection",
        "buildTopicCoverStyleNotes",
        "findGenerationTopicPresetByTopic",
    ]
    for snippet in topic_preset_contract_snippets:
        total += 1
        if snippet not in topic_presets_text:
            raise SystemExit(f"Missing shared topic preset contract: {snippet}")

    expected_topic_preset_keys = {"ranking", "route", "mentor", "timeline", "sales"}
    actual_topic_preset_keys = set(re.findall(r'key: "([^"]+)"', topic_presets_text))
    total += len(expected_topic_preset_keys)
    if actual_topic_preset_keys != expected_topic_preset_keys:
        raise SystemExit(
            "Shared topic presets must cover ranking, route, mentor, timeline, and sales topics."
        )

    topic_preset_required_fields = [
        "audience:",
        "coverDirection:",
        "desktopHelper:",
        "desktopLabel:",
        "knowledgeQuery:",
        "mobileHelper:",
        "mobileLabel:",
        "tags:",
        "topic:",
    ]
    for field in topic_preset_required_fields:
        total += 1
        if topic_presets_text.count(field) < len(expected_topic_preset_keys):
            raise SystemExit(f"Every shared topic preset must define {field}")

    settings_access_contracts = [
        (
            workspace_text,
            ["placeholder: \"未开启时留空\"", "? (localFilled ? \"已填写\" : \"未开启\")"],
            "PC access protection settings copy",
        ),
        (
            android_text,
            ["默认服务授权已就绪", "请在电脑端检查服务授权"],
            "mobile hidden service settings copy",
        ),
    ]
    for text, snippets, contract_name in settings_access_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    status_label_contract_snippets = [
        "export function collectionJobStatusLabel",
        "export function generatedContentStatusLabel",
        "export function generatedImageStatusLabel",
        'case "needs_operator_review"',
        "return \"等待确认\"",
    ]
    for snippet in status_label_contract_snippets:
        total += 1
        if snippet not in status_labels_text:
            raise SystemExit(f"Missing status label contract: {snippet}")

    collection_job_status_contracts = [
        (
            collection_job_status_text,
            [
                "export const COLLECTION_JOB_TERMINAL_STATUSES",
                "export type CollectionJobStatusSnapshot",
                "export function formatCollectionJobStatus",
                "export function collectionJobDiagnosticItems",
                'surface: "desktop" | "mobile" = "desktop"',
                "raw_candidates",
                "blocked_candidates",
                "operator_wait_seconds",
                "处理登录/验证码后重试",
                "重试、换关键词或链接导入",
                "请点击“继续上次采集”",
            ],
            "shared collection job status helper",
        ),
        (
            trend_collector_text,
            [
                'from "@/lib/collection-job-status"',
                "formatCollectionJobStatus(job)",
                "collectionJobDiagnosticItems(job)",
                'data-testid="collection-diagnostic-grid"',
                "diagnosticToneClass(item.tone)",
                "最短（秒）",
                "最长（秒）",
                'aria-label="最短采集间隔（秒）"',
                'aria-label="最长采集间隔（秒）"',
                "待打开搜索",
                "先打开搜索生成",
                "固定会话保存",
            ],
            "PC collection job status helper usage",
        ),
        (
            android_text,
            [
                'from "@/lib/collection-job-status"',
                "collectionJobDiagnosticItems(data)",
                "collectionJobDiagnosticItems(job)",
                "fetchLatestCollectionJob()",
                'fetch(`${API_BASE}/trends/jobs?limit=1`',
                'formatCollectionJobStatus(job, "mobile")',
                'formatCollectionJobStatus(data, "mobile")',
                'data-testid="mobile-collection-diagnostic-grid"',
                "mobileDiagnosticToneClass(item.tone)",
            ],
            "mobile collection job status helper usage",
        ),
    ]
    for text, snippets, contract_name in collection_job_status_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    mobile_xhs_copy_contract_snippets = [
        "tryCopyText(draftText)",
        "function publishExportStatus(message: string)",
        "function toggleEditing()",
        "setManualCopyText(null)",
        "const draftText = buildEditableDraftCopy(draft);",
        "setManualCopyText(draftText)",
        "已尝试复制文案；下方也保留了正文",
        "已尝试复制当前草稿。",
        "已尝试复制当前预览文案。",
        "下方会保留文案兜底",
        "已重新尝试复制文案，下方也保留了正文",
        "当前浏览器不能把图文直接带入小红书发布器",
        "请手动打开小红书发布入口",
        "已尝试复制预览链接",
        "isLocalOrPrivateHostname(window.location.hostname)",
        "setManualCopyText(copied ? null : previewUrl)",
        "async function copyDraftTextOnly()",
        'data-testid="draft-preview-copy"',
        'data-testid="draft-manual-copy-text"',
        'const XHS_COPY_TEXT_ONLY_LABEL = "只复制文案"',
        "{XHS_COPY_TEXT_ONLY_LABEL}",
        "浏览器拦截了剪贴板，文案已展开，可长按全选复制。",
        "浏览器拦截了剪贴板，预览链接已展开，可长按全选复制。",
        "已重新尝试复制文案",
        "文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。",
        "复制文案+封面，去小红书",
    ]
    for snippet in mobile_xhs_copy_contract_snippets:
        total += 1
        if snippet not in android_text:
            raise SystemExit(f"Missing mobile Xiaohongshu copy contract: {snippet}")

    mobile_static_reference_contract_snippets = [
        "先补高赞参考，再启动草稿和封面",
        'MobilePanel title="结构模板"',
        "结构模板 · 参考版式",
        "封面模板 · 参考版式",
    ]
    for snippet in mobile_static_reference_contract_snippets:
        total += 1
        if snippet not in android_text:
            raise SystemExit(f"Missing mobile static reference contract: {snippet}")

    mobile_topic_recommendation_contract_snippets = [
        "generationTopicPresets",
        "function applyMobileTopicPreset(preset: GenerationTopicPreset)",
        'data-testid="mobile-topic-preset-list"',
        'data-testid={`mobile-topic-preset-${preset.key}`}',
        "preset.mobileLabel",
        "preset.mobileHelper",
        "buildTopicCoverStyleNotes(",
        "可自定义",
    ]
    for snippet in mobile_topic_recommendation_contract_snippets:
        total += 1
        if snippet not in android_text:
            raise SystemExit(f"Missing mobile topic recommendation contract: {snippet}")

    mobile_draft_delete_contract_snippets = [
        "MOBILE_DELETED_DRAFT_IDS_STORAGE_KEY",
        "function rememberDeletedDraftId(contentId: number)",
        "function filterDeletedMobileDraftHistory(items: MobileDraftHistoryItem[])",
        "MOBILE_COVER_HYDRATION_RETRY_LIMIT",
        "MOBILE_COVER_HYDRATION_RETRY_MS",
        "async function fetchLatestCover(contentId: number)",
        "function scheduleMissingCoverRetry(items: MobileDraftHistoryItem[], attempt: number)",
        "async function hydrateMissingHistoryCovers(items: MobileDraftHistoryItem[], attempt = 0)",
        "hydrateMissingHistoryCovers(retryItems, attempt + 1)",
        "const missingCoverIds = items",
        "cover: item.cover ?? coverByContentId.get(item.content.id) ?? null",
        "void hydrateMissingHistoryCovers(normalized)",
        "function buildLocalDraftHistoryCoverUrl(content: GeneratedContent)",
        "buildLocalDraftHistoryCoverUrl(item.content)",
        'alt={hasGeneratedCover ? "草稿封面" : "本地封面预览"}',
        "本地预览 · 等待真实封面记录",
        "function beginDraftSelection(item: MobileDraftHistoryItem)",
        "function toggleDraftSelection(item: MobileDraftHistoryItem)",
        "async function deleteSelectedDraftHistoryItems(items: MobileDraftHistoryItem[])",
        "await fetch(`${API_BASE}/content/${item.content.id}`",
        'method: "DELETE"',
        "rememberDeletedDraftId(item.content.id)",
        "已进入草稿多选模式。",
        "已删除 ${deletedIds.length} 篇草稿，刷新后也不会再出现。",
        'data-testid="mobile-draft-selection-toolbar"',
        'data-testid="mobile-draft-selection-pin"',
        'data-testid="mobile-draft-selection-delete"',
        "selectedCount === 1 && selectedItem !== null",
    ]
    for snippet in mobile_draft_delete_contract_snippets:
        total += 1
        if snippet not in mobile_draft_contract_text:
            raise SystemExit(f"Missing mobile draft delete contract: {snippet}")

    mobile_xhs_export_start = android_text.index("async function handleOpenXiaohongshu")
    mobile_xhs_export_end = android_text.index(
        "async function copyPreviewLink",
        mobile_xhs_export_start,
    )
    mobile_xhs_export_text = android_text[
        mobile_xhs_export_start:mobile_xhs_export_end
    ]
    mobile_xhs_export_contract_snippets = [
        "const coverFile = await buildXhsCoverFile(coverImageUrl, draft)",
        "const textCopied = await tryCopyText(draftText)",
        "const nativeBridge = getOmpcAndroidBridge()",
        "shareToNativeXiaohongshu(draft.title, draftText, coverFile)",
        "navigator.share(shareData)",
        "downloadFile(coverFile)",
        "系统分享没有打开，已切换到下载封面和手动发布兜底。",
    ]
    for snippet in mobile_xhs_export_contract_snippets:
        total += 1
        if snippet not in mobile_xhs_export_text:
            raise SystemExit(f"Missing mobile Xiaohongshu export contract: {snippet}")

    forbidden_mobile_xhs_export_snippets = [
        "openXiaohongshuFromBrowser()",
        "xhsdiscover://home/explore",
        "正在尝试打开小红书 App",
        "下载封面并唤起小红书",
    ]
    for snippet in forbidden_mobile_xhs_export_snippets:
        total += 1
        if snippet in mobile_xhs_export_text:
            raise SystemExit(
                f"Mobile Xiaohongshu export must not use misleading app-home fallback: {snippet}"
            )

    total += 1
    if mobile_xhs_export_text.index("tryCopyText(draftText)") > mobile_xhs_export_text.index(
        "buildXhsCoverFile(coverImageUrl, draft)"
    ):
        raise SystemExit(
            "Mobile Xiaohongshu export must try copying text before async cover preparation."
        )

    clipboard_contract_snippets = [
        "export async function copyText",
        "export async function tryCopyText",
        "navigator.clipboard?.writeText",
        "previouslyFocusedElement",
        'textarea.setAttribute("aria-hidden", "true")',
        'textarea.style.opacity = "0.01"',
        'textarea.style.width = "1px"',
        'textarea.style.height = "1px"',
        "textarea.style.fontSize = \"16px\"",
        "textarea.focus({ preventScroll: true })",
        "previouslyFocusedElement?.focus({ preventScroll: true })",
        "textarea.setSelectionRange(0, textarea.value.length)",
        'document.execCommand("copy")',
    ]
    for snippet in clipboard_contract_snippets:
        total += 1
        if snippet not in clipboard_text:
            raise SystemExit(f"Missing clipboard helper contract: {snippet}")

    asset_url_contract_snippets = [
        "export function resolveAssetUrl",
        "apiBase = getApiBase()",
        "normalizedUrl.startsWith(\"//\")",
        "new URL(apiBase)",
    ]
    for snippet in asset_url_contract_snippets:
        total += 1
        if snippet not in asset_url_text:
            raise SystemExit(f"Missing asset URL helper contract: {snippet}")

    xhs_sticker_contract_snippets = [
        "export function renderXhsExpressionText",
        '["[笑哭R]", { face: "😂", name: "笑哭" }]',
        '["[哭惹R]", { face: "🥺", name: "哭惹" }]',
        "复制时仍保留原字符码",
    ]
    for snippet in xhs_sticker_contract_snippets:
        total += 1
        if snippet not in xhs_stickers_text:
            raise SystemExit(f"Missing Xiaohongshu sticker helper contract: {snippet}")

    tag_contract_snippets = [
        "export function normalizeTags",
        "export function formatTags",
        "export function formatTagLine",
        "tag.trim().replace(/^#+/, \"\")",
    ]
    for snippet in tag_contract_snippets:
        total += 1
        if snippet not in tags_text:
            raise SystemExit(f"Missing tag format helper contract: {snippet}")

    generated_asset_contract_snippets = [
        "export type GeneratedContent",
        "export type GeneratedImageAsset",
        "export function isGeneratedContent",
        "export function isGeneratedImageAsset",
        "typeof image.image_url === \"string\"",
    ]
    for snippet in generated_asset_contract_snippets:
        total += 1
        if snippet not in generated_assets_text:
            raise SystemExit(f"Missing generated asset helper contract: {snippet}")

    particle_style_contracts = [
        (
            workspace_text,
            [
                'type ExpressionOptionKey = "emoji" | "punctuation" | "particles" | "meme" | "softCta";',
                "particles: true",
                'key: "particles"',
                'label: "语气词"',
                "哦、哟、呀、啊、嘛、呢、啦、哈",
            ],
            "PC writing particle style",
        ),
        (
            android_text,
            ["哦、哟、呀、啊、嘛、呢、啦、哈", "不要每句都堆"],
            "Android writing particle style",
        ),
        (
            draft_prompt_text,
            ["Use conversational particles frequently but naturally", "Do not stack particles"],
            "draft prompt particle style",
        ),
        (
            humanization_prompt_text,
            ["preserve more soft particles", "real creator or senior schoolmate"],
            "humanization prompt particle style",
        ),
    ]
    for text, snippets, contract_name in particle_style_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    route_cover_contracts = [
        (
            workspace_text,
            ["路线/榜单矩阵", "水博榜", "不能编造"],
            "PC route-matrix cover guidance",
        ),
        (
            workspace_text,
            ["水博路线", "学校/价格/认证需复核"],
            "PC cover reference preview",
        ),
        (
            android_text,
            ["路线矩阵", "榜单矩阵", "已核实知识库"],
            "mobile route-matrix cover guidance",
        ),
        (
            dashboard_data_text,
            ["路线榜单矩阵", "决策地图", "风格轮换", "先选封面路线"],
            "dashboard cover reference cards",
        ),
        (
            image_service_text,
            ['"id": "route-matrix-board"', '"name": "路线榜单矩阵"'],
            "image visual direction pool",
        ),
        (
            image_prompt_text,
            ["路线/榜单型封面", "route matrix", "水博榜"],
            "image prompt route-matrix guidance",
        ),
        (
            xhs_style_reference_text,
            ["Operator-viewed case: `水博榜`", "路线/榜单型封面", "结构标识"],
            "Xiaohongshu prompt style reference",
        ),
        (
            xhs_style_doc_text,
            ["2026-06-13: `水博榜` route-list note", "route matrix", "学校/项目名称"],
            "Xiaohongshu docs style reference",
        ),
    ]
    for text, snippets, contract_name in route_cover_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    stale_gate_snippets = [
        "Only human-approved content can be used for image generation.",
        "Only draft, rewritten, review-pending, or approved content can be used for image generation.",
        "Only human-approved content can be recorded as published.",
        "Content was not found.",
        "Image was not found.",
        "Unknown image template.",
        "Only human-approved content can be exported.",
        "Only draft provider checks are available.",
        "Published content cannot be reviewed again.",
        "Phone number is already registered.",
        "Invalid phone number or password.",
        "Invalid account or password.",
        "Invalid or expired access token.",
        "Invalid access token claims.",
        "Missing bearer token.",
        "Invalid access token subject.",
        "User no longer exists.",
        "Database is not reachable.",
        "For desktop or test mode, rerun the local startup helper",
        "Background collection failed. Check local browser setup and session state.",
        "Trend collection job was not found.",
        "Trend collection job is already running.",
        "Trend collection job is already queued for automatic start.",
        "Completed trend collection jobs cannot be restarted.",
        "min_delay_seconds must be lower than max_delay_seconds.",
        "No collected trend assets matched the digest request.",
        "Trend digest:",
        "This knowledge entry summarizes collected public trend assets for drafting reference.",
        "It is not a publishing approval",
        "Source themes",
        "Collected examples",
        "Video transcript:",
        "Drafting guardrails",
        "Trend sources must be reviewed before creating a knowledge digest.",
        "Prompt template is missing:",
        "response did not include message content.",
        "response content was empty.",
        "response was not a JSON object.",
        "response did not include image data.",
        "response image data was invalid.",
        "response image payload was invalid.",
        "response did not include a supported image field.",
        "async function copyText(text: string)",
        "async function tryCopyText(text: string)",
        "function resolveAssetUrl(imageUrl: string)",
        "const xhsStickerPreviewByCode = new Map<string, { face: string; name: string }>",
        "function xhsStickerFallback(code: string)",
        "function formatTags(tags: string[] | null)",
        "function formatTagLine(tags: string[] | null)",
        "type GeneratedContent = {",
        "type GeneratedImageAsset = {",
        "function isGeneratedContent(value: unknown)",
        "function isGeneratedImageAsset(value: unknown)",
        "canCopy && imageProviderReady && !imageBusy",
        "封面仍是版式预览，真实图片生成后会在这里替换。\" :",
        "模拟小红书图文卡片",
        "legacyDemoMarker",
        "假图",
        "假封面图",
        "本次未走 DeepSeek",
        "DeepSeek 改写未完成",
        "image2 Key",
        "AIGC 撰稿",
        "Prompt 模板",
        "Prompt 模板库",
        "Prompt 独立存放",
        "prompt 结构参考",
        "封面 brief",
        "从 brief 到复核",
        "clean-room",
        "Cookie 保存",
        "默认关闭 Cookie",
        "登录门槛",
        "自动化模式",
        "Skill/MCP",
        "相关 Skill",
        "API/MCP",
        "托管 MCP",
        "MCP 形式",
        "MCP Server",
        "Cookie 归一化",
        "skills CLI",
        "Agent Skills",
        "候选 Skill",
        "第三方 API Key",
        "API Key",
        "RAG、长期阅读",
        "Codex Skill",
        "payload 校验",
        "Claude Code",
        "OpenCode",
        "Cursor 等环境",
        'title: "XiaohongshuSkills"',
        'title: "Guizang Social Card Skill"',
        'title: "xhs-cover-skill"',
        'title: "xiaohongshu-ops-skill"',
        'title: "XHS-Downloader"',
        'title: "xiaohongshu-text-image"',
        'title: "xhs-cover-mcp"',
        'title: "xhs-skill"',
        'title: "139 Xiaohongshu Skills"',
        "GitHub 上适合",
        "打开 GitHub",
        "当前版本免登录",
        "当前版本无需填写",
        "当前版本不要求登录验证",
        "登录验证已配置",
        "无需登录验证",
        "当前工作台无需登录验证",
        "当前工作台不要求登录验证",
        "打开设置查看登录验证",
        "正式发布前仍保留权限校验",
        "登录态",
        "发布门禁",
        "门禁校验",
        "门禁设计",
        "风控",
        "Markdown、纯文本或 JSON",
        "网页选择器",
        "Playwright 渲染 PNG",
        "AGPL 不直接复制",
        "GPL 项目不复制实现",
        "接口设计参考",
        "MIT 文档 / 托管服务",
        "输出 SVG/PNG/JPG",
        "PNG/JPG 依赖",
        "macOS Swift",
        "JSON 规格",
        "SVG 渲染",
        "外部命令启动",
        "Windows 打包方式",
        "许可：{candidate.license}",
        "软 CTA",
        "当前门控状态",
        "可交付内容",
        "确认后交付",
        "确认门控",
        'state: "门控"',
        'status: "门控"',
        "0 条可交付",
        "发布交付",
        "推广交付池",
        "结构化交付格式",
        "交付动作",
        "平台交付历史",
        "安全门",
        "发布安全门",
        "侧边安全门说明",
        "已批准内容",
        "导出包",
        "需有已批准内容后启用",
        "单独确认页已暂停",
        "安全门状态",
        "安全门仍保持开启",
        'title="安全门"',
        "安全门已确认",
        'status: "暂停"',
        "rewrite 服务 is not configured yet",
        "Bearer token",
        "服务端权限",
        "测试门禁",
        "模型名",
        "可用模型/中转站",
        "中转站",
        "接口地址",
        "codex_test 测试 Provider",
        "OpenAI-compatible image provider is configured",
        "OpenAI-compatible draft provider is configured",
        "Using codex_test workflow draft provider",
        "DeepSeek official API provider",
        "provider is not configured yet",
        "model provider is not configured yet",
        "直连服务",
        "流程联调",
        "OPC TEST ASSET",
        "登录令牌",
        "API Key 与令牌",
        "免令牌",
        "后端运行时",
        "当前后端环境",
        "后端已绑定",
        "未回显",
        "默认服务 Key 已绑定",
        "默认 Key 已绑定",
        "重启后端",
        "后端正在运行",
        "后端服务",
        "后端现有配置",
        "直连后端",
        "本机已填",
        "未绑定",
        "本机保存的凭证",
        "当前浏览器本机",
        "手机本机",
        "当前不用填",
        "当前未开启",
        "无需填写",
        "当前工作台未开启访问保护",
        "正在刷新当前保存状态",
        "服务配置已应用到当前工作台",
        "应用后由当前工作台调用服务",
        "撰稿 API Key",
        "图片 API Key",
        "改写 API Key",
        "图片服务 Key",
        "更换 Key",
        "封面生成走服务端",
        "真实配置检测",
        "当前保存配置",
        "当前免填",
        "此设备已填",
        "未保存",
        "DATABASE_URL",
        "页面不会显示完整密钥",
        "当前手机浏览器的此设备",
        "手机可配置",
        "服务密钥",
        "服务服务授权",
        "完整密钥",
        "新密钥",
        "密钥需检查",
        "当前设备已填写",
        "清空此设备保存",
        "此设备可配置",
        "人味化",
        "草稿 #",
        "文案 #",
        "封面图 #",
        "任务 #",
        "采集任务 #",
        "后台采集器",
        "后台不会自动消费",
        "状态：${data.status}",
        'title="当前状态"',
        ">当前状态</div>",
        "当前知识库还没有真实图文样本",
        "当前状态：",
        "本次采集状态：",
        "当前状态：${job.status}",
        "图片状态：",
        'href: "/?tab=',
        "{content.status}",
        "return status;",
        "非已批准内容",
        "策划师",
        "测试模式",
        "测试阶段",
        "测试免填",
        "测试模式免登录凭证",
        "登录凭证",
        "登录门控",
        "凭证状态",
        "清空此设备凭证",
        "主题或凭证",
        "主题、凭证",
        "当前浏览器的此设备",
        "凭证会保存在",
        "开发/测试换电脑",
        "正在检测本机环境",
        "查看修复命令",
        "优先命令",
        "修复命令",
        "查看本机环境",
        "服务已连接",
        "本地服务",
        "本机/局域网地址",
        "服务状态读取失败",
        "服务检测暂不可用",
        "重启应用服务",
        "已填写不代表授权通过",
        "copyImageFileToClipboard",
        "文案仍在剪贴板里",
        "当前草稿已复制。",
        "当前预览文案已复制。",
        "预览链接已复制；",
        "预览链接已复制，可以发给别人查看。",
        "浏览器复制失败",
        "复制封面+文案，去小红书",
        "文案和封面图已复制",
        "浏览器可能拦截了剪贴板权限",
        "function formatMobileCollectionJobStatus",
        "const terminalJobStatuses = new Set",
        ': "创建并启动"',
        "请重新点击“创建并启动”",
        "先填写关键词，再创建采集任务",
        "先填关键词，再创建采集任务",
        "正在创建采集任务",
        "任务已创建",
        "自动创建采集任务",
        "已创建采集任务",
        "采集任务创建失败",
        "请重新创建一个任务",
        "启动旧任务",
        "旧采集任务",
        "这条旧任务",
        "重新启动这条任务",
        "当前采集任务",
        "测试图文采集任务",
        "本地 SQLite 测试数据库",
        "测试环境请运行",
        "测试图片服务已就绪",
        "测试撰稿服务已就绪",
        "演示图片服务已就绪",
        "演示撰稿服务已就绪",
        '{busyAction === "job" ? "正在创建"',
        "趋势任务队列",
        "今日 3 个任务",
        "星标 128",
        "收藏 86",
        "分享 32",
        "项待处理",
        'data-testid="draft-card"',
        'testId="draft-cover-image"',
        "进入一键生成页创建文案",
        "草稿请求",
        "待创建",
        "不会创建封面图",
        "会创建文案",
        "不会创建演示图片",
        "不会生成演示图片",
        "演示模式",
        "演示素材",
        "演示封面模板",
        "OPC 演示封面",
        "当前是演示草稿",
        "演示草稿不可",
        "当前运营 lane",
        "压力测试",
        "Search target could not be prepared",
        "Clipboard copy failed",
        'MobilePanel title="高赞参考"',
        "把高赞参考变成素材池",
        "来源待 PC 确认",
        "非生成结果",
        "非采集素材",
        "非采集结果",
        "待人工复核",
    ]
    for snippet in stale_gate_snippets:
        total += 1
        if (
            snippet in workspace_text
            or snippet in android_text
            or snippet in public_preview_text
            or snippet in trend_collector_text
            or snippet in collection_job_status_text
            or snippet in image_service_text
            or snippet in model_router_text
            or snippet in workspace_service_text
            or snippet in dashboard_data_text
            or snippet in app_shell_text
            or snippet in service_error_text
            or snippet in api_deps_text
        ):
            raise SystemExit(f"Stale content production gate still present: {snippet}")

    dependency_stale_snippets = [
        "本地 SQLite 测试数据库",
        "测试环境请运行",
    ]
    for snippet in dependency_stale_snippets:
        total += 1
        if snippet in dependency_service_text:
            raise SystemExit(f"Stale dependency copy still present: {snippet}")

    return total


def _iter_text_hygiene_files() -> list[Path]:
    files: list[Path] = []
    for root in TEXT_HYGIENE_ROOTS:
        if root.is_file():
            candidates = [root]
        else:
            candidates = sorted(root.rglob("*"))
        for file in candidates:
            if not file.is_file() or file.suffix not in TEXT_HYGIENE_EXTENSIONS:
                continue
            if SKIP_DIRS.intersection(file.relative_to(ROOT).parts):
                continue
            files.append(file)
    return files


def validate_text_hygiene() -> int:
    files = _iter_text_hygiene_files()
    failures: list[str] = []
    for file in files:
        text = file.read_text(encoding="utf-8")
        for marker, reason in FORBIDDEN_TEXT_MARKERS.items():
            index = text.find(marker)
            if index == -1:
                continue
            line_number = text.count("\n", 0, index) + 1
            rel_path = file.relative_to(ROOT)
            failures.append(f"{rel_path}:{line_number} contains {reason} {marker!r}")
    if failures:
        raise SystemExit("Text hygiene check failed:\n" + "\n".join(failures))
    return len(files)


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
        "text_hygiene_files_checked": validate_text_hygiene(),
    }
    if not args.keep_cache:
        results["removed_pycache_dirs"] = clean_pycache()

    for key, value in results.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()

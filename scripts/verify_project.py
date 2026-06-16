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
    ROOT / "AGENTS.md",
    ROOT / "PROJECT_MAP.md",
    ROOT / "LOOP_LOG.md",
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
    chr(0xFFFD): "replacement character",
    chr(0x951F): "mojibake marker",
    chr(0x9225): "mojibake marker",
    chr(0x6D93): "mojibake marker",
    chr(0x00C2): "mojibake marker",
    "debugger": "debugger statement",
    "console.log": "console logging",
}


def compile_backend() -> int:
    py_files = [
        file
        for file in sorted((ROOT / "backend").rglob("*.py"))
        if not SKIP_DIRS.intersection(file.relative_to(ROOT).parts)
    ]
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
        ROOT / "AGENTS.md",
        ROOT / "PROJECT_MAP.md",
        ROOT / "LOOP_LOG.md",
        ROOT / "README.md",
        ROOT / ".env.example",
        ROOT / "docker-compose.yml",
        ROOT / "backend" / "app" / "main.py",
        ROOT / "backend" / "alembic" / "versions" / "0008_content_source_context.py",
        ROOT / "frontend" / "app" / "page.tsx",
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
        (
            'revision = "0008_content_source_context"',
            'down_revision = "0007_trend_collection_jobs"',
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
            "has_human_approved_review(db, content.id)",
            "只有人工确认通过的内容可以记录为已发布。",
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
            "_missing_required_web_sources",
            "没有可见 Tavily 来源",
            'topic_intent.key == "source_check"',
            "它不是普通经验帖，而是来源核验帖",
            'topic_intent.key == "list_filter"',
            "榜单/筛选类内容最重要的是维度清楚",
        ],
        "backend/app/services/topic_intent.py": [
            "LIST_FILTER_STRUCTURE_DRAFT_TERMS",
            'key="source_check"',
            'key="list_filter"',
            "来源核验",
            "榜单/筛选",
            '"来源"',
            '"核验"',
            '"官方"',
            '"官方来源清单"',
            '"来源清单"',
            '"核验清单"',
            '"项目页"',
            '"费用页"',
            '"学费表"',
            "价格/校徽/认证字段",
        ],
        "backend/app/services/web_search_service.py": [
            '"校徽"',
            '"价格"',
            '"来源"',
            '"核验"',
            '"官方"',
            '"项目页"',
            '"费用页"',
            '"学费表"',
            "official logo school emblem",
            "tuition fees total cost",
            "official accreditation policy",
            '"include_answer": True',
            "Tavily 授权失败",
            "额度或频率限制",
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
            "def has_human_approved_review",
            "human_approved_review_exists",
            ".where(Content.status.in_(EXPORTABLE_STATUSES), human_approved_review_exists)",
            "ContentReview.review_type == \"human\"",
            "ContentReview.status == \"approved\"",
            "只有人工确认通过的内容可以导出。",
        ],
        "backend/app/services/review_service.py": [
            'HUMAN_REVIEWABLE_STATUSES = {"draft", "rewritten", "review_pending"}',
            "content.status not in HUMAN_REVIEWABLE_STATUSES",
            "当前状态不能记录人工审核",
        ],
        "backend/tests/test_review_service.py": [
            "test_human_review_rejects_non_reviewable_lifecycle_statuses",
            '["approved", "published", "submitted", "rejected", "changes_requested"]',
            "assert content.status == content_status",
        ],
        "backend/app/services/content_service.py": [
            "这个选题需要实时来源",
            "没有可见 Tavily 结果",
            "不能编学校、价格、logo 或排名",
            "Live web search was required but no Tavily sources were available",
            "_prompt_web_search_context",
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
            '"typecheck": "tsc --noEmit --noUnusedLocals --noUnusedParameters --incremental false"',
        ],
        "frontend/scripts/next-with-dist.mjs": [
            'OPC_NEXT_DIST_DIR: ".next-build"',
            "restoreDevBuildFiles",
            "restoreDevTsconfig",
            '".next-build/types/**/*.ts"',
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
    tsconfig_text = (ROOT / "frontend" / "tsconfig.json").read_text(encoding="utf-8")
    total += 1
    if '".next-build/types/**/*.ts"' in tsconfig_text:
        raise SystemExit("Frontend typecheck must not include build-only .next-build generated types.")
    return total


def validate_login_failure_contract() -> int:
    workspace_text = (ROOT / "frontend" / "components" / "workspace-client.tsx").read_text(
        encoding="utf-8"
    )
    android_text = (ROOT / "frontend" / "app" / "android" / "page.tsx").read_text(
        encoding="utf-8"
    )
    e2e_text = (ROOT / "frontend" / "tests" / "e2e" / "opc.smoke.spec.ts").read_text(
        encoding="utf-8"
    )

    total = 0
    login_client_contracts = [
        (
            "PC",
            workspace_text,
            "无法连接登录服务，请确认应用服务正在运行。",
        ),
        (
            "mobile",
            android_text,
            "登录服务暂时不可用，请确认应用服务已启动。",
        ),
    ]
    for label, text, fetch_failure_copy in login_client_contracts:
        required_snippets = [
            'fetch(`${API_BASE}/auth/mobile-login`',
            "response.status === 404 || response.status === 405",
            "response.status >= 500",
            "readApiError(response",
            "登录服务暂时不可用",
            'throw new Error("账号或密码不正确。");',
            "error instanceof TypeError",
            fetch_failure_copy,
        ]
        for snippet in required_snippets:
            if snippet not in text:
                raise SystemExit(f"Missing {label} login failure contract: {snippet}")
            total += 1

        server_failure_index = text.index("response.status >= 500")
        bad_credential_index = text.index('throw new Error("账号或密码不正确。");')
        if server_failure_index > bad_credential_index:
            raise SystemExit(f"{label} login 5xx handling must run before bad-credential fallback")
        total += 1

    e2e_contracts = [
        "async function mockRejectedLogin",
        "async function mockUnavailableLogin",
        "async function mockServerErrorLogin",
        "status: 401",
        'route.abort("failed")',
        "status: 503",
        "PC login shows bad-credential feedback without persisting password",
        "mobile login shows bad-credential feedback without persisting password",
        "PC login shows service-unavailable feedback without persisting password",
        "mobile login shows service-unavailable feedback without persisting password",
        "PC login shows server-error feedback without persisting password",
        "mobile login shows server-error feedback without persisting password",
        'not.toContainText("账号或密码不正确。")',
        "localStorageContains(page, rejectedLogin.password)",
    ]
    for snippet in e2e_contracts:
        if snippet not in e2e_text:
            raise SystemExit(f"Missing login failure E2E contract: {snippet}")
        total += 1

    return total


def _extract_ts_array(name: str, text: str) -> list[str]:
    match = re.search(rf"export const {name}[^=]*=\s*\[(.*?)\];", text, re.S)
    if not match:
        raise SystemExit(f"Could not find frontend array {name}")
    return re.findall(r'"([^"]+)"', match.group(1))


def _extract_ts_const_string_array(name: str, text: str) -> list[str]:
    match = re.search(rf"(?:export\s+)?const {name}[^=]*=\s*\[(.*?)\];", text, re.S)
    if not match:
        raise SystemExit(f"Could not find frontend string array {name}")
    return re.findall(r'"([^"]+)"', match.group(1))


def _extract_topic_preset_objects(text: str) -> list[dict[str, str]]:
    match = re.search(
        r"export const generationTopicPresets[^=]*=\s*\[(.*?)\];",
        text,
        re.S,
    )
    if not match:
        raise SystemExit("Could not find generationTopicPresets")

    block = match.group(1)
    objects: list[dict[str, str]] = []
    for object_match in re.finditer(r"\{\s*(.*?)\n  \}", block, re.S):
        object_text = object_match.group(1)
        preset: dict[str, str] = {}
        for field in [
            "audience",
            "coverDirection",
            "desktopHelper",
            "desktopLabel",
            "key",
            "knowledgeQuery",
            "mobileHelper",
            "mobileLabel",
            "tags",
            "topic",
        ]:
            field_match = re.search(rf'{field}:\s*"([^"]*)"', object_text, re.S)
            if field_match:
                preset[field] = field_match.group(1)
        objects.append(preset)
    if not objects:
        raise SystemExit("Could not parse generation topic presets")
    return objects


def _require_unique(values: list[str], label: str) -> int:
    duplicates = sorted({value for value in values if values.count(value) > 1})
    if duplicates:
        raise SystemExit(f"Duplicate {label}: " + ", ".join(duplicates))
    return len(values)


def _contains_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term.lower() in normalized for term in terms)


def _split_topic_tags(tags: str) -> list[str]:
    return [tag.strip() for tag in re.split(r"[,，、;；]+", tags) if tag.strip()]


def validate_topic_presets_contract() -> int:
    topic_presets_text = (ROOT / "frontend" / "lib" / "topic-presets.ts").read_text(
        encoding="utf-8"
    )
    presets = _extract_topic_preset_objects(topic_presets_text)
    required_fields = {
        "audience",
        "coverDirection",
        "desktopHelper",
        "desktopLabel",
        "key",
        "knowledgeQuery",
        "mobileHelper",
        "mobileLabel",
        "tags",
        "topic",
    }
    label_contract = {
        "榜单型": ("ranking-", ("榜", "排名", "筛", "清单", "预算", "风险", "认证", "项目")),
        "路线型": ("route-", ("路线", "选择", "取舍", "路径", "国内", "海外")),
        "导师型": ("mentor-", ("导师", "套磁", "研究方向", "论文")),
        "时间型": ("timeline-", ("时间", "节点", "材料", "DDL", "月份", "优先级")),
        "来源型": ("source-", ("来源", "核验", "官网", "校徽", "价格", "费用", "学费", "认证", "logo")),
        "转化型": ("sales-", ("咨询", "转化", "私域", "线索", "话术", "价值")),
    }
    topic_preset_mojibake_markers = (
        "鎯",
        "鐭",
        "鍗",
        "璺",
        "瀵",
        "鏃",
        "杞",
        "绾",
        "妫",
        "缂",
        "閫",
        "灏",
        "涓",
        "鍦",
        "鍚",
        "鏉",
        "浜",
        "鐢",
        "鑱",
        "绋",
        "褰",
        "鏍",
        "搴",
        "鍜",
    )

    total = 0
    if _split_topic_tags("水博，海外博士、在职博士;博士项目") != [
        "水博",
        "海外博士",
        "在职博士",
        "博士项目",
    ]:
        raise SystemExit("Topic preset tag splitter must support Chinese separators.")
    total += 1

    if len(presets) < 20:
        raise SystemExit("Generation topic preset pool is too small")
    total += 1

    source_evidence_keywords = _extract_ts_const_string_array(
        "SOURCE_EVIDENCE_REQUIRED_KEYWORDS",
        topic_presets_text,
    )
    required_source_keywords = [
        "官网",
        "官方",
        "来源",
        "费用",
        "学费",
        "价格",
        "排名",
        "榜单",
        "学校",
        "项目清单",
        "认证",
        "logo",
        "official",
        "tuition",
        "fees",
        "ranking",
        "program list",
        "accreditation",
        "市场数据",
        "市场行情",
        "行情",
        "market data",
        "market rates",
        "pricing benchmarks",
        "汇率",
        "exchange rate",
        "currency conversion",
    ]
    missing_source_keywords = sorted(
        keyword for keyword in required_source_keywords if keyword not in source_evidence_keywords
    )
    if missing_source_keywords:
        raise SystemExit(
            "Source-evidence custom topic classifier is missing keywords: "
            + ", ".join(missing_source_keywords)
        )
    total += len(required_source_keywords)

    for snippet in [
        "export function generationTopicRequiresSourceEvidence",
        'preset?.key.startsWith("source-")',
        "SOURCE_EVIDENCE_REQUIRED_KEYWORDS.some",
        "searchText.includes",
    ]:
        if snippet not in topic_presets_text:
            raise SystemExit(f"Missing source-evidence classifier contract: {snippet}")
        total += 1

    keyword_contract_cases = [
        ("global water PhD ranking list", True),
        ("全球水博排名清单", True),
        ("water resources PhD university program list", True),
        ("official tuition fees and logo verification", True),
        ("overseas doctoral consulting market data benchmarks", True),
        ("博士项目市场行情和最新价格", True),
        ("overseas doctoral exchange rate and currency conversion check", True),
        ("博士项目汇率和币种换算怎么核验", True),
        ("marketing content conversion hooks", False),
        ("how to choose domestic or overseas PhD route", False),
    ]
    for sample, expected_match in keyword_contract_cases:
        actual_match = _contains_any(sample, tuple(source_evidence_keywords))
        if actual_match != expected_match:
            raise SystemExit(
                f"Source-evidence keyword classifier sample {sample!r} expected "
                f"{expected_match}, got {actual_match}"
            )
        total += 1

    total += _require_unique([preset.get("key", "") for preset in presets], "topic preset keys")
    total += _require_unique([preset.get("topic", "") for preset in presets], "topic preset topics")

    labels = {preset.get("desktopLabel", "") for preset in presets}
    missing_labels = sorted(set(label_contract) - labels)
    if missing_labels:
        raise SystemExit("Missing topic preset categories: " + ", ".join(missing_labels))
    total += len(label_contract)

    minimum_label_counts = {
        "榜单型": 4,
        "路线型": 4,
        "导师型": 4,
        "时间型": 4,
        "来源型": 2,
        "转化型": 4,
    }
    for label, minimum in minimum_label_counts.items():
        actual_count = sum(1 for preset in presets if preset.get("desktopLabel") == label)
        if actual_count < minimum:
            raise SystemExit(
                f"Topic preset category {label} must have at least {minimum} items, got {actual_count}"
            )
        total += 1

    fact_sensitive_label_requirements = {
        "榜单型": (
            ("核实", "核验", "认证", "风险", "未核实", "不承诺"),
        ),
        "来源型": (
            ("官网", "官方"),
            ("核验", "待复核", "待确认", "未核实", "不写", "不展示"),
        ),
    }
    category_intent_contract = {
        "榜单型": {
            "required": ("榜", "排名", "清单", "筛", "预算", "风险", "认证", "项目"),
            "forbidden": ("导师匹配", "套磁邮件", "时间线", "私域SOP", "咨询转化"),
        },
        "路线型": {
            "required": ("路线", "选择", "取舍", "路径", "国内", "海外", "先选"),
            "forbidden": ("榜单", "导师匹配", "时间线", "私域SOP", "咨询转化"),
        },
        "导师型": {
            "required": ("导师", "套磁", "研究方向", "论文", "适配"),
            "forbidden": ("避坑榜", "预算榜单", "时间线", "私域SOP", "咨询转化"),
        },
        "时间型": {
            "required": ("时间", "节点", "材料", "截止", "优先级", "一年", "什么时候"),
            "forbidden": ("榜单", "排名", "导师匹配", "私域SOP", "咨询转化"),
        },
        "来源型": {
            "required": ("来源", "核验", "官网", "校徽", "价格", "费用", "学费", "认证", "logo"),
            "forbidden": ("导师匹配", "套磁邮件", "时间线", "私域SOP", "咨询转化"),
        },
        "转化型": {
            "required": ("咨询", "转化", "私域", "线索", "话术", "价值", "异议"),
            "forbidden": ("避坑榜", "预算榜单", "导师匹配", "时间线"),
        },
    }
    intent_fields = (
        "topic",
        "audience",
        "knowledgeQuery",
        "tags",
        "coverDirection",
        "desktopHelper",
        "mobileHelper",
    )
    drift_guard_fields = ("topic", "desktopHelper", "mobileHelper", "tags")

    for preset in presets:
        missing = sorted(field for field in required_fields if not preset.get(field, "").strip())
        if missing:
            raise SystemExit(
                f"Topic preset {preset.get('key', '<unknown>')} missing fields: "
                + ", ".join(missing)
            )
        for field in required_fields:
            value = preset[field]
            if any("\ue000" <= char <= "\uf8ff" for char in value):
                raise SystemExit(
                    f"Topic preset {preset['key']} field {field} contains private-use text"
                )
            marker = next(
                (marker for marker in topic_preset_mojibake_markers if marker in value),
                None,
            )
            if marker:
                raise SystemExit(
                    f"Topic preset {preset['key']} field {field} contains mojibake marker {marker}"
                )
        label = preset["desktopLabel"]
        if label not in label_contract:
            raise SystemExit(f"Unknown topic preset label: {label}")
        expected_prefix, semantic_terms = label_contract[label]
        if not preset["key"].startswith(expected_prefix):
            raise SystemExit(
                f"Topic preset {preset['key']} must use prefix {expected_prefix} for {label}"
            )
        semantic_text = " ".join(
            [
                preset["topic"],
                preset["mobileHelper"],
                preset["desktopHelper"],
                preset["coverDirection"],
                preset["knowledgeQuery"],
                preset["tags"],
            ]
        )
        if not _contains_any(semantic_text, semantic_terms):
            raise SystemExit(f"Topic preset {preset['key']} lacks semantic terms for {label}")
        intent_contract = category_intent_contract[label]
        intent_text = " ".join(preset[field] for field in intent_fields)
        if not _contains_any(intent_text, intent_contract["required"]):
            raise SystemExit(
                f"Topic preset {preset['key']} lacks intent anchors for {label}"
            )
        drift_guard_text = " ".join(preset[field] for field in drift_guard_fields)
        drift_term = next(
            (term for term in intent_contract["forbidden"] if term in drift_guard_text),
            None,
        )
        if drift_term:
            raise SystemExit(
                f"Topic preset {preset['key']} contains cross-category drift term {drift_term}"
            )
        tag_count = len(_split_topic_tags(preset["tags"]))
        if tag_count < 3:
            raise SystemExit(f"Topic preset {preset['key']} should have at least 3 tags")
        fact_requirements = fact_sensitive_label_requirements.get(label, ())
        fact_text = " ".join([preset["coverDirection"], preset["desktopHelper"]])
        for terms in fact_requirements:
            if not _contains_any(fact_text, terms):
                raise SystemExit(
                    f"Topic preset {preset['key']} lacks fact-sensitive boundary terms for {label}"
                )
            total += 1
        total += len(required_fields) + 5

    return total


def validate_topic_intent_runtime_contract() -> int:
    import sys

    backend_path = str(ROOT / "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)

    from app.services.topic_intent import (  # noqa: PLC0415
        first_matching_topic_intent,
        is_water_ranking_topic,
    )

    cases = [
        ("全球水博排名必看", ["水博", "海外博士"], "list_filter", True),
        ("硕升博申请路线怎么选", ["硕升博", "国内博士"], "route", False),
        ("申请路线清单怎么看", ["路线选择", "国内博士", "海外博士"], "route", False),
        ("没有论文申博清单怎么看", ["背景补强", "项目经历"], "background", False),
        ("导师匹配前要做的方向自查", ["博士申请", "导师"], "mentor", False),
        ("导师清单怎么筛", ["导师匹配", "研究方向"], "mentor", False),
        ("导师匹配清单怎么看", ["博士申请", "论文"], "mentor", False),
        ("在职博士申请时间线怎么排", ["在职博士", "材料"], "timeline", False),
        ("申博材料清单怎么看", ["申请时间线", "材料准备"], "timeline", False),
        ("博士申请材料清单怎么看", ["时间安排", "材料准备"], "timeline", False),
        ("申请节点清单怎么看", ["时间安排", "截止时间"], "timeline", False),
        ("DDL清单怎么看", ["申请时间线", "材料准备"], "timeline", False),
        ("时间节点清单怎么看", ["申请时间线", "优先级"], "timeline", False),
        ("博士申请DDL清单", ["时间安排", "截止时间"], "timeline", False),
        ("适合上班族的博士项目怎么咨询", ["博士项目", "转化"], "sales", False),
        ("转化话术清单怎么看", ["咨询转化", "话术"], "sales", False),
        ("水博项目校徽和价格怎么核验", ["官网核验", "校徽"], "source_check", False),
        ("海外博士官方来源和费用怎么查", ["官方来源", "官网核验", "学费费用"], "source_check", False),
        ("官方来源清单怎么看", ["官网核验", "认证政策"], "source_check", False),
        ("别人问博士含金量怎么回答", ["咨询转化", "价值"], "sales", False),
    ]

    total = 0
    for topic, tags, expected_key, expected_ranking in cases:
        intent = first_matching_topic_intent(topic, tags)
        actual_key = intent.key if intent else None
        if actual_key != expected_key:
            raise SystemExit(
                f"Topic intent {topic!r} expected {expected_key}, got {actual_key}"
            )
        total += 1

        actual_ranking = is_water_ranking_topic(topic, tags)
        if actual_ranking != expected_ranking:
            raise SystemExit(
                f"Topic ranking flag {topic!r} expected {expected_ranking}, "
                f"got {actual_ranking}"
            )
        total += 1

    return total


def validate_frontend_design_contract() -> int:
    total = 0
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
    e2e_text = (
        ROOT / "frontend" / "tests" / "e2e" / "opc.smoke.spec.ts"
    ).read_text(encoding="utf-8")
    middleware_text = (ROOT / "frontend" / "middleware.ts").read_text(encoding="utf-8")

    frontend_new_window_links: list[tuple[Path, int, str]] = []
    for folder in [
        ROOT / "frontend" / "app",
        ROOT / "frontend" / "components",
        ROOT / "frontend" / "lib",
    ]:
        for file in sorted(folder.rglob("*")):
            if file.suffix not in {".ts", ".tsx"}:
                continue
            file_text = file.read_text(encoding="utf-8")
            for match in re.finditer(
                r"<a\b(?:(?!</a>).)*target=\"_blank\"(?:(?!</a>).)*</a>",
                file_text,
                re.S,
            ):
                line_number = file_text.count("\n", 0, match.start()) + 1
                frontend_new_window_links.append((file, line_number, match.group(0)))
    if not frontend_new_window_links:
        raise SystemExit("Missing frontend new-window link contract")
    for file, line_number, link in frontend_new_window_links:
        total += 1
        if 'rel="noopener noreferrer"' not in link:
            raise SystemExit(
                f"{file.relative_to(ROOT)}:{line_number} new-window links must use "
                'rel="noopener noreferrer"'
            )

    workspace_external_link_contracts = [
        "aria-label={`打开${platformLabel}封面原图`}",
        "aria-label={`查看外部能力来源：${candidate.title}`}",
    ]
    for snippet in workspace_external_link_contracts:
        total += 1
        if snippet not in workspace_text:
            raise SystemExit(f"Missing workspace external link contract: {snippet}")

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

    cyberpunk_theme_contract_snippets = [
        ".theme-cyberpunk.workspace-shell",
        "linear-gradient(120deg, transparent 0 48%, rgb(var(--moss) / 0.07) 49% 51%, transparent 52%)",
        ".theme-cyberpunk .glass-selected",
        "0 0 42px rgb(var(--steel) / 0.12)",
        ".theme-cyberpunk :where(input, select, textarea):focus-visible",
        'data-testid="cyberpunk-theme-preview"',
        ".cyberpunk-theme-preview::after",
        "workspace-theme-card",
        '.theme-cyberpunk .workspace-theme-card[aria-current="true"]',
        "workspace-dashboard-hero",
        ".theme-cyberpunk .workspace-task-row::before",
        ".theme-cyberpunk .workspace-metric-tile::after",
        "pc-shell-grid",
        ".theme-cyberpunk :is(.pc-shell-status-card, .pc-shell-safety-card, .pc-shell-theme-card, .pc-shell-local-card)::before",
        ".theme-cyberpunk :is(.pc-shell-status-card, .pc-shell-safety-card, .pc-shell-theme-card, .pc-shell-local-card)::after",
        ".theme-cyberpunk .pc-shell-nav-link[aria-current=\"page\"]",
        "workspace-panel-header",
        ".theme-cyberpunk .workspace-panel::before",
        "workspace-trend-console",
        "workspace-evidence-toggle",
        ".theme-cyberpunk .workspace-evidence-toggle[aria-expanded=\"true\"]",
        ".theme-cyberpunk .workspace-evidence-result-card",
        ".theme-cyberpunk a.workspace-evidence-result-card:focus-visible",
        ".theme-cyberpunk .workspace-preview-copy-button",
        ".theme-cyberpunk .workspace-preview-copy-button::after",
        ".theme-cyberpunk .workspace-preview-copy-button:focus-visible",
        "outline-offset: 2px",
        "深色石墨、HUD 网格和霓虹边缘",
        'const showingCurrentTheme = interfaceStyle === "cyberpunk"',
        'const displayThemeStyle = showingCurrentTheme ? interfaceStyle : recommendedTheme.style',
        'const displayThemeReason = showingCurrentTheme',
        '{showingCurrentTheme ? "当前主题" : "当前页推荐"}',
        'theme-${displayThemeStyle}',
        "usingDisplayTheme",
    ]
    for snippet in cyberpunk_theme_contract_snippets:
        total += 1
        if snippet not in f"{css_text}\n{data_text}\n{workspace_text}\n{app_shell_text}":
            raise SystemExit(f"Missing cyberpunk theme contract: {snippet}")

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

    login_shell_screenshot_contracts = [
        "function expectPngScreenshotEvidence",
        "function attachScreenshotEvidence",
        'test("PC and mobile login shells attach screenshot evidence"',
        'testInfo.attach(name, {',
        'contentType: "image/png"',
        'expect(screenshot.toString("ascii", 1, 4)).toBe("PNG")',
        "expect(screenshot.readUInt32BE(16)).toBeGreaterThanOrEqual(minWidth)",
        "expect(screenshot.readUInt32BE(20)).toBeGreaterThanOrEqual(minHeight)",
        'attachScreenshotEvidence(page, testInfo, "pc-login-shell.png"',
        'attachScreenshotEvidence(page, testInfo, "mobile-login-shell.png"',
        'page.getByTestId("pc-login-form").boundingBox()',
        'page.getByTestId("mobile-login-form").boundingBox()',
    ]
    for snippet in login_shell_screenshot_contracts:
        if snippet not in e2e_text:
            raise SystemExit(f"Missing login shell screenshot contract: {snippet}")

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

    pc_topbar_overflow_contract_snippets = [
        "xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)_auto]",
        "flex min-w-0 flex-col gap-3",
        "flex min-w-0 flex-wrap items-center justify-end",
        "hover:text-ink 2xl:flex",
        "max-w-[140px]",
    ]
    for snippet in pc_topbar_overflow_contract_snippets:
        if snippet not in app_shell_text:
            raise SystemExit(f"Missing PC topbar overflow guard: {snippet}")

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
                "PC 创作入口",
                "推荐选题、自定义选题、知识依据、封面方向和复制确认保持同题同步",
                "桌面端保留批量管理空间，也让生成依据和确认边界更早露出来",
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
        'aria-label="返回 PC 工作台"',
        'aria-label="查看通知状态"',
        "className={`${MOBILE_HEADER_ICON_BUTTON_CLASS}",
    ]
    for snippet in mobile_shell_contracts:
        if snippet not in android_text:
            raise SystemExit(f"Missing mobile shell contract: {snippet}")

    knowledge_api_text = (ROOT / "frontend" / "lib" / "knowledge-api.ts").read_text(
        encoding="utf-8"
    )
    mobile_knowledge_text = (
        ROOT / "frontend" / "components" / "mobile-knowledge-screen.tsx"
    ).read_text(encoding="utf-8")
    knowledge_visibility_contracts = [
        (
            workspace_text,
            [
                "function KnowledgeView()",
                "fetchKnowledgeItems(API_BASE",
                'data-testid="knowledge-list"',
                'data-testid="knowledge-search-input"',
                "const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);",
                "function openKnowledgeItem(item: KnowledgeItem)",
                "async function copyKnowledgeItem(item: KnowledgeItem)",
                'data-testid="pc-knowledge-detail-modal"',
                'data-testid="pc-knowledge-detail-content"',
                'data-testid="pc-knowledge-detail-copy"',
                'data-testid="pc-knowledge-detail-close"',
                "knowledgeItemContent(selectedItem)",
                "点击看全文",
            ],
            "PC knowledge library visibility",
        ),
        (
            f"{android_text}\n{mobile_knowledge_text}",
            [
                '"knowledge"',
                '{ id: "knowledge", icon: BookOpenText, label: "知识" }',
                "function KnowledgeScreen",
                'data-testid="mobile-knowledge-list"',
                "data-testid={`mobile-tab-${tab.id}`}",
                "setSelectedItem((currentItem) =>",
                "data.some((item) => item.id === currentItem.id)",
                "setSelectedItem(null);",
            ],
            "mobile knowledge library visibility",
        ),
        (
            knowledge_api_text,
            [
                "fetchKnowledgeItems",
                "/knowledge/${path}",
                'const path = query ? "search" : "list"',
            ],
            "shared knowledge API reader",
        ),
    ]
    for text, snippets, contract_name in knowledge_visibility_contracts:
        for snippet in snippets:
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    fake_mobile_status_markers = [
        "function StatusBar()",
        "9:41",
        "5G  82%",
    ]
    for marker in fake_mobile_status_markers:
        if marker in android_text:
            raise SystemExit(f"Fake mobile status marker is not allowed: {marker}")

    mobile_home_metric_contracts = [
        'const quickMetrics = [',
        '{ label: "趋势素材", value: "待采集"',
        '{ label: "知识条目", value: "待检索"',
        'metric.tab === "review" ? { ...metric, value: String(reviewPendingCount) } : metric',
        'page.getByTestId("metric-collect").locator("div").first()).toHaveText("待采集")',
        'page.getByTestId("metric-knowledge").locator("div").first()).toHaveText("待检索")',
        'page.getByTestId("metric-review").locator("div").first()).toHaveText("0")',
        "mobile home metrics use workflow status instead of stale counts",
    ]
    for snippet in mobile_home_metric_contracts:
        if snippet not in f"{android_text}\n{e2e_text}":
            raise SystemExit(f"Missing mobile home metric contract: {snippet}")

    stale_mobile_metric_markers = [
        '{ label: "趋势素材", value: "0"',
        '{ label: "知识条目", value: "查看"',
    ]
    for marker in stale_mobile_metric_markers:
        if marker in android_text:
            raise SystemExit(f"Stale mobile home metric marker is not allowed: {marker}")

    desktop_delivery_fallback_contracts = [
        '{ label: "趋势素材", value: "待采集"',
        '{ label: "知识条目", value: "待入库"',
        '{ label: "待确认稿件", value: "待确认"',
        '{ label: "发布准备", value: "手动"',
        '{ name: "采集记录", count: "待采集"',
        '{ name: "知识上传", count: "待入库"',
        '{ name: "草稿生成", count: "待生成"',
        '{ name: "确认清单", count: "待确认"',
        'status: "待确认后启用"',
        'status: "待人工记录"',
        'data-testid={`delivery-action-status-${index}`}',
        'data-testid={`delivery-queue-count-${index}`}',
        "PC delivery fallback metrics use status labels without publishing",
        'page.getByTestId("delivery-action-status-0")).toHaveText("待确认后启用")',
        'page.getByTestId("delivery-action-status-2")).toHaveText("待人工记录")',
        'page.getByTestId("delivery-queue-count-0")).toHaveText("待采集")',
        'page.getByTestId("delivery-queue-count-1")).toHaveText("待入库")',
        'page.getByTestId("delivery-queue-count-2")).toHaveText("待生成")',
        'page.getByTestId("delivery-queue-count-3")).toHaveText("待确认")',
        "expect(forbiddenPublishing).toEqual([])",
    ]
    for snippet in desktop_delivery_fallback_contracts:
        if snippet not in f"{data_text}\n{workspace_text}\n{e2e_text}":
            raise SystemExit(f"Missing desktop delivery fallback contract: {snippet}")

    stale_desktop_metric_markers = [
        '{ label: "趋势素材", value: "0"',
        '{ label: "知识条目", value: "0"',
        '{ label: "待确认稿件", value: "0"',
        '{ label: "发布准备", value: "0"',
        "count: 0",
        'status: "0 条已确认"',
        'status: "0 条记录"',
    ]
    for marker in stale_desktop_metric_markers:
        if marker in data_text:
            raise SystemExit(f"Stale desktop fallback metric marker is not allowed: {marker}")

    return (
        len(tab_ids)
        + len(style_ids)
        + len(referenced_styles)
        + len(template_styles)
        + len(generation_flow_snippets)
        + len(terminal_routing_snippets)
        + len(pc_login_snippets)
        + len(login_shell_screenshot_contracts)
        + len(app_shell_login_snippets)
        + sum(len(snippets) for _text, snippets, _name in one_click_entry_contracts)
        + sum(len(snippets) for _text, snippets, _name in mobile_focus_contracts)
        + len(mobile_shell_contracts)
        + sum(len(snippets) for _text, snippets, _name in knowledge_visibility_contracts)
        + len(mobile_home_metric_contracts)
        + len(stale_mobile_metric_markers)
        + len(desktop_delivery_fallback_contracts)
        + len(stale_desktop_metric_markers)
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
    platform_copy_text = (
        ROOT / "frontend" / "lib" / "platform-copy.ts"
    ).read_text(encoding="utf-8")
    mobile_create_text = (
        ROOT / "frontend" / "components" / "mobile-create-screen.tsx"
    ).read_text(encoding="utf-8")
    mobile_draft_preview_text = (
        ROOT / "frontend" / "components" / "mobile-draft-preview-editor.tsx"
    ).read_text(encoding="utf-8")
    mobile_draft_history_text = (
        ROOT / "frontend" / "components" / "mobile-draft-history.tsx"
    ).read_text(encoding="utf-8")
    mobile_reference_templates_text = (
        ROOT / "frontend" / "components" / "mobile-reference-templates.tsx"
    ).read_text(encoding="utf-8")
    mobile_back_navigation_text = (
        ROOT / "frontend" / "lib" / "mobile-back-navigation.ts"
    ).read_text(encoding="utf-8")
    mobile_cover_share_text = (
        ROOT / "frontend" / "lib" / "mobile-cover-share.ts"
    ).read_text(encoding="utf-8")
    mobile_create_contract_text = "\n".join(
        [
            android_text,
            mobile_create_text,
            mobile_draft_preview_text,
            mobile_draft_history_text,
            mobile_reference_templates_text,
            mobile_back_navigation_text,
            mobile_cover_share_text,
        ]
    )
    mobile_draft_contract_text = f"{mobile_create_contract_text}\n{mobile_draft_storage_text}"
    public_preview_text = (
        ROOT / "frontend" / "components" / "public-preview-client.tsx"
    ).read_text(encoding="utf-8")
    trend_collector_text = (
        ROOT / "frontend" / "components" / "trend-collector-panel.tsx"
    ).read_text(encoding="utf-8")
    mobile_collect_text = (
        ROOT / "frontend" / "components" / "mobile-collect-screen.tsx"
    ).read_text(encoding="utf-8")
    mobile_review_text = (
        ROOT / "frontend" / "components" / "mobile-review-screen.tsx"
    ).read_text(encoding="utf-8")
    mobile_trend_source_review_text = (
        ROOT / "frontend" / "components" / "mobile-trend-source-review.tsx"
    ).read_text(encoding="utf-8")
    image_service_text = (
        ROOT / "backend" / "app" / "services" / "image_service.py"
    ).read_text(encoding="utf-8")
    content_service_text = (
        ROOT / "backend" / "app" / "services" / "content_service.py"
    ).read_text(encoding="utf-8")
    content_source_context_test_text = (
        ROOT / "backend" / "tests" / "test_content_source_context.py"
    ).read_text(encoding="utf-8")
    e2e_text = (
        ROOT / "frontend" / "tests" / "e2e" / "opc.smoke.spec.ts"
    ).read_text(encoding="utf-8")
    trend_browser_scripts_text = (
        ROOT / "backend" / "app" / "services" / "trend_browser_scripts.py"
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
    source_evidence_text = (
        ROOT / "frontend" / "components" / "generation-source-evidence-card.tsx"
    ).read_text(encoding="utf-8")
    mobile_source_evidence_text = (
        ROOT / "frontend" / "components" / "mobile-source-evidence-panel.tsx"
    ).read_text(encoding="utf-8")
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
    generation_input_signature_text = (
        ROOT / "frontend" / "lib" / "generation-input-signature.ts"
    ).read_text(encoding="utf-8")
    scroll_into_view_text = (
        ROOT / "frontend" / "lib" / "scroll-into-view.ts"
    ).read_text(encoding="utf-8")
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
        'generatedContentLifecycleWarning,',
        "generatedContentLifecycleWarning(data.status)",
        "const canCopy = !testDraft && !generationBusy && !lifecycleWarning;",
        "const canGenerateImage = canCopy && !imageBusy && !lifecycleWarning;",
        'data-testid="pc-export-lifecycle-warning"',
        'data-testid="pc-export-copy-button"',
        "const previewLifecycleWarning = content ? generatedContentLifecycleWarning(content.status) : null;",
        "const canCopy = Boolean(content && !isTestDraft(content) && !previewLifecycleWarning);",
        'data-testid="pc-preview-modal-lifecycle-warning"',
        "type PrepublishChecklistItem",
        "function buildPrepublishChecklist",
        "generationSourceContextStats(content.source_context)",
        'data-testid="pc-export-prepublish-checklist"',
        'data-testid={`pc-export-prepublish-check-${item.key}`}',
        "const currentContentIdRef = useRef(content.id);",
        "currentContentIdRef.current = content.id;",
        "currentContentIdRef.current === data.content_id",
        "currentContentIdRef.current === requestContentId",
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
        'data-testid="pc-preview-modal-copy-button"',
        "interfaceStyle={interfaceStyle}",
        "workspace-preview-modal-card",
        "workspace-preview-close-button",
        "workspace-preview-copy-button",
        "theme-${interfaceStyle} fixed inset-0",
        "复制被浏览器拦截了；下方已展开正文，可直接全选复制。",
        "setManualCopyText(copyPayload)",
        "setManualCopyText(null)",
        "manualCopyRef.current?.select()",
        "targetRef.current?.select()",
        "visibleTopicPresets",
        "TOPIC_PRESET_REFRESH_MS",
        "当前选题已就绪，点击“一键生成图文+封面”。",
        "pickGenerationTopicPresetBatch",
        "pickGenerationTopicPresetBatch()",
        "refreshTopicPresets",
        "findGenerationTopicPresetByTopic(topic)",
        "const selectedTopicPreset = findGenerationTopicPresetByTopic(topic);",
        "const selected = selectedTopicPreset?.key === preset.key;",
        "aria-pressed={selected}",
        "const coverDirectionPreviewLabel = selectedTopicPreset?.desktopLabel",
        "const coverDirectionPreview = selectedTopicPreset?.coverDirection",
        'data-testid="content-cover-direction-preview"',
        'data-testid="content-cover-direction-type"',
        "自定义选题会使用当前平台基础封面风格",
        "function applyTopicPreset(preset: GenerationTopicPreset)",
        "function updateTopicAndAutoKnowledgeQuery(nextTopic: string)",
        "const previousTopicPreset = findGenerationTopicPresetByTopic(previousTopic);",
        "const nextTopicPreset = findGenerationTopicPresetByTopic(nextTopicText);",
        "nextTopicPreset.knowledgeQuery",
        "nextTopicPreset.audience",
        "nextTopicPreset.tags",
        "已识别推荐选题",
        "previousTopicPreset && nextTopicText",
        "已切换为自定义选题",
        "isKnownGenerationTopicKnowledgeQuery(normalizedQuery)",
        "buildCustomTopicAudience(previousTopic)",
        "isKnownGenerationTopicAudience(normalizedAudience)",
        "isKnownGenerationTopicTags(normalizedTags)",
        "defaultGenerationTargetAudience",
        "defaultGenerationTagsText",
        "normalizedQuery === previousTopic",
        "function clearSourceEvidence()",
        "clearSourceEvidence();",
        "function contentMatchesCurrentInputs(",
        "content is GeneratedContent",
        "content.title === topic.trim()",
        "content.platform === selectedPlatform",
        "tagsMatchText(content.tags, tagsText)",
        "sourceContextMatchesKnowledgeQuery(content.source_context, knowledgeQuery)",
        "generatedContentInputSignatureMatches(",
        "lastContentInputSignature",
        "currentGenerationInputSignature",
        "setLastContentInputSignature({ contentId: data.id, signature: requestSignature });",
        "contentMatchesCurrentInputs(lastContent)",
        "contentMatchesCurrentInputs(latestContent)",
        "const exportContentMatchesCurrentInputs = Boolean(currentExportContent);",
        "const mismatchedExportContent = exportContent && !currentExportContent ? exportContent : null;",
        "const mismatchedExportContentMessage = mismatchedExportContent",
        'data-testid="stale-draft-warning"',
        "复制前请重新生成",
        "sourceContextMatchesKnowledgeQuery(currentExportContent.source_context, knowledgeQuery)",
        "parseTagText(tagsText)",
        'exportContentMatchesCurrentInputs\n        ? "重新一键生成"',
        "exportContentMatchesCurrentInputs ? \"当前草稿\" : exportContent ? \"历史草稿\"",
        'data-testid="draft-history-strip"',
        'aria-label="历史图文草稿列表"',
        "snap-x gap-3 overflow-x-auto scroll-smooth",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "role=\"list\"",
        'data-testid="draft-history-card"',
        "snap-start overflow-hidden",
        "role=\"listitem\"",
        'data-testid="topic-preset-list"',
        'data-testid="topic-preset-refresh"',
        'data-testid={`topic-preset-${preset.key}`}',
        'data-testid="content-knowledge-query"',
        'data-testid="content-target-audience"',
        'data-testid="content-style-notes"',
        'data-testid="content-tags"',
        "preset.desktopLabel",
        "preset.desktopHelper",
        "buildTopicCoverStyleNotes(",
        "generateCoverForContent(finalContent, requestPayload.topic)",
        "async function generateCoverForContent(content: GeneratedContent, coverTopic = content.title)",
        "每 45 秒自动换一批，也可以直接修改为自定义选题",
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

    public_preview_contracts = [
        (
            public_preview_text,
            [
                'data-testid="public-preview-state"',
                "data-state={status}",
                'data-testid="public-preview-status-card"',
                'data-testid="public-preview-status-title"',
                'data-testid="public-preview-status-message"',
                'data-testid="public-preview-title"',
                'data-testid="public-preview-body"',
                'data-testid="public-preview-tags"',
                'data-testid="public-preview-safety-message"',
                'data-testid="public-preview-fallback-cover"',
                "预览链接无效。",
                "发布前预览 · 不会自动发布",
            ],
            "public preview status shell",
        ),
        (
            e2e_text,
            [
                "public preview invalid link resolves to clear error without API calls",
                'page.goto(`${BASE_URL}/preview/not-a-draft`)',
                'page.getByTestId("public-preview-state")).toHaveAttribute("data-state", "error"',
                'page.getByTestId("public-preview-status-title")).toContainText("预览打不开")',
                'page.getByTestId("public-preview-status-message")).toContainText("预览链接无效")',
                'page.getByTestId("public-preview-page")).toHaveCount(0)',
                'expectNoHorizontalViewportOverflow(page, "public preview invalid link"',
                "expect(previewApiRequests).toEqual([])",
            ],
            "public preview invalid-link E2E",
        ),
        (
            e2e_text,
            [
                "public preview renders draft content and cover without publishing",
                "E2E_PUBLIC_PREVIEW_CONTENT_ID = 8923",
                "E2E public preview timeline topic",
                "E2E guard blocked public preview publishing-like call.",
                "public-preview-cover",
                "public-preview-title",
                "public-preview-body",
                "public-preview-tags",
                "public-preview-safety-message",
                "public preview valid draft",
                "expect(contentRequests).toHaveLength(1)",
                "expect(imageRequests).toHaveLength(1)",
                "expect(forbiddenPublishing).toEqual([])",
            ],
            "public preview valid-draft E2E",
        ),
        (
            e2e_text,
            [
                "public preview keeps draft readable when cover lookup fails",
                "E2E_PUBLIC_PREVIEW_FALLBACK_CONTENT_ID = 8924",
                "E2E public preview missing cover topic",
                "E2E cover lookup temporarily unavailable.",
                "public-preview-fallback-cover",
                "public preview missing cover fallback",
                'page.getByTestId("public-preview-cover")).toHaveCount(0)',
                'page.getByTestId("public-preview-fallback-cover")).toContainText("封面预览")',
                'page.getByTestId("public-preview-body")).toContainText("封面接口失败")',
                'page.getByTestId("public-preview-safety-message")).toContainText("不会自动发布")',
                "expect(contentRequests).toHaveLength(1)",
                "expect(imageRequests).toHaveLength(1)",
                "expect(forbiddenPublishing).toEqual([])",
            ],
            "public preview missing-cover E2E",
        ),
        (
            e2e_text,
            [
                "public preview uses text cover when image payload is malformed",
                "E2E_PUBLIC_PREVIEW_MALFORMED_IMAGE_CONTENT_ID = 8931",
                "E2E public preview malformed image topic",
                "E2E image list returned malformed asset.",
                "public preview malformed image fallback",
                'page.getByTestId("public-preview-state")).toHaveCount(0)',
                'page.getByTestId("public-preview-cover")).toHaveCount(0)',
                'page.getByTestId("public-preview-fallback-cover")).toContainText("\\u5c01\\u9762\\u9884\\u89c8")',
                'page.getByTestId("public-preview-body")).toContainText("Malformed image payload")',
                'page.getByTestId("public-preview-safety-message")).toContainText("\\u4e0d\\u4f1a\\u81ea\\u52a8\\u53d1\\u5e03")',
                "expect(contentRequests).toHaveLength(1)",
                "expect(imageRequests).toHaveLength(1)",
                "expect(forbiddenPublishing).toEqual([])",
            ],
            "public preview malformed-image E2E",
        ),
        (
            e2e_text,
            [
                "public preview uses text cover when image payload is not an array",
                "E2E_PUBLIC_PREVIEW_NON_ARRAY_IMAGE_CONTENT_ID = 8932",
                "E2E public preview non-array image topic",
                "E2E image list returned a non-array payload.",
                "public preview non-array image fallback",
                'page.getByTestId("public-preview-state")).toHaveCount(0)',
                'page.getByTestId("public-preview-cover")).toHaveCount(0)',
                'page.getByTestId("public-preview-fallback-cover")).toContainText("\\u5c01\\u9762\\u9884\\u89c8")',
                'page.getByTestId("public-preview-body")).toContainText("Non-array image payload")',
                'page.getByTestId("public-preview-safety-message")).toContainText("\\u4e0d\\u4f1a\\u81ea\\u52a8\\u53d1\\u5e03")',
                "expect(contentRequests).toHaveLength(1)",
                "expect(imageRequests).toHaveLength(1)",
                "expect(forbiddenPublishing).toEqual([])",
            ],
            "public preview non-array-image E2E",
        ),
        (
            e2e_text,
            [
                "public preview resolves content backend errors without follow-up calls",
                "E2E_PUBLIC_PREVIEW_ERROR_CONTENT_ID = 8925",
                "E2E content service temporarily unavailable.",
                "E2E guard blocked image lookup after content error.",
                "public preview content backend error",
                'page.getByTestId("public-preview-state")).toHaveAttribute("data-state", "error"',
                'page.getByTestId("public-preview-status-message")).toContainText("暂时无法打开")',
                'page.getByTestId("public-preview-page")).toHaveCount(0)',
                "expect(contentRequests).toHaveLength(1)",
                "expect(imageRequests).toEqual([])",
                "expect(forbiddenPublishing).toEqual([])",
            ],
            "public preview content-error E2E",
        ),
        (
            e2e_text,
            [
                "public preview resolves malformed content without cover lookup",
                "E2E_PUBLIC_PREVIEW_MALFORMED_CONTENT_ID = 8930",
                "E2E malformed public preview draft",
                "E2E guard blocked image lookup after malformed content.",
                "public preview malformed content",
                'page.getByTestId("public-preview-state")).toHaveAttribute("data-state", "error"',
                'page.getByTestId("public-preview-status-message")).toContainText("\\u6570\\u636e\\u4e0d\\u5b8c\\u6574")',
                'page.getByTestId("public-preview-page")).toHaveCount(0)',
                "expect(contentRequests).toHaveLength(1)",
                "expect(imageRequests).toEqual([])",
                "expect(forbiddenPublishing).toEqual([])",
            ],
            "public preview malformed-content E2E",
        ),
    ]
    for text, snippets, contract_name in public_preview_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    draft_schema_contracts = [
        (
            content_service_text,
            [
                "def _draft_output_schema_issue",
                "DRAFT_METADATA_SECTION_HEADINGS",
                "def _draft_metadata_section_issue",
                "schema_issue = _draft_metadata_section_issue(draft)",
                "def _draft_hashtag_line_issue",
                "schema_issue = _draft_hashtag_line_issue(draft)",
                "MIN_DRAFT_MEANINGFUL_CHARACTERS",
                "def _draft_too_thin_issue",
                "schema_issue = _draft_too_thin_issue(draft)",
                "元数据段落",
                "独立话题标签行",
                "草稿正文过短",
                "草稿生成结果为空，请补充素材或稍后重试。",
                'status="schema_invalid"',
                "status.HTTP_502_BAD_GATEWAY",
            ],
            "draft output schema guard",
        ),
        (
            content_source_context_test_text,
            [
                "test_generate_content_rejects_blank_ai_draft",
                "test_generate_content_rejects_metadata_section_ai_draft",
                "test_generate_content_rejects_chinese_metadata_section_ai_draft",
                "test_generate_content_rejects_hashtag_line_ai_draft",
                "test_generate_content_rejects_too_thin_ai_draft",
                "Title: overseas doctoral logo check",
                "标题：海外博士官方来源核验",
                "#海外博士 #官方来源",
                "元数据段落",
                "独立话题标签行",
                "草稿正文过短",
                "db.query(Content).count() == 0",
                "GenerationLog",
                "schema_invalid",
            ],
            "draft output schema test",
        ),
    ]
    for text, snippets, contract_name in draft_schema_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    draft_generation_recovery_contracts = [
        (
            service_error_text,
            [
                "DRAFT_GENERATION_RECOVERY_MARKERS",
                "formatDraftGenerationErrorMessage",
                "生成结果需要补救",
                "系统不会保存这次不合格草稿",
                "草稿正文过短",
                "元数据段落",
                "独立话题标签行",
                "撰稿结果偏离选题",
            ],
            "draft generation recovery copy helper",
        ),
        (
            workspace_text,
            [
                "formatDraftGenerationErrorMessage(rawMessage)",
                "setStatusText(message)",
            ],
            "PC draft generation recovery copy",
        ),
        (
            mobile_create_text,
            [
                "formatDraftGenerationErrorMessage(",
                "setProgressLabel(\"生成失败\")",
            ],
            "mobile draft generation recovery copy",
        ),
        (
            e2e_text,
            [
                "failContentDetail?: string",
                "mobile schema-invalid draft failure gives recovery copy without false draft",
                "PC schema-invalid draft failure gives recovery copy without false draft",
                "生成结果需要补救：请补充业务素材",
                "草稿正文过短，无法覆盖选题、受众、行动建议和人工核对提醒",
                "系统不会保存这次不合格草稿",
            ],
            "schema-invalid draft recovery E2E",
        ),
    ]
    for text, snippets, contract_name in draft_generation_recovery_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    custom_topic_e2e_contracts = [
        "buildCustomTopicAudience",
        "buildCustomTopicTags",
        "mobile one-click generation keeps custom fact topic aligned through preview copy",
        "E2E_MOBILE_CUSTOM_TOPIC_CONTENT_ID",
        'page.getByTestId("draft-preview-prepublish-check-sources")',
        'page.getByTestId("draft-preview-prepublish-check-human")',
        "mobile preserves draft when cover generation fails",
        'page.getByTestId("draft-preview-prepublish-check-cover")',
        "封面尚未生成",
        "PC one-click generation keeps custom fact topic aligned through preview copy",
        "E2E_PC_CUSTOM_TOPIC_CONTENT_ID",
        'page.getByTestId("pc-export-prepublish-check-sources")',
        'page.getByTestId("pc-export-prepublish-check-human")',
        "PC cover failure keeps source topic draft available for preview copy",
        'page.getByTestId("pc-export-prepublish-check-cover")',
        "封面尚未生成或不可用",
        "customSourceTopic",
        "overseas doctoral consulting market data and pricing benchmarks",
        "mobile-source-preview-button",
        "mobile-draft-history-card-${E2E_MOBILE_CUSTOM_TOPIC_CONTENT_ID}",
        "content-cover-direction-type",
        "knowledge_query: customSourceTopic",
        "target_audience: expectedAudience",
        'expectNoHorizontalViewportOverflow(page, "mobile custom draft preview"',
        '{ label: "cover image", testId: "draft-preview-cover-image" }',
        '{ label: "preview link action", testId: "draft-copy-preview-link" }',
        "captureNextClipboardWrite(page)",
        "readCapturedClipboardText(page)",
        "expect(copiedPreviewText).toContain(customSourceTopic)",
        "expect(copiedMobileDraftText).toContain(customSourceTopic)",
        "countTextOccurrences(copiedMobileDraftText, `#${expectedTags[0]}`)",
        "countTextOccurrences(manualCopyText, `#${expectedTags[0]}`)",
        "countTextOccurrences(copiedPreviewText, `#${expectedTags[0]}`)",
        "expect(generationRequests.forbiddenPublishing).toEqual([])",
    ]
    for snippet in custom_topic_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing custom topic E2E contract: {snippet}")

    mobile_draft_history_error_contracts = [
        (
            mobile_create_text,
            [
                "draftHistoryError",
                "draftHistoryReloadKey",
                "retryMobileDraftHistory",
                'readApiError(response, "草稿历史读取失败。")',
                "草稿历史格式异常，请稍后重试。",
                "setDraftHistoryError(error instanceof Error ? error.message : \"草稿历史读取失败。\")",
                "onRetry={retryMobileDraftHistory}",
            ],
            "mobile draft-history read-error state",
        ),
        (
            mobile_draft_history_text,
            [
                'data-testid="mobile-draft-history-error"',
                'data-testid="mobile-draft-history-retry"',
                "草稿历史读取失败",
                "这不会触发生成、改写、确认或发布",
                "重新读取草稿",
            ],
            "mobile draft-history read-error UI",
        ),
        (
            e2e_text,
            [
                "mobile draft history read error is recoverable without generation calls",
                "E2E_MOBILE_DRAFT_HISTORY_RETRY_CONTENT_ID",
                "failDraftHistoryUntilReleased: true",
                "E2E mobile draft history unavailable.",
                "generationRequests.releaseDraftHistoryFailures()",
                'page.getByTestId("mobile-draft-history-retry").click()',
                'const mobileDraftHistoryErrorBox = await page.getByTestId("mobile-draft-history-error").boundingBox()',
                "mobileDraftHistoryErrorBox?.width",
                "mobileDraftHistoryErrorBox?.height",
                'attachScreenshotEvidence(page, testInfo, "mobile-draft-history-error.png"',
                'const mobileDraftHistoryRecoveredBox = await page',
                "mobileDraftHistoryRecoveredBox?.width",
                "mobileDraftHistoryRecoveredBox?.height",
                'attachScreenshotEvidence(page, testInfo, "mobile-draft-history-recovered.png"',
                "expect(generationRequests.contentList).toBeGreaterThan(1)",
                "expect(generationRequests.sourcePreview).toHaveLength(0)",
                "expect(generationRequests.contentGenerate).toHaveLength(0)",
                "expect(generationRequests.imageGenerate).toHaveLength(0)",
                "expect(generationRequests.forbiddenPublishing).toEqual([])",
            ],
            "mobile draft-history read-error E2E",
        ),
    ]
    for text, snippets, contract_name in mobile_draft_history_error_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    mobile_multi_topic_e2e_contracts = [
        "runMobileTopicAlignmentScenario",
        "E2E_MOBILE_SALES_TOPIC_CONTENT_ID",
        "E2E_MOBILE_ROUTE_TOPIC_CONTENT_ID",
        "E2E_MOBILE_MENTOR_TOPIC_CONTENT_ID",
        "E2E_MOBILE_TIMELINE_TOPIC_CONTENT_ID",
        "E2E_MOBILE_SOURCE_LOGO_PRICE_CONTENT_ID",
        "mobile one-click generation keeps selected sales topic aligned through preview copy",
        "mobile one-click generation keeps selected route topic aligned through preview copy",
        "mobile one-click generation keeps selected mentor topic aligned through preview copy",
        "mobile one-click generation keeps selected timing topic aligned through preview copy",
        "mobile one-click generation keeps selected source logo-price topic aligned through preview copy",
        'page.getByTestId("draft-preview-prepublish-check-content")',
        'page.getByTestId("draft-preview-prepublish-check-sources")',
        "presetKey: \"sales-main\"",
        "presetKey: \"route-main\"",
        "presetKey: \"mentor-direction-check\"",
        "presetKey: \"timeline-main\"",
        "presetKey: \"source-logo-price\"",
        "expectPreviewViewportFit: true",
        "viewport: { height: 780, width: 360 }",
        'expectNoHorizontalViewportOverflow(page, "mobile selected draft preview"',
        '{ label: "preview link action", testId: "draft-copy-preview-link" }',
        "expect(generationRequests.sourcePreview).toHaveLength(1)",
        "expect(generationRequests.contentGenerate).toHaveLength(1)",
        "expect(generationRequests.imageGenerate).toHaveLength(1)",
    ]
    for snippet in mobile_multi_topic_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing mobile multi-topic E2E contract: {snippet}")

    mobile_lifecycle_e2e_contracts = [
        "mobile published generation status stops at manual lifecycle review",
        "E2E_MOBILE_PUBLISHED_STATUS_CONTENT_ID",
        'contentStatus: "published"',
        'page.getByTestId("draft-preview-lifecycle-warning")).toContainText(',
        "const mobileLifecycleWarningBox = await page.getByTestId(\"draft-preview-lifecycle-warning\").boundingBox()",
        "mobileLifecycleWarningBox?.width",
        "mobileLifecycleWarningBox?.height",
        'attachScreenshotEvidence(page, testInfo, "mobile-published-lifecycle-warning.png"',
        'page.getByTestId("draft-open-xiaohongshu")).toBeDisabled()',
        'page.getByTestId("draft-preview-copy")).toBeDisabled()',
        'page.getByTestId("draft-copy-preview-link")).toBeDisabled()',
        'page.getByTestId("draft-preview-copy")).toContainText("需先核对状态")',
        'page.getByTestId("mobile-generation-progress")).toContainText("需先核对状态")',
        "expect(generationRequests.imageGenerate).toHaveLength(0)",
        "expect(generationRequests.forbiddenPublishing).toEqual([])",
    ]
    for snippet in mobile_lifecycle_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing mobile lifecycle E2E contract: {snippet}")

    mobile_review_e2e_contracts = [
        "mobile review queue submits human decisions without platform publishing",
        "mobile review decision failure keeps draft queued without publishing",
        'page.getByTestId("mobile-review-knowledge-list")).toContainText(approvePreset.topic)',
        'page.getByTestId("mobile-review-web-list")).toContainText(approvePreset.topic)',
        'page.getByTestId("mobile-review-knowledge-list")).toContainText(preset.topic)',
        'page.getByTestId("mobile-review-web-list")).toContainText(preset.topic)',
        'expectNoHorizontalViewportOverflow(page, "mobile review detail evidence"',
        'expectNoHorizontalViewportOverflow(page, "mobile review failure detail evidence"',
        'const approveFailureStatusBox = await page.getByTestId("mobile-review-status").boundingBox()',
        "approveFailureStatusBox?.width",
        "approveFailureStatusBox?.height",
        'attachScreenshotEvidence(page, testInfo, "mobile-review-approve-failure.png"',
        'page.getByTestId("mobile-review-detail-request-changes").click()',
        'expectNoHorizontalViewportOverflow(page, "mobile review request-changes failure detail evidence"',
        'const requestChangesFailureStatusBox = await page.getByTestId("mobile-review-status").boundingBox()',
        "requestChangesFailureStatusBox?.width",
        "requestChangesFailureStatusBox?.height",
        'attachScreenshotEvidence(page, testInfo, "mobile-review-request-changes-failure.png"',
        "expect(reviewRequests.reviews).toHaveLength(2)",
        'decision: "changes_requested"',
        '{ label: "source evidence", testId: "mobile-review-source-evidence" }',
        '{ label: "approve action", testId: "mobile-review-detail-approve" }',
        '{ label: "request changes action", testId: "mobile-review-detail-request-changes" }',
        "expect(reviewRequests.forbiddenPublishing).toEqual([])",
    ]
    for snippet in mobile_review_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing mobile review E2E contract: {snippet}")

    mobile_review_queue_error_contracts = [
        (
            mobile_review_text,
            [
                "queueError",
                "setQueueError(null)",
                "setQueueError(message)",
                'data-testid="mobile-review-queue-error"',
                'data-testid="mobile-review-queue-retry"',
                "待确认队列读取失败",
                "这只会重新读取待人工确认草稿；不会生成、改写、确认或发布",
                "重新读取队列",
            ],
            "mobile review queue read-error UI",
        ),
        (
            e2e_text,
            [
                "mobile review queue read error is recoverable without publishing",
                "failContentListUntilReleased: true",
                "E2E mobile review queue unavailable.",
                "reviewRequests.releaseContentListFailures()",
                'page.getByTestId("mobile-review-queue-retry").click()',
                'const mobileReviewQueueErrorBox = await page.getByTestId("mobile-review-queue-error").boundingBox()',
                "mobileReviewQueueErrorBox?.width",
                "mobileReviewQueueErrorBox?.height",
                'attachScreenshotEvidence(page, testInfo, "mobile-review-queue-error.png"',
                'const mobileReviewQueueRecoveredBox = await page.getByTestId("mobile-review-list").boundingBox()',
                "mobileReviewQueueRecoveredBox?.width",
                "mobileReviewQueueRecoveredBox?.height",
                'attachScreenshotEvidence(page, testInfo, "mobile-review-queue-recovered.png"',
                "expect(reviewRequests.contentList).toBeGreaterThan(1)",
                "expect(reviewRequests.reviews).toHaveLength(0)",
                "expect(reviewRequests.forbiddenPublishing).toEqual([])",
            ],
            "mobile review queue read-error E2E",
        ),
    ]
    for text, snippets, contract_name in mobile_review_queue_error_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    pc_review_queue_contracts = [
        (
            workspace_text,
            [
                'const pcReviewQueueStatuses = new Set(["draft", "rewritten", "review_pending"]);',
                "function isPcReviewQueueCandidate",
                "function PcReviewQueuePanel",
                "reviewQueueError",
                "reviewQueueReloadKey",
                "draftHistoryError",
                "draftHistoryReloadKey",
                "content/review-queue?platform=xiaohongshu",
                'data-testid="pc-review-queue"',
                'data-testid="pc-review-queue-count"',
                'data-testid="pc-review-queue-error"',
                'data-testid="pc-review-queue-retry"',
                'data-testid="draft-history-error"',
                'data-testid="draft-history-retry"',
                "历史草稿读取失败",
                "重新读取草稿",
                "待人工确认队列读取失败",
                "重新读取队列",
                "不会在队列不可读时自动发布",
                "只读查看待人工确认草稿；这里不会提交审核、发布或外发内容。",
            ],
            "PC read-only review queue UI",
        ),
        (
            e2e_text,
            [
                "PC content page shows a read-only pending review queue",
                "E2E_PC_REVIEW_QUEUE_CONTENT_ID",
                "E2E_PC_REVIEW_QUEUE_APPROVED_CONTENT_ID",
                "contentListItems:",
                'status: "review_pending"',
                'status: "approved"',
                'page.getByTestId("pc-review-queue-count")).toContainText("1")',
                "PC read-only review queue shows recoverable read errors",
                "failReviewQueue: true",
                "E2E PC review queue unavailable.",
                'page.getByTestId("pc-review-queue-error")).toContainText',
                "PC read-only review queue retry reloads content list only",
                "failReviewQueueUntilReleased: true",
                "generationRequests.releaseReviewQueueFailures()",
                'page.getByTestId("pc-review-queue-retry").click()',
                'const pcReviewQueueErrorBox = await page.getByTestId("pc-review-queue-error").boundingBox()',
                "pcReviewQueueErrorBox?.width",
                "pcReviewQueueErrorBox?.height",
                'attachScreenshotEvidence(page, testInfo, "pc-review-queue-error.png"',
                'const pcReviewQueueRecoveredBox = await page.getByTestId("pc-review-queue-list").boundingBox()',
                "pcReviewQueueRecoveredBox?.width",
                "pcReviewQueueRecoveredBox?.height",
                'attachScreenshotEvidence(page, testInfo, "pc-review-queue-recovered.png"',
                "expect(generationRequests.reviewQueue).toBeGreaterThan(1)",
                "PC draft history read error keeps review queue available",
                "failDraftHistoryUntilReleased: true",
                "E2E PC draft history unavailable.",
                "generationRequests.releaseDraftHistoryFailures()",
                'page.getByTestId("draft-history-retry").click()',
                'const pcDraftHistoryErrorBox = await page.getByTestId("draft-history-error").boundingBox()',
                "pcDraftHistoryErrorBox?.width",
                "pcDraftHistoryErrorBox?.height",
                'const pcReviewQueueAvailableBox = await page',
                "pcReviewQueueAvailableBox?.width",
                "pcReviewQueueAvailableBox?.height",
                'attachScreenshotEvidence(page, testInfo, "pc-draft-history-error-with-review-queue.png"',
                'const pcDraftHistoryRecoveredBox = await page.getByTestId("draft-history-strip").boundingBox()',
                "pcDraftHistoryRecoveredBox?.width",
                "pcDraftHistoryRecoveredBox?.height",
                'attachScreenshotEvidence(page, testInfo, "pc-draft-history-recovered.png"',
                "expect(generationRequests.contentList).toBeGreaterThan(1)",
                "expect(generationRequests.reviewQueue).toBeGreaterThan(0)",
                "expect(generationRequests.contentGenerate).toHaveLength(0)",
                "expect(generationRequests.imageGenerate).toHaveLength(0)",
                "expect(generationRequests.forbiddenPublishing).toEqual([])",
            ],
            "PC read-only review queue E2E",
        ),
    ]
    for text, snippets, contract_name in pc_review_queue_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    pc_multi_topic_e2e_contracts = [
        "runPcTopicAlignmentScenario",
        "E2E_PC_GENERATED_CONTENT_ID",
        "E2E_PC_ROUTE_TOPIC_CONTENT_ID",
        "E2E_PC_MENTOR_TOPIC_CONTENT_ID",
        "E2E_PC_TIMELINE_TOPIC_CONTENT_ID",
        "PC one-click generation keeps selected sales topic aligned through preview copy",
        "PC one-click generation keeps selected route topic aligned through preview copy",
        "PC one-click generation keeps selected mentor topic aligned through preview copy",
        "PC one-click generation keeps selected timing topic aligned through preview copy",
        "expectExportSafetyCopy: true",
        "presetKey: \"sales-main\"",
        "presetKey: \"route-main\"",
        "presetKey: \"mentor-direction-check\"",
        "presetKey: \"timeline-main\"",
        'page.getByTestId("pc-generated-export-card")',
        'page.getByTestId("pc-export-prepublish-check")',
        'page.getByTestId("xhs-preview-modal")',
        'page.getByTestId("pc-preview-modal-copy-button")',
        "__opcCapturedClipboardText",
        "captureNextClipboardWrite(page)",
        "readCapturedClipboardText(page)",
        "expect(copiedPreviewText).toContain(preset.topic)",
        "expect(copiedPreviewText).toContain(`#${expectedTags[0]}`)",
        "countTextOccurrences(copiedPreviewText, `#${expectedTags[0]}`)",
        "expect(generationRequests.contentGenerate).toHaveLength(1)",
        "expect(generationRequests.imageGenerate).toHaveLength(1)",
        "expect(generationRequests.rewrite).toHaveLength(0)",
        "expect(generationRequests.forbiddenPublishing).toEqual([])",
    ]
    for snippet in pc_multi_topic_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing PC multi-topic E2E contract: {snippet}")

    pc_lifecycle_e2e_contracts = [
        "PC published generation status stops at manual lifecycle review",
        "E2E_PC_PUBLISHED_STATUS_CONTENT_ID",
        'contentStatus: "published"',
        "const pcLifecycleWarningBox = await page.getByTestId(\"pc-export-lifecycle-warning\").boundingBox()",
        "pcLifecycleWarningBox?.width",
        "pcLifecycleWarningBox?.height",
        'attachScreenshotEvidence(page, testInfo, "pc-published-lifecycle-warning.png"',
        'page.getByTestId("pc-export-copy-button")).toBeDisabled()',
        'page.getByTestId("pc-export-copy-button")).toContainText("需先核对状态")',
        'page.getByTestId("pc-preview-modal-lifecycle-warning")).toContainText(',
        'page.getByTestId("pc-preview-modal-copy-button")).toBeDisabled()',
        'page.getByTestId("pc-preview-modal-copy-button")).toContainText("需先核对状态")',
        "expect(generationRequests.imageGenerate).toHaveLength(0)",
        "expect(generationRequests.forbiddenPublishing).toEqual([])",
    ]
    for snippet in pc_lifecycle_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing PC lifecycle E2E contract: {snippet}")

    copy_dedupe_contracts = [
        (
            platform_copy_text,
            [
                "export function stripDuplicateStandaloneTagLines",
                "export function buildPlatformCopyText",
                "lineTags.every((tag) => knownTags.has(tag))",
            ],
            "shared platform copy dedupe",
        ),
        (
            workspace_text,
            [
                "buildPlatformCopyText({",
                "stripDuplicateStandaloneTagLines(preview.body, preview.tags)",
            ],
            "PC platform copy dedupe",
        ),
        (
            mobile_draft_contract_text,
            [
                "buildPlatformCopyText({",
                "stripDuplicateStandaloneTagLines(draft.body, draft.tags)",
            ],
            "mobile platform copy dedupe",
        ),
        (
            e2e_text,
            [
                "`#${tags[0]} #${tags[1]}`",
                "countTextOccurrences(manualCopyText, `#${expectedTags[0]}`)",
            ],
            "platform copy dedupe E2E",
        ),
    ]
    for text, snippets, contract_name in copy_dedupe_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    missing_content_recovery_contracts = [
        (
            workspace_text,
            [
                "function missingGeneratedContentFields",
                'missingFields.push("标签")',
                '缺少${missingContentFields.join("、")}',
                'state: missingContentFields.length ? "blocked" : "ready"',
            ],
            "PC missing content recovery",
        ),
        (
            e2e_text,
            [
                "E2E_PC_MISSING_TAGS_CONTENT_ID",
                "PC generated draft missing tags shows recovery checklist",
                "responseTags: []",
                'page.getByTestId("pc-export-prepublish-check-content")',
                "缺少标签",
            ],
            "PC missing tag recovery E2E",
        ),
        (
            mobile_draft_contract_text,
            [
                "function missingMobileDraftFields",
                'missingFields.push("标签")',
                '缺少${missingContentFields.join("、")}',
                'state: missingContentFields.length ? "blocked" : "ready"',
            ],
            "mobile missing content recovery",
        ),
        (
            e2e_text,
            [
                "E2E_MOBILE_MISSING_TAGS_CONTENT_ID",
                "mobile generated draft missing tags shows recovery checklist",
                "responseTags: []",
                'page.getByTestId("draft-preview-prepublish-check-content")',
                "缺少标签",
            ],
            "mobile missing tag recovery E2E",
        ),
    ]
    for text, snippets, contract_name in missing_content_recovery_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    mobile_stale_draft_contracts = [
        (
            mobile_create_text,
            [
                "staleMobileDraftMessage",
                'data-testid="mobile-stale-draft-warning"',
                "当前已打开草稿是",
                "activeContentId={generatedContentMatchesCurrentInputs ? generatedContent?.id ?? null : null}",
            ],
            "mobile stale draft warning",
        ),
        (
            e2e_text,
            [
                "mobile-stale-draft-warning",
                "mentor matching checklist for part-time doctoral applicants",
                "toContainText(customSourceTopic)",
                "toContainText(nextCustomTopic)",
            ],
            "mobile stale draft E2E",
        ),
    ]
    for text, snippets, contract_name in mobile_stale_draft_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    topic_preset_contract_snippets = [
        "export const generationTopicPresets",
        "TOPIC_PRESET_ROTATION_SIZE",
        "TOPIC_PRESET_REFRESH_MS",
        "pickGenerationTopicPresetBatch",
        "freshTopicPresetPool",
        'key: "ranking-water-global"',
        'topic: "全球水博排名必看"',
        'knowledgeQuery: "全球 水博 博士 项目 排名 认证 预算 在职"',
        'topic: "低预算海外博士怎么筛"',
        'key: "ranking-water-programs"',
        'topic: "水资源博士项目清单怎么看"',
        'key: "source-logo-price"',
        'topic: "水博项目校徽和价格怎么核验"',
        'key: "source-official-fee-check"',
        'topic: "海外博士官方来源和费用怎么查"',
        'topic: "套磁邮件为什么没人回"',
        'topic: "博士项目咨询前必问5个问题"',
        "desktopLabel",
        "desktopHelper",
        "mobileLabel",
        "mobileHelper",
        "coverDirection",
        "buildTopicCoverStyleNotes",
        "findGenerationTopicPresetByTopic",
        "export function isKnownGenerationTopicKnowledgeQuery",
        "export function isKnownGenerationTopicAudience",
        "export function isKnownGenerationTopicTags",
        "export function buildCustomTopicAudience",
        "export function buildCustomTopicTags",
    ]
    for snippet in topic_preset_contract_snippets:
        total += 1
        if snippet not in topic_presets_text:
            raise SystemExit(f"Missing shared topic preset contract: {snippet}")

    source_logo_price_e2e_contracts = [
        "E2E_PC_SOURCE_LOGO_PRICE_CONTENT_ID",
        "E2E_MOBILE_SOURCE_LOGO_PRICE_CONTENT_ID",
        "mobile one-click generation keeps selected source logo-price topic aligned through preview copy",
        "PC one-click generation keeps selected source logo-price topic aligned through preview copy",
        "presetKey: \"source-logo-price\"",
        "contentId: E2E_MOBILE_SOURCE_LOGO_PRICE_CONTENT_ID,\n      expectPreviewViewportFit: true,\n      expectSourceEvidenceViewportFit: true,",
        "contentId: E2E_PC_SOURCE_LOGO_PRICE_CONTENT_ID,\n      expectSourceEvidenceViewportFit: true,",
        "viewport: { height: 780, width: 360 }",
        "expect(generationRequests.sourcePreview).toHaveLength(1)",
        "expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection)",
    ]
    for snippet in source_logo_price_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing source logo-price E2E contract: {snippet}")

    ranking_project_list_e2e_contracts = [
        "E2E_PC_RANKING_PROGRAMS_CONTENT_ID",
        "E2E_MOBILE_RANKING_PROGRAMS_CONTENT_ID",
        "mobile one-click generation keeps selected ranking project-list topic aligned through preview copy",
        "PC one-click generation keeps selected ranking project-list topic aligned through preview copy",
        "presetKey: \"ranking-water-programs\"",
        "expectSourceEvidenceViewportFit: true",
        "expectNoHorizontalViewportOverflow",
        "mobile-source-knowledge-list",
        "source-web-list",
        "expect(generationRequests.sourcePreview).toHaveLength(1)",
        "expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection)",
    ]
    for snippet in ranking_project_list_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing ranking project-list E2E contract: {snippet}")

    global_ranking_e2e_contracts = [
        "E2E_PC_GLOBAL_RANKING_CONTENT_ID",
        "E2E_MOBILE_GLOBAL_RANKING_CONTENT_ID",
        "mobile one-click generation keeps selected global ranking topic aligned through preview copy",
        "PC one-click generation keeps selected global ranking topic aligned through preview copy",
        "presetKey: \"ranking-water-global\"",
        "expectSourceEvidenceViewportFit: true",
        "expectPreviewViewportFit: true",
        "expect(generationRequests.sourcePreview).toHaveLength(1)",
        "expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection)",
    ]
    for snippet in global_ranking_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing global ranking E2E contract: {snippet}")

    custom_source_viewport_e2e_contracts = [
        "mobile one-click generation keeps custom fact topic aligned through preview copy",
        "PC one-click generation keeps custom fact topic aligned through preview copy",
        "mobile custom source evidence",
        "PC custom source evidence",
        "mobile-source-web-list",
        "source-knowledge-list",
        "expectNoHorizontalViewportOverflow",
    ]
    for snippet in custom_source_viewport_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing custom source viewport E2E contract: {snippet}")

    exchange_rate_custom_e2e_contracts = [
        "E2E_MOBILE_EXCHANGE_RATE_TOPIC_CONTENT_ID",
        "E2E_PC_EXCHANGE_RATE_TOPIC_CONTENT_ID",
        "mobile one-click generation keeps exchange-rate custom topic evidence aligned",
        "PC one-click generation keeps exchange-rate custom topic evidence aligned",
        "overseas doctoral exchange rate and currency conversion check",
        "Custom mobile source verification checklist for current exchange rates and currency conversion.",
        "Custom PC source verification checklist for current exchange rates and currency conversion.",
        "mobile exchange-rate source evidence",
        "PC exchange-rate source evidence",
        "mobile-source-web-list",
        "source-web-list",
        "draft-preview-prepublish-check-sources",
        "pc-export-prepublish-check-sources",
        "expect(generationRequests.sourcePreview).toHaveLength(1)",
        "expect(generationRequests.contentGenerate).toHaveLength(1)",
        "expect(generationRequests.imageGenerate).toHaveLength(1)",
        "expect(generationRequests.forbiddenPublishing).toEqual([])",
    ]
    for snippet in exchange_rate_custom_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing exchange-rate custom topic E2E contract: {snippet}")

    official_logo_price_custom_e2e_contracts = [
        "E2E_MOBILE_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID",
        "E2E_PC_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID",
        "mobile one-click generation keeps official logo-price custom topic evidence aligned",
        "PC one-click generation keeps official logo-price custom topic evidence aligned",
        "official overseas doctoral logo authorization and tuition price verification",
        "Custom mobile source verification checklist for official logo authorization and tuition price evidence.",
        "Custom PC source verification checklist for official logo authorization and tuition price evidence.",
        "e2e-mobile-official-logo-price-topic",
        "e2e-pc-official-logo-price-topic",
        "mobile official logo-price source evidence",
        "PC official logo-price source evidence",
        "mobile official logo-price draft preview",
        "mobile-source-knowledge-list",
        "source-knowledge-list",
        "mobile-source-web-list",
        "source-web-list",
        "draft-preview-prepublish-check-sources",
        "pc-export-prepublish-check-sources",
        "draft-copy-preview-link",
        "pc-preview-modal-copy-button",
        "expect(generationRequests.sourcePreview).toHaveLength(1)",
        "expect(generationRequests.contentGenerate).toHaveLength(1)",
        "expect(generationRequests.imageGenerate).toHaveLength(1)",
        "expect(generationRequests.forbiddenPublishing).toEqual([])",
        "content_id: E2E_MOBILE_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID",
        "content_id: E2E_PC_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID",
        'requireTopicPreset("source-logo-price").coverDirection',
    ]
    for snippet in official_logo_price_custom_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing official logo-price custom topic E2E contract: {snippet}")

    source_preview_failure_viewport_contracts = [
        "mobile source preview failure",
        "mobile custom source preview failure",
        "PC source preview failure",
        "PC custom source preview failure",
        "overseas doctoral exchange rate and currency conversion check",
        "mobile-source-preview-button",
        "source-preview-button",
        "E2E source preview unavailable.",
        "E2E mobile source preview unavailable.",
    ]
    for snippet in source_preview_failure_viewport_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing source preview failure viewport E2E contract: {snippet}")

    expected_topic_preset_prefixes = {"ranking", "route", "mentor", "timeline", "source", "sales"}
    actual_topic_preset_keys = set(re.findall(r'key: "([^"]+)"', topic_presets_text))
    actual_topic_preset_prefixes = {key.split("-", 1)[0] for key in actual_topic_preset_keys}
    total += len(expected_topic_preset_prefixes)
    if not expected_topic_preset_prefixes.issubset(actual_topic_preset_prefixes):
        raise SystemExit(
            "Shared topic presets must cover ranking, route, mentor, timeline, source, and sales topics."
        )
    total += 1
    if len(actual_topic_preset_keys) < 20:
        raise SystemExit("Shared topic presets must include at least 20 recommended topics.")

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
        if topic_presets_text.count(field) < len(actual_topic_preset_keys):
            raise SystemExit(f"Every shared topic preset must define {field}")

    settings_access_contracts = [
        (
            workspace_text,
            [
                "placeholder: \"未开启时留空\"",
                "? (localFilled ? \"已填写\" : \"未开启\")",
                'data-testid="settings-console-overview"',
                'data-testid="settings-router-status"',
                "AI Key 与安全控制台",
                "Model Router 状态",
                "页面只展示保存状态，不显示敏感内容。",
            ],
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
        "export function isUnsafeGeneratedContentStatus",
        "export function generatedContentLifecycleWarning",
        "export function generatedImageStatusLabel",
        'const unsafeGeneratedContentStatuses = new Set(["published", "submitted"]);',
        'case "needs_operator_review"',
        "return \"待确认\"",
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
                "后台启动中断",
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
            f"{android_text}\n{mobile_collect_text}",
            [
                'from "@/lib/collection-job-status"',
                "collectionJobDiagnosticItems(data)",
                "collectionJobDiagnosticItems(job)",
                "fetchLatestCollectionJob()",
                'fetch(`${apiBase}/trends/jobs?limit=1`',
                'formatCollectionJobStatus(job, "mobile")',
                'formatCollectionJobStatus(data, "mobile")',
                "type TrendReviewQueueStorage = {",
                'const TREND_REVIEW_QUEUE_STORAGE_KEY = "opc_mobile_trend_review_queue_v1";',
                "function normalizeTrendReviewQueueStorage(",
                "fallbackContext: { platform: MobilePlatform; query: string }",
                "const [dismissedTrendIds, setDismissedTrendIds] = useState<number[]>([]);",
                "const trendItemsReadyRef = useRef(false);",
                "const trendReviewQueueHydratedRef = useRef(false);",
                "const skipNextTrendReviewQueueWriteRef = useRef(false);",
                "const pendingTrendItems = trendItems.filter(",
                "!reviewedTrendIdSet.has(item.id) && !dismissedTrendIdSet.has(item.id)",
                "const sourceReviewed = reviewedTrendIds.length > 0;",
                "parsed && parsed.platform === platform && parsed.query === contextQuery",
                "query: query.trim(),",
                "writeMobileStorage(TREND_REVIEW_QUEUE_STORAGE_KEY, JSON.stringify(payload));",
                "if (!trendItemsReadyRef.current) {",
                "trendItemsReadyRef.current = true;",
                "trendItemsReadyRef.current = false;",
                "setReviewedTrendIds((currentIds) => Array.from(new Set([...currentIds, ...nextReviewedIds])));",
                "已人工确认 ${nextReviewedIds.length} 条来源，可保存摘要，也可以继续采集下一批。",
                "可保存摘要，也可以继续采集下一批。",
                "trend_ids: reviewedTrendIds",
                "setDismissedTrendIds((currentIds) => Array.from(new Set([...currentIds, ...savedTrendIds])));",
                "本批来源已确认，可先保存摘要；继续运行采集会显示新素材。",
                "待确认 {pendingTrendItems.length}",
                "保存 ${reviewedTrendIds.length} 条摘要",
                'data-testid="mobile-collect-next-batch"',
                "继续采集下一批",
                "继续运行采集获取新素材",
                'data-testid="mobile-collection-diagnostic-grid"',
                "mobileDiagnosticToneClass(item.tone)",
                "setSelectedTrendItem((currentItem) =>",
                "trendItems.find((item) => item.id === currentItem.id) ?? null",
                "setSelectedTrendItem(null);",
            ],
            "mobile collection job status helper usage",
        ),
    ]
    for text, snippets, contract_name in collection_job_status_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    mobile_trend_source_body_contract_snippets = [
        "function mobileTrendBodyText(item: MobileTrendContent)",
        "COMPACT_XHS_METADATA_ONLY_RE",
        "正文未采到，打开来源人工确认。",
        "mobileTrendExcerpt(item, 72)",
        "const bodyText = mobileTrendBodyText(item);",
        '<div className="text-xs font-black text-ink/[0.52]">正文</div>',
        "正文未采到，请打开来源人工确认后再入库。",
    ]
    for snippet in mobile_trend_source_body_contract_snippets:
        total += 1
        if snippet not in mobile_trend_source_review_text:
            raise SystemExit(f"Missing mobile trend source body visibility contract: {snippet}")

    trend_detail_runtime_state_contract_snippets = [
        "const runtimeStateNotes = () => {",
        "__INITIAL_STATE__",
        "__INITIAL_SSR_STATE__",
        "__NEXT_DATA__",
        "__NUXT__",
        "value.noteDesc",
        "value.image_list",
        "interact.liked_count",
        "interact.collected_count",
        "interact.comment_count",
        "interact.share_count",
        "runtimeStateNotes() || parsedStateNotes()",
    ]
    for snippet in trend_detail_runtime_state_contract_snippets:
        total += 1
        if snippet not in trend_browser_scripts_text:
            raise SystemExit(f"Missing trend detail runtime-state contract: {snippet}")

    mobile_source_evidence_query_contracts = [
        (
            generated_assets_text,
            [
                "export function sourceContextMatchesKnowledgeQuery(",
                "sourceContext?.knowledge_query?.trim()",
                "sourceQuery === knowledgeQuery.trim()",
                "export function generationSourceContextStats(",
                "missingRequiredWebResults: webRequired && webCount === 0",
                'webEvidenceCountLabel: webCount ? `${webCount} 条` : webRequired ? "未返回" : "未启用"',
            ],
            "source evidence query match helper",
        ),
        (
            source_evidence_text,
            [
                "fallbackKnowledgeQuery?: string;",
                'const visibleKnowledgeQuery = sourceContext?.knowledge_query || fallbackKnowledgeQuery?.trim() || "";',
                "检索词：{visibleKnowledgeQuery}",
                "generationSourceContextStats(sourceContext)",
            ],
            "PC source evidence fallback query",
        ),
        (
            workspace_text,
            [
                "fallbackKnowledgeQuery={knowledgeQuery}",
                'const defaultGenerationKnowledgeQuery = "硕升博 高赞图文 写作参考";',
                "const [knowledgeQuery, setKnowledgeQuery] = useState(defaultGenerationKnowledgeQuery);",
                "sourceContextMatchesKnowledgeQuery(sourceContext, knowledgeQuery)",
                "sourceContextMatchesKnowledgeQuery(currentExportContent.source_context, knowledgeQuery)",
            ],
            "PC create source evidence query wiring",
        ),
        (
            mobile_source_evidence_text,
            [
                "fallbackKnowledgeQuery?: string;",
                'const visibleKnowledgeQuery = sourceContext?.knowledge_query || fallbackKnowledgeQuery?.trim() || "";',
                "检索词：{visibleKnowledgeQuery}",
                "generationSourceContextStats(sourceContext)",
            ],
            "mobile source evidence fallback query",
        ),
        (
            mobile_review_text,
            [
                "generationSourceContextStats(sourceContext).totalCount",
                "generationSourceContextStats(sourceContext).missingRequiredWebResults",
                "generationSourceContextStats(sourceContext)",
                "const { hasEvidence, missingRequiredWebResults, totalCount }",
                'data-testid="mobile-review-source-evidence"',
                'data-testid="mobile-review-knowledge-list"',
                'data-testid="mobile-review-web-list"',
                'data-testid="mobile-review-required-web-warning"',
                'data-testid="mobile-review-no-evidence-warning"',
                "mobile-review-evidence-result-card",
                "aria-label={`打开联网来源：${item.title}`}",
                'rel="noopener noreferrer"',
                "knowledgeItems.slice(0, 4).map((item, index)",
                "webResults.slice(0, 4).map((item, index)",
                "来源 {evidenceCount} 条",
                "待补联网来源",
            ],
            "mobile review source evidence stats",
        ),
        (
            mobile_create_text,
            [
                "fallbackKnowledgeQuery={generationKnowledgeQuery}",
                "const generationKnowledgeQuery = selectedTopicPreset?.knowledgeQuery ?? topic;",
                "sourceContextMatchesKnowledgeQuery(sourceContext, generationKnowledgeQuery)",
                "sourceContextMatchesKnowledgeQuery(generatedContent?.source_context, generationKnowledgeQuery)",
            ],
            "mobile create source evidence query wiring",
        ),
    ]
    for text, snippets, contract_name in mobile_source_evidence_query_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    mobile_generate_start = mobile_create_text.index("async function generateDraftAndCover")
    mobile_generate_end = mobile_create_text.index("async function copyDraft", mobile_generate_start)
    mobile_generate_text = mobile_create_text[mobile_generate_start:mobile_generate_end]
    mobile_generate_lifecycle_contract_snippets = [
        "const lifecycleWarning = generatedContentLifecycleWarning(data.status);",
        'setProgressLabel("需先核对状态");',
        "onAction(lifecycleWarning);",
        'fetch(`${apiBase}/image/generate`',
    ]
    for snippet in mobile_generate_lifecycle_contract_snippets:
        total += 1
        if snippet not in mobile_generate_text:
            raise SystemExit(f"Missing mobile generation lifecycle contract: {snippet}")
    total += 1
    if mobile_generate_text.index("generatedContentLifecycleWarning(data.status)") > mobile_generate_text.index(
        'fetch(`${apiBase}/image/generate`'
    ):
        raise SystemExit(
            "Mobile generation must check unsafe generated-content lifecycle status before image generation."
        )

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
        "const lifecycleWarning = generatedContent ? generatedContentLifecycleWarning(generatedContent.status) : null;",
        "const exportLocked = Boolean(lifecycleWarning);",
        'data-testid="draft-preview-lifecycle-warning"',
        'disabled={xhsExporting || exportLocked}',
        'disabled={!generatedContent || exportLocked}',
        "function buildMobilePreviewChecklist",
        "state: lifecycleWarning ? \"blocked\" : generatedContent ? \"review\" : \"blocked\"",
        "generationSourceContextStats(generatedContent?.source_context)",
        "}, [generatedContent?.id]);",
        'data-testid="draft-preview-copy"',
        'data-testid="draft-manual-copy-text"',
        'data-testid="draft-preview-prepublish-checklist"',
        'data-testid={`draft-preview-prepublish-check-${item.key}`}',
        'const XHS_COPY_TEXT_ONLY_LABEL = "只复制文案"',
        "{XHS_COPY_TEXT_ONLY_LABEL}",
        "浏览器拦截了剪贴板，文案已展开，可长按全选复制。",
        "浏览器拦截了剪贴板，预览链接已展开，可长按全选复制。",
        "已重新尝试复制文案",
        "文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。",
        "复制文案+封面，人工去小红书发布",
    ]
    for snippet in mobile_xhs_copy_contract_snippets:
        total += 1
        if snippet not in mobile_create_contract_text:
            raise SystemExit(f"Missing mobile Xiaohongshu copy contract: {snippet}")
    total += 1
    if "复制文案+封面，去小红书" in mobile_create_contract_text:
        raise SystemExit(
            "Mobile Xiaohongshu export button must make manual publishing explicit."
        )

    mobile_static_reference_contract_snippets = [
        "先补高赞参考，再启动草稿和封面",
        'MobilePanel title="结构模板"',
        "结构模板 · 参考版式",
        "封面模板 · 参考版式",
    ]
    for snippet in mobile_static_reference_contract_snippets:
        total += 1
        if snippet not in mobile_create_contract_text:
            raise SystemExit(f"Missing mobile static reference contract: {snippet}")

    mobile_topic_recommendation_contract_snippets = [
        "visibleTopicPresets",
        "TOPIC_PRESET_REFRESH_MS",
        "pickGenerationTopicPresetBatch",
        "pickGenerationTopicPresetBatch()",
        "refreshMobileTopicPresets",
        "function applyMobileTopicPreset(preset: GenerationTopicPreset)",
        "function updateMobileTopicAndAutoContext(nextTopic: string)",
        "const previousTopicPreset = findGenerationTopicPresetByTopic(previousTopic);",
        "const nextTopicPreset = findGenerationTopicPresetByTopic(nextTopicText);",
        "if (nextTopicPreset) {\n        return nextTopicPreset.audience;",
        "if (nextTopicPreset) {\n        return nextTopicPreset.tags;",
        "已识别推荐选题",
        "previousTopicPreset && nextTopicText",
        "已切换为自定义选题",
        "buildCustomTopicAudience(previousTopic)",
        "isKnownGenerationTopicAudience(normalizedAudience)",
        "isKnownGenerationTopicTags(normalizedTags)",
        "defaultMobileTargetAudience",
        "defaultMobileTagsText",
        "function clearMobileSourceEvidence()",
        "clearMobileSourceEvidence();",
        "const generatedContentMatchesCurrentInputs = Boolean(",
        "generatedContent.title === topic.trim()",
        "generatedContent.platform === platform",
        "tagsMatchText(generatedContent.tags, tagsText)",
        "sourceContextMatchesKnowledgeQuery(generatedContent.source_context, generationKnowledgeQuery)",
        "generatedContentInputSignatureMatches(",
        "generatedContentInputSignature",
        "currentMobileGenerationInputSignature",
        "setGeneratedContentInputSignature({ contentId: data.id, signature: requestSignature });",
        "parseTagText(tagsText)",
        "const heroProgressPercent = busy",
        "generatedContentMatchesCurrentInputs\n      ? 100",
        'generatedContentMatchesCurrentInputs\n              ? "重新一键生成"',
        'data-testid="mobile-topic-preset-list"',
        'data-testid="mobile-topic-preset-refresh"',
        'data-testid={`mobile-topic-preset-${preset.key}`}',
        "preset.mobileLabel",
        "preset.mobileHelper",
        "buildTopicCoverStyleNotes(",
        "buildTopicCoverStyleNotes(baseCoverStyleNotes, requestPayload.topic)",
        "每 45 秒自动换一批，可自定义",
    ]
    for snippet in mobile_topic_recommendation_contract_snippets:
        total += 1
        if snippet not in mobile_create_contract_text:
            raise SystemExit(f"Missing mobile topic recommendation contract: {snippet}")

    mobile_source_evidence_contract_snippets = [
        'data-testid="mobile-source-evidence"',
        'data-testid="mobile-source-evidence-switcher"',
        'data-testid="mobile-source-knowledge-toggle"',
        'data-testid="mobile-source-web-toggle"',
        'data-testid="mobile-source-knowledge-list"',
        'data-testid="mobile-source-web-list"',
        'data-testid="mobile-source-required-web-warning"',
        "mobile-source-evidence-result-card",
        "type MobileEvidenceSection = \"knowledge\" | \"web\" | null;",
        "const knowledgeOpen = openEvidenceSection === \"knowledge\";",
        "const webOpen = openEvidenceSection === \"web\";",
        "useEffect(() =>",
        "setOpenEvidenceSection(null);",
        "}, [sourceContext, visibleKnowledgeQuery]);",
        "点击下方来源类型展开核对",
        "{knowledgeOpen ? \"已展开\" : \"点击展开\"}",
        "{webOpen ? \"已展开\" : \"点击展开\"}",
        "Tavily 查询：{webSearch.query}",
        "Tavily 摘要：",
        "摘要仅作线索，发布前请点开下方 URL 核对原文。",
        "此选题需要联网来源；未拿到 Tavily 结果前，不要让模型猜测学校、价格、logo 或排名结论。",
        "这个选题需要实时资料，但本次还没拿到可见联网搜索结果；请换关键词、检查 Tavily，或只写核验框架，不要让模型猜测学校、价格、logo 或排名结论。",
        "sourceContext?.review_note",
        "{sourceContext.review_note}",
    ]
    for snippet in mobile_source_evidence_contract_snippets:
        total += 1
        if snippet not in mobile_source_evidence_text:
            raise SystemExit(f"Missing mobile source evidence contract: {snippet}")

    source_evidence_key_contracts = [
        (
            source_evidence_text,
            [
                'data-testid="source-evidence-switcher"',
                'data-testid="source-knowledge-toggle"',
                'data-testid="source-web-toggle"',
                'data-testid="source-knowledge-list"',
                'data-testid="source-web-list"',
                'data-testid="source-required-web-warning"',
                "workspace-evidence-result-card",
                "type EvidenceSection = \"knowledge\" | \"web\" | null;",
                "const knowledgeOpen = openEvidenceSection === \"knowledge\";",
                "const webOpen = openEvidenceSection === \"web\";",
                "useEffect(() =>",
                "setOpenEvidenceSection(null);",
                "}, [sourceContext, visibleKnowledgeQuery]);",
                "点击知识库引用或联网搜索展开核对",
                "{knowledgeOpen ? \"已展开\" : \"点击展开\"}",
                "{webOpen ? \"已展开\" : \"点击展开\"}",
                "const evidenceExcerptClass",
                "max-h-36 overflow-y-auto whitespace-pre-wrap break-words",
                "knowledgeItems.slice(0, 4).map((item, index)",
                'key={`${item.id}-${index}`}',
                "knowledgeItemExcerpt(knowledgeItem, 320)",
                "webResults.slice(0, 4).map((item, index)",
                "aria-label={`打开联网来源：${item.title}`}",
                'rel="noopener noreferrer"',
                'key={`${item.url}-${item.title}-${index}`}',
                "useRef<HTMLDivElement | null>(null)",
                'import { scrollElementIntoView } from "@/lib/scroll-into-view";',
                "scrollElementIntoView(target);",
                "ref={knowledgeListRef}",
                "ref={webListRef}",
                "scroll-mt-24",
                "webSearch?.answer",
                "Tavily 摘要：",
                "摘要仅作线索，发布前请点开下方 URL 核对原文。",
                "此选题需要联网来源；未拿到 Tavily 结果前，不要让模型猜测学校、价格、logo 或排名结论。",
                "这个选题需要实时资料，但本次还没有可见联网搜索结果；请先换关键词、检查 Tavily，或只写核验框架，不要让模型猜测学校、价格、logo 或排名结论。",
            ],
            "PC source evidence stable keys",
        ),
        (
            mobile_source_evidence_text,
            [
                "knowledgeItems.slice(0, 3).map((item, index)",
                "const knowledgeOpen = openEvidenceSection === \"knowledge\";",
                "const webOpen = openEvidenceSection === \"web\";",
                "{knowledgeOpen ? \"已展开\" : \"点击展开\"}",
                "{webOpen ? \"已展开\" : \"点击展开\"}",
                'key={`${item.id}-${index}`}',
                "const mobileEvidenceExcerptClass",
                "max-h-28 overflow-y-auto whitespace-pre-wrap break-words",
                "knowledgeItemExcerpt(knowledgeItem, 240)",
                "webResults.slice(0, 3).map((item, index)",
                "aria-label={`打开联网来源：${item.title}`}",
                'rel="noopener noreferrer"',
                'key={`${item.url}-${item.title}-${index}`}',
                "useRef<HTMLDivElement | null>(null)",
                'import { scrollElementIntoView } from "@/lib/scroll-into-view";',
                "scrollElementIntoView(target);",
                "ref={knowledgeListRef}",
                "ref={webListRef}",
                "scroll-mt-24",
                "webSearch?.answer",
                "Tavily 摘要：",
                "摘要仅作线索，发布前请点开下方 URL 核对原文。",
            ],
            "mobile source evidence stable keys",
        ),
    ]
    for text, snippets, contract_name in source_evidence_key_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    mobile_project_swipe_contract_snippets = [
        "mobileBackGestureStartRef",
        "function shouldIgnoreMobileBackGesture(target: EventTarget | null)",
        "function beginMobileBackGesture({",
        "function finishMobileBackGesture({",
        "const isLeftBackSwipe = start.edge === \"left\"",
        "const isRightBackSwipe = start.edge === \"right\"",
        "handleMobileBackRequest(\"gesture\")",
        "requestMobileNestedBack(source)",
        "addMobileBackHandler(() =>",
        "if (selectedProjectId) {",
        "setSelectedProjectId(null);",
        'data-testid="mobile-create-project-detail"',
        'data-project-swipe-ignore="true"',
    ]
    for snippet in mobile_project_swipe_contract_snippets:
        total += 1
        if snippet not in mobile_create_contract_text:
            raise SystemExit(f"Missing mobile project swipe-back contract: {snippet}")
    total += 1
    if mobile_create_contract_text.count('data-project-swipe-ignore="true"') < 2:
        raise SystemExit(
            "Mobile project swipe-back must ignore both topic presets and draft carousel."
        )

    mobile_draft_delete_contract_snippets = [
        "MOBILE_DELETED_DRAFT_IDS_STORAGE_KEY",
        "function rememberDeletedDraftId(contentId: number)",
        "function filterDeletedMobileDraftHistory(items: MobileDraftHistoryItem[])",
        "function normalizeVisibleDraftHistory(nextItems: MobileDraftHistoryItem[])",
        "return filterDeletedMobileDraftHistory(normalizeMobileDraftHistory(nextItems));",
        "const normalized = normalizeVisibleDraftHistory(nextItems);",
        "MOBILE_COVER_HYDRATION_RETRY_LIMIT",
        "MOBILE_COVER_HYDRATION_RETRY_MS",
        "export const XHS_COVER_WIDTH = 2048;",
        "export const XHS_COVER_HEIGHT = 2736;",
        "canvas.width = image.naturalWidth || XHS_COVER_WIDTH;",
        "canvas.width = XHS_COVER_WIDTH;",
        "context.scale(canvas.width / XHS_COVER_BASE_WIDTH, canvas.height / XHS_COVER_BASE_HEIGHT);",
        'return new File([blob], `${sanitizeFilename(draft.title)}.png`, { type: "image/png" });',
        "async function fetchLatestCover(contentId: number)",
        "const currentStoredContent = readStoredMobileContent();",
        "currentStoredContent?.id !== contentId",
        "function scheduleMissingCoverRetry(items: MobileDraftHistoryItem[], attempt: number)",
        "async function hydrateMissingHistoryCovers(items: MobileDraftHistoryItem[], attempt = 0)",
        "hydrateMissingHistoryCovers(retryItems, attempt + 1)",
        "const missingCoverIds = items",
        "cover: item.cover ?? coverByContentId.get(item.content.id) ?? null",
        "setGeneratedCover(",
        "storedCover?.content_id === visibleStoredContent.id ? storedCover : null",
        "setGeneratedContent(null);",
        "void hydrateMissingHistoryCovers(normalized)",
        "function buildLocalDraftHistoryCoverUrl(content: GeneratedContent)",
        "buildLocalDraftHistoryCoverUrl(item.content)",
        'alt={hasGeneratedCover ? "草稿封面" : "本地封面预览"}',
        "本地预览 · 等待真实封面记录",
        "bodyParagraphs.map((paragraph, index) => (",
        "<p key={`${index}-${paragraph}`}>{renderXhsExpressionText(paragraph)}</p>",
        "function beginDraftSelection(item: MobileDraftHistoryItem)",
        "function toggleDraftSelection(item: MobileDraftHistoryItem)",
        "async function deleteSelectedDraftHistoryItems(items: MobileDraftHistoryItem[])",
        "await fetch(`${apiBase}/content/${item.content.id}`",
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

    mobile_xhs_export_start = mobile_draft_preview_text.index("async function handleOpenXiaohongshu")
    mobile_xhs_export_end = mobile_draft_preview_text.index(
        "async function copyPreviewLink",
        mobile_xhs_export_start,
    )
    mobile_xhs_export_text = mobile_draft_preview_text[
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
        "正在准备打开小红书发布入口；图文只会进入编辑流程，仍需人工确认后提交。",
        "选择小红书后仍需人工确认提交。",
        "并在小红书内人工确认后再提交",
        "人工确认后再提交",
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
        "正在打开小红书发布入口；封面图、标题和正文会一起发送。",
        "已交给小红书；如果正文没有自动带入",
        "选择小红书即可带入封面图",
        "请选择小红书发布入口。如果正文没有自动带入",
        "选择刚下载的封面图后粘贴正文。",
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
        "export function parseTagText",
        "export function tagsMatchText",
        "export function formatTags",
        "export function formatTagLine",
        "const TAG_SPLIT_PATTERN",
        "tag.trim().replace(/^[#＃]+/, \"\")",
        "tagsText.replace(/[#＃]/g, \" #\").split(TAG_SPLIT_PATTERN)",
        "new Set<string>()",
    ]
    for snippet in tag_contract_snippets:
        total += 1
        if snippet not in tags_text:
            raise SystemExit(f"Missing tag format helper contract: {snippet}")

    generation_input_signature_contract_snippets = [
        "export type GenerationInputSignature",
        "export type GeneratedContentInputSignature",
        "export function buildGenerationInputSignature",
        "tags: parseTagText(tagsText)",
        "export function generationInputSignaturesMatch",
        "left.targetAudience === right.targetAudience",
        "left.tone === right.tone",
        "export function generatedContentInputSignatureMatches",
        "Restored drafts may not have an in-memory signature",
        "!record ||",
        "record.contentId !== contentId",
        "generationInputSignaturesMatch(record.signature, currentSignature)",
    ]
    for snippet in generation_input_signature_contract_snippets:
        total += 1
        if snippet not in generation_input_signature_text:
            raise SystemExit(f"Missing generation input signature contract: {snippet}")

    scroll_into_view_contract_snippets = [
        "export function scrollElementIntoView",
        "target: Element",
        '"(prefers-reduced-motion: reduce)"',
        'behavior: prefersReducedMotion ? "auto" : "smooth"',
        "target.scrollIntoView({",
    ]
    for snippet in scroll_into_view_contract_snippets:
        total += 1
        if snippet not in scroll_into_view_text:
            raise SystemExit(f"Missing scroll into view helper contract: {snippet}")

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
            mobile_create_contract_text,
            ["哦、哟、呀、啊、嘛、呢、啦、哈", "不要每句都堆"],
            "Android writing particle style",
        ),
        (
            draft_prompt_text,
            ["Use conversational particles frequently but naturally", "Do not stack particles"],
            "draft prompt particle style",
        ),
        (
            draft_prompt_text,
            [
                "哪些学校",
                "哪个学校",
                "有哪些项目",
                "哪个项目",
                "provide verification dimensions instead of inventing",
                "Do not treat the answer summary as",
                "web_search_context.required",
            ],
            "draft prompt school/project list source guard",
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
            mobile_create_contract_text,
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
        "等待确认",
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
            or snippet in status_labels_text
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


def validate_android_shell_contract() -> int:
    main_activity = (
        ROOT
        / "android-shell"
        / "app"
        / "src"
        / "main"
        / "java"
        / "top"
        / "mvpdark"
        / "opc"
        / "MainActivity.java"
    )
    if not main_activity.exists():
        return 0

    text = main_activity.read_text(encoding="utf-8")
    required_snippets = [
        'target.addJavascriptInterface(new OmpcBridge(), "OMPCAndroid")',
        "public String shareToXiaohongshu(",
        "copyTextToClipboard(title, text)",
        "ShareLaunchResult shareResult = launchXiaohongshuShare(",
        'return shareResult.ok ? "ok" : "error:" + shareResult.message;',
        "new Intent(Intent.ACTION_SEND_MULTIPLE)",
        "putParcelableArrayListExtra(Intent.EXTRA_STREAM",
        "attachShareText(intent, title, text)",
        "clipData.addItem(new ClipData.Item(text))",
        'intent.putExtra("contentText", text)',
        "CountDownLatch latch = new CountDownLatch(1)",
        "shareImageToXiaohongshu(Uri imageUri, String title, String text)",
        "createLegacyXiaohongshuShareIntent(imageUri, title, text)",
        "若小红书未自动填入，请长按粘贴",
        "没找到可以接收封面图的发布入口",
    ]
    forbidden_snippets = [
        'openXiaohongshu(Uri.parse("https://www.xiaohongshu.com/explore"))',
        'openXiaohongshu(Uri.parse("https://www.xiaohongshu.com/discovery"))',
    ]

    total = 0
    for snippet in required_snippets:
        total += 1
        if snippet not in text:
            raise SystemExit(f"Missing Android shell share contract: {snippet}")
    for snippet in forbidden_snippets:
        total += 1
        if snippet in text:
            raise SystemExit(
                f"Android shell must not use misleading Xiaohongshu home fallback: {snippet}"
            )
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
    escaped_markers = [marker for marker in FORBIDDEN_TEXT_MARKERS if marker.startswith("\\u")]
    if escaped_markers:
        raise SystemExit(
            "Text hygiene markers must be actual Unicode characters, not escaped literals: "
            + ", ".join(repr(marker) for marker in escaped_markers)
        )
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
        "login_failure_contract_checked": validate_login_failure_contract(),
        "frontend_design_contract_checked": validate_frontend_design_contract(),
        "topic_presets_contract_checked": validate_topic_presets_contract(),
        "topic_intent_runtime_contract_checked": validate_topic_intent_runtime_contract(),
        "content_production_contract_checked": validate_content_production_contract(),
        "android_shell_contract_checked": validate_android_shell_contract(),
        "text_hygiene_files_checked": validate_text_hygiene(),
    }
    if not args.keep_cache:
        results["removed_pycache_dirs"] = clean_pycache()

    for key, value in results.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()

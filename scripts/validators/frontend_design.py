from __future__ import annotations

import re
from pathlib import Path

from ._helpers import ROOT, _warn, _read_workspace_components_text, _extract_ts_array

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
    workspace_text = _read_workspace_components_text()
    app_shell_text = (
        ROOT / "frontend" / "components" / "app-shell.tsx"
    ).read_text(encoding="utf-8")
    app_error_text = (ROOT / "frontend" / "app" / "error.tsx").read_text(encoding="utf-8")
    global_error_text = (ROOT / "frontend" / "app" / "global-error.tsx").read_text(
        encoding="utf-8"
    )
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
        'pathname === "/"',
        'nextUrl.pathname = "/android"',
        "sec-ch-ua-mobile",
        'forcedTerminal === "pc"',
        'forcedTerminal === "android"',
        'matcher: ["/", "/android/:path*"]',
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

    app_error_boundary_contracts = [
        (
            app_error_text,
            [
                '"use client";',
                "export default function AppError",
                'data-testid="app-error-boundary"',
                'data-testid="app-error-message"',
                'data-testid="app-error-reset"',
                'data-testid="app-error-home"',
                "当前操作没有被提交或发布",
                "返回 OPC 工作台",
                'href="/?theme=mint"',
                "process.env.NODE_ENV === \"development\"",
                "error.digest",
            ],
            "route error boundary",
        ),
        (
            global_error_text,
            [
                '"use client";',
                "export default function GlobalError",
                "<html lang=\"zh-CN\">",
                'data-testid="global-error-boundary"',
                'data-testid="global-error-message"',
                'data-testid="global-error-reset"',
                'data-testid="global-error-home"',
                "当前操作没有被提交或发布",
                "返回 OPC 工作台",
                'href="/?theme=mint"',
                "process.env.NODE_ENV === \"development\"",
                "error.digest",
            ],
            "global error boundary",
        ),
    ]
    for text, snippets, contract_name in app_error_boundary_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

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
    # Knowledge library has been separated to OMPC-ZSCJ; backend routes removed.
    # These contracts are now soft warnings instead of hard failures.
    knowledge_visibility_contracts = [
        (
            workspace_text,
            [
                "function KnowledgeView()",
                "fetchKnowledgeItems(",
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
                _warn(
                    f"knowledge library separated to OMPC-ZSCJ; "
                    f"missing {contract_name} contract: {snippet}"
                )

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

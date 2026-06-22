from __future__ import annotations

from ._content_production_context import ContentProductionTexts


def _check_stale(texts: ContentProductionTexts) -> int:
    workspace_text = texts.workspace_text
    android_text = texts.android_text
    mobile_draft_storage_text = texts.mobile_draft_storage_text
    platform_copy_text = texts.platform_copy_text
    mobile_create_text = texts.mobile_create_text
    mobile_create_utils_text = texts.mobile_create_utils_text
    mobile_create_helpers_text = texts.mobile_create_helpers_text
    mobile_draft_preview_text = texts.mobile_draft_preview_text
    mobile_draft_history_text = texts.mobile_draft_history_text
    mobile_reference_templates_text = texts.mobile_reference_templates_text
    mobile_back_navigation_text = texts.mobile_back_navigation_text
    mobile_cover_share_text = texts.mobile_cover_share_text
    mobile_create_contract_text = texts.mobile_create_contract_text
    mobile_draft_contract_text = texts.mobile_draft_contract_text
    public_preview_text = texts.public_preview_text
    trend_collector_text = texts.trend_collector_text
    mobile_collect_text = texts.mobile_collect_text
    mobile_collect_utils_text = texts.mobile_collect_utils_text
    mobile_review_text = texts.mobile_review_text
    mobile_trend_source_review_text = texts.mobile_trend_source_review_text
    image_service_text = texts.image_service_text
    content_service_text = texts.content_service_text
    content_source_context_text = texts.content_source_context_text
    content_prompt_builder_text = texts.content_prompt_builder_text
    content_service_combined_text = texts.content_service_combined_text
    promotion_brief_text = texts.promotion_brief_text
    content_source_context_test_text = texts.content_source_context_test_text
    e2e_text = texts.e2e_text
    trend_browser_scripts_text = texts.trend_browser_scripts_text
    model_router_text = texts.model_router_text
    workspace_service_text = texts.workspace_service_text
    dependency_service_text = texts.dependency_service_text
    status_labels_text = texts.status_labels_text
    collection_job_status_text = texts.collection_job_status_text
    dashboard_data_text = texts.dashboard_data_text
    app_shell_text = texts.app_shell_text
    app_error_text = texts.app_error_text
    global_error_text = texts.global_error_text
    source_evidence_text = texts.source_evidence_text
    source_card_summary_text = texts.source_card_summary_text
    mobile_source_evidence_text = texts.mobile_source_evidence_text
    promotion_brief_summary_text = texts.promotion_brief_summary_text
    promotion_readiness_summary_text = texts.promotion_readiness_summary_text
    service_error_text = texts.service_error_text
    api_deps_text = texts.api_deps_text
    asset_url_text = texts.asset_url_text
    clipboard_text = texts.clipboard_text
    generated_assets_text = texts.generated_assets_text
    xhs_stickers_text = texts.xhs_stickers_text
    tags_text = texts.tags_text
    generation_input_signature_text = texts.generation_input_signature_text
    scroll_into_view_text = texts.scroll_into_view_text
    topic_presets_text = texts.topic_presets_text
    draft_prompt_text = texts.draft_prompt_text
    humanization_prompt_text = texts.humanization_prompt_text
    image_prompt_text = texts.image_prompt_text
    xhs_style_reference_text = texts.xhs_style_reference_text
    xhs_style_doc_text = texts.xhs_style_doc_text

    total = 0

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

from __future__ import annotations

from ._content_production_context import ContentProductionTexts


def _check_misc(texts: ContentProductionTexts) -> int:
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


    return total

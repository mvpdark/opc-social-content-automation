from __future__ import annotations

import re

from ._content_production_context import ContentProductionTexts


def _check_topic(texts: ContentProductionTexts) -> int:
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

    missing_web_warning_e2e_contracts = [
        "MISSING_WEB_RESULTS_MODEL_GUESS_WARNING",
        "emptySourcePreviewWebResults?: boolean",
        "emptySourcePreviewWebResults = false",
        "emptyWebResults: emptySourcePreviewWebResults",
        "mobile missing Tavily results warns against model-guessed current facts",
        "PC missing Tavily results warns against model-guessed current facts",
        "mobile-source-required-web-warning",
        "source-required-web-warning",
        "mobile-source-web-list",
        "source-web-list",
        'expect(generationRequests.contentGenerate).toHaveLength(0)',
        'expect(generationRequests.imageGenerate).toHaveLength(0)',
    ]
    for snippet in missing_web_warning_e2e_contracts:
        total += 1
        if snippet not in e2e_text:
            raise SystemExit(f"Missing missing-web warning E2E contract: {snippet}")

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


    return total

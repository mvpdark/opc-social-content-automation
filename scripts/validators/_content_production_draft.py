from __future__ import annotations

from ._content_production_context import ContentProductionTexts
from ._helpers import _warn


def _check_draft(texts: ContentProductionTexts) -> int:
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

    draft_schema_contracts = [
        (
            promotion_brief_text,
            [
                "def build_promotion_brief",
                "brief_by_intent",
                "default_brief",
                "FORBIDDEN_PROMOTION_CLAIMS",
                "QUALITY_CHECKS",
                "manual_review_required",
                "verification framework only",
            ],
            "promotion brief builder",
        ),
        (
            content_source_context_text,
            [
                "def _source_cards",
                '"source_cards"',
                '"web:missing-required"',
                '"missing_required_source"',
                "No visible Tavily result supports current-fact conclusions.",
                "from app.services.promotion_brief import build_promotion_brief",
                "def _source_context_with_promotion_brief",
                '"promotion_brief": promotion_brief',
            ],
            "source cards and promotion brief draft payload",
        ),
        (
            draft_prompt_text,
            [
                "If `source_context.source_cards` is provided",
                "treat those cards as the fact",
                "Prefer `source_context.source_cards`",
                "If `promotion_brief` is provided",
                "intent, persona, pain point, trust proof, CTA, forbidden claims",
                "Do not print the brief as a",
            ],
            "source cards and promotion brief prompt guidance",
        ),
        (
            generated_assets_text,
            [
                "export type GenerationSourceCard",
                "source_cards?: GenerationSourceCard[];",
                "export type GenerationPromotionBrief",
                "promotion_brief?: GenerationPromotionBrief | null;",
                "export function promotionBriefDisplayItems",
                "export function buildPromotionReadinessSummary",
                "CTA 待加强",
                "可进入人工复核",
                "复制或发布准备前仍需人工确认",
            ],
            "promotion brief source-context type",
        ),
        (
            content_source_context_test_text,
            [
                '"source_cards"',
                "missing_required_source",
                "No visible Tavily result",
                "test_promotion_brief_maps_topic_intent_to_marketing_plan",
                "test_promotion_brief_downgrades_missing_source_topics_to_verification_framework",
                'promotion_brief == package.payload["source_context"]["promotion_brief"]',
                "guaranteed admission",
                "verification framework only",
            ],
            "promotion brief backend tests",
        ),
        (
            content_service_combined_text,
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
            content_service_combined_text,
            [
                "def _source_context_missing_required_web_results",
                "def _draft_missing_required_web_source_issue",
                "source_fact_issue = _draft_missing_required_web_source_issue",
                'status="source_fact_invalid"',
                "不要让模型猜测学校、价格、logo 或排名结论",
                "missing_web_framework_terms",
                "missing_web_fact_terms",
            ],
            "missing required web source draft guard",
        ),
        (
            content_source_context_test_text,
            [
                "test_generate_content_rejects_blank_ai_draft",
                "test_generate_content_rejects_metadata_section_ai_draft",
                "test_generate_content_rejects_chinese_metadata_section_ai_draft",
                "test_generate_content_rejects_hashtag_line_ai_draft",
                "test_generate_content_rejects_too_thin_ai_draft",
                "test_generate_content_rejects_conclusion_facts_when_required_web_sources_are_missing",
                "test_generate_content_allows_framework_draft_when_required_web_sources_are_missing",
                "Title: overseas doctoral logo check",
                "标题：海外博士官方来源核验",
                "#海外博士 #官方来源",
                "元数据段落",
                "独立话题标签行",
                "草稿正文过短",
                "source_fact_invalid",
                "排名第一名",
                "官网来源核验框架",
                "db.query(Content).count() == 0",
                "GenerationLog",
                "schema_invalid",
            ],
            "draft output schema test",
        ),
    ]
    for text, snippets, contract_name in draft_schema_contracts:
        if not text:
            _warn(f"source file missing, skipping {contract_name} contract")
            continue
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    promotion_brief_visibility_contracts = [
        (
            promotion_brief_summary_text,
            [
                "export function PromotionBriefSummary",
                "promotionBriefDisplayItems(sourceContext)",
                "推广简报",
                "约束撰稿策略、来源边界和行动引导",
                "发布前仍需人工复核",
            ],
            "promotion brief summary component",
        ),
        (
            source_evidence_text,
            [
                "PromotionBriefSummary",
                'testId="source-promotion-brief"',
            ],
            "PC source evidence promotion brief visibility",
        ),
        (
            source_card_summary_text,
            [
                "export function SourceCardSummary",
                "来源卡片",
                "支持内容：",
                "使用边界：",
                "可用于：",
            ],
            "source card summary component",
        ),
        (
            source_evidence_text,
            [
                "SourceCardSummary",
                'testId="source-card-summary"',
                "sourceContext?.source_cards",
            ],
            "PC source card visibility",
        ),
        (
            mobile_source_evidence_text,
            [
                "SourceCardSummary",
                'testId="mobile-source-card-summary"',
                'variant="mobile"',
            ],
            "mobile source card visibility",
        ),
        (
            mobile_source_evidence_text,
            [
                "PromotionBriefSummary",
                'testId="mobile-source-promotion-brief"',
                'variant="mobile"',
            ],
            "mobile source evidence promotion brief visibility",
        ),
        (
            mobile_review_text,
            [
                "PromotionBriefSummary",
                'testId="mobile-review-promotion-brief"',
                'variant="mobile"',
            ],
            "mobile review promotion brief visibility",
        ),
        (
            e2e_text,
            [
                "promotion_brief",
                "source-promotion-brief",
                "mobile-source-promotion-brief",
                "mobile-review-promotion-brief",
                "E2E CTA",
                "复制或发布准备前仍需人工确认",
            ],
            "promotion brief visibility E2E",
        ),
    ]
    for text, snippets, contract_name in promotion_brief_visibility_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    promotion_readiness_contracts = [
        (
            promotion_readiness_summary_text,
            [
                "export function PromotionReadinessSummary",
                "buildPromotionReadinessSummary",
                "推广对齐检查",
                "这里只提示复核重点，不会自动发布",
                'data-testid={`${testId}-score`}',
            ],
            "promotion readiness summary component",
        ),
        (
            workspace_text,
            [
                "PromotionReadinessSummary",
                'testId="pc-export-promotion-readiness"',
                "sourceContext={content.source_context}",
            ],
            "PC promotion readiness visibility",
        ),
        (
            mobile_draft_preview_text,
            [
                "PromotionReadinessSummary",
                'testId="draft-preview-promotion-readiness"',
                "sourceContext={generatedContent?.source_context}",
                'variant="mobile"',
            ],
            "mobile promotion readiness visibility",
        ),
        (
            e2e_text,
            [
                "draft-preview-promotion-readiness",
                "pc-export-promotion-readiness",
                'toContainText("CTA")',
                "已就绪|待加强",
                "可进入人工复核",
            ],
            "promotion readiness E2E",
        ),
    ]
    for text, snippets, contract_name in promotion_readiness_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")

    draft_generation_recovery_contracts = [
        (
            service_error_text,
            [
                "GENERIC_STRUCTURED_SERVICE_ERROR",
                "function normalizeServiceErrorMessage(message: unknown)",
                "nestedMessage = errorObject.message ?? errorObject.detail ?? errorObject.error",
                "export function sanitizeServiceErrorMessage(message: unknown)",
                "服务返回了需要人工处理的错误，请刷新当前数据后重试。",
                "DRAFT_GENERATION_RECOVERY_MARKERS",
                "DRAFT_MISSING_REQUIRED_WEB_SOURCE_MARKERS",
                "formatDraftGenerationErrorMessage",
                "生成结果需要补救",
                "生成已停止：这个选题缺少可见 Tavily 来源",
                "先补来源或改成核验框架",
                "系统不会保存这次不合格草稿",
                "系统不会保存模型猜测的学校、价格、logo 或排名结论",
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
                "detail?: unknown",
                "message?: unknown",
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
                "failSourcePreviewDetail?: unknown",
                "mobile structured source preview error stays recoverable without false draft",
                "PC structured source preview error stays recoverable without false draft",
                "服务返回了需要人工处理的错误，请刷新当前数据后重试。",
                "mobile schema-invalid draft failure gives recovery copy without false draft",
                "PC schema-invalid draft failure gives recovery copy without false draft",
                "mobile source-fact rejection gives source recovery copy without false draft",
                "PC source-fact rejection gives source recovery copy without false draft",
                "生成结果需要补救：请补充业务素材",
                "生成已停止",
                "先补来源或改成核验框架",
                "草稿正文过短，无法覆盖选题、受众、行动建议和人工核对提醒",
                "系统不会保存这次不合格草稿",
                "缺少可见 Tavily 来源时，草稿只能提供核验框架",
            ],
            "schema-invalid draft recovery E2E",
        ),
    ]
    for text, snippets, contract_name in draft_generation_recovery_contracts:
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {contract_name} contract: {snippet}")


    return total

from __future__ import annotations

from ._content_production_context import ContentProductionTexts


def _check_status(texts: ContentProductionTexts) -> int:
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
            f"{android_text}\n{mobile_collect_text}\n{mobile_collect_utils_text}",
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


    return total

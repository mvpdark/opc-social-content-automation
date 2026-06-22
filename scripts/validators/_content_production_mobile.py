from __future__ import annotations

from ._content_production_context import ContentProductionTexts


def _check_mobile(texts: ContentProductionTexts) -> int:
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
        "buildMobileHeroProgressState(",
        "percent: heroProgressPercent",
        'generatedContentMatchesCurrentInputs\n            ? "重新一键生成"',
        'data-testid="mobile-topic-preset-list"',
        'data-testid="mobile-topic-preset-refresh"',
        'data-testid={`mobile-topic-preset-${preset.key}`}',
        "preset.mobileLabel",
        "preset.mobileHelper",
        "buildTopicCoverStyleNotes(",
        "buildTopicCoverStyleNotes(baseCoverStyleNotes, topic)",
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


    return total

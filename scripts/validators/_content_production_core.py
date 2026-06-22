from __future__ import annotations

from ._content_production_context import ContentProductionTexts


def _check_core(texts: ContentProductionTexts) -> int:
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


    return total

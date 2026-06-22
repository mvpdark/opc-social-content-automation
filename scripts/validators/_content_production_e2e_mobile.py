from __future__ import annotations

from ._content_production_context import ContentProductionTexts


def _check_e2e_mobile(texts: ContentProductionTexts) -> int:
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
                "onRetry={draftHistory.retryMobileDraftHistory}",
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


    return total

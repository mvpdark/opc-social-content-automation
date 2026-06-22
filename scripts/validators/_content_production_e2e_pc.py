from __future__ import annotations

from ._content_production_context import ContentProductionTexts


def _check_e2e_pc(texts: ContentProductionTexts) -> int:
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
            f"{mobile_create_text}\n{mobile_create_utils_text}",
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


    return total

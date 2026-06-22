from __future__ import annotations

from dataclasses import dataclass

from ._helpers import ROOT, _read_workspace_components_text, _read_optional_text


@dataclass
class ContentProductionTexts:
    workspace_text: str
    android_text: str
    mobile_draft_storage_text: str
    platform_copy_text: str
    mobile_create_text: str
    mobile_create_utils_text: str
    mobile_create_helpers_text: str
    mobile_draft_preview_text: str
    mobile_draft_history_text: str
    mobile_reference_templates_text: str
    mobile_back_navigation_text: str
    mobile_cover_share_text: str
    mobile_create_contract_text: str
    mobile_draft_contract_text: str
    public_preview_text: str
    trend_collector_text: str
    mobile_collect_text: str
    mobile_collect_utils_text: str
    mobile_review_text: str
    mobile_trend_source_review_text: str
    image_service_text: str
    content_service_text: str
    content_source_context_text: str
    content_prompt_builder_text: str
    content_service_combined_text: str
    promotion_brief_text: str
    content_source_context_test_text: str
    e2e_text: str
    trend_browser_scripts_text: str
    model_router_text: str
    workspace_service_text: str
    dependency_service_text: str
    status_labels_text: str
    collection_job_status_text: str
    dashboard_data_text: str
    app_shell_text: str
    app_error_text: str
    global_error_text: str
    source_evidence_text: str
    source_card_summary_text: str
    mobile_source_evidence_text: str
    promotion_brief_summary_text: str
    promotion_readiness_summary_text: str
    service_error_text: str
    api_deps_text: str
    asset_url_text: str
    clipboard_text: str
    generated_assets_text: str
    xhs_stickers_text: str
    tags_text: str
    generation_input_signature_text: str
    scroll_into_view_text: str
    topic_presets_text: str
    draft_prompt_text: str
    humanization_prompt_text: str
    image_prompt_text: str
    xhs_style_reference_text: str
    xhs_style_doc_text: str


def load_texts() -> ContentProductionTexts:
    """Load all text files needed for content production contract validation."""
    workspace_text = _read_workspace_components_text()
    android_text = (ROOT / "frontend" / "app" / "android" / "page.tsx").read_text(
        encoding="utf-8"
    )
    mobile_draft_storage_text = (
        ROOT / "frontend" / "lib" / "mobile-draft-storage.ts"
    ).read_text(encoding="utf-8")
    platform_copy_text = (
        ROOT / "frontend" / "lib" / "platform-copy.ts"
    ).read_text(encoding="utf-8")
    mobile_create_text = (
        ROOT / "frontend" / "components" / "mobile-create-screen.tsx"
    ).read_text(encoding="utf-8")
    for _mobile_create_child in sorted(
        (ROOT / "frontend" / "components" / "mobile-create").glob("*.ts*")
    ):
        mobile_create_text += "\n" + _mobile_create_child.read_text(encoding="utf-8")
    mobile_create_utils_text = (
        ROOT / "frontend" / "components" / "mobile-create-utils.ts"
    ).read_text(encoding="utf-8")
    mobile_create_helpers_text = (
        ROOT / "frontend" / "components" / "mobile-create-helpers.tsx"
    ).read_text(encoding="utf-8")
    mobile_draft_preview_text = (
        ROOT / "frontend" / "components" / "mobile-draft-preview-editor.tsx"
    ).read_text(encoding="utf-8")
    mobile_draft_history_text = (
        ROOT / "frontend" / "components" / "mobile-draft-history.tsx"
    ).read_text(encoding="utf-8")
    mobile_reference_templates_text = (
        ROOT / "frontend" / "components" / "mobile-reference-templates.tsx"
    ).read_text(encoding="utf-8")
    mobile_back_navigation_text = (
        ROOT / "frontend" / "lib" / "mobile-back-navigation.ts"
    ).read_text(encoding="utf-8")
    mobile_cover_share_text = (
        ROOT / "frontend" / "lib" / "mobile-cover-share.ts"
    ).read_text(encoding="utf-8")
    mobile_create_contract_text = "\n".join(
        [
            android_text,
            mobile_create_text,
            mobile_create_utils_text,
            mobile_create_helpers_text,
            mobile_draft_preview_text,
            mobile_draft_history_text,
            mobile_reference_templates_text,
            mobile_back_navigation_text,
            mobile_cover_share_text,
        ]
    )
    mobile_draft_contract_text = f"{mobile_create_contract_text}\n{mobile_draft_storage_text}"
    public_preview_text = (
        ROOT / "frontend" / "components" / "public-preview-client.tsx"
    ).read_text(encoding="utf-8")
    trend_collector_text = (
        ROOT / "frontend" / "components" / "trend-collector-panel.tsx"
    ).read_text(encoding="utf-8")
    mobile_collect_text = (
        ROOT / "frontend" / "components" / "mobile-collect-screen.tsx"
    ).read_text(encoding="utf-8")
    mobile_collect_utils_text = (
        ROOT / "frontend" / "components" / "mobile-collect-utils.ts"
    ).read_text(encoding="utf-8")
    mobile_review_text = (
        ROOT / "frontend" / "components" / "mobile-review-screen.tsx"
    ).read_text(encoding="utf-8")
    mobile_trend_source_review_text = (
        ROOT / "frontend" / "components" / "mobile-trend-source-review.tsx"
    ).read_text(encoding="utf-8")
    image_service_text = (
        ROOT / "backend" / "app" / "services" / "image_service.py"
    ).read_text(encoding="utf-8")
    content_service_text = (
        ROOT / "backend" / "app" / "services" / "content_service.py"
    ).read_text(encoding="utf-8")
    content_source_context_text = (
        ROOT / "backend" / "app" / "services" / "content_source_context.py"
    ).read_text(encoding="utf-8")
    content_prompt_builder_text = (
        ROOT / "backend" / "app" / "services" / "content_prompt_builder.py"
    ).read_text(encoding="utf-8")
    # Combined text for contracts whose snippets span content_service.py
    # and the refactored content_prompt_builder.py / content_source_context.py.
    content_service_combined_text = (
        f"{content_service_text}\n{content_prompt_builder_text}\n{content_source_context_text}"
    )
    promotion_brief_text = (
        ROOT / "backend" / "app" / "services" / "promotion_brief.py"
    ).read_text(encoding="utf-8")
    content_source_context_test_text = _read_optional_text(
        ROOT / "backend" / "tests" / "test_content_source_context.py"
    )
    if content_source_context_test_text is None:
        content_source_context_test_text = ""
    e2e_text = (
        ROOT / "frontend" / "tests" / "e2e" / "opc.smoke.spec.ts"
    ).read_text(encoding="utf-8")
    trend_browser_scripts_text = (
        ROOT / "backend" / "app" / "services" / "trend_browser_scripts.py"
    ).read_text(encoding="utf-8")
    model_router_text = (
        ROOT / "backend" / "app" / "services" / "model_router.py"
    ).read_text(encoding="utf-8")
    workspace_service_text = (
        ROOT / "backend" / "app" / "services" / "workspace_service.py"
    ).read_text(encoding="utf-8")
    dependency_service_text = (
        ROOT / "backend" / "app" / "services" / "dependency_service.py"
    ).read_text(encoding="utf-8")
    status_labels_text = (ROOT / "frontend" / "lib" / "status-labels.ts").read_text(
        encoding="utf-8"
    )
    collection_job_status_text = (
        ROOT / "frontend" / "lib" / "collection-job-status.ts"
    ).read_text(encoding="utf-8")
    dashboard_data_text = (ROOT / "frontend" / "lib" / "dashboard-data.ts").read_text(
        encoding="utf-8"
    )
    app_shell_text = (ROOT / "frontend" / "components" / "app-shell.tsx").read_text(
        encoding="utf-8"
    )
    app_error_text = (ROOT / "frontend" / "app" / "error.tsx").read_text(encoding="utf-8")
    global_error_text = (ROOT / "frontend" / "app" / "global-error.tsx").read_text(
        encoding="utf-8"
    )
    source_evidence_text = (
        ROOT / "frontend" / "components" / "generation-source-evidence-card.tsx"
    ).read_text(encoding="utf-8")
    source_card_summary_text = (
        ROOT / "frontend" / "components" / "source-card-summary.tsx"
    ).read_text(encoding="utf-8")
    mobile_source_evidence_text = (
        ROOT / "frontend" / "components" / "mobile-source-evidence-panel.tsx"
    ).read_text(encoding="utf-8")
    promotion_brief_summary_text = (
        ROOT / "frontend" / "components" / "promotion-brief-summary.tsx"
    ).read_text(encoding="utf-8")
    promotion_readiness_summary_text = (
        ROOT / "frontend" / "components" / "promotion-readiness-summary.tsx"
    ).read_text(encoding="utf-8")
    service_error_text = (
        ROOT / "frontend" / "lib" / "service-error-copy.ts"
    ).read_text(encoding="utf-8")
    api_deps_text = (ROOT / "backend" / "app" / "api" / "deps.py").read_text(
        encoding="utf-8"
    )
    asset_url_text = (ROOT / "frontend" / "lib" / "asset-url.ts").read_text(
        encoding="utf-8"
    )
    clipboard_text = (ROOT / "frontend" / "lib" / "clipboard.ts").read_text(
        encoding="utf-8"
    )
    generated_assets_text = (
        ROOT / "frontend" / "lib" / "generated-assets.ts"
    ).read_text(encoding="utf-8")
    xhs_stickers_text = (ROOT / "frontend" / "lib" / "xhs-stickers.tsx").read_text(
        encoding="utf-8"
    )
    tags_text = (ROOT / "frontend" / "lib" / "tags.ts").read_text(
        encoding="utf-8"
    )
    generation_input_signature_text = (
        ROOT / "frontend" / "lib" / "generation-input-signature.ts"
    ).read_text(encoding="utf-8")
    scroll_into_view_text = (
        ROOT / "frontend" / "lib" / "scroll-into-view.ts"
    ).read_text(encoding="utf-8")
    topic_presets_text = (ROOT / "frontend" / "lib" / "topic-presets.ts").read_text(
        encoding="utf-8"
    )
    draft_prompt_text = (ROOT / "prompts" / "draft_generation.md").read_text(
        encoding="utf-8"
    )
    humanization_prompt_text = (ROOT / "prompts" / "humanization.md").read_text(
        encoding="utf-8"
    )
    image_prompt_text = (ROOT / "prompts" / "image_generation.md").read_text(
        encoding="utf-8"
    )
    xhs_style_reference_text = (
        ROOT / "prompts" / "xiaohongshu_style_reference.md"
    ).read_text(encoding="utf-8")
    xhs_style_doc_text = (ROOT / "docs" / "XIAOHONGSHU_STYLE_REFERENCE.md").read_text(
        encoding="utf-8"
    )
    return ContentProductionTexts(
        workspace_text=workspace_text,
        android_text=android_text,
        mobile_draft_storage_text=mobile_draft_storage_text,
        platform_copy_text=platform_copy_text,
        mobile_create_text=mobile_create_text,
        mobile_create_utils_text=mobile_create_utils_text,
        mobile_create_helpers_text=mobile_create_helpers_text,
        mobile_draft_preview_text=mobile_draft_preview_text,
        mobile_draft_history_text=mobile_draft_history_text,
        mobile_reference_templates_text=mobile_reference_templates_text,
        mobile_back_navigation_text=mobile_back_navigation_text,
        mobile_cover_share_text=mobile_cover_share_text,
        mobile_create_contract_text=mobile_create_contract_text,
        mobile_draft_contract_text=mobile_draft_contract_text,
        public_preview_text=public_preview_text,
        trend_collector_text=trend_collector_text,
        mobile_collect_text=mobile_collect_text,
        mobile_collect_utils_text=mobile_collect_utils_text,
        mobile_review_text=mobile_review_text,
        mobile_trend_source_review_text=mobile_trend_source_review_text,
        image_service_text=image_service_text,
        content_service_text=content_service_text,
        content_source_context_text=content_source_context_text,
        content_prompt_builder_text=content_prompt_builder_text,
        content_service_combined_text=content_service_combined_text,
        promotion_brief_text=promotion_brief_text,
        content_source_context_test_text=content_source_context_test_text,
        e2e_text=e2e_text,
        trend_browser_scripts_text=trend_browser_scripts_text,
        model_router_text=model_router_text,
        workspace_service_text=workspace_service_text,
        dependency_service_text=dependency_service_text,
        status_labels_text=status_labels_text,
        collection_job_status_text=collection_job_status_text,
        dashboard_data_text=dashboard_data_text,
        app_shell_text=app_shell_text,
        app_error_text=app_error_text,
        global_error_text=global_error_text,
        source_evidence_text=source_evidence_text,
        source_card_summary_text=source_card_summary_text,
        mobile_source_evidence_text=mobile_source_evidence_text,
        promotion_brief_summary_text=promotion_brief_summary_text,
        promotion_readiness_summary_text=promotion_readiness_summary_text,
        service_error_text=service_error_text,
        api_deps_text=api_deps_text,
        asset_url_text=asset_url_text,
        clipboard_text=clipboard_text,
        generated_assets_text=generated_assets_text,
        xhs_stickers_text=xhs_stickers_text,
        tags_text=tags_text,
        generation_input_signature_text=generation_input_signature_text,
        scroll_into_view_text=scroll_into_view_text,
        topic_presets_text=topic_presets_text,
        draft_prompt_text=draft_prompt_text,
        humanization_prompt_text=humanization_prompt_text,
        image_prompt_text=image_prompt_text,
        xhs_style_reference_text=xhs_style_reference_text,
        xhs_style_doc_text=xhs_style_doc_text
    )

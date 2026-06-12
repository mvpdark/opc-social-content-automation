import pytest
from fastapi import HTTPException

from app.models.trend_collection_job import TrendCollectionJob
from app.models.trend_content import TrendContent
from app.schemas.trend import TrendCollectionJobCreate
from app.schemas.trend import TrendLinkImportRequest
from app.schemas.trend import TrendKnowledgeDigestRequest
from app.services.trend_service import (
    build_xhs_link_import_target,
    build_platform_search_target,
    build_safety_profile,
    collection_job_has_pending_auto_start,
    ensure_trend_sources_reviewed,
    mark_collection_job_for_auto_start,
    render_trend_knowledge_digest,
)


def test_build_platform_search_target_encodes_keyword() -> None:
    target = build_platform_search_target("xiaohongshu", "硕升博 申请")

    assert target.search_url == "https://www.xiaohongshu.com/search_result?keyword=%E7%A1%95%E5%8D%87%E5%8D%9A%20%E7%94%B3%E8%AF%B7"
    assert target.content_kind == "image_text"
    assert target.video_collection_enabled is False
    assert target.requires_manual_login is False
    assert target.automation_mode == "public_first_visible_browser"
    assert any("Do not bypass" in note for note in target.safety_notes)


def test_build_xhs_link_import_target_extracts_supported_links() -> None:
    target = build_xhs_link_import_target(
        TrendLinkImportRequest(
            raw_text=(
                "看看这篇 https://www.xiaohongshu.com/explore/abc123?xsec_token=token "
                "还有短链 https://xhslink.com/a/b，其他 https://example.com/skip"
            )
        )
    )

    assert target.platform == "xiaohongshu"
    assert target.extracted_count == 3
    assert target.accepted_count == 2
    assert target.download_media_enabled is False
    assert target.cookie_persistence is False
    assert target.links[0].link_type == "note_detail"
    assert target.links[0].note_id == "abc123"
    assert target.links[1].link_type == "short_link"
    assert target.links[1].requires_resolution is True
    assert target.links[2].accepted is False
    assert "clean-room" in " ".join(target.safety_notes)


def test_build_xhs_link_import_target_handles_profile_and_h_suffix_punctuation() -> None:
    target = build_xhs_link_import_target(
        TrendLinkImportRequest(
            raw_text="用户主页笔记：https://www.xiaohongshu.com/user/profile/user123/note456。",
            max_links=3,
        )
    )

    assert target.accepted_count == 1
    assert target.links[0].normalized_url == "https://www.xiaohongshu.com/user/profile/user123/note456"
    assert target.links[0].link_type == "profile_note"
    assert target.links[0].note_id == "note456"


def test_build_xhs_link_import_target_rejects_incomplete_xhs_urls() -> None:
    target = build_xhs_link_import_target(
        TrendLinkImportRequest(
            raw_text="短链首页 https://xhslink.com 和不完整主页 https://www.xiaohongshu.com/user/profile",
            max_links=5,
        )
    )

    assert target.extracted_count == 2
    assert target.accepted_count == 0
    assert target.links[0].accepted is False
    assert "share code" in (target.links[0].reason or "")
    assert target.links[1].accepted is False
    assert "user id" in (target.links[1].reason or "")


def test_build_safety_profile_defaults_to_account_safety() -> None:
    payload = TrendCollectionJobCreate(platform="xiaohongshu", keyword="硕升博")

    profile = build_safety_profile(payload)

    assert profile["collector"] == "playwright_assisted"
    assert profile["speed_policy"] == "account_safety_first"
    assert profile["human_like_scrolling"] is True
    assert profile["session_persistence"] is True
    assert profile["cookie_persistence"] is False
    assert profile["content_kind"] == "image_text"
    assert profile["video_collection_enabled"] is False
    assert profile["target"]["search_url"].startswith("https://www.xiaohongshu.com/")


def test_build_safety_profile_rejects_invalid_delay_window() -> None:
    payload = TrendCollectionJobCreate(
        platform="douyin",
        keyword="博士申请",
        min_delay_seconds=10,
        max_delay_seconds=10,
    )

    with pytest.raises(HTTPException):
        build_safety_profile(payload)


def test_build_safety_profile_rejects_video_until_review_workflow_exists() -> None:
    payload = TrendCollectionJobCreate(
        platform="xiaohongshu",
        keyword="硕升博",
        content_kind="video",
    )

    with pytest.raises(HTTPException) as exc:
        build_safety_profile(payload)

    assert exc.value.status_code == 422
    assert "Video collection is disabled" in exc.value.detail


def test_mark_collection_job_for_auto_start_resets_restartable_job() -> None:
    job = TrendCollectionJob(
        platform="xiaohongshu",
        keyword="硕升博",
        status="needs_operator_review",
        safety_profile={},
        result_summary={
            "message": "No public results found.",
            "collected_items": 2,
            "trend_ids": [4, 5],
        },
        error="Login wall detected.",
    )

    mark_collection_job_for_auto_start(job)

    assert job.status == "queued"
    assert job.error is None
    assert job.result_summary is not None
    assert job.result_summary["auto_start"] is True
    assert job.result_summary["collected_items"] == 2
    assert job.result_summary["trend_ids"] == [4, 5]
    assert "automatically" in str(job.result_summary["message"])


def test_collection_job_has_pending_auto_start_only_matches_auto_queued_job() -> None:
    queued_job = TrendCollectionJob(
        platform="xiaohongshu",
        keyword="硕升博",
        status="queued",
        safety_profile={},
        result_summary={"auto_start": True},
    )
    legacy_job = TrendCollectionJob(
        platform="xiaohongshu",
        keyword="硕升博",
        status="queued",
        safety_profile={},
        result_summary={"auto_start": False},
    )
    running_job = TrendCollectionJob(
        platform="xiaohongshu",
        keyword="硕升博",
        status="running",
        safety_profile={},
        result_summary={"auto_start": True},
    )

    assert collection_job_has_pending_auto_start(queued_job) is True
    assert collection_job_has_pending_auto_start(legacy_job) is False
    assert collection_job_has_pending_auto_start(running_job) is False


def test_render_trend_knowledge_digest_includes_sources() -> None:
    payload = TrendKnowledgeDigestRequest(
        platform="douyin",
        keyword="博士申请",
        limit=5,
        source_reviewed=True,
    )
    item = TrendContent(
        id=7,
        platform="douyin",
        title="博士申请时间线",
        content="先确认方向，再准备套磁材料和研究计划。",
        author="OPC sample",
        url="https://www.douyin.com/search/example",
        tags=["申请", "规划"],
        likes=10,
        favorites=5,
        comments=2,
        shares=1,
        video_transcript="视频提到提前准备推荐人与导师沟通。",
    )

    title, content, source_ids = render_trend_knowledge_digest([item], payload)

    assert title == "Trend digest: 博士申请 (douyin)"
    assert source_ids == [7]
    assert "博士申请时间线" in content
    assert "Video transcript" in content
    assert "human review" in content


def test_ensure_trend_sources_reviewed_rejects_unreviewed_sources() -> None:
    with pytest.raises(HTTPException) as exc:
        ensure_trend_sources_reviewed(False)

    assert exc.value.status_code == 409
    assert "reviewed" in exc.value.detail


def test_ensure_trend_sources_reviewed_allows_reviewed_sources() -> None:
    ensure_trend_sources_reviewed(True)

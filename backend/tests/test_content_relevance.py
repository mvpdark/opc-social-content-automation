from app.schemas.content import ContentGenerateRequest
from app.services.content_service import _draft_topic_relevance_issue


def test_water_ranking_topic_rejects_generic_application_draft() -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="全球水博排名必看",
        tags=["水博", "排名"],
    )

    issue = _draft_topic_relevance_issue(
        payload,
        "先确认研究方向，再做导师匹配，最后安排申请时间节点。",
    )

    assert issue is not None
    assert "全球水博排名必看" in issue
    assert "水博榜单/排名" in issue


def test_water_ranking_topic_accepts_dimension_based_ranking_draft() -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="全球水博排名必看",
        tags=["水博", "排名"],
    )

    issue = _draft_topic_relevance_issue(
        payload,
        "水博榜单先按认证、预算、毕业难度和在职适配做梯队，再补充已核实学校池。",
    )

    assert issue is None

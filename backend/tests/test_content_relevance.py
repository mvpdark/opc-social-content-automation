import pytest

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


def test_water_ranking_topic_detects_ranking_terms_from_tags() -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="全球水博项目怎么选",
        tags=["水博", "排名"],
    )

    issue = _draft_topic_relevance_issue(
        payload,
        "先确认研究方向，再看导师近三年论文，最后准备套磁邮件。",
    )

    assert issue is not None
    assert "水博榜单/排名" in issue


def test_water_list_topic_accepts_verified_checklist_structure() -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="水资源博士项目清单怎么看",
        tags=["水博", "项目清单"],
    )

    issue = _draft_topic_relevance_issue(
        payload,
        "水博项目清单要先按认证、预算、毕业难度和在职适配做梯队，再补充已核实学校池。",
    )

    assert issue is None


@pytest.mark.parametrize(
    ("topic", "bad_draft", "good_draft", "expected_label"),
    [
        (
            "低预算海外博士怎么筛",
            "先确认研究方向，再看导师近三年论文，最后准备套磁邮件。",
            "低预算海外博士要按学费、驻校费用、认证风险和毕业难度做筛选维度，再分项目梯队。",
            "榜单/筛选",
        ),
        (
            "在职博士项目避坑榜",
            "先按 12-9 个月、9-6 个月安排申请时间线。",
            "在职博士避坑榜要按认证、官网信息、费用节点、毕业要求和授课模式做风险分层。",
            "榜单/筛选",
        ),
        (
            "硕升博申请路线怎么选",
            "先看导师近三年论文，再写套磁邮件。",
            "硕升博路线要按预算、出勤、认证和毕业难度做选择判断。",
            "路线/选择",
        ),
        (
            "上班族申博先选国家还是项目",
            "先设计咨询话术，再做私域跟进和转化。",
            "上班族申博要先按国家、项目、认证、预算、出勤和毕业难度做路线取舍。",
            "路线/选择",
        ),
        (
            "国内博士和海外博士怎么取舍",
            "先看导师近三年论文，再写套磁邮件。",
            "国内博士和海外博士要按职业目标、预算、认证、出勤和时间成本做路线对比。",
            "路线/选择",
        ),
        (
            "没有论文还能读博吗",
            "先做项目预算榜，再看认证和学校池。",
            "没有论文要按项目经历、工作成果、研究计划、背景短板和补强路径判断可行性。",
            "背景补强",
        ),
        (
            "导师匹配前要做的方向自查",
            "先按 12-9 个月、9-6 个月安排申请时间线。",
            "导师匹配前先看研究方向、近期论文、课题交集和套磁邮件证据。",
            "导师匹配",
        ),
        (
            "研究方向太散怎么收",
            "先做项目预算榜，再看认证和学校池。",
            "研究方向太散要按关键词聚类、问题意识、方法匹配和经历证据做收敛。",
            "导师匹配",
        ),
        (
            "在职博士申请时间线怎么排",
            "先做项目预算榜，再看认证和学校池。",
            "时间线要拆成 12-9 个月、9-6 个月、6-3 个月和最后阶段。",
            "时间安排",
        ),
        (
            "一年内申博材料清单",
            "先看导师近三年论文，再写套磁邮件。",
            "一年内申博材料清单要按月份、推荐信、研究计划、英语成绩和文书优先级安排。",
            "时间安排",
        ),
        (
            "英语成绩和文书先准备哪个",
            "先做项目预算榜，再看认证和学校池。",
            "英语成绩和文书要按申请截止、材料依赖、优先级和可并行任务安排。",
            "时间安排",
        ),
        (
            "适合上班族的博士项目怎么咨询",
            "先整理研究方向，再看导师成果。",
            "咨询时先问需求、预算、项目适配，再安排沟通话术和跟进节奏。",
            "咨询转化",
        ),
        (
            "别人问博士含金量怎么回答",
            "先看导师近三年论文，再写套磁邮件。",
            "回答博士含金量时要按职业目标、单位认可、现实成本和价值解释处理异议。",
            "咨询转化",
        ),
    ],
)
def test_topic_intent_relevance_rejects_drift_and_accepts_matching_draft(
    topic: str,
    bad_draft: str,
    good_draft: str,
    expected_label: str,
) -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic=topic,
        tags=[],
    )

    issue = _draft_topic_relevance_issue(payload, bad_draft)

    assert issue is not None
    assert topic in issue
    assert expected_label in issue
    assert _draft_topic_relevance_issue(payload, good_draft) is None

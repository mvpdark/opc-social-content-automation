import pytest

from app.schemas.content import ContentGenerateRequest
from app.services.content_service import _draft_topic_relevance_issue
from app.services.topic_intent import first_matching_topic_intent
from topic_preset_helpers import load_generation_topic_presets, split_topic_tags


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


@pytest.mark.parametrize("topic", ["水博有哪些学校", "水博哪个学校好"])
def test_water_school_list_topic_rejects_mentor_drift(topic: str) -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic=topic,
        tags=["水博", "博士项目"],
    )

    issue = _draft_topic_relevance_issue(
        payload,
        "先确认研究方向，再看导师近三年论文，最后准备套磁邮件。",
    )

    assert issue is not None
    assert "水博榜单/排名" in issue
    assert (
        _draft_topic_relevance_issue(
            payload,
            "水博学校池要按认证、预算、毕业难度和在职适配做清单，再逐项核验官网。",
        )
        is None
    )


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


def test_list_filter_topic_rejects_generic_school_project_name_drop() -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="低预算海外博士怎么筛",
        tags=["海外博士", "低预算博士", "在职博士", "博士项目"],
    )

    issue = _draft_topic_relevance_issue(
        payload,
        "先列几个学校和项目，再看导师近三年论文，最后安排套磁邮件。",
    )

    assert issue is not None
    assert "榜单/筛选" in issue
    assert (
        _draft_topic_relevance_issue(
            payload,
            "低预算海外博士要按学费、认证风险、驻校成本和毕业难度做筛选维度，再分项目梯队。",
        )
        is None
    )


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
        (
            "博士含金量排行",
            "回答博士含金量时要按职业目标、单位认可、现实成本和价值解释处理异议。",
            "博士含金量排行要按认证、费用、职业认可和学习价值做梯队筛选。",
            "榜单/筛选",
        ),
        (
            "水博项目校徽和价格怎么对比",
            "先确认研究方向，再看导师近三年论文，最后准备套磁邮件。",
            "水博项目校徽和价格要按官网来源、官方 logo/校徽、学费费用、认证政策和待复核字段做核验清单。",
            "来源核验",
        ),
        (
            "博士项目官方来源怎么查",
            "先确认研究方向，再看导师近三年论文，最后准备套磁邮件。",
            "博士项目官方来源要按官网 URL、项目页、公开费用、认证政策和待复核字段做核验清单。",
            "来源核验",
        ),
        (
            "海外博士来源核验清单",
            "先做预算友好榜，再按学校池和毕业难度做排行。",
            "海外博士来源核验清单要按官网 URL、官方项目页、费用页、认证政策和待复核字段逐项标注。",
            "来源核验",
        ),
        (
            "学校官网学费表怎么查",
            "先按 12-9 个月、9-6 个月安排申请时间线。",
            "学校官网学费表要按官方项目页、费用页、收费标准、年份口径和待复核字段做来源核验。",
            "来源核验",
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


@pytest.mark.parametrize(
    ("topic", "tags", "expected_label"),
    [
        (
            "怎么判断导师是否适合自己",
            ["导师选择", "博士申请", "导师匹配", "研究方向"],
            "导师匹配",
        ),
        (
            "什么时候开始联系导师",
            ["联系导师", "套磁", "博士申请", "申请时间线"],
            "时间安排",
        ),
        (
            "申博材料清单怎么看",
            ["申请时间线", "材料准备", "优先级"],
            "时间安排",
        ),
        (
            "博士申请材料清单怎么看",
            ["时间安排", "材料准备", "文书优先级"],
            "时间安排",
        ),
        (
            "申请节点清单怎么看",
            ["时间安排", "材料准备", "截止时间"],
            "时间安排",
        ),
        (
            "DDL清单怎么看",
            ["申请时间线", "材料准备", "优先级"],
            "时间安排",
        ),
        (
            "时间节点清单怎么看",
            ["申请时间线", "优先级"],
            "时间安排",
        ),
        (
            "博士申请DDL清单",
            ["时间安排", "截止时间"],
            "时间安排",
        ),
        (
            "博士项目咨询前必问5个问题",
            ["博士咨询", "项目筛选", "在职博士", "私域转化"],
            "咨询转化",
        ),
        (
            "海外博士价格怎么对比",
            ["海外博士", "价格", "学费"],
            "来源核验",
        ),
        (
            "水博项目校徽和价格怎么核验",
            ["水博", "官网核验", "校徽logo", "学费价格"],
            "来源核验",
        ),
        (
            "博士项目官方来源怎么查",
            ["来源核验", "官网", "认证政策"],
            "来源核验",
        ),
        (
            "海外博士来源核验清单",
            ["官网核验", "项目来源"],
            "来源核验",
        ),
        (
            "海外博士官方来源和费用怎么查",
            ["海外博士", "官方来源", "官网核验", "学费费用", "认证政策"],
            "来源核验",
        ),
        (
            "学校官网学费表怎么查",
            ["博士项目", "费用页", "收费标准"],
            "来源核验",
        ),
        (
            "私域里怎么筛选博士咨询客户",
            ["私域运营", "博士咨询", "线索筛选", "项目适配"],
            "咨询转化",
        ),
        (
            "博士含金量排行",
            ["博士含金量", "排名", "价值对比"],
            "榜单/筛选",
        ),
    ],
)
def test_recommended_topic_title_intent_takes_priority_over_generic_tags(
    topic: str,
    tags: list[str],
    expected_label: str,
) -> None:
    rule = first_matching_topic_intent(topic, tags)

    assert rule is not None
    assert rule.label == expected_label


def test_generation_topic_presets_align_with_backend_intents() -> None:
    presets = load_generation_topic_presets()
    compatible_labels = {
        "榜单型": {"榜单/筛选"},
        "路线型": {"路线/选择", "背景补强"},
        "导师型": {"导师匹配"},
        "时间型": {"时间安排"},
        "来源型": {"来源核验"},
        "转化型": {"咨询转化"},
    }

    assert len(presets) >= 20
    for preset in presets:
        tags = split_topic_tags(preset["tags"])
        rule = first_matching_topic_intent(preset["topic"], tags)

        assert rule is not None, preset["key"]
        assert rule.label in compatible_labels[preset["desktopLabel"]], preset["key"]


def test_generation_topic_presets_keep_broad_recommendation_pool() -> None:
    presets = load_generation_topic_presets()
    labels = [preset["desktopLabel"] for preset in presets]
    expected_minimums = {
        "榜单型": 4,
        "路线型": 4,
        "导师型": 4,
        "时间型": 4,
        "转化型": 4,
        "来源型": 2,
    }

    assert len(presets) >= 20
    for label, minimum in expected_minimums.items():
        assert labels.count(label) >= minimum, label

    for preset in presets:
        assert preset["topic"].strip(), preset["key"]
        assert preset["tags"].strip(), preset["key"]
        assert len(split_topic_tags(preset["tags"])) >= 3, preset["key"]
        assert preset["knowledgeQuery"].strip(), preset["key"]
        assert preset["coverDirection"].strip(), preset["key"]

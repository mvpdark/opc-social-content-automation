from dataclasses import dataclass


WATER_ROUTE_TOPIC_TERMS = ("水博", "海外博士", "境外博士")
RANKING_TOPIC_TERMS = ("排名", "排行", "榜", "榜单", "必看")
RANKING_DRAFT_TERMS = (
    "排名",
    "排行",
    "榜",
    "榜单",
    "梯队",
    "学校池",
    "项目池",
    "路线池",
    "清单",
    "认证",
    "预算",
    "毕业难度",
)


@dataclass(frozen=True)
class TopicIntentRule:
    key: str
    topic_terms: tuple[str, ...]
    draft_terms: tuple[str, ...]
    label: str
    guidance: str


TOPIC_INTENT_RULES = (
    TopicIntentRule(
        key="route",
        topic_terms=("路线", "怎么选", "选择", "路径"),
        draft_terms=("路线", "路径", "选择", "适配", "判断", "对比", "方案"),
        label="路线/选择",
        guidance="请围绕路线对比、选择标准、适配人群和判断步骤展开。",
    ),
    TopicIntentRule(
        key="mentor",
        topic_terms=("导师", "匹配", "套磁"),
        draft_terms=("导师", "匹配", "研究方向", "论文", "课题", "成果", "套磁", "邮件"),
        label="导师匹配",
        guidance="请围绕研究方向、导师成果、论文/课题交集和套磁前准备展开。",
    ),
    TopicIntentRule(
        key="timeline",
        topic_terms=("时间线", "时间节点", "时间怎么排", "什么时候"),
        draft_terms=("时间线", "时间节点", "阶段", "提前", "月份", "DDL", "安排", "节奏"),
        label="时间安排",
        guidance="请围绕申请阶段、时间节点、提前准备和执行节奏展开。",
    ),
    TopicIntentRule(
        key="sales",
        topic_terms=("咨询", "转化", "上班族", "私域", "获客"),
        draft_terms=("咨询", "需求", "预算", "适配", "沟通", "话术", "转化", "项目"),
        label="咨询转化",
        guidance="请围绕用户需求、预算、项目适配、沟通话术和转化路径展开。",
    ),
)


def contains_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term.lower() in normalized for term in terms)


def joined_topic_text(topic: str, tags: list[str] | None = None) -> str:
    return " ".join([topic, *(tags or [])])


def is_water_ranking_topic(topic: str, tags: list[str] | None = None) -> bool:
    topic_text = joined_topic_text(topic, tags)
    return contains_any(topic_text, WATER_ROUTE_TOPIC_TERMS) and contains_any(
        topic,
        RANKING_TOPIC_TERMS,
    )


def first_matching_topic_intent(
    topic: str,
    tags: list[str] | None = None,
) -> TopicIntentRule | None:
    topic_text = joined_topic_text(topic, tags)
    return next(
        (rule for rule in TOPIC_INTENT_RULES if contains_any(topic_text, rule.topic_terms)),
        None,
    )

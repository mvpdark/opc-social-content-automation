from dataclasses import dataclass


WATER_ROUTE_TOPIC_TERMS = ("水博", "海外博士", "境外博士")
SCHOOL_PROJECT_LIST_TOPIC_TERMS = (
    "哪些学校",
    "有哪些学校",
    "哪几所学校",
    "哪个学校",
    "哪所学校",
    "哪些院校",
    "有哪些院校",
    "哪个院校",
    "哪所院校",
    "哪些项目",
    "有哪些项目",
    "哪几个项目",
    "哪个项目",
)
RANKING_TOPIC_TERMS = (
    "排名",
    "排行",
    "榜",
    "榜单",
    "清单",
    "必看",
    *SCHOOL_PROJECT_LIST_TOPIC_TERMS,
)
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
        key="list_filter",
        topic_terms=(
            "排名",
            "排行",
            "榜",
            "榜单",
            "怎么筛",
            "筛选",
            "避坑榜",
            "清单怎么看",
            *SCHOOL_PROJECT_LIST_TOPIC_TERMS,
        ),
        draft_terms=(
            "排名",
            "排行",
            "榜",
            "榜单",
            "筛选",
            "维度",
            "梯队",
            "清单",
            "预算",
            "费用",
            "学费",
            "认证",
            "风险",
            "避坑",
            "项目",
            "学校",
        ),
        label="榜单/筛选",
        guidance="请围绕筛选维度、榜单结构、预算/认证/风险分层和项目核验动作展开。",
    ),
    TopicIntentRule(
        key="source_check",
        topic_terms=(
            "校徽",
            "logo",
            "标志",
            "核验",
            "来源",
            "官方",
            "项目页",
            "费用页",
            "学费表",
            "收费",
            "价格",
            "费用",
            "学费",
            "官网",
            "政策",
            "认证",
        ),
        draft_terms=(
            "核验",
            "来源",
            "官网",
            "官方",
            "项目页",
            "费用页",
            "学费表",
            "收费",
            "校徽",
            "logo",
            "标志",
            "价格",
            "费用",
            "学费",
            "认证",
            "政策",
            "待复核",
            "维度",
            "清单",
        ),
        label="来源核验",
        guidance="请围绕官方来源、URL/snippet 证据、价格/校徽/认证字段、待复核风险和核验清单展开。",
    ),
    TopicIntentRule(
        key="route",
        topic_terms=(
            "路线",
            "怎么选",
            "选择",
            "路径",
            "先选",
            "取舍",
            "国内博士",
            "海外博士",
        ),
        draft_terms=(
            "路线",
            "路径",
            "选择",
            "适配",
            "判断",
            "对比",
            "方案",
            "国家",
            "国内",
            "海外",
            "取舍",
        ),
        label="路线/选择",
        guidance="请围绕路线对比、选择标准、适配人群和判断步骤展开。",
    ),
    TopicIntentRule(
        key="background",
        topic_terms=("没论文", "没有论文", "论文经历", "还能读博"),
        draft_terms=(
            "论文",
            "项目经历",
            "工作成果",
            "研究计划",
            "背景",
            "短板",
            "补强",
            "可行性",
        ),
        label="背景补强",
        guidance="请围绕论文短板、项目经历、工作成果、研究计划和背景补强路径展开。",
    ),
    TopicIntentRule(
        key="mentor",
        topic_terms=("导师", "匹配", "套磁", "研究方向", "方向太散"),
        draft_terms=(
            "导师",
            "匹配",
            "研究方向",
            "论文",
            "课题",
            "成果",
            "套磁",
            "邮件",
            "关键词",
            "方法",
            "问题意识",
            "收敛",
        ),
        label="导师匹配",
        guidance="请围绕研究方向、导师成果、论文/课题交集和套磁前准备展开。",
    ),
    TopicIntentRule(
        key="timeline",
        topic_terms=(
            "时间线",
            "时间节点",
            "时间怎么排",
            "什么时候",
            "材料清单",
            "优先级",
            "先准备",
            "一年内",
        ),
        draft_terms=(
            "时间线",
            "时间节点",
            "阶段",
            "提前",
            "月份",
            "DDL",
            "安排",
            "节奏",
            "材料",
            "清单",
            "优先级",
            "推荐信",
            "研究计划",
            "文书",
            "英语",
        ),
        label="时间安排",
        guidance="请围绕申请阶段、时间节点、提前准备和执行节奏展开。",
    ),
    TopicIntentRule(
        key="sales",
        topic_terms=("咨询", "转化", "上班族", "私域", "获客", "含金量", "怎么回答"),
        draft_terms=(
            "咨询",
            "需求",
            "预算",
            "适配",
            "沟通",
            "话术",
            "转化",
            "项目",
            "含金量",
            "价值",
            "认可",
            "职业",
            "异议",
            "回答",
        ),
        label="咨询转化",
        guidance="请围绕用户需求、预算、项目适配、沟通话术和转化路径展开。",
    ),
)

STRONG_TOPIC_TERMS_BY_RULE = {
    "list_filter": (
        "排名",
        "排行",
        "排行榜",
        "榜",
        "榜单",
        "避坑榜",
        "清单怎么看",
    ),
    "timeline": (
        "时间线",
        "时间节点",
        "时间怎么排",
        "什么时候",
        "材料清单",
        "优先级",
        "先准备",
        "一年内",
    ),
    "sales": ("咨询", "转化", "私域", "获客", "含金量", "怎么回答"),
}


def contains_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term.lower() in normalized for term in terms)


def joined_topic_text(topic: str, tags: list[str] | None = None) -> str:
    return " ".join([topic, *(tags or [])])


def _topic_intent_score(text: str, rule: TopicIntentRule) -> int:
    normalized = text.lower()
    strong_terms = STRONG_TOPIC_TERMS_BY_RULE.get(rule.key, ())
    return sum(
        2 if term in strong_terms else 1
        for term in rule.topic_terms
        if term.lower() in normalized
    )


def _best_matching_topic_intent(text: str) -> TopicIntentRule | None:
    scored_rules = [
        (score, rule)
        for rule in TOPIC_INTENT_RULES
        if (score := _topic_intent_score(text, rule)) > 0
    ]
    if not scored_rules:
        return None
    return max(scored_rules, key=lambda item: item[0])[1]


def is_water_ranking_topic(topic: str, tags: list[str] | None = None) -> bool:
    topic_text = joined_topic_text(topic, tags)
    return contains_any(topic_text, WATER_ROUTE_TOPIC_TERMS) and contains_any(
        topic_text,
        RANKING_TOPIC_TERMS,
    )


def first_matching_topic_intent(
    topic: str,
    tags: list[str] | None = None,
) -> TopicIntentRule | None:
    return _best_matching_topic_intent(topic) or _best_matching_topic_intent(" ".join(tags or []))

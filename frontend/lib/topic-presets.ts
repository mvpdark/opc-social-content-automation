export type GenerationTopicPresetKey = string;

export type GenerationTopicPreset = {
  audience: string;
  coverDirection: string;
  desktopHelper: string;
  desktopLabel: string;
  key: GenerationTopicPresetKey;
  knowledgeQuery: string;
  mobileHelper: string;
  mobileLabel: string;
  tags: string;
  topic: string;
};

export const TOPIC_PRESET_ROTATION_SIZE = 6;
export const TOPIC_PRESET_REFRESH_MS = 45_000;

const SOURCE_EVIDENCE_REQUIRED_KEYWORDS = [
  "官网",
  "官方",
  "来源",
  "证据",
  "核验",
  "校徽",
  "价格",
  "费用",
  "学费",
  "排名",
  "榜单",
  "学校",
  "院校",
  "项目清单",
  "认证",
  "logo",
  "official",
  "source",
  "sources",
  "tuition",
  "fee",
  "fees",
  "price",
  "cost",
  "ranking",
  "rankings",
  "school",
  "schools",
  "university",
  "universities",
  "program list",
  "accreditation",
  "市场数据",
  "市场行情",
  "行情",
  "最新价格",
  "价格走势",
  "market data",
  "market rate",
  "market rates",
  "market price",
  "market prices",
  "pricing benchmark",
  "pricing benchmarks",
  "current price",
  "latest price",
  "live price"
];

export const generationTopicPresets: GenerationTopicPreset[] = [
  {
    audience: "想快速筛选海外博士路线的在职申请人",
    coverDirection:
      "使用榜单矩阵或排名分层表，突出认证优先、预算友好、在职适配等维度，不使用未经核实的校徽、官方标志或录取承诺。",
    desktopHelper: "按榜单、认证、预算和在职友好度展开",
    desktopLabel: "榜单型",
    key: "ranking-water-global",
    knowledgeQuery: "全球 水博 博士 项目 排名 认证 预算 在职",
    mobileHelper: "榜单/排名",
    mobileLabel: "榜单",
    tags: "水博,海外博士,在职博士,博士项目,小红书获客",
    topic: "全球水博排名必看"
  },
  {
    audience: "预算有限但想读正规海外博士的在职申请人",
    coverDirection:
      "使用预算分层榜单或费用雷达图，突出学费、驻校成本、认证风险和时间成本，不承诺低价或包录取。",
    desktopHelper: "按预算、认证和风险分层",
    desktopLabel: "榜单型",
    key: "ranking-low-budget",
    knowledgeQuery: "低预算 海外博士 在职博士 学费 认证 项目",
    mobileHelper: "预算榜单",
    mobileLabel: "榜单",
    tags: "海外博士,低预算博士,在职博士,博士项目",
    topic: "低预算海外博士怎么筛"
  },
  {
    audience: "准备引用学校官网、费用页或校徽素材的硕升博申请人",
    coverDirection:
      "使用来源核验清单或证据卡片，突出官网 URL、费用口径、校徽/logo 授权、认证年份和待复核字段，不展示未经核实的校徽或价格结论。",
    desktopHelper: "按官网、价格、校徽和认证字段核验",
    desktopLabel: "来源型",
    key: "source-logo-price",
    knowledgeQuery: "水博 海外博士 官网 校徽 logo 价格 学费 费用 认证 政策 来源 核验",
    mobileHelper: "来源核验",
    mobileLabel: "来源",
    tags: "水博,海外博士,官网核验,校徽logo,学费价格",
    topic: "水博项目校徽和价格怎么核验"
  },
  {
    audience: "想核对海外博士项目官网、费用页和认证口径的申请人",
    coverDirection:
      "使用官网证据链或费用核验表，突出项目页 URL、学费年份、收费口径、认证政策和待确认字段；未核实前不写价格结论或学校推荐。",
    desktopHelper: "按官网 URL、费用页、认证和年份口径核验",
    desktopLabel: "来源型",
    key: "source-official-fee-check",
    knowledgeQuery: "海外博士 官方来源 官网 项目页 学费 费用 认证 政策 年份 口径",
    mobileHelper: "官网核验",
    mobileLabel: "来源",
    tags: "海外博士,官方来源,官网核验,学费费用,认证政策",
    topic: "海外博士官方来源和费用怎么查"
  },
  {
    audience: "担心遇到不靠谱博士项目的咨询用户",
    coverDirection:
      "使用红黄绿风险清单或避坑榜，突出认证、官网信息、毕业要求、授课模式和付款节点。",
    desktopHelper: "按项目风险和核验动作展开",
    desktopLabel: "榜单型",
    key: "ranking-risk-check",
    knowledgeQuery: "在职博士 项目 避坑 认证 毕业要求 学位核验",
    mobileHelper: "避坑清单",
    mobileLabel: "榜单",
    tags: "博士项目,在职博士,避坑,学位认证",
    topic: "在职博士项目避坑榜"
  },
  {
    audience: "水资源、环境或土木方向背景的申博人群",
    coverDirection:
      "使用方向地图或项目索引卡，突出水资源、水环境、水利、地下水、海岸管理等方向，学校与项目必须来自已核验资料。",
    desktopHelper: "按水资源方向和项目类型展开",
    desktopLabel: "榜单型",
    key: "ranking-water-programs",
    knowledgeQuery: "water resources PhD hydrology water science university program ranking",
    mobileHelper: "项目清单",
    mobileLabel: "榜单",
    tags: "水资源博士,水博,海外博士,项目清单",
    topic: "水资源博士项目清单怎么看"
  },
  {
    audience: "准备硕升博但不知道选国内还是海外的学生",
    coverDirection:
      "使用路线决策地图或分叉路径图，突出国内/海外/在职路线对比和选择条件，避免做成导师匹配或时间表。",
    desktopHelper: "按选择路径和判断条件展开",
    desktopLabel: "路线型",
    key: "route-main",
    knowledgeQuery: "硕升博 申请路线 国内 海外 在职博士",
    mobileHelper: "路线判断",
    mobileLabel: "路线",
    tags: "硕升博,博士申请,路线规划,在职博士",
    topic: "硕升博申请路线怎么选"
  },
  {
    audience: "边工作边准备博士申请的人群",
    coverDirection:
      "使用先后顺序决策树，突出先定国家/项目/方向的判断条件和常见误区。",
    desktopHelper: "按路线选择顺序展开",
    desktopLabel: "路线型",
    key: "route-country-program",
    knowledgeQuery: "在职博士 先选国家 先选项目 博士申请路线",
    mobileHelper: "路线顺序",
    mobileLabel: "路线",
    tags: "在职博士,海外博士,博士申请,路线规划",
    topic: "上班族申博先选国家还是项目"
  },
  {
    audience: "纠结国内博士和海外博士含金量的人群",
    coverDirection:
      "使用对比表或天平图，突出职业目标、时间成本、研究训练、认证和预算的权衡。",
    desktopHelper: "按国内/海外路线取舍展开",
    desktopLabel: "路线型",
    key: "route-domestic-overseas",
    knowledgeQuery: "国内博士 海外博士 在职博士 含金量 认证 申请",
    mobileHelper: "路线对比",
    mobileLabel: "路线",
    tags: "国内博士,海外博士,在职博士,博士申请",
    topic: "国内博士和海外博士怎么取舍"
  },
  {
    audience: "论文经历薄弱但想评估申博可能性的申请人",
    coverDirection:
      "使用经历补强路线图，突出论文、项目、工作成果、研究计划和导师匹配的补强顺序。",
    desktopHelper: "按背景短板和补强动作展开",
    desktopLabel: "路线型",
    key: "route-no-paper",
    knowledgeQuery: "没有论文 博士申请 在职博士 研究计划 项目经历",
    mobileHelper: "背景补强",
    mobileLabel: "路线",
    tags: "博士申请,论文经历,研究计划,背景提升",
    topic: "没有论文还能读博吗"
  },
  {
    audience: "已经有研究兴趣但不知道怎么找导师的申请人",
    coverDirection:
      "使用导师匹配雷达、自查清单或研究方向卡片，突出方向适配、论文项目、经历接合度，不做榜单排名。",
    desktopHelper: "围绕方向自查和导师匹配动作",
    desktopLabel: "导师型",
    key: "mentor-direction-check",
    knowledgeQuery: "博士申请 导师匹配 研究方向 套磁",
    mobileHelper: "导师匹配",
    mobileLabel: "导师",
    tags: "导师匹配,研究方向,博士申请,套磁",
    topic: "导师匹配前要做的方向自查"
  },
  {
    audience: "套磁后没有收到回复的申请人",
    coverDirection:
      "使用邮件诊断清单或回复率漏斗，突出方向错配、邮件过泛、材料不足和时机问题。",
    desktopHelper: "按套磁失败原因展开",
    desktopLabel: "导师型",
    key: "mentor-email-no-reply",
    knowledgeQuery: "博士申请 套磁邮件 没回复 导师匹配 研究方向",
    mobileHelper: "套磁诊断",
    mobileLabel: "导师",
    tags: "套磁邮件,导师匹配,博士申请,研究方向",
    topic: "套磁邮件为什么没人回"
  },
  {
    audience: "想判断导师是否值得联系的申请人",
    coverDirection:
      "使用导师适配打分卡，突出近年论文、课题、招生方向、学生去向和沟通风格。",
    desktopHelper: "按导师适配维度展开",
    desktopLabel: "导师型",
    key: "mentor-fit-score",
    knowledgeQuery: "博士导师 适配度 论文 课题 招生方向 学生去向",
    mobileHelper: "导师打分",
    mobileLabel: "导师",
    tags: "导师选择,博士申请,导师匹配,研究方向",
    topic: "怎么判断导师是否适合自己"
  },
  {
    audience: "研究兴趣很多但不知道怎么收敛的人群",
    coverDirection:
      "使用研究方向收敛漏斗，突出关键词聚类、问题意识、方法匹配和经历证据。",
    desktopHelper: "按方向收敛和表达展开",
    desktopLabel: "导师型",
    key: "mentor-direction-narrow",
    knowledgeQuery: "博士申请 研究方向 收敛 research proposal 方向表达",
    mobileHelper: "方向收敛",
    mobileLabel: "导师",
    tags: "研究方向,博士申请,研究计划,导师匹配",
    topic: "研究方向太散怎么收"
  },
  {
    audience: "准备一年内启动博士申请的在职人群",
    coverDirection:
      "使用时间轴、日历节点或材料排期表，突出月份节点、材料准备和沟通节奏，不做学校排名。",
    desktopHelper: "围绕时间表、材料和节点",
    desktopLabel: "时间型",
    key: "timeline-main",
    knowledgeQuery: "在职博士 申请时间线 材料准备 节点",
    mobileHelper: "时间节点",
    mobileLabel: "时间",
    tags: "在职博士,申请时间线,材料准备,硕升博",
    topic: "在职博士申请时间线怎么排"
  },
  {
    audience: "希望一年内完成申请准备的人群",
    coverDirection:
      "使用12个月准备表或材料清单，突出简历、研究计划、推荐信、成绩和语言节点。",
    desktopHelper: "按一年准备节奏展开",
    desktopLabel: "时间型",
    key: "timeline-one-year",
    knowledgeQuery: "博士申请 一年准备 材料清单 推荐信 研究计划 英语",
    mobileHelper: "一年计划",
    mobileLabel: "时间",
    tags: "博士申请,申请时间线,材料清单,研究计划",
    topic: "一年内申博材料清单"
  },
  {
    audience: "不确定何时开始联系导师的申请人",
    coverDirection:
      "使用联系导师时机表，突出材料成熟度、招生季、项目截止日期和回复节奏。",
    desktopHelper: "按联系时机和前置条件展开",
    desktopLabel: "时间型",
    key: "timeline-contact-mentor",
    knowledgeQuery: "博士申请 什么时候 联系导师 套磁 截止日期",
    mobileHelper: "联系节点",
    mobileLabel: "时间",
    tags: "联系导师,套磁,博士申请,申请时间线",
    topic: "什么时候开始联系导师"
  },
  {
    audience: "语言成绩和文书都没准备好的人群",
    coverDirection:
      "使用优先级排序卡，突出申请截止、短板补齐、材料依赖关系和可并行任务。",
    desktopHelper: "按材料优先级展开",
    desktopLabel: "时间型",
    key: "timeline-language-doc",
    knowledgeQuery: "博士申请 英语成绩 文书 推荐信 研究计划 优先级",
    mobileHelper: "材料优先级",
    mobileLabel: "时间",
    tags: "博士申请,英语成绩,文书,材料准备",
    topic: "英语成绩和文书先准备哪个"
  },
  {
    audience: "想先了解项目适配度再咨询的潜在客户",
    coverDirection:
      "使用咨询转化漏斗、私域SOP卡片或低压行动清单，突出先判断适配度再咨询，不制造焦虑或承诺结果。",
    desktopHelper: "围绕咨询转化和低压行动建议",
    desktopLabel: "转化型",
    key: "sales-main",
    knowledgeQuery: "博士项目 咨询 转化 私域 小红书",
    mobileHelper: "咨询转化",
    mobileLabel: "转化",
    tags: "博士项目,咨询转化,私域运营,小红书营销",
    topic: "适合上班族的博士项目怎么咨询"
  },
  {
    audience: "准备咨询博士项目前想先做功课的人群",
    coverDirection:
      "使用提问清单或咨询前检查表，突出认证、费用、毕业要求、服务边界和材料准备。",
    desktopHelper: "按咨询前问题清单展开",
    desktopLabel: "转化型",
    key: "sales-consult-questions",
    knowledgeQuery: "博士项目 咨询 问题清单 费用 认证 毕业要求",
    mobileHelper: "咨询清单",
    mobileLabel: "转化",
    tags: "博士咨询,项目筛选,在职博士,私域转化",
    topic: "博士项目咨询前必问5个问题"
  },
  {
    audience: "需要在私域里承接博士咨询线索的运营者",
    coverDirection:
      "使用私域筛选SOP或分层跟进卡，突出先筛选目标、预算、时间、专业背景和风险认知。",
    desktopHelper: "按私域筛选和跟进节奏展开",
    desktopLabel: "转化型",
    key: "sales-private-sop",
    knowledgeQuery: "博士咨询 私域 SOP 线索筛选 项目适配",
    mobileHelper: "私域SOP",
    mobileLabel: "转化",
    tags: "私域运营,博士咨询,线索筛选,项目适配",
    topic: "私域里怎么筛选博士咨询客户"
  },
  {
    audience: "需要向家人、老板或单位解释读博价值的人群",
    coverDirection:
      "使用答疑卡或价值解释框架，突出职业目标、学术训练、行业身份和现实成本，不夸大回报。",
    desktopHelper: "按价值解释和异议处理展开",
    desktopLabel: "转化型",
    key: "sales-value-objection",
    knowledgeQuery: "在职博士 含金量 职业发展 单位认可 价值解释",
    mobileHelper: "异议处理",
    mobileLabel: "转化",
    tags: "在职博士,博士价值,职业发展,咨询转化",
    topic: "别人问博士含金量怎么回答"
  }
];

function shuffleTopicPresets(presets: GenerationTopicPreset[]) {
  const shuffled = [...presets];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function freshTopicPresetPool(presets: GenerationTopicPreset[], previousKeys: string[]) {
  const previousKeySet = new Set(previousKeys);
  const freshPresets = presets.filter((preset) => !previousKeySet.has(preset.key));
  const repeatedPresets = presets.filter((preset) => previousKeySet.has(preset.key));
  return [...shuffleTopicPresets(freshPresets), ...shuffleTopicPresets(repeatedPresets)];
}

export function pickGenerationTopicPresetBatch({
  currentTopic = "",
  previousKeys = [],
  size = TOPIC_PRESET_ROTATION_SIZE
}: {
  currentTopic?: string;
  previousKeys?: string[];
  size?: number;
} = {}) {
  const batchSize = Math.max(0, Math.min(size, generationTopicPresets.length));
  if (batchSize === 0) {
    return [];
  }

  const pinnedPreset =
    generationTopicPresets.find((preset) => preset.topic === currentTopic.trim()) ?? null;
  const pool = freshTopicPresetPool(
    generationTopicPresets.filter((preset) => preset.key !== pinnedPreset?.key),
    previousKeys
  );

  return pinnedPreset
    ? [pinnedPreset, ...pool.slice(0, batchSize - 1)]
    : pool.slice(0, batchSize);
}

export function findGenerationTopicPresetByTopic(topic: string) {
  const normalizedTopic = topic.trim();
  return (
    generationTopicPresets.find((preset) => preset.topic === normalizedTopic) ?? null
  );
}

export function generationTopicRequiresSourceEvidence({
  knowledgeQuery = "",
  preset,
  tags = "",
  topic
}: {
  knowledgeQuery?: string;
  preset?: GenerationTopicPreset | null;
  tags?: string;
  topic: string;
}) {
  if (preset?.key.startsWith("source-")) {
    return true;
  }
  const searchText = `${topic} ${knowledgeQuery} ${tags}`.toLowerCase();
  return SOURCE_EVIDENCE_REQUIRED_KEYWORDS.some((keyword) =>
    searchText.includes(keyword.toLowerCase())
  );
}

export function isKnownGenerationTopicKnowledgeQuery(knowledgeQuery: string) {
  const normalizedKnowledgeQuery = knowledgeQuery.trim();
  return generationTopicPresets.some(
    (preset) => preset.knowledgeQuery === normalizedKnowledgeQuery
  );
}

export function isKnownGenerationTopicAudience(audience: string) {
  const normalizedAudience = audience.trim();
  return generationTopicPresets.some((preset) => preset.audience === normalizedAudience);
}

export function isKnownGenerationTopicTags(tags: string) {
  const normalizedTags = tags.trim();
  return generationTopicPresets.some((preset) => preset.tags === normalizedTags);
}

export function buildCustomTopicAudience(topic: string) {
  const normalizedTopic = topic.trim();
  return normalizedTopic ? `对“${normalizedTopic}”感兴趣的申请人` : "";
}

export function buildCustomTopicTags(topic: string) {
  return topic.trim();
}

export function buildTopicCoverStyleNotes(baseStyleNotes: string, topic: string) {
  const preset = findGenerationTopicPresetByTopic(topic);
  if (!preset) {
    return baseStyleNotes;
  }
  return `${baseStyleNotes} 当前选题封面方向：${preset.coverDirection}`;
}

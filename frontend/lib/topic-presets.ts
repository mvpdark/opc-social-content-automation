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
  "官网","官方","来源","证据","核验","校徽","价格","费用","学费",
  "排名","榜单","学校","院校","项目清单","认证","logo","official",
  "source","sources","tuition","fee","fees","price","cost","ranking",
  "rankings","school","schools","university","universities","program list",
  "accreditation","市场数据","市场行情","行情","最新价格","价格走势",
  "market data","market rate","market rates","market price","market prices",
  "pricing benchmark","pricing benchmarks","current price","latest price",
  "live price","汇率","外汇","币种换算","exchange rate","exchange rates",
  "currency rate","currency rates","currency conversion","foreign exchange",
  "fx rate","fx rates"
];


export const generationTopicPresets: GenerationTopicPreset[] = [
  // ===== 避坑型（转化率最高）=====
  {
    audience: "正在准备套磁但不知道怎么写的申博考生",
    coverDirection: "使用邮件诊断清单或红黄绿避坑卡，突出常见套磁错误和正确做法对比",
    desktopHelper: "按套磁错误类型和修正方法展开",
    desktopLabel: "避坑型",
    key: "pitfall-email-mistakes",
    knowledgeQuery: "套磁信 博导回复 申博套磁 套磁技巧 邮件模板",
    mobileHelper: "套磁避坑",
    mobileLabel: "避坑",
    tags: "申博,套磁,博士申请,套磁信,避坑",
    topic: "发了30封套磁信0回复？问题出在这一步"
  },
  {
    audience: "刚开始考虑申博但不知从何下手的人群",
    coverDirection: "使用第一步决策树或顺序对比图，突出常见错误顺序和正确路线",
    desktopHelper: "按申博第一步常见错误展开",
    desktopLabel: "避坑型",
    key: "pitfall-first-step",
    knowledgeQuery: "硕升博 申博第一步 套磁 研究计划 博士申请流程",
    mobileHelper: "第一步避坑",
    mobileLabel: "避坑",
    tags: "硕升博,申博,博士申请,套磁,避坑",
    topic: "硕升博申请第一步，不是先套磁"
  },
  {
    audience: "想读博但不确定自己是否适合的在职人群",
    coverDirection: "使用人群分类雷达图或适配度自测卡，突出不适合读博的3类人特征",
    desktopHelper: "按不适合读博的人群特征展开",
    desktopLabel: "避坑型",
    key: "pitfall-not-suitable",
    knowledgeQuery: "在职博士 适不适合读博 博士申请条件 时间精力",
    mobileHelper: "适配自测",
    mobileLabel: "避坑",
    tags: "在职博士,读博适合度,博士申请,避坑",
    topic: "这3类人千万别读博，看看你中招没"
  },
  {
    audience: "正在选校选导师但怕踩坑的申博考生",
    coverDirection: "使用导师红黄绿避坑清单或风险预警卡，突出选导师的致命错误",
    desktopHelper: "按选导师常见踩坑点展开",
    desktopLabel: "避坑型",
    key: "pitfall-mentor-selection",
    knowledgeQuery: "选博导 导师避坑 博士申请 导师匹配 师生关系",
    mobileHelper: "选导师避坑",
    mobileLabel: "避坑",
    tags: "选导师,博士申请,导师避坑,博导",
    topic: "选博导的5个致命错误，踩一个毁三年"
  },
  {
    audience: "准备写研究计划书但不知道雷区的申博考生",
    coverDirection: "使用研究计划书雷区清单或评分卡，突出常见错误和扣分项",
    desktopHelper: "按研究计划书常见雷区展开",
    desktopLabel: "避坑型",
    key: "pitfall-rp-mistakes",
    knowledgeQuery: "研究计划书 博士申请 RP写作 常见错误",
    mobileHelper: "RP避坑",
    mobileLabel: "避坑",
    tags: "研究计划书,博士申请,RP写作,避坑",
    topic: "研究计划书这3个雷区，导师看了直接拒"
  },
  {
    audience: "打算找中介帮忙申博但怕被坑的人群",
    coverDirection: "使用中介避坑红绿灯或费用陷阱清单，突出常见骗局和自查方法",
    desktopHelper: "按申博中介常见陷阱展开",
    desktopLabel: "避坑型",
    key: "pitfall-agency-scams",
    knowledgeQuery: "申博中介 博士申请中介 中介骗局 保过陷阱",
    mobileHelper: "中介避坑",
    mobileLabel: "避坑",
    tags: "申博中介,博士申请,中介避坑,保过陷阱",
    topic: "申博中介说保过？听到这两个字快跑"
  },
  {
    audience: "准备申博面试但不知道常见陷阱的考生",
    coverDirection: "使用面试翻车案例卡或红黄绿问答清单，突出高频陷阱题和雷区回答",
    desktopHelper: "按面试翻车案例和正确回答展开",
    desktopLabel: "避坑型",
    key: "pitfall-interview-traps",
    knowledgeQuery: "博士面试 面试翻车 面试雷区 回答陷阱 博士申请",
    mobileHelper: "面试避坑",
    mobileLabel: "避坑",
    tags: "博士面试,面试避坑,博士申请,面试雷区",
    topic: "博士面试这么说直接被刷，别犯这些错"
  },
  {
    audience: "正在准备推荐信但不知道怎么操作的申博考生",
    coverDirection: "使用推荐信避坑清单或对比卡，突出常见错误和正确写法",
    desktopHelper: "按推荐信常见踩坑展开",
    desktopLabel: "避坑型",
    key: "pitfall-recommendation",
    knowledgeQuery: "推荐信 博士申请 推荐人 推荐信写作 常见错误",
    mobileHelper: "推荐信避坑",
    mobileLabel: "避坑",
    tags: "推荐信,博士申请,推荐人,避坑",
    topic: "推荐信找错了人，申博直接凉一半"
  },
  // ===== 痛点型（转化率第二）=====
  {
    audience: "论文经历薄弱但想评估申博可能性的申请人",
    coverDirection: "使用背景补强路线图或无论文申博案例卡，突出补强方向和成功路径",
    desktopHelper: "按无论文短板和补强动作展开",
    desktopLabel: "痛点型",
    key: "pain-no-paper",
    knowledgeQuery: "没有论文 博士申请 在职博士 研究计划 项目经历",
    mobileHelper: "无论文申博",
    mobileLabel: "痛点",
    tags: "博士申请,无论文,在职博士,背景提升",
    topic: "没有论文还能读博吗？过来人说实话"
  },
  {
    audience: "双非背景想申名校博士但觉得没希望的人群",
    coverDirection: "使用双非逆袭路线图或背景对比卡，突出双非申博成功案例和策略",
    desktopHelper: "按双非劣势和逆袭策略展开",
    desktopLabel: "痛点型",
    key: "pain-double-non",
    knowledgeQuery: "双非 申博 名校博士 双非申博成功 博士申请",
    mobileHelper: "双非申博",
    mobileLabel: "痛点",
    tags: "双非,博士申请,名校博士,背景提升",
    topic: "双非无论文，我是怎么逆袭名校博士的"
  },
  {
    audience: "30岁以上想读博但担心年龄太大的人群",
    coverDirection: "使用年龄适配卡或大龄申博路线图，突出大龄申博的优势和策略",
    desktopHelper: "按大龄申博优势和策略展开",
    desktopLabel: "痛点型",
    key: "pain-age-30",
    knowledgeQuery: "大龄读博 30岁读博 在职博士 年龄限制 博士申请",
    mobileHelper: "大龄申博",
    mobileLabel: "痛点",
    tags: "大龄读博,在职博士,博士申请,年龄焦虑",
    topic: "30岁读博晚不晚？大龄申博真实经历"
  },
  {
    audience: "在职想读博但担心没时间精力的人群",
    coverDirection: "使用时间精力管理表或在职读博真实日程卡，突出在职申博的时间策略",
    desktopHelper: "按在职读博时间管理展开",
    desktopLabel: "痛点型",
    key: "pain-working-time",
    knowledgeQuery: "在职博士 时间管理 在职申博 边工作边读博",
    mobileHelper: "在职时间",
    mobileLabel: "痛点",
    tags: "在职博士,时间管理,博士申请,在职申博",
    topic: "上班族能边工作边读博吗？时间怎么挤"
  },
  {
    audience: "跨专业想申博但担心被拒的人群",
    coverDirection: "使用跨专业申博路线图或成功案例卡，突出跨专业优势和补强策略",
    desktopHelper: "按跨专业劣势和逆袭策略展开",
    desktopLabel: "痛点型",
    key: "pain-cross-major",
    knowledgeQuery: "跨专业 申博 跨学科博士 博士申请 转专业",
    mobileHelper: "跨专业申博",
    mobileLabel: "痛点",
    tags: "跨专业,博士申请,跨学科,背景提升",
    topic: "跨专业申博被歧视？换个思路反而加分"
  },
  {
    audience: "英语成绩不好但想申博的人群",
    coverDirection: "使用英语补强路线图或替代方案卡，突出低分申博策略和豁免条件",
    desktopHelper: "按英语短板和替代方案展开",
    desktopLabel: "痛点型",
    key: "pain-low-english",
    knowledgeQuery: "英语成绩低 雅思托福 博士申请 语言豁免 低分申博",
    mobileHelper: "低分申博",
    mobileLabel: "痛点",
    tags: "英语成绩,雅思托福,博士申请,低分申博",
    topic: "英语差就不能申博？这些学校不看成绩"
  },
  // ===== 案例型（建立信任）=====
  {
    audience: "想看真实申博成功案例的考生",
    coverDirection: "使用申博时间线回顾图或关键节点卡，突出从准备到上岸的完整路线",
    desktopHelper: "按申博成功经历的关键节点展开",
    desktopLabel: "案例型",
    key: "case-success-story",
    knowledgeQuery: "申博成功经历 博士申请上岸 在职博士 套磁",
    mobileHelper: "上岸经历",
    mobileLabel: "案例",
    tags: "申博经历,博士申请,上岸,在职博士",
    topic: "从纠结到上岸：我的申博全记录"
  },
  {
    audience: "套磁被拒后想翻盘的申博考生",
    coverDirection: "使用被拒翻盘路线图或挽回话术卡，突出被拒后的补救策略",
    desktopHelper: "按套磁被拒后的翻盘策略展开",
    desktopLabel: "案例型",
    key: "case-reject-comeback",
    knowledgeQuery: "套磁被拒 导师拒绝 翻盘 补救 博士申请",
    mobileHelper: "被拒翻盘",
    mobileLabel: "案例",
    tags: "套磁被拒,博士申请,翻盘,导师拒绝",
    topic: "套磁被拒了怎么办？还有机会翻盘"
  },
  // ===== 新增高吸引力选题 =====
  {
    audience: "套磁信写了好久还没发出去的申博考生",
    coverDirection: "使用写作卡点诊断图或邮件草稿对比卡，突出常见卡点和突破方法",
    desktopHelper: "按套磁信写作卡点和解决方案展开",
    desktopLabel: "避坑型",
    key: "pitfall-email-stuck",
    knowledgeQuery: "套磁信写作 申博套磁 邮件写法 卡点 博士申请",
    mobileHelper: "套磁卡点",
    mobileLabel: "避坑",
    tags: "套磁,博士申请,套磁信,写作技巧",
    topic: "套磁信写了3天还没发出去？你可能卡在这"
  },
  {
    audience: "正在准备申博材料怕遗漏的考生",
    coverDirection: "使用材料清单红绿灯或漏交警示卡，突出必交材料和常见遗漏",
    desktopHelper: "按申博材料清单和遗漏风险展开",
    desktopLabel: "避坑型",
    key: "pitfall-material-missing",
    knowledgeQuery: "申博材料 申请材料清单 材料遗漏 博士申请",
    mobileHelper: "材料避坑",
    mobileLabel: "避坑",
    tags: "申博材料,博士申请,材料清单,避坑",
    topic: "申博材料交了才发现漏了这个，直接被刷"
  },
  {
    audience: "硕士导师不支持自己申博的考生",
    coverDirection: "使用破局策略卡或沟通话术清单，突出应对方法和策略",
    desktopHelper: "按导师不支持申博的应对策略展开",
    desktopLabel: "痛点型",
    key: "pain-advisor-disapprove",
    knowledgeQuery: "硕士导师不支持 申博阻力 导师推荐信 沟通策略",
    mobileHelper: "导师阻力",
    mobileLabel: "痛点",
    tags: "硕士导师,博士申请,导师支持,申博阻力",
    topic: "硕士导师不支持申博怎么办？3招破局"
  },
  {
    audience: "想知道申博到底要花多少钱的人群",
    coverDirection: "使用真实费用清单或花费对比卡，突出各项费用和省钱技巧",
    desktopHelper: "按申博费用明细和省钱策略展开",
    desktopLabel: "痛点型",
    key: "pain-cost-breakdown",
    knowledgeQuery: "申博费用 博士申请花费 套磁费用 考试费用 材料费用",
    mobileHelper: "申博费用",
    mobileLabel: "痛点",
    tags: "申博费用,博士申请,花费清单,省钱攻略",
    topic: "申博要花多少钱？真实账单全公开"
  },
  {
    audience: "申博被拒后想找到原因翻盘的考生",
    coverDirection: "使用被拒原因分析图或翻盘时间线，突出从被拒到拿到offer的关键转折",
    desktopHelper: "按被拒原因分析和翻盘策略展开",
    desktopLabel: "案例型",
    key: "case-reject-to-offer",
    knowledgeQuery: "申博被拒 翻盘 拿到offer 二次申请 博士申请",
    mobileHelper: "被拒翻盘",
    mobileLabel: "案例",
    tags: "申博被拒,翻盘,博士申请,offer",
    topic: "从被拒3次到拿到offer，我做对了这件事"
  },
  {
    audience: "想了解博士延毕真相再决定是否读博的人群",
    coverDirection: "使用延毕率数据卡或风险预警图，突出延毕真相和避坑策略",
    desktopHelper: "按博士延毕率和风险因素展开",
    desktopLabel: "避坑型",
    key: "pitfall-delay-graduation",
    knowledgeQuery: "博士延毕率 延毕原因 读博风险 博士毕业",
    mobileHelper: "延毕真相",
    mobileLabel: "避坑",
    tags: "博士延毕,读博风险,博士毕业,避坑",
    topic: "博士延毕率有多高？读博前必须知道真相"
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
  return normalizedTopic ? `对"${normalizedTopic}"感兴趣的申请人` : "";
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

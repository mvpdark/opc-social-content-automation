import { getApiBase } from "@/lib/api-base";
import {
  externalSkillCandidates,
  interfaceStyles,
  workspaceTabIds,
  type InterfaceStyle,
  type WorkspaceTab
} from "@/lib/dashboard-data";
import {
  isGeneratedContent,
  generationSourceContextStats,
  type GeneratedContent
} from "@/lib/generated-assets";
import {
  sanitizeProviderStatusItems,
  type ProviderStatusItem
} from "@/lib/provider-settings";
import { buildPlatformCopyText } from "@/lib/platform-copy";
import {
  SERVICE_CONFIG_READ_ERROR,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import { formatTagLine } from "@/lib/tags";

export const pillTone = {
  neutral: "border-line bg-mist text-muted",
  green: "border-moss/40 bg-moss/10 text-ink",
  blue: "border-steel/40 bg-steel/10 text-ink",
  red: "border-coral/40 bg-coral/10 text-ink",
  amber: "border-amber/40 bg-amber/10 text-ink"
} satisfies Record<string, string>;

export const iconToneClass = {
  amber: "bg-amber/10 text-amber",
  blue: "bg-steel/10 text-steel",
  green: "bg-moss/10 text-moss",
  red: "bg-coral/10 text-coral"
} satisfies Record<string, string>;

export const subtleCardClass = "workspace-subtle-card glass-subtle rounded-md border";
export const formControlClass =
  "workspace-form-control glass-control mt-2 w-full rounded-md border px-3 text-sm text-ink outline-none";
export const secondaryButtonClass =
  "workspace-button workspace-button-secondary glass-control flex items-center justify-center gap-2 rounded-md border text-sm font-medium text-ink";

export const dependencyTone = {
  missing: "red",
  ok: "green",
  outdated: "red",
  warning: "amber"
} satisfies Record<string, keyof typeof pillTone>;

export const dependencyStatusLabel = {
  missing: "缺失",
  ok: "正常",
  outdated: "需升级",
  warning: "提醒"
} satisfies Record<string, string>;

export const externalSkillStatusTone = {
  优先试点: "green",
  可选接入: "blue",
  可选外部调用: "blue",
  只做外部工具: "amber",
  候选服务: "amber"
} satisfies Record<(typeof externalSkillCandidates)[number]["status"], keyof typeof pillTone>;

export function externalLicenseLabel(license: string) {
  if (license.includes("GPL")) {
    return "受限开源";
  }
  if (license.includes("MIT")) {
    return "开放许可";
  }
  if (license.includes("托管")) {
    return "托管服务，许可待确认";
  }
  if (license.includes("需确认")) {
    return "待确认";
  }
  return license;
}

export const API_BASE = getApiBase();
export const PC_AUTH_STORAGE_KEY = "opc_pc_auth_v1";
export const CREDENTIAL_STORAGE_KEY = "opc_workspace_credentials_v1";
export const INTERFACE_STYLE_STORAGE_KEY = "opc_interface_style_v1";
export const LAST_GENERATED_CONTENT_STORAGE_KEY = "opc_latest_generated_content_v1";
export const PINNED_DRAFT_IDS_STORAGE_KEY = "opc_pinned_draft_ids_v1";
export const DEFAULT_WRITING_STYLE_STORAGE_KEY = "opc_default_writing_style_v1";

export type CredentialSettings = {
  workspaceToken: string;
  draftApiKey: string;
  imageApiKey: string;
  rewriteApiKey: string;
};

export type ApiErrorBody = {
  detail?: unknown;
  message?: unknown;
};

export type DependencyItem = {
  category: string;
  detected: string | null;
  fix: string | null;
  message: string;
  minimum: string | null;
  name: string;
  required: boolean;
  status: "ok" | "warning" | "missing" | "outdated";
};

export type DependencyReport = {
  generated_at: string;
  items: DependencyItem[];
  repair_steps: string[];
  status: "ok" | "attention" | "blocked";
  summary: {
    blocking: number;
    ok: number;
    total: number;
    warning: number;
  };
};

export const emptyCredentials: CredentialSettings = {
  workspaceToken: "",
  draftApiKey: "",
  imageApiKey: "",
  rewriteApiKey: ""
};

export const creationProjects = [
  {
    id: "postgraduate-phd",
    title: "1.硕升博推广",
    category: "小红书图文获客",
    status: "可进入",
    statusTone: "green",
    description: "围绕硕升博、在职申博和水博路线，生成图文草稿、封面方向、标签和发布检查。",
    inputs: ["趋势参考", "申请人痛点", "项目卖点"],
    outputs: ["图文草稿", "封面方案", "发布清单"],
    workflow: ["采集参考", "一键撰稿+封面", "预览复制", "人工确认发布"],
    enabled: true
  },
  {
    id: "ecommerce-listing",
    title: "2.抖音商品自动化",
    category: "电商转化",
    status: "规划中",
    statusTone: "amber",
    description: "面向电商商品标题、卖点、详情页结构、FAQ 和客服话术。",
    inputs: ["商品信息", "卖点素材", "竞品参考"],
    outputs: ["上架文案", "详情页结构", "客服话术"],
    workflow: ["商品资料", "卖点提炼", "详情页草稿", "人工确认"],
    enabled: false
  },
  {
    id: "private-domain-sales",
    title: "3.私域商品自动化",
    category: "销售跟进",
    status: "规划中",
    statusTone: "amber",
    description: "面向朋友圈、社群跟进、异议处理和成交 SOP。",
    inputs: ["产品资料", "客户问题", "成交限制"],
    outputs: ["跟进 SOP", "群发文案", "异议处理"],
    workflow: ["客户分层", "跟进话术", "异议处理", "人工确认"],
    enabled: false
  }
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  category: string;
  status: string;
  statusTone: keyof typeof pillTone;
  description: string;
  inputs: readonly string[];
  outputs: readonly string[];
  workflow: readonly string[];
  enabled: boolean;
}>;

export type CreationProjectId = (typeof creationProjects)[number]["id"];

export function findEnabledCreationProject(projectId: string | null) {
  return creationProjects.find((project) => project.enabled && project.id === projectId) ?? null;
}

export function updateCreationProjectQuery(projectId: CreationProjectId | null) {
  const url = new URL(window.location.href);
  if (projectId) {
    url.searchParams.set("project", projectId);
  } else {
    url.searchParams.delete("project");
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export const writingStylePresets = [
  {
    id: "warm_cute",
    label: "女性可爱",
    helper: "亲近、软一点、有陪伴感",
    prompt:
      "偏女性可爱风，像学姐认真提醒：语气温柔、轻松、有陪伴感，可以少量用姐妹/宝子/uu口吻，并自然多用哦、哟、呀、啊等口语语气词，开头要有共鸣，不要像硬广或官方说明文"
  },
  {
    id: "professional",
    label: "专业清爽",
    helper: "信息密度高，少情绪",
    prompt:
      "专业清爽风，短段落、强逻辑，先拆误区再给清单，表达可信克制"
  },
  {
    id: "experience",
    label: "学姐经验",
    helper: "像真实经历复盘",
    prompt:
      "学姐经验风，用第一线观察和申请复盘口吻写，避免空泛说教，多写具体判断"
  },
  {
    id: "high_hook",
    label: "高赞钩子",
    helper: "冲突感更强，适合封面",
    prompt:
      "高赞钩子风，开头直接打破常见误区，标题和前三行要有停留感，但不能夸大承诺"
  }
] as const;

export type WritingStylePresetId = (typeof writingStylePresets)[number]["id"];
export type ExpressionOptionKey = "emoji" | "punctuation" | "particles" | "meme" | "softCta";

export const defaultExpressionOptions: Record<ExpressionOptionKey, boolean> = {
  emoji: true,
  punctuation: true,
  particles: true,
  meme: true,
  softCta: true
};

export const expressionOptions = [
  {
    key: "emoji",
    label: "轻量表情",
    enabled: "必须自然放入 2-5 个小红书表情字符码、轻量 emoji 或颜文字，让语气更像真实小红书笔记",
    disabled: "不使用 emoji 或颜文字"
  },
  {
    key: "punctuation",
    label: "活泼标点",
    enabled: "必须自然使用 ～、！！、？、…… 来制造口语节奏，但不要连续堆叠",
    disabled: "标点保持克制"
  },
  {
    key: "particles",
    label: "语气词",
    enabled: "必须自然提高口语语气词密度，在开头、转折和提醒处穿插哦、哟、呀、啊、嘛、呢、啦、哈等，但不要每句都堆",
    disabled: "少用哦、呀、啊等口语语气词，表达更克制"
  },
  {
    key: "meme",
    label: "表情包感",
    enabled: "至少加入 1-2 个短括号吐槽和口语停顿制造表情包感，例如（先别急）（真的别反着来）（会很亏）",
    disabled: "不使用吐槽式表达"
  },
  {
    key: "softCta",
    label: "温柔引导",
    enabled: "结尾用温和提醒引导咨询，不制造焦虑，不承诺结果",
    disabled: "结尾只给中性建议"
  }
] as const;

export const hiddenXhsStickerToneGuide =
  "隐藏撰稿规则：如果平台是小红书，生成正文时必须自然少量使用小红书可识别的表情字符码，优先 [笑哭R]、[哭惹R]、[哇R]、[赞R]、[doge]、[蹲后续H]，每篇 2-5 个；字符码要融入正文语气，不要解释字符码，不要列出表情清单。";

export const defaultGenerationKnowledgeQuery = "硕升博 高赞图文 写作参考";
export const defaultGenerationTargetAudience = "准备硕升博申请的学生";
export const defaultGenerationTagsText = "硕升博,水博,博士申请,小红书获客";

export const xhsHighAttractionCoverStyle =
  "小红书高吸引封面：先按选题选择不同封面路线，优先轮换路线/榜单矩阵、决策地图、学术蓝图、杂志页、黑板批注、手机信息拼贴等结构；只有需要时才用学习桌或清单芯片。水博/在职博士/升博类内容可参考“水博榜”的路线矩阵思路，但学校、价格、认证和毕业难度必须来自已核实知识库，不能编造；避免官方标志、校徽、录取承诺和重复的奶油珊瑚薄荷模板。";

export const douyinHighAttractionCoverStyle =
  "抖音图文封面：9:16高对比竖版首屏，强结果标题，真实学习/申请材料场景，短清单信息块，明亮但不杂乱，避免官方标志和录取承诺。";

export type XhsStickerCategory =
  | "基础情绪"
  | "互动语气"
  | "反应吐槽"
  | "生活种草"
  | "薯系角色"
  | "露营户外"
  | "运动骑行"
  | "手势互动"
  | "人群角色"
  | "发布场景"
  | "节日符号"
  | "自然食物"
  | "爱心文字";

export type XhsSticker = {
  aliases?: readonly string[];
  code: string;
  face: string;
  name: string;
};

export const xhsStickerCatalog: readonly {
  category: XhsStickerCategory;
  names: readonly string[];
}[] = [
  {
    category: "基础情绪",
    names: [
      "微笑",
      "害羞",
      "失望",
      "汗颜",
      "哇",
      "偷笑",
      "大笑",
      "哭惹",
      "笑哭",
      "笑哭了",
      "可怜",
      "皱眉",
      "生气",
      "惊恐",
      "捂脸",
      "抽泣",
      "睡觉"
    ]
  },
  {
    category: "互动语气",
    names: [
      "赞",
      "棒",
      "超喜欢",
      "亲一个",
      "飞吻",
      "吧唧",
      "萌萌哒",
      "心心眼",
      "嘻嘻",
      "得意"
    ]
  },
  {
    category: "反应吐槽",
    names: [
      "doge",
      "鄙视",
      "斜眼",
      "抓狂",
      "抠鼻",
      "尬住",
      "呃",
      "叹气",
      "扶额",
      "扶墙",
      "扯脸",
      "石化",
      "捂嘴笑",
      "暗中观察",
      "再见",
      "坏笑"
    ]
  },
  {
    category: "生活种草",
    names: [
      "买爆",
      "种草",
      "拔草",
      "吃瓜",
      "喝奶茶",
      "自拍",
      "冰淇淋",
      "棒棒糖",
      "吃粽子",
      "吐舌头",
      "派对",
      "蹲后续"
    ]
  },
  {
    category: "薯系角色",
    names: ["黄金薯", "黑薯问号", "变猪猪", "完啦", "泪崩", "色色"]
  },
  {
    category: "露营户外",
    names: ["天幕", "卡式炉", "折叠椅", "营地车", "露营灯", "露营", "渔夫帽", "登山鞋", "背包", "马甲"]
  },
  {
    category: "运动骑行",
    names: ["骑行服", "手套", "头盔", "风镜", "公路车", "折叠车", "飞盘", "冲浪板", "双翘滑板", "陆冲板", "长板"]
  },
  {
    category: "手势互动",
    names: ["点赞", "向右", "合十", "ok", "加油", "握手", "鼓掌", "弱", "耶", "抱拳", "勾引", "拳头", "拥抱", "举手"]
  },
  {
    category: "人群角色",
    names: ["猪头", "老虎", "集美", "仙女", "红书"]
  },
  {
    category: "发布场景",
    names: [
      "开箱",
      "探店",
      "ootd",
      "同款",
      "打卡",
      "飞机",
      "拍立得",
      "薯券",
      "优惠券",
      "购物车",
      "kiss",
      "礼物",
      "生日蛋糕",
      "私信",
      "请文明",
      "请友好",
      "氛围感",
      "清单",
      "电影",
      "学生党"
    ]
  },
  {
    category: "节日符号",
    names: [
      "彩虹",
      "爆炸",
      "炸弹",
      "火",
      "啤酒",
      "咖啡",
      "钱袋",
      "流汗",
      "发",
      "红包",
      "福",
      "鞭炮",
      "庆祝",
      "烟花",
      "气球",
      "看",
      "新月",
      "满月",
      "大便",
      "太阳",
      "晚安",
      "星"
    ]
  },
  {
    category: "自然食物",
    names: ["玫瑰", "凋谢", "郁金香", "樱花", "海豚", "放大镜", "刀", "辣椒", "黄瓜", "葡萄", "草莓", "桃子", "红薯", "栗子"]
  },
  {
    category: "爱心文字",
    names: [
      "红色心形",
      "黄色心形",
      "绿色心形",
      "蓝色心形",
      "紫色心形",
      "爱心",
      "两颗心",
      "浅肤色",
      "中浅肤色",
      "中等肤色",
      "中深肤色",
      "有",
      "可",
      "蹲",
      "零",
      "一",
      "二",
      "三",
      "四",
      "五",
      "六",
      "七",
      "八",
      "九",
      "加一",
      "满",
      "禁"
    ]
  }
] as const;

export const xhsStickerFaceByName: Record<string, string> = {
  doge: "😏",
  买爆: "🛍️",
  亲一个: "😘",
  偷笑: "🤭",
  再见: "👋",
  冰淇淋: "🍦",
  变猪猪: "🐽",
  可怜: "🥺",
  叹气: "😮‍💨",
  吃瓜: "🍉",
  吃粽子: "🍙",
  吐舌头: "😛",
  吧唧: "😚",
  呃: "😶",
  哇: "😮",
  哭惹: "🥺",
  喝奶茶: "🧋",
  嘻嘻: "😁",
  坏笑: "😈",
  大笑: "😆",
  失望: "😞",
  完啦: "😵",
  害羞: "☺️",
  尬住: "😬",
  得意: "😌",
  微笑: "🙂",
  心心眼: "😍",
  惊恐: "😱",
  扯脸: "🫠",
  扶墙: "🫨",
  扶额: "🤦",
  抓狂: "😫",
  抠鼻: "🙄",
  抽泣: "😢",
  拔草: "🌱",
  捂嘴笑: "🤭",
  捂脸: "🤦",
  斜眼: "😒",
  暗中观察: "👀",
  棒: "👌",
  棒棒糖: "🍭",
  汗颜: "😅",
  泪崩: "😭",
  派对: "🥳",
  生气: "😠",
  皱眉: "😟",
  睡觉: "😴",
  石化: "🪨",
  种草: "🌿",
  笑哭: "😂",
  笑哭了: "🤣",
  自拍: "🤳",
  色色: "😍",
  萌萌哒: "🥰",
  赞: "👍",
  超喜欢: "💗",
  蹲后续: "🪑",
  鄙视: "🙄",
  飞吻: "😘",
  黄金薯: "🥔",
  黑薯问号: "❓",
  天幕: "⛺",
  卡式炉: "🍳",
  折叠椅: "🪑",
  营地车: "🛒",
  露营灯: "🏮",
  露营: "⛺",
  渔夫帽: "👒",
  登山鞋: "🥾",
  背包: "🎒",
  马甲: "🦺",
  骑行服: "🚴",
  手套: "🧤",
  头盔: "🪖",
  风镜: "🥽",
  公路车: "🚲",
  折叠车: "🚲",
  飞盘: "🥏",
  冲浪板: "🏄",
  双翘滑板: "🛹",
  陆冲板: "🛹",
  长板: "🛹",
  点赞: "👍",
  向右: "👉",
  合十: "🙏",
  ok: "👌",
  加油: "💪",
  握手: "🤝",
  鼓掌: "👏",
  弱: "👎",
  耶: "✌️",
  抱拳: "🙏",
  勾引: "👆",
  拳头: "✊",
  拥抱: "🤗",
  举手: "🙋",
  猪头: "🐷",
  老虎: "🐯",
  集美: "👭",
  仙女: "🧚",
  红书: "📕",
  开箱: "📦",
  探店: "🏬",
  ootd: "👗",
  同款: "🧩",
  打卡: "📍",
  飞机: "✈️",
  拍立得: "📸",
  薯券: "🎫",
  优惠券: "🎟️",
  购物车: "🛒",
  kiss: "💋",
  礼物: "🎁",
  生日蛋糕: "🎂",
  私信: "💌",
  请文明: "🛡️",
  请友好: "🤝",
  氛围感: "✨",
  清单: "📝",
  电影: "🎬",
  学生党: "🎓",
  彩虹: "🌈",
  爆炸: "💥",
  炸弹: "💣",
  火: "🔥",
  啤酒: "🍺",
  咖啡: "☕",
  钱袋: "💰",
  流汗: "💦",
  发: "🧧",
  红包: "🧧",
  福: "🧧",
  鞭炮: "🧨",
  庆祝: "🎉",
  烟花: "🎆",
  气球: "🎈",
  看: "👀",
  新月: "🌙",
  满月: "🌕",
  大便: "💩",
  太阳: "☀️",
  晚安: "🌙",
  星: "⭐",
  玫瑰: "🌹",
  凋谢: "🥀",
  郁金香: "🌷",
  樱花: "🌸",
  海豚: "🐬",
  放大镜: "🔍",
  刀: "🔪",
  辣椒: "🌶️",
  黄瓜: "🥒",
  葡萄: "🍇",
  草莓: "🍓",
  桃子: "🍑",
  红薯: "🍠",
  栗子: "🌰",
  红色心形: "❤️",
  黄色心形: "💛",
  绿色心形: "💚",
  蓝色心形: "💙",
  紫色心形: "💜",
  爱心: "♥️",
  两颗心: "💕",
  浅肤色: "🏻",
  中浅肤色: "🏼",
  中等肤色: "🏽",
  中深肤色: "🏾",
  有: "有",
  可: "可",
  蹲: "蹲",
  零: "0",
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
  加一: "+1",
  满: "满",
  禁: "禁"
};

export const xhsStickerCodeByName: Record<string, string> = {
  doge: "[doge]",
  蹲后续: "[蹲后续H]",
  吐舌头: "[吐舌头H]",
  扯脸: "[扯脸H]"
};

export const xhsStickerAliasesByName: Record<string, readonly string[]> = {
  蹲后续: ["[蹲后续R]"]
};

export const xhsStyleStickers: XhsSticker[] = xhsStickerCatalog.flatMap((group) =>
  group.names.map((name) => ({
    aliases: xhsStickerAliasesByName[name],
    code: xhsStickerCodeByName[name] ?? `[${name}R]`,
    face: xhsStickerFaceByName[name] ?? "💬",
    name
  }))
);

export const xhsStickerByCode = new Map<string, XhsSticker>(
  xhsStyleStickers.flatMap((sticker) =>
    [sticker.code, ...(sticker.aliases ?? [])].map((code) => [code, sticker] as const)
  )
);

export function buildWritingTone(
  presetId: WritingStylePresetId,
  options: Record<ExpressionOptionKey, boolean>
) {
  const preset =
    writingStylePresets.find((item) => item.id === presetId) ?? writingStylePresets[0];
  const optionGuides = expressionOptions.map((option) =>
    options[option.key] ? option.enabled : option.disabled
  );

  return `${preset.prompt}；${optionGuides.join("；")}。`;
}

export function buildGenerationTone(
  visibleTone: string,
  platform: string,
  options: Record<ExpressionOptionKey, boolean>
) {
  const trimmedTone = visibleTone.trim();
  if (platform !== "xiaohongshu" || !options.emoji) {
    return trimmedTone || undefined;
  }
  return [trimmedTone, hiddenXhsStickerToneGuide].filter(Boolean).join("；");
}

export function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return workspaceTabIds.includes(value as WorkspaceTab);
}

export function coerceWorkspaceTabAlias(value: string | null): WorkspaceTab | null {
  if (value === "review") {
    return "content";
  }
  if (value === "publish" || value === "publishing") {
    return "delivery";
  }
  return isWorkspaceTab(value) ? value : null;
}

export function isInterfaceStyle(value: string | null): value is InterfaceStyle {
  return interfaceStyles.some((style) => style.id === value);
}

export function isWritingStylePresetId(value: string | null): value is WritingStylePresetId {
  return writingStylePresets.some((style) => style.id === value);
}

export function readLocalStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_error) {
    // Some embedded browsers disable localStorage. The workspace must keep working without it.
  }
}

export function removeLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch (_error) {
    // Some embedded browsers disable localStorage. The workspace must keep working without it.
  }
}

export function readStoredWorkspaceAccount() {
  const stored = readLocalStorage(PC_AUTH_STORAGE_KEY);
  const account = stored?.trim() ?? "";
  return account.length > 0 && account.length <= 32 ? account : null;
}

export function saveStoredWorkspaceAccount(account: string) {
  writeLocalStorage(PC_AUTH_STORAGE_KEY, account);
}

export function clearStoredWorkspaceAccount() {
  removeLocalStorage(PC_AUTH_STORAGE_KEY);
}

export async function readApiError(response: Response, fallback: string) {
  const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
  if (errorBody?.detail === "database_unavailable") {
    return "数据库暂时不可用：安装包或本地运行请重新启动；自部署模式请检查数据库连接设置和数据库服务。";
  }
  return sanitizeServiceErrorMessage(errorBody?.message ?? errorBody?.detail ?? fallback);
}

export function normalizeRewriteServiceMessage(message: string) {
  const rewriteNotConfiguredPattern = new RegExp(
    ["DeepSeek", "rewrite", "provider", "is", "not", "configured", "yet\\."].join("\\s+"),
    "g"
  );
  return sanitizeServiceErrorMessage(
    message
      .replace(rewriteNotConfiguredPattern, "改写服务尚未配置。")
      .replace(/DeepSeek/g, "改写服务")
  );
}

export type ProviderCheckResult = {
  configured: boolean;
  message: string;
  status: string;
  target: string;
};

export type WorkspaceLoginResponse = {
  account: string;
  default_keys_bound: boolean;
  key_profile: string;
  provider_statuses: ProviderStatusItem[];
};

export async function fetchProviderStatuses() {
  const response = await fetch(`${API_BASE}/workspace/provider-status`);
  if (!response.ok) {
    throw new Error(await readApiError(response, SERVICE_CONFIG_READ_ERROR));
  }
  return sanitizeProviderStatusItems(
    (await response.json()) as ProviderStatusItem[]
  );
}

export async function authenticateWorkspaceLogin(account: string, password: string) {
  try {
    const response = await fetch(`${API_BASE}/auth/mobile-login`, {
      body: JSON.stringify({ account, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    if (response.ok) {
      const data = (await response.json()) as Partial<WorkspaceLoginResponse>;
      if (!data.account?.trim()) {
        throw new Error("登录服务响应异常，请稍后再试。");
      }
      return {
        account: data.account.trim(),
        defaultKeysBound: Boolean(data.default_keys_bound),
        providerStatuses: Array.isArray(data.provider_statuses)
          ? sanitizeProviderStatusItems(data.provider_statuses)
          : []
      };
    }

    if (response.status === 404 || response.status === 405) {
      throw new Error("登录服务暂未更新，请重新打开应用后再试。");
    }
    if (response.status >= 500) {
      throw new Error(await readApiError(response, "登录服务暂时不可用，请稍后再试。"));
    }
    throw new Error("账号或密码不正确。");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("无法连接登录服务，请确认应用服务正在运行。");
    }
    throw error;
  }
}

export function hasLiveImageProvider(statuses: ProviderStatusItem[]) {
  const imageProviderStatus = statuses.find((item) => item.name === "Image generation");
  return Boolean(
    imageProviderStatus?.configured && imageProviderStatus.provider !== "codex_test"
  );
}

export const blockedPublishTerms = [
  "保录",
  "包过",
  "百分百",
  "100%",
  "内部名额",
  "官方录取",
  "保证录取",
  "保证套磁成功",
  "必上岸"
];

export const localDraftMarkers = [
  "codex_test",
  "\u3010\u6d4b\u8bd5\u8349\u7a3f\u3011",
  "\u3010\u6f14\u793a\u8349\u7a3f\u3011",
  "\u3010\u672c\u5730\u68c0\u67e5\u8349\u7a3f\u3011"
];

export const pcReviewQueueStatuses = new Set(["draft", "rewritten", "review_pending"]);

export function buildPlatformCopy(content: GeneratedContent) {
  return buildPlatformCopyText({
    body: content.body,
    tags: content.tags,
    title: content.title
  });
}

export function complianceWarnings(content: GeneratedContent) {
  const text = `${content.title}\n${content.body}\n${formatTagLine(content.tags)}`;
  return blockedPublishTerms.filter((term) => text.includes(term));
}

export function isTestDraft(content: GeneratedContent) {
  return localDraftMarkers.some((marker) => content.body.includes(marker));
}

export function isPcReviewQueueCandidate(content: GeneratedContent) {
  return content.platform === "xiaohongshu" && pcReviewQueueStatuses.has(content.status) && !isTestDraft(content);
}

export type PrepublishChecklistState = "ready" | "review" | "blocked";

export type PrepublishChecklistItem = {
  detail: string;
  key: "content" | "sources" | "cover" | "risk" | "human";
  label: string;
  state: PrepublishChecklistState;
};

export const prepublishChecklistTone = {
  blocked: "red",
  ready: "green",
  review: "amber"
} satisfies Record<PrepublishChecklistState, keyof typeof pillTone>;

export const prepublishChecklistStateLabel = {
  blocked: "需补充",
  ready: "已就绪",
  review: "待核对"
} satisfies Record<PrepublishChecklistState, string>;

export function missingGeneratedContentFields(content: GeneratedContent) {
  const missingFields: string[] = [];
  if (!content.title.trim()) {
    missingFields.push("标题");
  }
  if (!content.body.trim()) {
    missingFields.push("正文");
  }
  if (!formatTagLine(content.tags)) {
    missingFields.push("标签");
  }
  return missingFields;
}

export function buildPrepublishChecklist({
  content,
  imageReady,
  lifecycleWarning,
  testDraft,
  warnings
}: {
  content: GeneratedContent;
  imageReady: boolean;
  lifecycleWarning: string | null;
  testDraft: boolean;
  warnings: string[];
}): PrepublishChecklistItem[] {
  const sourceStats = generationSourceContextStats(content.source_context);
  const missingContentFields = missingGeneratedContentFields(content);
  const sourceDetail = sourceStats.missingRequiredWebResults
    ? "当前选题需要实时来源，但没有可见 Tavily 结果，复制前先补来源。"
    : sourceStats.hasEvidence
      ? `已带 ${sourceStats.totalCount} 条来源证据，复制前核对学校、价格、logo、排名等事实。`
      : "未带来源证据，只能作为通用草稿，复制前请人工补充可信依据。";

  return [
    {
      detail: missingContentFields.length
        ? `缺少${missingContentFields.join("、")}；请回到表单补齐后重新生成，或人工补充后再复制。`
        : "标题、正文、标签会一起复制；发布前仍需逐项读一遍。",
      key: "content",
      label: "标题/正文/标签",
      state: missingContentFields.length ? "blocked" : "ready"
    },
    {
      detail: sourceDetail,
      key: "sources",
      label: "来源证据",
      state: sourceStats.missingRequiredWebResults ? "blocked" : sourceStats.hasEvidence ? "review" : "blocked"
    },
    {
      detail: imageReady
        ? "封面素材已生成；仍需核对是否含假校徽、假录取或误导视觉。"
        : "封面尚未生成或不可用；复制正文前先决定是否补封面。",
      key: "cover",
      label: "封面素材",
      state: imageReady ? "review" : "blocked"
    },
    {
      detail: warnings.length
        ? `发现高风险词：${warnings.join("、")}。请修改后再复制。`
        : "未发现保录、包过、内部名额等高风险承诺词。",
      key: "risk",
      label: "安全用语",
      state: warnings.length ? "blocked" : "ready"
    },
    {
      detail: testDraft
        ? "这是本地检查草稿，不可直接发布。"
        : lifecycleWarning
          ? lifecycleWarning
          : "当前仍是草稿状态；复制只准备素材，最终发布必须人工确认。",
      key: "human",
      label: "人工确认",
      state: testDraft || lifecycleWarning ? "blocked" : "review"
    }
  ];
}

export function loadStoredGeneratedContent() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const rawContent = window.localStorage.getItem(LAST_GENERATED_CONTENT_STORAGE_KEY);
    if (!rawContent) {
      return null;
    }
    const parsedContent = JSON.parse(rawContent) as unknown;
    return isGeneratedContent(parsedContent) ? parsedContent : null;
  } catch (_error) {
    return null;
  }
}

export function saveStoredGeneratedContent(content: GeneratedContent) {
  if (typeof window === "undefined" || isTestDraft(content)) {
    return;
  }
  try {
    window.localStorage.setItem(LAST_GENERATED_CONTENT_STORAGE_KEY, JSON.stringify(content));
  } catch (_error) {
    // Browser storage can be unavailable in restricted modes; the backend list still remains source of truth.
  }
}

export function loadPinnedDraftIds() {
  const stored = readLocalStorage(PINNED_DRAFT_IDS_STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is number => Number.isInteger(value) && value > 0);
  } catch (_error) {
    return [];
  }
}

export function savePinnedDraftIds(ids: number[]) {
  writeLocalStorage(PINNED_DRAFT_IDS_STORAGE_KEY, JSON.stringify(ids));
}

export function sortDraftHistory(contents: GeneratedContent[], pinnedIds: number[]) {
  const pinRank = new Map(pinnedIds.map((id, index) => [id, index]));
  return [...contents].sort((left, right) => {
    const leftRank = pinRank.get(left.id);
    const rightRank = pinRank.get(right.id);
    if (leftRank !== undefined || rightRank !== undefined) {
      if (leftRank === undefined) {
        return 1;
      }
      if (rightRank === undefined) {
        return -1;
      }
      return leftRank - rightRank;
    }
    return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
  });
}

export function upsertDraftHistory(contents: GeneratedContent[], content: GeneratedContent) {
  return [content, ...contents.filter((item) => item.id !== content.id)];
}

export function formatDraftTime(value?: string) {
  if (!value) {
    return "刚生成";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚生成";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
}

export function renderXhsExpressionText(text: string) {
  return text.split(/(\[[^\[\]]+\])/g).map((part, index) => {
    const sticker = xhsStickerByCode.get(part);
    if (!sticker) {
      return part;
    }
    return (
      <span
        aria-label={`${sticker.name}表情`}
        className="mx-0.5 inline-flex h-6 min-w-6 translate-y-[3px] items-center justify-center rounded-full border border-coral/20 bg-coral/10 px-1.5 text-base leading-none text-ink shadow-sm"
        key={`${part}-${index}`}
        title={`${part}：${sticker.name}，本地近似预览，复制后仍保留原字符码`}
      >
        {sticker.face}
      </span>
    );
  });
}

"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Bookmark,
  BookOpenText,
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  ExternalLink,
  Heart,
  Image,
  KeyRound,
  LockKeyhole,
  Loader2,
  MessageCircle,
  PenLine,
  Radar,
  RotateCcw,
  Save,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Terminal,
  Trash2,
  UserRound,
  X
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { GenerationSourceEvidenceCard } from "@/components/generation-source-evidence-card";
import {
  isPlatformId,
  PlatformIcon,
  PlatformLabel,
  type PlatformId
} from "@/components/platform-icon";
import { TrendCollectorPanel } from "@/components/trend-collector-panel";
import { getApiBase } from "@/lib/api-base";
import { resolveAssetUrl } from "@/lib/asset-url";
import { copyText } from "@/lib/clipboard";
import {
  isGeneratedContent,
  isGeneratedImageAsset,
  sourceContextMatchesKnowledgeQuery,
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import {
  buildGenerationInputSignature,
  generatedContentInputSignatureMatches,
  type GeneratedContentInputSignature
} from "@/lib/generation-input-signature";
import {
  fetchKnowledgeItems,
  knowledgeCategoryLabel,
  knowledgeItemContent,
  knowledgeItemExcerpt,
  knowledgeItemTitle,
  type KnowledgeItem
} from "@/lib/knowledge-api";
import {
  contentControls,
  coverReferences,
  draftPreview,
  externalSkillCandidates,
  imageWorkflow,
  interfaceStyles,
  knowledgeAssets,
  pipeline,
  promoterActions,
  publishingRecords,
  queues,
  safetyGates,
  themeTemplates,
  workspaceTabIds,
  type InterfaceStyle,
  type WorkspaceTab,
  writingReferences
} from "@/lib/dashboard-data";
import {
  providerBindingDefaultsFromStatuses,
  providerKeyUpdatePayload,
  sanitizeProviderStatusItems,
  type ProviderStatusItem
} from "@/lib/provider-settings";
import {
  SERVICE_CONFIG_READ_ERROR,
  isServiceCredentialError,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import {
  generatedContentStatusLabel,
  generatedImageStatusLabel
} from "@/lib/status-labels";
import { formatTagLine, parseTagText, tagsMatchText } from "@/lib/tags";
import {
  TOPIC_PRESET_REFRESH_MS,
  buildCustomTopicAudience,
  buildCustomTopicTags,
  buildTopicCoverStyleNotes,
  findGenerationTopicPresetByTopic,
  isKnownGenerationTopicAudience,
  isKnownGenerationTopicKnowledgeQuery,
  isKnownGenerationTopicTags,
  pickGenerationTopicPresetBatch,
  type GenerationTopicPreset
} from "@/lib/topic-presets";

const pillTone = {
  neutral: "border-line bg-mist text-muted",
  green: "border-moss/40 bg-moss/10 text-ink",
  blue: "border-steel/40 bg-steel/10 text-ink",
  red: "border-coral/40 bg-coral/10 text-ink",
  amber: "border-amber/40 bg-amber/10 text-ink"
} satisfies Record<string, string>;

const iconToneClass = {
  amber: "bg-amber/10 text-amber",
  blue: "bg-steel/10 text-steel",
  green: "bg-moss/10 text-moss",
  red: "bg-coral/10 text-coral"
} satisfies Record<string, string>;

const subtleCardClass = "glass-subtle rounded-md border";
const formControlClass =
  "glass-control mt-2 w-full rounded-md border px-3 text-sm text-ink outline-none";
const secondaryButtonClass =
  "glass-control flex items-center justify-center gap-2 rounded-md border text-sm font-medium text-ink";

const dependencyTone = {
  missing: "red",
  ok: "green",
  outdated: "red",
  warning: "amber"
} satisfies Record<string, keyof typeof pillTone>;

const dependencyStatusLabel = {
  missing: "缺失",
  ok: "正常",
  outdated: "需升级",
  warning: "提醒"
} satisfies Record<string, string>;

const externalSkillStatusTone = {
  优先试点: "green",
  可选接入: "blue",
  可选外部调用: "blue",
  只做外部工具: "amber",
  候选服务: "amber"
} satisfies Record<(typeof externalSkillCandidates)[number]["status"], keyof typeof pillTone>;

function externalLicenseLabel(license: string) {
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

const API_BASE = getApiBase();
const PC_AUTH_STORAGE_KEY = "opc_pc_auth_v1";
const CREDENTIAL_STORAGE_KEY = "opc_workspace_credentials_v1";
const INTERFACE_STYLE_STORAGE_KEY = "opc_interface_style_v1";
const LAST_GENERATED_CONTENT_STORAGE_KEY = "opc_latest_generated_content_v1";
const PINNED_DRAFT_IDS_STORAGE_KEY = "opc_pinned_draft_ids_v1";
const DEFAULT_WRITING_STYLE_STORAGE_KEY = "opc_default_writing_style_v1";

type CredentialSettings = {
  workspaceToken: string;
  draftApiKey: string;
  imageApiKey: string;
  rewriteApiKey: string;
};

type ApiErrorBody = {
  detail?: string;
  message?: string;
};

type DependencyItem = {
  category: string;
  detected: string | null;
  fix: string | null;
  message: string;
  minimum: string | null;
  name: string;
  required: boolean;
  status: "ok" | "warning" | "missing" | "outdated";
};

type DependencyReport = {
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

const emptyCredentials: CredentialSettings = {
  workspaceToken: "",
  draftApiKey: "",
  imageApiKey: "",
  rewriteApiKey: ""
};

const creationProjects = [
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

type CreationProjectId = (typeof creationProjects)[number]["id"];

function findEnabledCreationProject(projectId: string | null) {
  return creationProjects.find((project) => project.enabled && project.id === projectId) ?? null;
}

function updateCreationProjectQuery(projectId: CreationProjectId | null) {
  const url = new URL(window.location.href);
  if (projectId) {
    url.searchParams.set("project", projectId);
  } else {
    url.searchParams.delete("project");
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

const writingStylePresets = [
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

type WritingStylePresetId = (typeof writingStylePresets)[number]["id"];
type ExpressionOptionKey = "emoji" | "punctuation" | "particles" | "meme" | "softCta";

const defaultExpressionOptions: Record<ExpressionOptionKey, boolean> = {
  emoji: true,
  punctuation: true,
  particles: true,
  meme: true,
  softCta: true
};

const expressionOptions = [
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

const hiddenXhsStickerToneGuide =
  "隐藏撰稿规则：如果平台是小红书，生成正文时必须自然少量使用小红书可识别的表情字符码，优先 [笑哭R]、[哭惹R]、[哇R]、[赞R]、[doge]、[蹲后续H]，每篇 2-5 个；字符码要融入正文语气，不要解释字符码，不要列出表情清单。";

const defaultGenerationKnowledgeQuery = "硕升博 高赞图文 写作参考";
const defaultGenerationTargetAudience = "准备硕升博申请的学生";
const defaultGenerationTagsText = "硕升博,水博,博士申请,小红书获客";

const xhsHighAttractionCoverStyle =
  "小红书高吸引封面：先按选题选择不同封面路线，优先轮换路线/榜单矩阵、决策地图、学术蓝图、杂志页、黑板批注、手机信息拼贴等结构；只有需要时才用学习桌或清单芯片。水博/在职博士/升博类内容可参考“水博榜”的路线矩阵思路，但学校、价格、认证和毕业难度必须来自已核实知识库，不能编造；避免官方标志、校徽、录取承诺和重复的奶油珊瑚薄荷模板。";

const douyinHighAttractionCoverStyle =
  "抖音图文封面：9:16高对比竖版首屏，强结果标题，真实学习/申请材料场景，短清单信息块，明亮但不杂乱，避免官方标志和录取承诺。";

type XhsStickerCategory =
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

type XhsSticker = {
  aliases?: readonly string[];
  code: string;
  face: string;
  name: string;
};

const xhsStickerCatalog: readonly {
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

const xhsStickerFaceByName: Record<string, string> = {
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

const xhsStickerCodeByName: Record<string, string> = {
  doge: "[doge]",
  蹲后续: "[蹲后续H]",
  吐舌头: "[吐舌头H]",
  扯脸: "[扯脸H]"
};

const xhsStickerAliasesByName: Record<string, readonly string[]> = {
  蹲后续: ["[蹲后续R]"]
};

const xhsStyleStickers: XhsSticker[] = xhsStickerCatalog.flatMap((group) =>
  group.names.map((name) => ({
    aliases: xhsStickerAliasesByName[name],
    code: xhsStickerCodeByName[name] ?? `[${name}R]`,
    face: xhsStickerFaceByName[name] ?? "💬",
    name
  }))
);

const xhsStickerByCode = new Map<string, XhsSticker>(
  xhsStyleStickers.flatMap((sticker) =>
    [sticker.code, ...(sticker.aliases ?? [])].map((code) => [code, sticker] as const)
  )
);

function buildWritingTone(
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

function buildGenerationTone(
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

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return workspaceTabIds.includes(value as WorkspaceTab);
}

function coerceWorkspaceTabAlias(value: string | null): WorkspaceTab | null {
  if (value === "review") {
    return "content";
  }
  if (value === "publish" || value === "publishing") {
    return "delivery";
  }
  return isWorkspaceTab(value) ? value : null;
}

function isInterfaceStyle(value: string | null): value is InterfaceStyle {
  return interfaceStyles.some((style) => style.id === value);
}

function ThemeSwatches({
  compact = false,
  style
}: {
  compact?: boolean;
  style: InterfaceStyle;
}) {
  const sizeClass = compact ? "h-1.5 w-7" : "h-2.5 w-8";
  const marginClass = compact ? "mt-2" : "mt-3";
  if (style === "cyberpunk") {
    return (
      <span
        aria-hidden="true"
        className={`theme-cyberpunk cyberpunk-theme-preview ${marginClass} ${compact ? "h-7" : "h-10"}`}
        data-testid="cyberpunk-theme-preview"
      >
        <span className="h-1.5 w-10 rounded-sm bg-moss shadow-[0_0_14px_rgb(var(--moss)/0.42)]" />
        <span className="h-1.5 w-8 rounded-sm bg-steel shadow-[0_0_14px_rgb(var(--steel)/0.38)]" />
        <span className="h-1.5 w-2.5 rounded-full bg-coral shadow-[0_0_12px_rgb(var(--coral)/0.45)]" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`theme-${style} ${marginClass} flex gap-1`}>
      <span className={`${sizeClass} rounded-sm bg-steel`} />
      <span className={`${sizeClass} rounded-sm bg-moss`} />
      <span className={`${sizeClass} rounded-sm bg-coral`} />
    </span>
  );
}

function isWritingStylePresetId(value: string | null): value is WritingStylePresetId {
  return writingStylePresets.some((style) => style.id === value);
}

function readLocalStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_error) {
    // Some embedded browsers disable localStorage. The workspace must keep working without it.
  }
}

function removeLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch (_error) {
    // Some embedded browsers disable localStorage. The workspace must keep working without it.
  }
}

function readStoredWorkspaceAccount() {
  const stored = readLocalStorage(PC_AUTH_STORAGE_KEY);
  const account = stored?.trim() ?? "";
  return account.length > 0 && account.length <= 32 ? account : null;
}

function saveStoredWorkspaceAccount(account: string) {
  writeLocalStorage(PC_AUTH_STORAGE_KEY, account);
}

function clearStoredWorkspaceAccount() {
  removeLocalStorage(PC_AUTH_STORAGE_KEY);
}

async function readApiError(response: Response, fallback: string) {
  const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
  if (errorBody?.detail === "database_unavailable") {
    return "数据库暂时不可用：安装包或本地运行请重新启动；自部署模式请检查数据库连接设置和数据库服务。";
  }
  return sanitizeServiceErrorMessage(errorBody?.message ?? errorBody?.detail ?? fallback);
}

function normalizeRewriteServiceMessage(message: string) {
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

type ProviderCheckResult = {
  configured: boolean;
  message: string;
  status: string;
  target: string;
};

type WorkspaceLoginResponse = {
  account: string;
  default_keys_bound: boolean;
  key_profile: string;
  provider_statuses: ProviderStatusItem[];
};

async function fetchProviderStatuses() {
  const response = await fetch(`${API_BASE}/workspace/provider-status`);
  if (!response.ok) {
    throw new Error(await readApiError(response, SERVICE_CONFIG_READ_ERROR));
  }
  return sanitizeProviderStatusItems(
    (await response.json()) as ProviderStatusItem[]
  );
}

async function authenticateWorkspaceLogin(account: string, password: string) {
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
    throw new Error("账号或密码不正确。");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("无法连接登录服务，请确认应用服务正在运行。");
    }
    throw error;
  }
}

function hasLiveImageProvider(statuses: ProviderStatusItem[]) {
  const imageProviderStatus = statuses.find((item) => item.name === "Image generation");
  return Boolean(
    imageProviderStatus?.configured && imageProviderStatus.provider !== "codex_test"
  );
}

const blockedPublishTerms = [
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

const localDraftMarkers = [
  "codex_test",
  "\u3010\u6d4b\u8bd5\u8349\u7a3f\u3011",
  "\u3010\u6f14\u793a\u8349\u7a3f\u3011",
  "\u3010\u672c\u5730\u68c0\u67e5\u8349\u7a3f\u3011"
];

function buildPlatformCopy(content: GeneratedContent) {
  const tagLine = formatTagLine(content.tags);
  return [content.title.trim(), content.body.trim(), tagLine].filter(Boolean).join("\n\n");
}

function complianceWarnings(content: GeneratedContent) {
  const text = `${content.title}\n${content.body}\n${formatTagLine(content.tags)}`;
  return blockedPublishTerms.filter((term) => text.includes(term));
}

function isTestDraft(content: GeneratedContent) {
  return localDraftMarkers.some((marker) => content.body.includes(marker));
}

function loadStoredGeneratedContent() {
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

function saveStoredGeneratedContent(content: GeneratedContent) {
  if (typeof window === "undefined" || isTestDraft(content)) {
    return;
  }
  try {
    window.localStorage.setItem(LAST_GENERATED_CONTENT_STORAGE_KEY, JSON.stringify(content));
  } catch (_error) {
    // Browser storage can be unavailable in restricted modes; the backend list still remains source of truth.
  }
}

function loadPinnedDraftIds() {
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

function savePinnedDraftIds(ids: number[]) {
  writeLocalStorage(PINNED_DRAFT_IDS_STORAGE_KEY, JSON.stringify(ids));
}

function sortDraftHistory(contents: GeneratedContent[], pinnedIds: number[]) {
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

function upsertDraftHistory(contents: GeneratedContent[], content: GeneratedContent) {
  return [content, ...contents.filter((item) => item.id !== content.id)];
}

function formatDraftTime(value?: string) {
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

function renderXhsExpressionText(text: string) {
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

export function WorkspaceClient({
  hasInitialTheme,
  initialProject,
  initialStyle,
  initialTab
}: {
  hasInitialTheme: boolean;
  initialProject: string | null;
  initialStyle: InterfaceStyle;
  initialTab: WorkspaceTab;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [interfaceStyle, setInterfaceStyle] = useState<InterfaceStyle>(initialStyle);
  const [defaultWritingStyle, setDefaultWritingStyle] =
    useState<WritingStylePresetId>("warm_cute");
  const [showHelperText, setShowHelperText] = useState(true);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [credentials, setCredentials] = useState<CredentialSettings>(emptyCredentials);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [workspaceAccount, setWorkspaceAccount] = useState<string | null>(null);

  useEffect(() => {
    function syncStateFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      const theme = params.get("theme");
      const normalizedTab = coerceWorkspaceTabAlias(tab);

      if (normalizedTab && tab !== normalizedTab) {
        params.set("tab", normalizedTab);
        window.history.replaceState(null, "", `/?${params.toString()}`);
        setActiveTab(normalizedTab);
      } else {
        setActiveTab(normalizedTab ?? "dashboard");
      }
      if (isInterfaceStyle(theme)) {
        setInterfaceStyle(theme);
      }
    }

    syncStateFromUrl();
    window.addEventListener("popstate", syncStateFromUrl);

    const params = new URLSearchParams(window.location.search);
    const storedStyle = readLocalStorage(INTERFACE_STYLE_STORAGE_KEY);
    if (!hasInitialTheme && !isInterfaceStyle(params.get("theme")) && isInterfaceStyle(storedStyle)) {
      setInterfaceStyle(storedStyle);
    }
    const storedWritingStyle = readLocalStorage(DEFAULT_WRITING_STYLE_STORAGE_KEY);
    if (isWritingStylePresetId(storedWritingStyle)) {
      setDefaultWritingStyle(storedWritingStyle);
    }

    try {
      const stored = readLocalStorage(CREDENTIAL_STORAGE_KEY);
      if (stored) {
        setCredentials({ ...emptyCredentials, ...JSON.parse(stored) });
      }
    } catch (_error) {
      setCredentials(emptyCredentials);
    } finally {
      setCredentialsLoaded(true);
    }
    setWorkspaceAccount(readStoredWorkspaceAccount());
    setAuthLoaded(true);

    return () => window.removeEventListener("popstate", syncStateFromUrl);
  }, [hasInitialTheme]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (hasInitialTheme) {
      setInterfaceStyle(initialStyle);
    }
  }, [hasInitialTheme, initialStyle]);

  useEffect(() => {
    if (!credentialsLoaded) {
      return;
    }
    writeLocalStorage(CREDENTIAL_STORAGE_KEY, JSON.stringify(credentials));
  }, [credentials, credentialsLoaded]);

  useEffect(() => {
    writeLocalStorage(INTERFACE_STYLE_STORAGE_KEY, interfaceStyle);
  }, [interfaceStyle]);

  useEffect(() => {
    writeLocalStorage(DEFAULT_WRITING_STYLE_STORAGE_KEY, defaultWritingStyle);
  }, [defaultWritingStyle]);

  function buildWorkspaceUrl(tab: WorkspaceTab, style = interfaceStyle) {
    const params = new URLSearchParams();
    if (tab !== "dashboard") {
      params.set("tab", tab);
    }
    params.set("theme", style);
    const query = params.toString();
    return query ? `/?${query}` : "/";
  }

  function handleTabChange(nextTab: WorkspaceTab) {
    setActiveTab(nextTab);
    const nextUrl = buildWorkspaceUrl(nextTab);
    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  }

  function handleLogin(account: string) {
    saveStoredWorkspaceAccount(account);
    setWorkspaceAccount(account);
  }

  function handleLogout() {
    clearStoredWorkspaceAccount();
    setWorkspaceAccount(null);
  }

  if (!authLoaded || !workspaceAccount) {
    return (
      <PcLoginPage
        interfaceStyle={interfaceStyle}
        loading={!authLoaded}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      accountLabel={workspaceAccount}
      interfaceStyle={interfaceStyle}
      onLogout={handleLogout}
      showHelperText={showHelperText}
    >
      {activeTab === "dashboard" ? (
        <DashboardView
          buildWorkspaceUrl={buildWorkspaceUrl}
          defaultWritingStyle={defaultWritingStyle}
          onDefaultWritingStyleChange={setDefaultWritingStyle}
        />
      ) : null}
      {activeTab === "research" ? (
        <ResearchView
          onOpenSettings={() => handleTabChange("settings")}
          workspaceToken={credentials.workspaceToken}
        />
      ) : null}
      {activeTab === "knowledge" ? <KnowledgeView /> : null}
      {activeTab === "content" ? (
        <ContentView
          defaultWritingStyle={defaultWritingStyle}
          initialProject={initialProject}
          onOpenSettings={() => handleTabChange("settings")}
          workspaceToken={credentials.workspaceToken}
        />
      ) : null}
      {activeTab === "cover" ? <CoverView contentHref={buildWorkspaceUrl("content")} /> : null}
      {activeTab === "delivery" ? <DeliveryView /> : null}
      {activeTab === "settings" ? (
        <SettingsView
          credentials={credentials}
          interfaceStyle={interfaceStyle}
          onCredentialsChange={setCredentials}
          onReset={() => setShowHelperText(true)}
          onShowHelperTextChange={setShowHelperText}
          showHelperText={showHelperText}
        />
      ) : null}
    </AppShell>
  );
}

function PcLoginPage({
  interfaceStyle,
  loading,
  onLogin
}: {
  interfaceStyle: InterfaceStyle;
  loading: boolean;
  onLogin: (account: string) => void;
}) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = loading || isSubmitting;

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }
    const normalizedAccount = account.trim();
    if (!normalizedAccount || !password) {
      setError("请输入账号和密码。");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await authenticateWorkspaceLogin(normalizedAccount, password);
      onLogin(result.account);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={`theme-${interfaceStyle} workspace-shell min-h-screen text-ink`}>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <section className="grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="glass-panel overflow-hidden rounded-[28px] border shadow-panel">
            <div className="flex h-full min-h-[520px] flex-col justify-between p-6 lg:p-8">
              <div>
                <div className="flex items-center gap-3">
                  <img
                    alt="OPC 应用图标"
                    className="h-14 w-14 rounded-[18px] object-cover shadow-[0_18px_38px_rgba(37,99,235,0.2)]"
                    src="/app-icon.png"
                  />
                  <div>
                    <div className="text-lg font-semibold leading-6">OPC</div>
                    <div className="text-sm text-muted">AI 任务执行平台</div>
                  </div>
                </div>
                <div className="mt-10 flex flex-wrap gap-2">
                  <Pill tone="blue">PC 工作台</Pill>
                  <Pill tone="green">本地预览</Pill>
                  <Pill tone="amber">人工确认后发布</Pill>
                </div>
                <h1 className="mt-5 max-w-xl text-3xl font-semibold leading-tight text-ink md:text-4xl">
                  登录后即可启动小红书获客任务。
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                  进入工作台后，先准备资料和趋势参考，再生成文案、封面和发布清单，最终仍由人工确认提交。
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted md:grid-cols-3">
                {[
                  { icon: PenLine, title: "生成草稿", body: "标题、正文、标签统一输出。" },
                  { icon: Image, title: "封面预览", body: "先看发布后的首屏效果。" },
                  { icon: ShieldCheck, title: "安全确认", body: "发布前保留人工把关。" }
                ].map((item, index) => (
                  <div
                    className="rounded-[18px] border border-line bg-paper/55 p-4"
                    key={`home-feature-${index}-${item.title}`}
                  >
                    <item.icon className="h-4 w-4 text-steel" />
                    <div className="mt-3 font-semibold text-ink">{item.title}</div>
                    <div className="mt-1 text-xs leading-5">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form
            className="glass-panel flex min-h-[520px] flex-col justify-between rounded-[28px] border p-5 shadow-panel sm:p-6"
            data-testid="pc-login-form"
            onSubmit={submitLogin}
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-steel/10 text-steel">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold leading-8">登录 OPC 工作台</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                请输入分配给你的账号和密码。登录状态只保存在这台设备上，不会保存密码。
              </p>

              <label className="mt-8 block text-sm font-medium text-ink" htmlFor="pc-login-account">
                账号
              </label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  autoComplete="username"
                  className="glass-control h-11 w-full rounded-md border py-2 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-steel/50 focus:ring-2 focus:ring-steel/20"
                  data-testid="pc-login-account"
                  disabled={busy}
                  id="pc-login-account"
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="请输入账号"
                  value={account}
                />
              </div>

              <label className="mt-5 block text-sm font-medium text-ink" htmlFor="pc-login-password">
                密码
              </label>
              <div className="relative mt-2">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  autoComplete="current-password"
                  className="glass-control h-11 w-full rounded-md border py-2 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-steel/50 focus:ring-2 focus:ring-steel/20"
                  data-testid="pc-login-password"
                  disabled={busy}
                  id="pc-login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  type="password"
                  value={password}
                />
              </div>

              {error ? (
                <div
                  className="mt-5 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm leading-6 text-ink"
                  data-testid="pc-login-error"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-8">
              <button
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper transition hover:translate-y-[-1px] hover:shadow-[0_16px_32px_rgba(15,23,42,0.2)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="pc-login-submit"
                disabled={busy}
                type="submit"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {loading ? "正在检查登录状态" : isSubmitting ? "正在登录" : "登录并进入工作台"}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-muted">
                忘记账号或密码时，请联系工作台管理员重置。
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function DashboardView({
  buildWorkspaceUrl,
  defaultWritingStyle,
  onDefaultWritingStyleChange
}: {
  buildWorkspaceUrl: (tab: WorkspaceTab) => string;
  defaultWritingStyle: WritingStylePresetId;
  onDefaultWritingStyleChange: (nextStyle: WritingStylePresetId) => void;
}) {
  const keyTasks = [
    {
      title: "趋势采集",
      description: "发现热门话题与优质内容",
      primaryMetric: "待同步",
      secondaryMetric: "待确认",
      tertiaryMetric: "待筛选",
      primaryLabel: "今日完成",
      secondaryLabel: "素材结果",
      tertiaryLabel: "高热话题",
      progress: "0%",
      action: "开始采集",
      href: buildWorkspaceUrl("research"),
      icon: Radar,
      tone: "green" as const
    },
    {
      title: "知识加工",
      description: "沉淀知识，构建可复用资产",
      primaryMetric: "待同步",
      secondaryMetric: "待关联",
      tertiaryMetric: "待入库",
      primaryLabel: "待处理",
      secondaryLabel: "证据来源",
      tertiaryLabel: "知识条目",
      progress: "0%",
      action: "去处理",
      href: buildWorkspaceUrl("knowledge"),
      icon: BookOpenText,
      tone: "green" as const
    },
    {
      title: "内容创作",
      description: "基于知识生产优质内容",
      primaryMetric: "待生成",
      secondaryMetric: "待审核",
      tertiaryMetric: "手动发布",
      primaryLabel: "草稿",
      secondaryLabel: "人工确认",
      tertiaryLabel: "发布动作",
      progress: "0%",
      action: "去创作",
      href: buildWorkspaceUrl("content"),
      icon: PenLine,
      tone: "green" as const
    }
  ];
  const recentActivities = [
    { time: "--:--", title: "趋势采集", detail: "运行采集后显示真实完成记录", status: "待运行", tone: "neutral" as const },
    { time: "--:--", title: "知识处理", detail: "保存摘要后显示真实入库记录", status: "待入库", tone: "neutral" as const },
    { time: "--:--", title: "内容生成", detail: "一键生成后显示真实草稿记录", status: "待生成", tone: "neutral" as const },
    { time: "--:--", title: "联网搜索", detail: "按需查询后显示 Tavily 结果", status: "按需触发", tone: "neutral" as const }
  ];
  const productivityMetrics = [
    { label: "采集话题", value: "--", trend: "连接后显示" },
    { label: "入库知识", value: "--", trend: "连接后显示" },
    { label: "生成内容", value: "--", trend: "连接后显示" },
    { label: "发布内容", value: "手动", trend: "不自动发布" },
    { label: "互动数据", value: "--", trend: "连接后显示" }
  ];
  const workspaceHealth = [
    { icon: KeyRound, label: "模型 Key", state: "设置可查", tone: "blue" as const },
    { icon: Search, label: "联网检索", state: "按需触发", tone: "green" as const },
    { icon: ShieldCheck, label: "人工确认", state: "固定开启", tone: "red" as const },
    { icon: Clipboard, label: "复制发布", state: "手动执行", tone: "amber" as const }
  ];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="glass-panel rounded-md border p-5 shadow-panel">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[2rem] font-semibold leading-tight text-ink lg:text-[2.35rem]">
                  今日工作台
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  采集、知识、创作和审核按顺序推进；系统只生成草稿，不会自动发布。
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>工作中</span>
                <span className="h-2 w-2 rounded-full bg-moss" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {workspaceHealth.map((item) => (
                <a
                  className="flex min-h-[86px] items-center gap-3 rounded-md border border-line/70 bg-paper/58 px-4 py-3"
                  href={item.label === "模型 Key" ? buildWorkspaceUrl("settings") : item.label === "联网检索" ? buildWorkspaceUrl("content") : buildWorkspaceUrl("content")}
                  key={`workspace-health-${item.label}`}
                >
                  <IconBox tone={item.tone}>
                    <item.icon className="h-4 w-4" />
                  </IconBox>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{item.label}</div>
                    <div className="mt-1 text-xs text-muted">{item.state}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-md border p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">关键任务</div>
                <p className="mt-1 text-xs text-muted">按参考图的桌面工作流排列，不再像手机卡片堆叠。</p>
              </div>
              <Pill tone="green">系统状态</Pill>
            </div>
            <div className="space-y-3">
              {keyTasks.map((task) => (
                <div
                  className="grid gap-3 rounded-md border border-line/70 bg-paper/58 p-4 lg:grid-cols-[230px_repeat(3,92px)_minmax(120px,1fr)_120px] lg:items-center"
                  key={`key-task-${task.title}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <IconBox tone={task.tone}>
                      <task.icon className="h-4 w-4" />
                    </IconBox>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-ink">{task.title}</div>
                      <div className="mt-1 truncate text-xs text-muted">{task.description}</div>
                    </div>
                  </div>
                  {[
                    [task.primaryMetric, task.primaryLabel],
                    [task.secondaryMetric, task.secondaryLabel],
                    [task.tertiaryMetric, task.tertiaryLabel]
                  ].map(([value, label]) => (
                    <div className="border-line/70 lg:border-l lg:pl-4" key={`${task.title}-${label}`}>
                      <div className="text-lg font-semibold leading-6 text-ink">{value}</div>
                      <div className="mt-1 text-xs text-muted">{label}</div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/70">
                      <div className="h-full rounded-full bg-moss" style={{ width: task.progress }} />
                    </div>
                    <span className="w-10 text-xs text-muted">{task.progress}</span>
                  </div>
                  <a
                    className="flex h-10 items-center justify-center rounded-md bg-moss px-4 text-sm font-semibold text-white"
                    href={task.href}
                  >
                    {task.action}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="glass-panel rounded-md border p-4 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">最近动态</div>
              <p className="mt-1 text-xs text-muted">真实流程入口，发布仍需人工确认。</p>
            </div>
            <Pill tone="neutral">全部类型</Pill>
          </div>
          <div className="mt-5 space-y-4">
            {recentActivities.map((activity) => (
              <div className="grid grid-cols-[52px_1fr_auto] gap-3" key={`${activity.time}-${activity.title}`}>
                <div className="text-xs text-muted">{activity.time}</div>
                <div className="min-w-0 border-l border-line pl-4">
                  <div className="text-sm font-semibold text-ink">{activity.title}</div>
                  <div className="mt-1 truncate text-xs text-muted">{activity.detail}</div>
                </div>
                <Pill tone={activity.tone}>{activity.status}</Pill>
              </div>
            ))}
          </div>
          <a
            className="mt-6 flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-paper/58 text-sm font-semibold text-ink"
            href={buildWorkspaceUrl("content")}
          >
            查看全部动态
          </a>
        </aside>
      </section>

      <section className="glass-panel rounded-md border p-4 shadow-panel">
        <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-[repeat(5,minmax(0,1fr))_320px] lg:divide-x lg:divide-y-0">
          {productivityMetrics.map((metric) => (
            <div className="px-3 py-3" key={`productivity-${metric.label}`}>
              <div className="text-xs text-muted">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold leading-none text-ink">{metric.value}</div>
              <div className="mt-2 text-xs font-semibold text-moss">{metric.trend}</div>
              <div className="mt-4 h-6 rounded-sm bg-[linear-gradient(135deg,rgb(var(--moss)/0.18)_25%,transparent_25%,transparent_50%,rgb(var(--moss)/0.18)_50%,rgb(var(--moss)/0.18)_75%,transparent_75%)] bg-[length:12px_12px]" />
            </div>
          ))}
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-ink">默认风格</div>
            <p className="mt-1 text-xs leading-5 text-muted">可在创作项目中细调。</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {writingStylePresets.slice(0, 4).map((style) => {
                const selected = style.id === defaultWritingStyle;
                return (
                  <button
                    aria-pressed={selected}
                    className={[
                      "rounded-md border px-3 py-2 text-left text-xs font-medium transition",
                      selected
                        ? "border-steel/50 bg-steel/10 text-ink"
                        : "border-line bg-mist/50 text-muted hover:border-steel/40 hover:text-ink"
                    ].join(" ")}
                    data-testid={`dashboard-writing-style-${style.id}`}
                    key={style.id}
                    onClick={() => onDefaultWritingStyleChange(style.id)}
                    type="button"
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[20px] border px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">生产流程</div>
            <p className="mt-1 text-xs leading-5 text-muted">
              数据先确认，再生成；发布动作不在自动流程里。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pipeline.slice(0, 5).map((step, index) => (
              <a
                className="group flex items-center gap-2 rounded-md border border-line bg-paper/55 px-3 py-2 text-xs font-medium text-ink"
                href={
                  index === 0
                    ? buildWorkspaceUrl("research")
                    : index === 1
                      ? buildWorkspaceUrl("knowledge")
                      : index === 2 || index === 3
                        ? buildWorkspaceUrl("content")
                        : buildWorkspaceUrl("settings")
                }
                key={`pipeline-step-${index}-${step.title}`}
              >
                <step.icon className="h-3.5 w-3.5 text-steel transition group-hover:text-ink" />
                {step.title}
              </a>
            ))}
            <span className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-medium text-ink">
              人工确认后再发布
            </span>
          </div>
        </div>
      </section>

      <DependencyDoctorPanel />
    </div>
  );
}

function DependencyDoctorPanel() {
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [dependencyBusy, setDependencyBusy] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [showRepairPlan, setShowRepairPlan] = useState(false);

  useEffect(() => {
    void loadDependencyReport();
  }, []);

  async function loadDependencyReport() {
    setDependencyBusy(true);
    setDependencyError(null);
    try {
      const response = await fetch(`${API_BASE}/workspace/dependencies`);
      if (!response.ok) {
        throw new Error(await readApiError(response, "依赖检测失败。"));
      }
      const data = (await response.json()) as DependencyReport;
      setDependencyReport(data);
    } catch (error) {
      setDependencyError(error instanceof Error ? error.message : "依赖检测失败。");
    } finally {
      setDependencyBusy(false);
    }
  }

  const blockedCount = dependencyReport?.summary.blocking ?? 0;
  const warningCount = dependencyReport?.summary.warning ?? 0;
  const totalCount = dependencyReport?.summary.total ?? 0;
  const reportTone =
    dependencyReport?.status === "blocked"
      ? "red"
      : dependencyReport?.status === "attention"
        ? "amber"
        : "green";
  const reportLabel =
    dependencyReport?.status === "blocked"
      ? "需处理"
      : dependencyReport?.status === "attention"
        ? "有提醒"
        : "正常";
  const attentionItems =
    dependencyReport?.items.filter((item) => item.status !== "ok").slice(0, 8) ?? [];
  const hasDependencyIssues = Boolean(
    dependencyReport && (dependencyReport.status !== "ok" || attentionItems.length > 0)
  );
  const primaryRepairStep = dependencyReport?.repair_steps[0] ?? "python scripts/setup_local.py";

  return (
    <Panel
      action={
        <button
          aria-label="检测依赖"
          className={`${secondaryButtonClass} h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={dependencyBusy}
          onClick={loadDependencyReport}
          type="button"
        >
          {dependencyBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          检测依赖
        </button>
      }
      helper="换设备或首次安装时先看这里；Windows 安装包会检查运行环境和项目依赖。"
      title="环境检测与一键修复"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
        <div className={`${subtleCardClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">依赖状态</div>
              <p className="mt-1 text-xs leading-5 text-muted">
                {dependencyReport
                  ? `已检测 ${totalCount} 项`
                  : dependencyBusy
                    ? "正在检测当前设备"
                    : "尚未完成检测"}
              </p>
            </div>
            <Pill tone={dependencyReport ? reportTone : "neutral"}>{dependencyReport ? reportLabel : "待检测"}</Pill>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-line bg-mist px-2 py-2">
              <div className="text-lg font-semibold">{blockedCount}</div>
              <div className="text-[11px] text-muted">阻塞</div>
            </div>
            <div className="rounded-md border border-line bg-mist px-2 py-2">
              <div className="text-lg font-semibold">{warningCount}</div>
              <div className="text-[11px] text-muted">提醒</div>
            </div>
            <div className="rounded-md border border-line bg-mist px-2 py-2">
              <div className="text-lg font-semibold">{totalCount}</div>
              <div className="text-[11px] text-muted">总项</div>
            </div>
          </div>
          <button
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!dependencyReport || !hasDependencyIssues}
            onClick={() => {
              if (hasDependencyIssues) {
                setShowRepairPlan((current) => !current);
              }
            }}
            type="button"
          >
            {dependencyReport && !hasDependencyIssues ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Terminal className="h-4 w-4" />
            )}
            {dependencyReport && !hasDependencyIssues ? "无需修复" : "查看修复方案"}
          </button>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {hasDependencyIssues ? (
              <>
                推荐处理：<span className="font-mono text-ink">{primaryRepairStep}</span>
              </>
            ) : dependencyReport ? (
              "当前环境满足运行要求。"
            ) : (
              "检测后会显示需要处理的修复建议。"
            )}
          </p>
        </div>

        <div className="space-y-3">
          {dependencyError ? (
            <div className={`${subtleCardClass} border-coral/40 p-4 text-sm text-coral`}>
              {dependencyError}
            </div>
          ) : null}
          {attentionItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {attentionItems.map((item, index) => (
                <div className={`${subtleCardClass} p-3`} key={`attention-${index}-${item.category}-${item.name}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.status === "missing" || item.status === "outdated" ? (
                          <AlertTriangle className="h-4 w-4 text-coral" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-amber" />
                        )}
                        <span className="text-sm font-semibold">{item.name}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted">{item.message}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted">
                        当前：{item.detected || "未检测到"}
                        {item.minimum ? ` · 要求：${item.minimum}+` : ""}
                      </p>
                    </div>
                    <Pill tone={dependencyTone[item.status]}>
                      {dependencyStatusLabel[item.status]}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          ) : dependencyReport ? (
            <div className={`${subtleCardClass} p-4`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-moss" />
                核心依赖满足当前项目要求
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                普通安装包模式无需额外安装系统组件；后续切换电脑时重新检测即可。
              </p>
            </div>
          ) : (
            <div className={`${subtleCardClass} p-4 text-sm text-muted`}>
              点击“检测依赖”查看当前设备状态。
            </div>
          )}

          {showRepairPlan && dependencyReport && hasDependencyIssues ? (
            <div className={`${subtleCardClass} p-4`}>
              <div className="text-sm font-semibold">修复方案</div>
              <div className="mt-3 space-y-2">
                {dependencyReport.repair_steps.map((step, index) => (
                  <div
                    className="rounded-md border border-line bg-ink px-3 py-2 font-mono text-xs leading-5 text-paper"
                    key={`${step}-${index}`}
                  >
                    {step}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                当前只生成修复建议，不会直接安装系统组件；Windows 安装包模式不需要 Docker，自部署模式才会提示 Docker。
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function ResearchView({
  onOpenSettings,
  workspaceToken
}: {
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  return (
    <div className="space-y-4">
      <TrendCollectorPanel onOpenSettings={onOpenSettings} workspaceToken={workspaceToken} />
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReferencePanel
          helper="后续写稿时优先参考这些高赞图文结构。"
          items={writingReferences}
          title="写作参考"
        />
        <ReferencePanel
          helper="封面生成时参考标题层级、清单数量和视觉对比。"
          items={coverReferences}
          title="图文参考"
        />
      </section>
    </div>
  );
}

function KnowledgeView() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("正在读取知识库...");
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [portalReady, setPortalReady] = useState(false);

  async function loadKnowledge(nextQuery = query) {
    const normalizedQuery = nextQuery.trim();
    setLoading(true);
    setMessage(normalizedQuery ? "正在搜索知识库..." : "正在读取最近入库内容...");
    try {
      const data = await fetchKnowledgeItems(API_BASE, {
        limit: 24,
        query: normalizedQuery
      });
      setItems(data);
      setMessage(
        data.length
          ? normalizedQuery
            ? `找到 ${data.length} 条相关知识。`
            : `已显示最近 ${data.length} 条知识。`
          : normalizedQuery
            ? "没有找到匹配知识，可以换个关键词。"
            : "知识库还没有条目，先从采集页保存知识摘要。"
      );
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : "知识库读取失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKnowledge("");
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setCopyState("idle");
  }, [selectedItem?.id]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadKnowledge(query);
  }

  function openKnowledgeItem(item: KnowledgeItem) {
    setSelectedItem(item);
  }

  function openKnowledgeDetailModal(item: KnowledgeItem) {
    setSelectedItem(item);
    setDetailModalOpen(true);
  }

  async function copyKnowledgeItem(item: KnowledgeItem) {
    try {
      await copyText(`${knowledgeItemTitle(item)}\n\n${knowledgeItemContent(item)}`);
      setCopyState("copied");
    } catch (_error) {
      setCopyState("failed");
    }
  }

  const visibleDetailItem = selectedItem ?? items[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel helper="查看已经入库的采集摘要、写作素材和人工确认后的知识条目。" title="知识库">
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={submitSearch}>
          <label className="min-w-0">
            <span className="text-xs font-medium text-muted">搜索知识条目</span>
            <div className="glass-control mt-2 flex h-10 items-center gap-2 rounded-md border px-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                data-testid="knowledge-search-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例如：水博 排名 学校 认证"
                value={query}
              />
            </div>
          </label>
          <button
            className="mt-auto flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            搜索
          </button>
          <button
            className={`${secondaryButtonClass} mt-auto h-10 px-4 disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={loading}
            onClick={() => {
              setQuery("");
              void loadKnowledge("");
            }}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            刷新
          </button>
        </form>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted" data-testid="knowledge-list-status">
            {message}
          </p>
          <Pill tone={items.length ? "green" : "neutral"}>{items.length} 条</Pill>
        </div>

        <div className="overflow-hidden rounded-md border border-line/70" data-testid="knowledge-list">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="px-3 py-3">标题</th>
                  <th className="px-3 py-3">类别</th>
                  <th className="px-3 py-3">来源</th>
                  <th className="px-3 py-3">状态</th>
                  <th className="px-3 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => (
                  <tr
                    className={[
                      "cursor-pointer bg-paper/50 align-top transition focus-within:bg-moss/10 hover:bg-moss/5",
                      visibleDetailItem?.id === item.id ? "bg-moss/10" : ""
                    ].join(" ")}
                    data-testid="knowledge-item"
                    key={item.id}
                    onClick={() => openKnowledgeItem(item)}
                  >
                    <td className="px-3 py-3">
                      <button
                        className="block w-full text-left focus-visible:outline-none"
                        onClick={() => openKnowledgeItem(item)}
                        type="button"
                      >
                        <span className="line-clamp-2 break-words font-semibold leading-5 text-ink">
                          {knowledgeItemTitle(item)}
                        </span>
                        <span className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted">
                          {knowledgeItemExcerpt(item, 150)}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <Pill>{knowledgeCategoryLabel(item.category)}</Pill>
                    </td>
                    <td className="px-3 py-3 text-xs leading-5 text-muted">
                      #{item.id}
                      <br />
                      {item.match_type === "recent" ? "最近入库" : "检索结果"}
                    </td>
                    <td className="px-3 py-3">
                      {typeof item.score === "number" ? (
                        <Pill tone="green">匹配 {Math.round(item.score * 100)}%</Pill>
                      ) : (
                        <Pill tone="neutral">点击看全文</Pill>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-paper/70 px-3 text-xs font-semibold text-ink"
                        onClick={(event) => {
                          event.stopPropagation();
                          openKnowledgeDetailModal(item);
                        }}
                        type="button"
                      >
                        展开
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && items.length === 0 ? (
          <div className={`${subtleCardClass} mt-3 px-4 py-5 text-sm leading-6 text-muted`}>
            这里会展示采集页保存的知识摘要。先在“采集”里确认来源，再保存知识摘要，之后创作会优先引用这里的内容。
          </div>
        ) : null}
      </Panel>

      {detailModalOpen && selectedItem && portalReady
        ? createPortal(
            <div
              aria-modal="true"
              className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-md"
              data-testid="pc-knowledge-detail-modal"
              onClick={() => setDetailModalOpen(false)}
              role="dialog"
            >
              <section
                aria-label="知识条目详情"
                className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/50 bg-paper shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-moss">#{selectedItem.id}</span>
                      <Pill>{knowledgeCategoryLabel(selectedItem.category)}</Pill>
                    </div>
                    <h3 className="mt-2 break-words text-lg font-semibold leading-7 text-ink">
                      {knowledgeItemTitle(selectedItem)}
                    </h3>
                  </div>
                  <button
                    aria-label="关闭知识条目详情"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-mist text-muted"
                    data-testid="pc-knowledge-detail-close"
                    onClick={() => setDetailModalOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <p
                    className="whitespace-pre-wrap break-words text-sm leading-7 text-ink/82"
                    data-testid="pc-knowledge-detail-content"
                  >
                    {knowledgeItemContent(selectedItem)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted">
                    这是已入库知识内容；涉及学校、价格、排名或认证时，发布前仍需回到来源核对。
                  </p>
                  <button
                    className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper"
                    data-testid="pc-knowledge-detail-copy"
                    onClick={() => void copyKnowledgeItem(selectedItem)}
                    type="button"
                  >
                    <Clipboard className="h-4 w-4" />
                    {copyState === "copied" ? "已复制" : copyState === "failed" ? "复制失败，请手选" : "复制知识条目"}
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}

      <div className="space-y-4">
        <Panel
          action={visibleDetailItem ? <Pill tone="green">可复制</Pill> : <Pill tone="neutral">待选择</Pill>}
          helper="点击左侧知识条目后，会在这里直接展开正文。"
          title="知识详情"
        >
          {visibleDetailItem ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-moss">#{visibleDetailItem.id}</span>
                <Pill>{knowledgeCategoryLabel(visibleDetailItem.category)}</Pill>
                {visibleDetailItem.match_type ? (
                  <Pill tone={visibleDetailItem.match_type === "recent" ? "neutral" : "green"}>
                    {visibleDetailItem.match_type === "recent" ? "最近入库" : "检索命中"}
                  </Pill>
                ) : null}
              </div>
              <h3 className="mt-3 break-words text-lg font-semibold leading-7 text-ink">
                {knowledgeItemTitle(visibleDetailItem)}
              </h3>
              <div className="mt-4 max-h-[420px] overflow-y-auto rounded-md border border-line/70 bg-paper/60 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink/82">
                  {knowledgeItemContent(visibleDetailItem)}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper"
                  onClick={() => void copyKnowledgeItem(visibleDetailItem)}
                  type="button"
                >
                  <Clipboard className="h-4 w-4" />
                  {copyState === "copied" ? "已复制" : copyState === "failed" ? "复制失败" : "复制条目"}
                </button>
                <button
                  className={`${secondaryButtonClass} h-10 px-4`}
                  onClick={() => openKnowledgeDetailModal(visibleDetailItem)}
                  type="button"
                >
                  <ExternalLink className="h-4 w-4" />
                  展开详情
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                学校、价格、排名、认证等事实仍需回到原始来源核对后再发布。
              </p>
            </div>
          ) : (
            <div className={`${subtleCardClass} px-4 py-5 text-sm leading-6 text-muted`}>
              当前没有可预览的知识条目。先从采集页保存知识摘要。
            </div>
          )}
        </Panel>
        <Panel helper="系统默认不跳过的项目规则。" title="入库规则">
          <SafetyGateList />
        </Panel>
        <Panel helper="这些是知识资产的类型说明，不是虚构样本。" title="知识资产类型">
          <div className="grid grid-cols-1 gap-3">
            {knowledgeAssets.map((asset, index) => (
              <div key={`knowledge-asset-${index}-${asset.title}`} className={`${subtleCardClass} p-4`}>
                <div className="flex items-start gap-3">
                  <IconBox tone="green">
                    <asset.icon className="h-4 w-4" />
                  </IconBox>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold">{asset.title}</h3>
                      <Pill>{asset.status}</Pill>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">{asset.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
function ContentView({
  defaultWritingStyle,
  initialProject,
  onOpenSettings,
  workspaceToken
}: {
  defaultWritingStyle: WritingStylePresetId;
  initialProject: string | null;
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [selectedCreationProjectId, setSelectedCreationProjectId] =
    useState<CreationProjectId | null>(
      () => findEnabledCreationProject(initialProject)?.id ?? null
    );
  const [previewContent, setPreviewContent] = useState<GeneratedContent | null>(null);
  const [previewImageAsset, setPreviewImageAsset] = useState<GeneratedImageAsset | null>(null);
  const [draftHistory, setDraftHistory] = useState<GeneratedContent[]>([]);
  const [draftImagesByContentId, setDraftImagesByContentId] = useState<
    Record<number, GeneratedImageAsset | null>
  >({});
  const [pinnedDraftIds, setPinnedDraftIds] = useState<number[]>([]);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const selectedCreationProject = findEnabledCreationProject(selectedCreationProjectId);

  async function fetchLatestImage(contentId: number) {
    try {
      const response = await fetch(`${API_BASE}/image/list?content_id=${contentId}&limit=1`);
      if (!response.ok) {
        return null;
      }
      const images = (await response.json()) as unknown;
      if (!Array.isArray(images)) {
        return null;
      }
      return images.find(isGeneratedImageAsset) ?? null;
    } catch (_error) {
      return null;
    }
  }

  function handleGeneratedContent(content: GeneratedContent) {
    setPreviewContent(content);
    setPreviewImageAsset(null);
    setDraftHistory((current) =>
      sortDraftHistory(upsertDraftHistory(current, content), pinnedDraftIds)
    );
    setDraftActionError(null);
    saveStoredGeneratedContent(content);
  }

  function handleImageGenerated(asset: GeneratedImageAsset) {
    setPreviewImageAsset(asset);
    setDraftImagesByContentId((current) => ({
      ...current,
      [asset.content_id]: asset
    }));
  }

  async function handleSelectDraft(content: GeneratedContent) {
    setPreviewContent(content);
    setDraftActionError(null);
    saveStoredGeneratedContent(content);
    if (Object.prototype.hasOwnProperty.call(draftImagesByContentId, content.id)) {
      setPreviewImageAsset(draftImagesByContentId[content.id]);
      return;
    }
    setPreviewImageAsset(null);
    const image = await fetchLatestImage(content.id);
    setDraftImagesByContentId((current) => ({
      ...current,
      [content.id]: image
    }));
    setPreviewImageAsset(image);
  }

  function handleTogglePinDraft(contentId: number) {
    setPinnedDraftIds((current) => {
      const next = current.includes(contentId)
        ? current.filter((id) => id !== contentId)
        : [contentId, ...current];
      savePinnedDraftIds(next);
      setDraftHistory((history) => sortDraftHistory(history, next));
      return next;
    });
  }

  async function handleDeleteDraft(contentId: number) {
    setDraftActionError(null);
    try {
      const response = await fetch(`${API_BASE}/content/${contentId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "草稿删除失败。"));
      }
      const nextHistory = draftHistory.filter((content) => content.id !== contentId);
      const nextPinnedIds = pinnedDraftIds.filter((id) => id !== contentId);
      const nextContent = previewContent?.id === contentId ? nextHistory[0] ?? null : previewContent;
      setDraftHistory(sortDraftHistory(nextHistory, nextPinnedIds));
      setPinnedDraftIds(nextPinnedIds);
      savePinnedDraftIds(nextPinnedIds);
      setDraftImagesByContentId((current) => {
        const next = { ...current };
        delete next[contentId];
        return next;
      });
      if (previewContent?.id === contentId) {
        setPreviewContent(nextContent);
        setPreviewImageAsset(nextContent ? draftImagesByContentId[nextContent.id] ?? null : null);
        if (nextContent) {
          saveStoredGeneratedContent(nextContent);
        } else {
          removeLocalStorage(LAST_GENERATED_CONTENT_STORAGE_KEY);
        }
      }
    } catch (error) {
      setDraftActionError(error instanceof Error ? error.message : "草稿删除失败。");
    }
  }

  function handleSelectCreationProject(projectId: CreationProjectId) {
    setSelectedCreationProjectId(projectId);
    updateCreationProjectQuery(projectId);
  }

  function handleReturnToProjects() {
    setSelectedCreationProjectId(null);
    updateCreationProjectQuery(null);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const project = findEnabledCreationProject(params.get("project"));
    if (project) {
      setSelectedCreationProjectId(project.id);
    } else if (params.has("project")) {
      updateCreationProjectQuery(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const storedPinnedIds = loadPinnedDraftIds();
    setPinnedDraftIds(storedPinnedIds);
    const storedContent = loadStoredGeneratedContent();
    if (storedContent) {
      setPreviewContent(storedContent);
      setDraftHistory([storedContent]);
    }

    if (storedContent) {
      void fetchLatestImage(storedContent.id).then((image) => {
        if (active) {
          setPreviewImageAsset(image);
          setDraftImagesByContentId((current) => ({
            ...current,
            [storedContent.id]: image
          }));
        }
      });
    }

    async function loadLatestContent() {
      try {
        const response = await fetch(`${API_BASE}/content/list?platform=xiaohongshu`);
        if (!response.ok) {
          return;
        }
        const contents = (await response.json()) as unknown;
        if (!Array.isArray(contents)) {
          return;
        }
        const history = sortDraftHistory(
          contents.filter(isGeneratedContent).filter((content) => !isTestDraft(content)),
          storedPinnedIds
        );
        const latestContent = history[0] ?? null;
        if (active) {
          setDraftHistory(history);
          setPreviewContent(latestContent);
          setPreviewImageAsset(null);
          if (latestContent) {
            saveStoredGeneratedContent(latestContent);
          }
        }
        for (const content of history) {
          void fetchLatestImage(content.id).then((image) => {
            if (!active) {
              return;
            }
            setDraftImagesByContentId((current) => ({
              ...current,
              [content.id]: image
            }));
            if (latestContent?.id === content.id) {
              setPreviewImageAsset(image);
            }
          });
        }
      } catch (_error) {
        // Keep the local draft or full example visible when the database/API is not available.
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    }

    void loadLatestContent();
    return () => {
      active = false;
    };
  }, []);

  if (!selectedCreationProject) {
    return (
      <CreationProjectGateway
        latestContent={previewContent}
        loading={previewLoading}
        onSelect={handleSelectCreationProject}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-md border px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="green">当前项目</Pill>
              <Pill tone="blue">小红书获客</Pill>
              <Pill tone="amber">人工确认后发布</Pill>
            </div>
            <h2 className="mt-3 text-xl font-semibold leading-7 text-ink">
              {selectedCreationProject.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              {selectedCreationProject.description}
            </p>
          </div>
          <button
            className={`${secondaryButtonClass} h-10 px-4`}
            data-testid="creation-project-return"
            onClick={handleReturnToProjects}
            type="button"
          >
            返回项目
          </button>
        </div>
      </section>

        <GenerationLauncher
          defaultWritingStyle={defaultWritingStyle}
          latestImageAsset={previewImageAsset}
          latestContent={previewContent}
          onGeneratedContent={handleGeneratedContent}
          onImageGenerated={handleImageGenerated}
          onOpenSettings={onOpenSettings}
          workspaceToken={workspaceToken}
        />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <DraftPanel
          content={previewContent}
          coverImageAsset={previewImageAsset}
          draftActionError={draftActionError}
          history={draftHistory}
          imageAssetsByContentId={draftImagesByContentId}
          loading={previewLoading}
          onDeleteContent={handleDeleteDraft}
          onSelectContent={handleSelectDraft}
          onTogglePin={handleTogglePinDraft}
          pinnedContentIds={pinnedDraftIds}
        />
        <div className="space-y-4">
          <Panel helper="生成前需要明确输入、改写和确认边界。" title="生产控制">
            <div className="space-y-3">
              {contentControls.map((control, index) => (
                <div key={`content-control-${index}-${control.title}`} className={`${subtleCardClass} p-3`}>
                  <div className="flex items-center gap-3">
                    <IconBox tone="blue">
                      <control.icon className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <div className="text-sm font-semibold">{control.title}</div>
                      <p className="mt-1 text-xs leading-5 text-muted">{control.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <ReferencePanel
            helper="用于降低模板感、提高开头吸引力。"
            items={writingReferences}
            title="可用参考"
          />
        </div>
      </div>
    </div>
  );
}

function CreationProjectGateway({
  latestContent,
  loading,
  onSelect
}: {
  latestContent: GeneratedContent | null;
  loading: boolean;
  onSelect: (projectId: CreationProjectId) => void;
}) {
  const liveProject = creationProjects.find((project) => project.enabled) ?? creationProjects[0];
  const roadmapProjects = creationProjects.filter((project) => !project.enabled);
  const gatewayWorkflowIcons = [Search, PenLine, Clipboard, ShieldCheck] as const;
  const gatewayWorkflowTones = ["blue", "green", "amber", "red"] as const;

  return (
    <div className="space-y-6" data-testid="creation-project-gateway">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <button
          aria-label={`进入${liveProject.title}创作流程`}
          className="group glass-panel relative min-h-[372px] overflow-hidden rounded-[30px] border p-0 text-left shadow-panel transition duration-200 hover:translate-y-[-2px] hover:border-steel/60 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/45 active:translate-y-0"
          data-testid={`creation-project-${liveProject.id}`}
          onClick={() => onSelect(liveProject.id)}
          type="button"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-steel/15 via-moss/10 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper/45 to-transparent" />
          <div className="relative grid h-full gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_286px] lg:p-6">
            <div className="flex min-h-[314px] flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="blue">PC 创作入口</Pill>
                <Pill tone="green">{liveProject.status}</Pill>
                <Pill tone="amber">人工确认后发布</Pill>
              </div>

              <div className="mt-6 max-w-3xl">
                <div className="text-xs font-semibold text-muted">{liveProject.category}</div>
                <h2 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-ink lg:text-[2.65rem]">
                  {liveProject.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted lg:text-[15px]">
                  {liveProject.description}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 2xl:grid-cols-4">
                {liveProject.workflow.map((step, index) => {
                  const StepIcon = gatewayWorkflowIcons[index] ?? ShieldCheck;
                  return (
                    <div
                      className="min-h-[84px] rounded-[18px] border border-line/70 bg-paper/55 px-3 py-3 transition group-hover:border-steel/45 group-hover:bg-paper/70"
                      key={`live-project-step-${index}-${step}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <IconBox tone={gatewayWorkflowTones[index] ?? "blue"}>
                          <StepIcon className="h-4 w-4" />
                        </IconBox>
                        <span className="text-[11px] font-semibold text-muted">
                          0{index + 1}
                        </span>
                      </div>
                      <div className="mt-3 text-xs font-semibold leading-5 text-ink">{step}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-line/70 pt-5 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-ink">输入资料</div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {liveProject.inputs.join(" / ")}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-ink">交付结果</div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {liveProject.outputs.join(" / ")}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="max-w-xl text-xs leading-5 text-muted">
                  推荐选题、自定义选题、知识依据、封面方向和复制确认保持同题同步。
                </span>
                <span className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper shadow-sm transition group-hover:translate-y-[-1px]">
                  <PenLine className="h-4 w-4" />
                  进入项目
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-line/70 bg-paper/58 p-4 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.46)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black text-moss">一键生成</div>
                  <div className="mt-1 text-lg font-black leading-6 text-ink">
                    撰稿 + 封面图
                  </div>
                </div>
                <IconBox tone="green">
                  <Image className="h-4 w-4" />
                </IconBox>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-3">
                  <span className="text-xs font-medium text-muted">知识依据</span>
                  <span className="text-xs font-semibold text-ink">跟随选题检索</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-3">
                  <span className="text-xs font-medium text-muted">封面方向</span>
                  <span className="text-xs font-semibold text-ink">随主题同步</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted">发布动作</span>
                  <span className="text-xs font-semibold text-ink">人工确认后复制</span>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full w-3/4 rounded-full bg-moss" />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                桌面端保留批量管理空间，也让生成依据和确认边界更早露出来。
              </p>
            </div>
          </div>
        </button>

        <aside className="glass-panel rounded-[28px] border p-5 shadow-panel lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">确认状态</div>
              <p className="mt-1 text-xs leading-5 text-muted">发布前确认链路保持可见。</p>
            </div>
            <IconBox tone={latestContent ? "green" : "blue"}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpenText className="h-4 w-4" />
              )}
            </IconBox>
          </div>

          <div className="mt-6">
            <div className="rounded-[22px] border border-line/70 bg-paper/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {latestContent ? "已有历史草稿" : loading ? "正在读取草稿" : "还没有草稿"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {latestContent
                      ? "进入项目后，可以从历史草稿中预览、复制或重新生成。"
                      : "先进入项目，填写选题后生成文案和封面。"}
                  </p>
                </div>
                <Pill tone={latestContent ? "green" : loading ? "blue" : "amber"}>
                  {latestContent ? "可继续" : loading ? "读取中" : "待开始"}
                </Pill>
              </div>
            </div>

            <div className="mt-4 divide-y divide-line/70 rounded-[22px] border border-line/70 bg-paper/45">
              {[
                ["采集", "先看来源，再入知识库"],
                ["生成", "只生成草稿和封面"],
                ["发布", "人工确认后手动复制"]
              ].map(([label, detail]) => (
                <div className="flex items-center justify-between gap-3 px-4 py-3" key={label}>
                  <span className="text-xs font-semibold text-ink">{label}</span>
                  <span className="text-right text-xs leading-5 text-muted">{detail}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[22px] border border-amber/45 bg-amber/10 p-4 text-xs leading-5 text-muted">
              所有项目都会保留人工确认节点；不会自动发布，也不会伪造采集、图片或效果数据。
            </div>
          </div>
        </aside>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ink">后续自动化项目</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              这些模块先展示方向，接入后也会像「1.硕升博推广」一样进入独立创作流程。
            </p>
          </div>
          <Pill tone="neutral">仅展示</Pill>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {roadmapProjects.map((project) => (
            <article
              className="glass-subtle rounded-[24px] border p-4 opacity-85 transition hover:opacity-100"
              data-testid={`creation-project-${project.id}`}
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-muted">{project.category}</div>
                  <h4 className="mt-1 text-lg font-semibold leading-6 text-ink">{project.title}</h4>
                </div>
                <Pill tone={project.statusTone}>{project.status}</Pill>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{project.description}</p>
              <div className="mt-4 grid grid-cols-1 gap-3 text-xs leading-5 sm:grid-cols-2">
                <div>
                  <div className="font-semibold text-ink">输入</div>
                  <div className="mt-1 text-muted">{project.inputs.join(" / ")}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">交付</div>
                  <div className="mt-1 text-muted">{project.outputs.join(" / ")}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.workflow.map((step, index) => (
                  <span
                    className="rounded-md border border-line bg-paper/60 px-2 py-1 text-[11px] font-medium text-muted"
                    key={`${project.id}-workflow-${index}-${step}`}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function GenerationLauncher({
  defaultWritingStyle,
  latestImageAsset,
  latestContent,
  onGeneratedContent,
  onImageGenerated,
  onOpenSettings,
  workspaceToken
}: {
  defaultWritingStyle: WritingStylePresetId;
  latestImageAsset: GeneratedImageAsset | null;
  latestContent: GeneratedContent | null;
  onGeneratedContent: (content: GeneratedContent) => void;
  onImageGenerated: (asset: GeneratedImageAsset) => void;
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [platform, setPlatform] = useState("xiaohongshu");
  const [topic, setTopic] = useState("硕升博申请第一步，不是先套磁");
  const [knowledgeQuery, setKnowledgeQuery] = useState(defaultGenerationKnowledgeQuery);
  const [targetAudience, setTargetAudience] = useState(defaultGenerationTargetAudience);
  const [visibleTopicPresets, setVisibleTopicPresets] = useState<GenerationTopicPreset[]>(() =>
    pickGenerationTopicPresetBatch()
  );
  const [stylePreset, setStylePreset] = useState<WritingStylePresetId>(defaultWritingStyle);
  const [styleOptions, setStyleOptions] =
    useState<Record<ExpressionOptionKey, boolean>>(defaultExpressionOptions);
  const [tone, setTone] = useState(() =>
    buildWritingTone(defaultWritingStyle, defaultExpressionOptions)
  );
  const [tagsText, setTagsText] = useState(defaultGenerationTagsText);
  const [busyAction, setBusyAction] = useState<"draft" | null>(null);
  const [statusText, setStatusText] = useState("填写选题后，点击“一键生成图文+封面”。");
  const [lastContent, setLastContent] = useState<GeneratedContent | null>(null);
  const [lastContentInputSignature, setLastContentInputSignature] =
    useState<GeneratedContentInputSignature | null>(null);
  const [needsProviderSettings, setNeedsProviderSettings] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [draftCheckStatus, setDraftCheckStatus] = useState<ProviderCheckResult | null>(null);
  const [draftCheckBusy, setDraftCheckBusy] = useState(false);
  const [sourceContext, setSourceContext] = useState<GenerationSourceContext | null>(null);
  const [sourcePreviewBusy, setSourcePreviewBusy] = useState(false);
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(null);

  const selectedPlatform: PlatformId = platform === "douyin" ? "douyin" : "xiaohongshu";
  const selectedTopicPreset = findGenerationTopicPresetByTopic(topic);
  const hasTopic = topic.trim().length > 0;
  const currentGenerationInputSignature = buildGenerationInputSignature({
    knowledgeQuery,
    platform: selectedPlatform,
    tagsText,
    targetAudience,
    tone,
    topic
  });
  const coverDirectionPreviewLabel = selectedTopicPreset?.desktopLabel ?? (hasTopic ? "自定义" : "待选择");
  const coverDirectionPreview = selectedTopicPreset?.coverDirection ?? (
    hasTopic
      ? "自定义选题会使用当前平台基础封面风格；生成前请在预览里确认标题、封面方向和标签是否一致。"
      : "选择推荐选题后，会在这里预览封面方向；自定义选题也会保留人工确认。"
  );
  const draftProviderStatus = providerStatuses.find((item) => item.name === "Draft generation");
  const draftProviderMissing = Boolean(providerStatuses.length && !draftProviderStatus?.configured);
  const draftProviderCheckFailed = Boolean(
    draftCheckStatus && draftCheckStatus.status !== "ok"
  );
  const draftProviderBlocked = draftProviderMissing || draftProviderCheckFailed;
  const canGenerate = hasTopic && busyAction === null && !draftProviderBlocked;
  const exportContent = lastContent ?? latestContent;
  const currentExportContent = contentMatchesCurrentInputs(lastContent)
    ? lastContent
    : contentMatchesCurrentInputs(latestContent)
      ? latestContent
      : null;
  const exportContentMatchesCurrentInputs = Boolean(currentExportContent);
  const mismatchedExportContent = exportContent && !currentExportContent ? exportContent : null;
  const mismatchedExportContentMessage = mismatchedExportContent
    ? mismatchedExportContent.title === topic.trim()
      ? "当前已有草稿的标签或检索依据和表单不一致，复制前请重新生成或重新选择对应草稿。"
      : `当前已有草稿标题是“${mismatchedExportContent.title}”，不是当前选题“${topic.trim()}”，复制前请重新生成。`
    : null;
  const matchingSourceContext = sourceContextMatchesKnowledgeQuery(sourceContext, knowledgeQuery)
    ? sourceContext
    : null;
  const matchingExportSourceContext =
    currentExportContent &&
    sourceContextMatchesKnowledgeQuery(currentExportContent.source_context, knowledgeQuery)
      ? currentExportContent.source_context ?? null
      : null;
  const visibleSourceContext =
    matchingSourceContext ?? matchingExportSourceContext;
  const generateButtonLabel = !hasTopic
      ? "先填写选题"
      : draftProviderMissing
        ? "先配置撰稿服务"
      : draftProviderCheckFailed
        ? "先修复撰稿服务"
      : "一键生成图文+封面";
  const generateButtonTitle = !hasTopic
      ? "先填写选题，再一键生成图文和封面"
      : draftProviderMissing
        ? "去设置里填写并应用撰稿服务授权"
      : draftProviderCheckFailed
        ? "检测到撰稿服务不可用，请先去设置页更换或重新应用服务授权"
      : undefined;
  const launchStatusText = !hasTopic
      ? "先填写选题，再一键生成图文和封面。"
      : draftProviderMissing
        ? "撰稿服务缺少服务授权，先去设置页填写并应用。"
      : draftProviderCheckFailed
        ? draftCheckStatus?.message ?? "撰稿服务检测未通过，请先去设置页修复。"
      : statusText;
  const primaryGenerateLabel =
    busyAction === "draft"
      ? "正在一键生成"
      : exportContentMatchesCurrentInputs
        ? "重新一键生成"
        : generateButtonLabel;
  const providerDisplayItems = [
    { label: "撰稿", name: "Draft generation" },
    { label: "改写", name: "Humanization rewrite" },
    { label: "图片", name: "Image generation" }
  ].map((item) => ({
    ...item,
    status: providerStatuses.find((statusItem) => statusItem.name === item.name)
  }));
  const rewriteProviderStatus = providerStatuses.find(
    (item) => item.name === "Humanization rewrite"
  );
  const liveImageProviderReady = hasLiveImageProvider(providerStatuses);
  const rewriteProviderReady = Boolean(rewriteProviderStatus?.configured);
  const launcherChecklist = [
    {
      detail: hasTopic ? "已填写" : "待填写",
      icon: Search,
      label: "选题",
      tone: hasTopic ? "green" : "amber"
    },
    {
      detail: draftProviderBlocked ? "需检查" : "可启动",
      icon: PenLine,
      label: "撰稿",
      tone: draftProviderBlocked ? "red" : "blue"
    },
    {
      detail: liveImageProviderReady ? "可生成" : "待检测",
      icon: Image,
      label: "封面",
      tone: liveImageProviderReady ? "green" : "amber"
    },
    {
      detail: "手动确认",
      icon: ShieldCheck,
      label: "发布",
      tone: "amber"
    }
  ] as const;

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
    };
  }

  useEffect(() => {
    setStylePreset(defaultWritingStyle);
    setStyleOptions(defaultExpressionOptions);
    setTone(buildWritingTone(defaultWritingStyle, defaultExpressionOptions));
  }, [defaultWritingStyle]);

  useEffect(() => {
    if (
      latestContent?.source_context &&
      latestContent.title === topic.trim() &&
      latestContent.platform === selectedPlatform
    ) {
      setSourceContext(latestContent.source_context);
    }
  }, [
    latestContent?.id,
    latestContent?.platform,
    latestContent?.source_context,
    latestContent?.title,
    selectedPlatform,
    topic
  ]);

  async function refreshProviderStatuses() {
    try {
      const data = await fetchProviderStatuses();
      setProviderStatuses(data);
      setProviderStatusError(null);
      return data;
    } catch (error) {
      setProviderStatusError(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
      );
      return null;
    }
  }

  useEffect(() => {
    let active = true;

    async function loadProviderStatuses() {
      try {
        const data = await fetchProviderStatuses();
        if (active) {
          setProviderStatuses(data);
          setProviderStatusError(null);
        }
      } catch (error) {
        if (active) {
          setProviderStatusError(
            sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
          );
        }
      }
    }

    void loadProviderStatuses();
    return () => {
      active = false;
    };
  }, []);

  async function checkDraftProviderFromLauncher() {
    setDraftCheckBusy(true);
    setDraftCheckStatus(null);
    setStatusText("正在检测撰稿服务连接。");
    try {
      const response = await fetch(`${API_BASE}/workspace/provider-check`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ target: "draft" })
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("服务检测暂时不可用，请重新打开应用后再试。");
        }
        throw new Error(await readApiError(response, "撰稿服务检测失败。"));
      }
      const data = (await response.json()) as ProviderCheckResult;
      const displayData = { ...data, message: sanitizeServiceErrorMessage(data.message) };
      setDraftCheckStatus(displayData);
      setNeedsProviderSettings(displayData.status !== "ok");
      setStatusText(
        displayData.status === "ok"
          ? displayData.message
          : `检测未通过：${displayData.message}`
      );
    } catch (error) {
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "撰稿服务检测失败。"
      );
      setDraftCheckStatus({
        configured: false,
        message,
        status: "failed",
        target: "draft"
      });
      setNeedsProviderSettings(true);
      setStatusText(message);
    } finally {
      setDraftCheckBusy(false);
    }
  }

  function applyStylePreset(nextPreset: WritingStylePresetId) {
    setStylePreset(nextPreset);
    setTone(buildWritingTone(nextPreset, styleOptions));
  }

  function toggleStyleOption(optionKey: ExpressionOptionKey) {
    setStyleOptions((currentOptions) => {
      const nextOptions = {
        ...currentOptions,
        [optionKey]: !currentOptions[optionKey]
      };
      setTone(buildWritingTone(stylePreset, nextOptions));
      return nextOptions;
    });
  }

  function clearSourceEvidence() {
    setSourceContext(null);
    setSourcePreviewError(null);
  }

  function updateTopicAndAutoKnowledgeQuery(nextTopic: string) {
    const previousTopic = topic.trim();
    const nextTopicText = nextTopic.trim();
    const nextTopicPreset = findGenerationTopicPresetByTopic(nextTopicText);
    setTopic(nextTopic);
    setKnowledgeQuery((currentQuery) => {
      const normalizedQuery = currentQuery.trim();
      const shouldSyncQuery =
        !normalizedQuery ||
        normalizedQuery === previousTopic ||
        normalizedQuery === defaultGenerationKnowledgeQuery ||
        isKnownGenerationTopicKnowledgeQuery(normalizedQuery);
      return nextTopicPreset
        ? nextTopicPreset.knowledgeQuery
        : shouldSyncQuery
          ? nextTopicText
          : currentQuery;
    });
    setTargetAudience((currentAudience) => {
      const normalizedAudience = currentAudience.trim();
      const shouldSyncAudience =
        !normalizedAudience ||
        normalizedAudience === defaultGenerationTargetAudience ||
        normalizedAudience === buildCustomTopicAudience(previousTopic) ||
        isKnownGenerationTopicAudience(normalizedAudience);
      return nextTopicPreset
        ? nextTopicPreset.audience
        : shouldSyncAudience
          ? buildCustomTopicAudience(nextTopicText) || defaultGenerationTargetAudience
          : currentAudience;
    });
    setTagsText((currentTags) => {
      const normalizedTags = currentTags.trim();
      const shouldSyncTags =
        !normalizedTags ||
        normalizedTags === previousTopic ||
        normalizedTags === defaultGenerationTagsText ||
        isKnownGenerationTopicTags(normalizedTags);
      return nextTopicPreset
        ? nextTopicPreset.tags
        : shouldSyncTags
          ? buildCustomTopicTags(nextTopicText) || defaultGenerationTagsText
          : currentTags;
    });
    clearSourceEvidence();
    if (nextTopicPreset) {
      setStatusText(`已识别推荐选题：${nextTopicPreset.topic}`);
    }
  }

  function applyTopicPreset(preset: GenerationTopicPreset) {
    setTopic(preset.topic);
    setKnowledgeQuery(preset.knowledgeQuery);
    setTargetAudience(preset.audience);
    setTagsText(preset.tags);
    clearSourceEvidence();
    setStatusText(`已套用推荐选题：${preset.topic}`);
  }

  function refreshTopicPresets(manual = false) {
    setVisibleTopicPresets((currentPresets) =>
      pickGenerationTopicPresetBatch({
        currentTopic: topic,
        previousKeys: currentPresets.map((preset) => preset.key)
      })
    );
    if (manual) {
      setStatusText("已刷新推荐选题。");
    }
  }

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshTopicPresets();
    }, TOPIC_PRESET_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [topic]);

  function contentMatchesCurrentInputs(
    content: GeneratedContent | null | undefined
  ): content is GeneratedContent {
    return Boolean(
      content &&
        content.title === topic.trim() &&
        content.platform === selectedPlatform &&
        tagsMatchText(content.tags, tagsText) &&
        sourceContextMatchesKnowledgeQuery(content.source_context, knowledgeQuery) &&
        generatedContentInputSignatureMatches(
          content.id,
          lastContentInputSignature,
          currentGenerationInputSignature
        )
    );
  }

  function buildGenerationRequestPayload() {
    return {
      platform,
      topic: topic.trim(),
      knowledge_query: knowledgeQuery.trim() || undefined,
      tone: buildGenerationTone(tone, platform, styleOptions),
      target_audience: targetAudience.trim() || undefined,
      knowledge_limit: 5,
      tags: parseTagText(tagsText)
    };
  }

  async function previewSourceContext() {
    if (!topic.trim()) {
      setSourcePreviewError("先填写选题，再查看检索依据。");
      return;
    }

    setSourcePreviewBusy(true);
    setSourcePreviewError(null);
    setStatusText("正在检索知识库和联网来源，稍等一下。");
    try {
      const response = await fetch(`${API_BASE}/content/source-preview`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildGenerationRequestPayload())
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "检索依据读取失败。"));
      }
      const data = (await response.json()) as { source_context?: GenerationSourceContext };
      setSourceContext(data.source_context ?? null);
      setStatusText("检索依据已加载，请先人工核对来源，再决定是否一键生成。");
    } catch (error) {
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "检索依据读取失败。"
      );
      setSourcePreviewError(message);
      setStatusText(message);
    } finally {
      setSourcePreviewBusy(false);
    }
  }

  async function generateDraft() {
    if (!topic.trim()) {
      setStatusText("先填写选题，再一键生成图文和封面。");
      return;
    }

    setBusyAction("draft");
    setNeedsProviderSettings(false);
    setStatusText("正在一键生成：先撰稿，再改写，最后生成封面图。");
    try {
      const requestPayload = buildGenerationRequestPayload();
      const requestSignature = buildGenerationInputSignature({
        knowledgeQuery: requestPayload.knowledge_query,
        platform: requestPayload.platform,
        tagsText,
        targetAudience: requestPayload.target_audience,
        tone: requestPayload.tone,
        topic: requestPayload.topic
      });
      const response = await fetch(`${API_BASE}/content/generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(requestPayload)
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "图文草稿生成失败。"));
      }
      const data = (await response.json()) as GeneratedContent;
      setSourceContext(data.source_context ?? null);
      setSourcePreviewError(null);
      setLastContent(data);
      setLastContentInputSignature({ contentId: data.id, signature: requestSignature });
      onGeneratedContent(data);
      setNeedsProviderSettings(false);
      let finalContent = data;
      let rewriteWarning: string | null = null;
      if (!rewriteProviderReady) {
        rewriteWarning = "改写服务未配置或尚未确认，本次未走改写服务。";
        setStatusText(
          "文案草稿已生成。改写服务未配置或尚未确认，本次未走改写服务，正在尝试生成封面图。"
        );
      } else {
        setStatusText("文案草稿已生成，正在调用改写服务做口吻润色。");
        try {
          const rewriteResponse = await fetch(`${API_BASE}/content/rewrite`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              content_id: data.id,
              instruction:
                "按当前选题和风格做口吻润色，保留事实边界、关键词、标签语境和合规限制，不制造录取承诺。"
            })
          });
          if (!rewriteResponse.ok) {
            throw new Error(await readApiError(rewriteResponse, "改写服务处理失败。"));
          }
          const rewrittenContent = (await rewriteResponse.json()) as GeneratedContent;
          finalContent = rewrittenContent;
          setSourceContext(rewrittenContent.source_context ?? data.source_context ?? null);
          setLastContent(rewrittenContent);
          setLastContentInputSignature({
            contentId: rewrittenContent.id,
            signature: requestSignature
          });
          onGeneratedContent(rewrittenContent);
          setStatusText("文案已完成口吻润色，正在生成封面图。");
        } catch (rewriteError) {
          const rawRewriteMessage =
            rewriteError instanceof Error ? rewriteError.message : "改写服务处理失败。";
          const rewriteMessage = normalizeRewriteServiceMessage(rawRewriteMessage);
          setNeedsProviderSettings(
            rawRewriteMessage.includes("DeepSeek") ||
              rawRewriteMessage.includes("授权失败") ||
              isServiceCredentialError(rawRewriteMessage)
          );
          rewriteWarning = `改写服务未完成：${rewriteMessage}`;
          setStatusText(
            `文案草稿已生成，但改写服务未完成：${rewriteMessage} 正在尝试用当前草稿生成封面图。`
          );
        }
      }

      if (isTestDraft(finalContent)) {
        setStatusText(
          "这是本地检查草稿，不会生成封面图。请配置真实撰稿服务后再一键生成。"
        );
        return;
      }

      try {
        await generateCoverForContent(finalContent, requestPayload.topic);
        const completionMessage = rewriteWarning
          ? `文案和封面图已生成，但${rewriteWarning}预览确认后即可复制文案。`
          : "文案和封面图已一键生成。预览确认后即可复制文案。";
        setStatusText(completionMessage);
      } catch (coverError) {
        const coverMessage =
          coverError instanceof Error ? coverError.message : "封面图生成失败。";
        setNeedsProviderSettings(
          coverMessage.includes("图片服务") ||
            coverMessage.includes("授权失败") ||
            isServiceCredentialError(coverMessage) ||
            coverMessage.includes("image")
        );
        setStatusText(`文案已生成，但封面图未完成：${sanitizeServiceErrorMessage(coverMessage)}`);
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "图文草稿生成失败。";
      const message = sanitizeServiceErrorMessage(rawMessage);
      setNeedsProviderSettings(
        rawMessage.includes("授权失败") ||
          rawMessage.includes("模型") ||
          rawMessage.includes("接口") ||
          isServiceCredentialError(rawMessage)
      );
      setStatusText(message);
    } finally {
      setBusyAction(null);
    }
  }

  async function generateCoverForContent(content: GeneratedContent, coverTopic = content.title) {
    const isDouyinPost = content.platform === "douyin";
    const refreshedStatuses = liveImageProviderReady ? null : await refreshProviderStatuses();
    const refreshedImageProviderReady =
      liveImageProviderReady || hasLiveImageProvider(refreshedStatuses ?? []);
    if (!refreshedImageProviderReady) {
      throw new Error("图片服务还没有完成可用性检查，请先到设置页应用图片服务授权。");
    }

    const coverStyleNotes = buildTopicCoverStyleNotes(
      isDouyinPost ? douyinHighAttractionCoverStyle : xhsHighAttractionCoverStyle,
      coverTopic
    );

    const response = await fetch(`${API_BASE}/image/generate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        aspect_ratio: isDouyinPost ? "9:16" : "3:4",
        content_id: content.id,
        style_notes: coverStyleNotes,
        template: isDouyinPost ? "douyin-cover" : "xiaohongshu-cover"
      })
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "封面图生成失败。"));
    }
    const cover = (await response.json()) as GeneratedImageAsset;
    onImageGenerated(cover);
    return cover;
  }

  return (
    <div data-testid="generation-launcher">
      <Panel
        action={
          <Pill
            tone={exportContentMatchesCurrentInputs ? "green" : exportContent ? "amber" : "blue"}
          >
            {exportContentMatchesCurrentInputs ? "当前草稿" : exportContent ? "历史草稿" : "主入口"}
          </Pill>
        }
        helper="一键生成会生成文案并尝试生成封面，不会自动发布；发布前仍需人工确认。"
        title="一键生成图文+封面"
      >
        <div className="mb-5 overflow-hidden rounded-md border border-line/80 bg-paper/60 p-4 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.52)] lg:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] xl:items-center">
            <div>
              <Pill
                tone={exportContentMatchesCurrentInputs ? "green" : exportContent ? "amber" : "blue"}
              >
                {exportContentMatchesCurrentInputs ? "当前草稿" : exportContent ? "历史草稿" : "生产入口"}
              </Pill>
              <h3 className="mt-3 text-xl font-black leading-7 text-ink">
                选题确认后，点这里一键生成
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                当前会生成一篇营销图文草稿，自动改写并尝试生成封面图；知识依据、标签和封面方向会跟随当前选题，不会自动发布。
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {launcherChecklist.map((item) => (
                  <div
                    className="rounded-[18px] border border-line/70 bg-paper/58 px-3 py-3"
                    key={`launcher-checklist-${item.label}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <IconBox tone={item.tone}>
                        <item.icon className="h-4 w-4" />
                      </IconBox>
                      <span className="text-[11px] font-semibold text-muted">{item.detail}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-ink">{item.label}</div>
                  </div>
                ))}
              </div>
              <button
                aria-label={primaryGenerateLabel}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-moss px-5 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                data-flow="one-click-generate"
                data-testid="start-production-button"
                disabled={!canGenerate}
                onClick={generateDraft}
                title={generateButtonTitle}
                type="button"
              >
                {busyAction === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PenLine className="h-4 w-4" />
                )}
                {primaryGenerateLabel}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(360px,0.95fr)_320px_minmax(360px,1.05fr)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
                <span>平台</span>
                <PlatformLabel
                  className="font-semibold text-ink"
                  iconSize="sm"
                  platform={selectedPlatform}
                  suffix="图文"
                />
              </span>
              <select
                className={`${formControlClass} h-10`}
                value={platform}
                onChange={(event) => {
                  setPlatform(event.target.value);
                  clearSourceEvidence();
                }}
              >
                <option value="xiaohongshu">小红书图文</option>
                <option value="douyin">抖音图文</option>
              </select>
            </label>
            <div className={`${subtleCardClass} px-3 py-2`}>
              <div className="text-xs font-medium text-muted">访问保护</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {workspaceToken ? "访问保护已开启" : "未开启"}
                </span>
                <button
                  aria-label="打开设置查看访问保护"
                  className="glass-control rounded-md border px-2 py-1 text-xs font-medium text-ink"
                  onClick={onOpenSettings}
                  type="button"
                >
                  打开设置
                </button>
              </div>
            </div>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-muted">选题</span>
              <input
                className={`${formControlClass} h-10`}
                data-testid="content-topic"
                onChange={(event) => {
                  updateTopicAndAutoKnowledgeQuery(event.target.value);
                }}
                placeholder="输入要生成的图文主题"
                value={topic}
              />
            </label>
            <div className="md:col-span-2" data-testid="topic-preset-list">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">推荐选题</span>
                <button
                  className="flex h-8 items-center gap-1 rounded-md border border-line bg-paper/70 px-2 text-[11px] font-semibold text-moss transition hover:border-moss/60 hover:bg-moss/10"
                  data-testid="topic-preset-refresh"
                  onClick={() => refreshTopicPresets(true)}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  换一批
                </button>
              </div>
              <div className="mt-1 text-[11px] text-muted">每 45 秒自动换一批，也可以直接修改为自定义选题</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {visibleTopicPresets.map((preset) => {
                  const selected = selectedTopicPreset?.key === preset.key;
                  return (
                    <button
                      aria-pressed={selected}
                      className={[
                        "min-h-[94px] rounded-[16px] border px-3 py-2.5 text-left transition hover:translate-y-[-1px]",
                        selected
                          ? "border-moss/70 bg-moss/10 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.44)]"
                          : "border-steel/35 bg-paper/70 hover:border-moss/60 hover:bg-moss/10"
                      ].join(" ")}
                      data-testid={`topic-preset-${preset.key}`}
                      key={preset.key}
                      onClick={() => applyTopicPreset(preset)}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-moss">
                          {preset.desktopLabel}
                        </span>
                        {selected ? (
                          <span className="rounded-full bg-moss/15 px-2 py-0.5 text-[10px] font-semibold text-moss">
                            当前
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-ink">
                        {preset.topic}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-muted">
                        {preset.desktopHelper}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted">知识检索词</span>
              <input
                aria-label="知识检索词"
                className={`${formControlClass} h-10`}
                data-testid="content-knowledge-query"
                onChange={(event) => {
                  setKnowledgeQuery(event.target.value);
                  clearSourceEvidence();
                }}
                value={knowledgeQuery}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">目标人群</span>
              <input
                aria-label="目标人群"
                className={`${formControlClass} h-10`}
                data-testid="content-target-audience"
                onChange={(event) => setTargetAudience(event.target.value)}
                value={targetAudience}
              />
            </label>
            <div
              className="md:col-span-2 rounded-md border border-moss/25 bg-moss/10 px-3 py-2.5"
              data-testid="content-cover-direction-preview"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">封面方向</span>
                <span
                  className="shrink-0 rounded-full bg-paper/70 px-2 py-0.5 text-[10px] font-semibold text-moss"
                  data-testid="content-cover-direction-type"
                >
                  {coverDirectionPreviewLabel}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink">{coverDirectionPreview}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-medium text-muted">撰稿风格</span>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {writingStylePresets.map((preset) => {
                  const selected = stylePreset === preset.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-20 rounded-md border px-3 py-2 text-left transition ${
                        selected
                          ? "border-coral bg-coral/10 text-ink"
                          : "glass-control text-ink hover:border-coral/50"
                      }`}
                      key={preset.id}
                      onClick={() => applyStylePreset(preset.id)}
                      type="button"
                    >
                      <span className="block text-sm font-semibold">{preset.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {preset.helper}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-medium text-muted">表达增强</span>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-5">
                {expressionOptions.map((option) => {
                  const enabled = styleOptions[option.key];
                  return (
                    <button
                      aria-checked={enabled}
                      className={`flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 text-left text-xs font-medium transition ${
                        enabled
                          ? "border-moss bg-moss/10 text-ink"
                          : "glass-control text-muted"
                      }`}
                      key={option.key}
                      onClick={() => toggleStyleOption(option.key)}
                      role="switch"
                      type="button"
                    >
                      <span>{option.label}</span>
                      <span>{enabled ? "开" : "关"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block md:col-span-2">
              <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
                <span>风格要求</span>
                <span>{tone.length}/420</span>
              </span>
              <textarea
                aria-label="风格要求"
                className={`${formControlClass} min-h-24 resize-y py-2 leading-6`}
                data-testid="content-style-notes"
                maxLength={420}
                onChange={(event) => setTone(event.target.value)}
                value={tone}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-muted">标签</span>
              <input
                aria-label="标签"
                className={`${formControlClass} h-10`}
                data-testid="content-tags"
                onChange={(event) => {
                  setTagsText(event.target.value);
                  clearSourceEvidence();
                }}
                value={tagsText}
              />
            </label>
          </div>

          <div className={`${subtleCardClass} p-4`}>
            <div className="text-sm font-semibold">启动状态</div>
            <p className="mt-2 text-sm leading-6 text-muted">{launchStatusText}</p>
            {mismatchedExportContentMessage ? (
              <div
                className="mt-3 rounded-md border border-amber/40 bg-amber/10 p-3 text-xs leading-5 text-ink"
                data-testid="stale-draft-warning"
              >
                {mismatchedExportContentMessage}
              </div>
            ) : null}
            <div className="mt-4 rounded-md border border-line bg-mist/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-ink">服务配置检测</div>
                <span className="text-[11px] text-muted">填写后仍建议检测一次</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {providerStatusError ? (
                  <Pill tone="red">检测失败</Pill>
                ) : providerDisplayItems.some((item) => item.status) ? (
                  providerDisplayItems.map((item, index) => {
                    const isDraft = item.name === "Draft generation";
                    const configured = Boolean(item.status?.configured);
                    const tone = needsProviderSettings && isDraft ? "red" : configured ? "green" : "amber";
                    const label =
                      needsProviderSettings && isDraft
                        ? "授权需检查"
                        : configured
                          ? "已填写"
                          : "未填写";
                    return (
                      <Pill key={`provider-status-${index}-${item.name}`} tone={tone}>
                        {item.label} {label}
                      </Pill>
                    );
                  })
                ) : (
                  <Pill tone="neutral">读取中</Pill>
                )}
              </div>
              {providerStatusError ? (
                <p className="mt-2 text-xs leading-5 text-muted">{providerStatusError}</p>
              ) : null}
              {draftCheckStatus ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  {draftCheckStatus.status === "ok"
                    ? draftCheckStatus.message
                    : `检测未通过：${draftCheckStatus.message}`}
                </p>
              ) : null}
              <button
                aria-label="检测撰稿连接"
                className={`${secondaryButtonClass} mt-3 h-9 w-full disabled:cursor-not-allowed disabled:opacity-60`}
                data-testid="draft-provider-check-button"
                disabled={draftCheckBusy || busyAction !== null}
                onClick={checkDraftProviderFromLauncher}
                type="button"
              >
                {draftCheckBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {draftCheckBusy ? "正在检测" : "检测撰稿连接"}
              </button>
            </div>
            {needsProviderSettings ? (
              <button
                className={`${secondaryButtonClass} mt-4 h-10 w-full`}
                onClick={onOpenSettings}
                type="button"
              >
                <Settings className="h-4 w-4" />
                去设置检查撰稿服务授权
              </button>
            ) : null}
            <div className="mt-4 border-l-4 border-amber pl-3 text-xs leading-5 text-muted">
              一键生成会按顺序处理文案、改写和封面；最终发布仍保持人工确认，不会自动发布。
            </div>
          </div>
          <div className="space-y-4">
            <GenerationSourceEvidenceCard
              disabled={!hasTopic || busyAction !== null}
              error={sourcePreviewError}
              fallbackKnowledgeQuery={knowledgeQuery}
              onPreview={previewSourceContext}
              previewBusy={sourcePreviewBusy}
              sourceContext={visibleSourceContext}
            />
            {currentExportContent ? (
              <GeneratedPostExportCard
                key={currentExportContent.id}
                content={currentExportContent}
                generatedImageAsset={latestImageAsset}
                generationBusy={busyAction !== null}
                imageProviderReady={liveImageProviderReady}
                onImageGenerated={onImageGenerated}
                onOpenSettings={onOpenSettings}
                onRefreshProviderStatuses={refreshProviderStatuses}
                workspaceToken={workspaceToken}
              />
            ) : (
              <div className={`${subtleCardClass} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-ink">小红书内容预览</div>
                  <Pill tone="neutral">待生成</Pill>
                </div>
                <div className="mt-4 overflow-hidden rounded-md border border-line bg-paper/70">
                  <div className="relative aspect-[3/4] bg-[linear-gradient(145deg,rgb(var(--moss)/0.18),rgb(var(--paper))_45%,rgb(var(--amber)/0.16))] p-4">
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="mb-3 h-1.5 w-12 rounded-full bg-moss" />
                      <div className="line-clamp-4 text-2xl font-black leading-tight text-ink">
                        {topic || "选择主题后一键生成"}
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-semibold text-muted">封面方向</div>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-ink">
                      {coverDirectionPreview}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-steel">
                      {tagsText
                        .split(/[，,\s]+/)
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((tag) => (
                          <span key={`preview-tag-${tag}`}>#{tag.replace(/^#/, "")}</span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function GeneratedPostExportCard({
  content,
  generatedImageAsset,
  generationBusy,
  imageProviderReady,
  onImageGenerated,
  onOpenSettings,
  onRefreshProviderStatuses,
  workspaceToken
}: {
  content: GeneratedContent;
  generatedImageAsset: GeneratedImageAsset | null;
  generationBusy: boolean;
  imageProviderReady: boolean;
  onImageGenerated: (asset: GeneratedImageAsset) => void;
  onOpenSettings: () => void;
  onRefreshProviderStatuses: () => Promise<ProviderStatusItem[] | null>;
  workspaceToken: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<GeneratedImageAsset | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement | null>(null);
  const warnings = complianceWarnings(content);
  const testDraft = isTestDraft(content);
  const canCopy = !testDraft && !generationBusy;
  const canGenerateImage = canCopy && !imageBusy;
  const copyPayload = buildPlatformCopy(content);
  const tagLine = formatTagLine(content.tags);
  const imagePreviewUrl = imageAsset ? resolveAssetUrl(imageAsset.image_url) : null;
  const isDouyinPost = content.platform === "douyin";
  const platformLabel = isDouyinPost ? "抖音" : "小红书";
  const coverAspectRatio = isDouyinPost ? "9:16" : "3:4";
  const coverStyleNotes = buildTopicCoverStyleNotes(
    isDouyinPost ? douyinHighAttractionCoverStyle : xhsHighAttractionCoverStyle,
    content.title
  );
  const coverTemplate = isDouyinPost ? "douyin-cover" : "xiaohongshu-cover";
  const imageButtonLabel = imageBusy
    ? "正在生成封面"
    : generationBusy
      ? "一键生成中"
    : imageAsset
      ? "重新生成封面"
      : imageProviderReady
        ? "生成封面图"
        : "检测并生成封面";

  useEffect(() => {
    if (generatedImageAsset?.content_id === content.id) {
      setImageAsset(generatedImageAsset);
      setImageError(null);
    }
  }, [content.id, generatedImageAsset]);

  useEffect(() => {
    setCopyState("idle");
    setManualCopyText(null);
  }, [content.id]);

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }
    manualCopyRef.current?.focus();
    manualCopyRef.current?.select();
  }, [manualCopyText]);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
    };
  }

  async function handleCopy() {
    if (!canCopy) {
      setCopyState("failed");
      setManualCopyText(null);
      return;
    }
    try {
      await copyText(copyPayload);
      setCopyState("copied");
      setManualCopyText(null);
    } catch (_error) {
      setCopyState("failed");
      setManualCopyText(copyPayload);
    }
  }

  async function handleGenerateImage() {
    if (generationBusy) {
      setImageError("一键生成还没完成，请等文案和封面流程结束后再操作。");
      return;
    }
    if (!canCopy) {
      setImageError("本地检查草稿不可生成封面图，请先生成一篇正式草稿。");
      return;
    }

    setImageBusy(true);
    setImageError(null);
    try {
      const refreshedStatuses = imageProviderReady
        ? null
        : await onRefreshProviderStatuses();
      const refreshedImageProviderReady = imageProviderReady ||
        hasLiveImageProvider(refreshedStatuses ?? []);
      if (!refreshedImageProviderReady) {
        throw new Error("图片服务还没有完成可用性检查，请先到设置页应用图片服务授权后再点生成封面图。");
      }
      const response = await fetch(`${API_BASE}/image/generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          aspect_ratio: coverAspectRatio,
          content_id: content.id,
          style_notes: coverStyleNotes,
          template: coverTemplate
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "封面图生成失败。"));
      }
      const data = (await response.json()) as GeneratedImageAsset;
      setImageAsset(data);
      onImageGenerated(data);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "封面图生成失败。");
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className={`${subtleCardClass} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="green">已生成</Pill>
              <Pill tone={content.status === "draft" ? "amber" : "green"}>
                {generatedContentStatusLabel(content.status)}
              </Pill>
            </div>
            <h3 className="mt-3 text-xl font-semibold leading-7">{content.title}</h3>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-steel px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
              data-testid="cover-generate-button"
              disabled={!canGenerateImage}
              onClick={handleGenerateImage}
              type="button"
            >
              {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              {imageButtonLabel}
            </button>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canCopy}
              onClick={handleCopy}
              type="button"
            >
              {copyState === "copied" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {testDraft
                ? "本地检查草稿不可复制"
                : copyState === "copied"
                  ? "已复制"
                  : `一键复制${platformLabel}文案`}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-line bg-mist/70 p-4">
          <div className="whitespace-pre-wrap text-sm leading-7 text-ink">{content.body}</div>
          {tagLine ? (
            <div className="mt-4 text-sm font-medium leading-6 text-steel">{tagLine}</div>
          ) : null}
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          {generationBusy
            ? "一键生成还在继续，完成前先不要复制或手动生成封面。"
            : `复制内容包含标题、正文和话题标签；不会自动发布，粘贴到${platformLabel}前仍需人工看一遍。`}
        </p>
      </div>

      <div className={`${subtleCardClass} p-4`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {warnings.length || testDraft ? (
            <AlertTriangle className="h-4 w-4 text-amber" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-moss" />
          )}
          发布前检查
        </div>
        <div className="mt-3 space-y-2 text-xs leading-5 text-muted">
          {testDraft ? (
            <div className="rounded-md border border-amber/40 bg-amber/10 p-3 text-ink">
              这是本地检查草稿，不可直接发布。
            </div>
          ) : null}
          {warnings.length ? (
            <div className="rounded-md border border-amber/40 bg-amber/10 p-3 text-ink">
              发现高风险词：{warnings.join("、")}。请改完再复制。
            </div>
          ) : (
            <div className="rounded-md border border-moss/40 bg-moss/10 p-3 text-ink">
              未发现保录、包过、内部名额等高风险承诺词。
            </div>
          )}
          <div className="rounded-md border border-line bg-paper p-3">
            封面图生成后仍需人工复核；不要使用假录取通知、校徽或保证录取视觉。
          </div>
          {copyState === "failed" && !testDraft ? (
            <div className="rounded-md border border-coral/40 bg-coral/10 p-3 text-ink">
              复制被浏览器拦截了；下方已展开正文，可直接全选复制。
            </div>
          ) : null}
          {manualCopyText ? (
            <textarea
              aria-label={`${platformLabel}手动复制文案`}
              className="min-h-32 w-full resize-y rounded-md border border-coral/30 bg-paper px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
              data-testid="pc-export-manual-copy-text"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              ref={manualCopyRef}
              value={manualCopyText}
            />
          ) : null}
        </div>
      </div>

      <div className={`${subtleCardClass} p-4`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Image className="h-4 w-4 text-steel" />
              {platformLabel}封面图
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              使用高吸引封面公式生成 {coverAspectRatio} 竖版图；生成后只是待确认素材，不会自动发布。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!imageProviderReady ? (
              <button
                className={`${secondaryButtonClass} h-10 px-4`}
                onClick={onOpenSettings}
                type="button"
              >
                <Settings className="h-4 w-4" />
                配置图片服务
              </button>
            ) : null}
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-steel px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
              data-testid="cover-generate-button-secondary"
              disabled={!canGenerateImage}
              onClick={handleGenerateImage}
              type="button"
            >
              {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              {imageButtonLabel}
            </button>
          </div>
        </div>
        {!imageProviderReady ? (
          <div className="mt-3 rounded-md border border-amber/40 bg-amber/10 p-3 text-xs leading-5 text-ink">
            点击生成时会重新检测真实图片服务；检测未通过会停止生成，不会补替代封面。
          </div>
        ) : null}
        {imageError ? (
          <div className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-xs leading-5 text-ink">
            {imageError}
          </div>
        ) : null}
        {imageAsset && imagePreviewUrl ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-[18px] border border-line bg-paper">
              <img
                alt="生成的封面图预览"
                className={`${isDouyinPost ? "aspect-[9/16]" : "aspect-[3/4]"} w-full object-cover`}
                src={imagePreviewUrl}
              />
            </div>
            <div className="rounded-md border border-line bg-mist/60 p-4 text-xs leading-6 text-muted">
              <div className="font-semibold text-ink">封面图：{generatedImageStatusLabel(imageAsset.status)}</div>
              <div className="mt-2">
                未确认内容生成的封面会保持待确认状态。粘贴到{platformLabel}前，请确认标题、图中文字、封面暗示和正文一致。
              </div>
              <a
                className="mt-3 inline-flex items-center gap-2 font-semibold text-steel"
                href={imagePreviewUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                打开原图
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CoverView({ contentHref }: { contentHref: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.9fr)_1fr]">
      <Panel
        action={
          <a
            aria-label="前往创作项目生成封面"
            className="flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-paper"
            href={contentHref}
          >
            <Image className="h-4 w-4" />
            去创作项目
          </a>
        }
        helper="先在创作项目中选择项目并生成文案和封面；下方展示参考版式。"
        title="封面参考版式"
      >
        <CoverReferencePreview />
      </Panel>

      <div className="space-y-4">
        <Panel helper="从封面需求到人工复核的图片流程。" title="图片流程">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {imageWorkflow.map((step, index) => (
              <div key={`image-workflow-${index}-${step.title}`} className={`${subtleCardClass} p-4`}>
                <IconBox tone={step.status === "强制" ? "red" : "blue"}>
                  <step.icon className="h-4 w-4" />
                </IconBox>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <Pill tone={step.status === "强制" ? "red" : "neutral"}>{step.status}</Pill>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">{step.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
        <ReferencePanel
          helper="图文生成时从这里抽取封面结构和视觉约束。"
          items={coverReferences}
          title="封面参考"
        />
      </div>
    </div>
  );
}

function DeliveryView() {
  return (
    <div className="space-y-4">
      <Panel helper="没有已确认内容时保持禁用；确认后再生成复制包和发布记录。" title="发布动作">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {promoterActions.map((action, index) => (
            <div key={`promoter-action-${index}-${action.title}`} className={`${subtleCardClass} p-4`}>
              <IconBox tone="green">
                <action.icon className="h-4 w-4" />
              </IconBox>
              <div className="mt-3 text-sm font-semibold">{action.title}</div>
              <div className="mt-1 text-xs leading-5 text-muted">{action.description}</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">{action.status}</span>
                <button
                  aria-label={`${action.command}，需有已确认内容后启用`}
                  className="glass-control flex h-8 items-center gap-2 rounded-md border px-2 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:opacity-55"
                  disabled
                  title="需有已确认内容后启用"
                  type="button"
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.command}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel helper="运营队列里的待处理事项。" title="工作队列">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {queues.map((queue, index) => (
              <div key={`publish-queue-${index}-${queue.name}`} className={`${subtleCardClass} px-4 py-3`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{queue.name}</div>
                    <div className="mt-1 text-xs text-muted">{queue.owner}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">{queue.count}</div>
                    <div className="text-xs text-muted">{queue.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <PublishingTable />
      </section>
    </div>
  );
}

function SettingsView({
  credentials,
  interfaceStyle,
  onCredentialsChange,
  onReset,
  onShowHelperTextChange,
  showHelperText
}: {
  credentials: CredentialSettings;
  interfaceStyle: InterfaceStyle;
  onCredentialsChange: (nextCredentials: CredentialSettings) => void;
  onReset: () => void;
  onShowHelperTextChange: (nextValue: boolean) => void;
  showHelperText: boolean;
}) {
  const [credentialStatus, setCredentialStatus] = useState("服务授权只保存在这台设备。");
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [providerCheckStatus, setProviderCheckStatus] = useState<string | null>(null);
  const [providerCheckBusy, setProviderCheckBusy] = useState(false);
  const canApplyProviderKeys = !credentialBusy;
  const canCheckProvider = !credentialBusy && !providerCheckBusy;
  const providerApplyLabel = "应用服务配置";
  const providerBindings = providerBindingDefaultsFromStatuses(providerStatuses);
  const configuredServiceCount = [
    providerBindings.draft,
    providerBindings.image,
    providerBindings.rewrite,
    providerBindings.webSearch
  ].filter(Boolean).length;
  const providerStatusSummary = providerStatuses.length
    ? `${configuredServiceCount} / 4 已连接`
    : providerStatusError
      ? "读取失败"
      : "正在读取";
  const currentStyleLabel =
    interfaceStyles.find((style) => style.id === interfaceStyle)?.label ?? "当前主题";
  const providerRouteItems = [
    { label: "撰稿", name: "Draft generation", target: "正文草稿" },
    { label: "改写", name: "Humanization rewrite", target: "口吻润色" },
    { label: "图片", name: "Image generation", target: "封面生成" },
    { label: "联网", name: "Web search", target: "Tavily 搜索" }
  ].map((item) => ({
    ...item,
    status: providerStatuses.find((statusItem) => statusItem.name === item.name)
  }));
  const settingsOverviewCards: Array<{
    detail: string;
    icon: typeof KeyRound;
    pill: string;
    title: string;
    tone: keyof typeof iconToneClass;
    value: string;
  }> = [
    {
      detail: "撰稿、图片、改写和联网搜索的保存状态来自后端。",
      icon: KeyRound,
      pill: providerStatuses.length ? "真实状态" : "待读取",
      title: "AI Key 管理",
      tone: configuredServiceCount >= 3 ? "green" : configuredServiceCount > 0 ? "amber" : "blue",
      value: providerStatusSummary
    },
    {
      detail: "生成、改写、封面和研究任务继续按用途分流。",
      icon: Radar,
      pill: "保留路由",
      title: "Model Router",
      tone: "blue",
      value: "按任务路由"
    },
    {
      detail: "采集、知识摘要和发布动作仍需要人工确认。",
      icon: ShieldCheck,
      pill: "固定规则",
      title: "安全控制",
      tone: "green",
      value: "发布前审核"
    },
    {
      detail: `当前 ${themeTemplates.length} 个运营模板可切换，设置入口始终保留。`,
      icon: Settings,
      pill: currentStyleLabel,
      title: "界面模板",
      tone: "amber",
      value: `${interfaceStyles.length} 种主题`
    }
  ];

  async function refreshProviderStatuses() {
    try {
      const statuses = await fetchProviderStatuses();
      setProviderStatuses(statuses);
      setProviderStatusError(null);
      return statuses;
    } catch (error) {
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR
      );
      setProviderStatusError(message);
      return null;
    }
  }

  useEffect(() => {
    let active = true;

    async function loadProviderStatuses() {
      try {
        const statuses = await fetchProviderStatuses();
        if (active) {
          setProviderStatuses(statuses);
          setProviderStatusError(null);
        }
      } catch (error) {
        if (active) {
          setProviderStatusError(
            sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
          );
        }
      }
    }

    void loadProviderStatuses();
    return () => {
      active = false;
    };
  }, []);

  function updateCredential(key: keyof CredentialSettings, value: string) {
    onCredentialsChange({ ...credentials, [key]: value });
  }

  function clearCredentials() {
    onCredentialsChange(emptyCredentials);
    setCredentialStatus("已清空这台设备保存的服务配置。");
  }

  async function applyProviderKeys() {
    const payload = providerKeyUpdatePayload(credentials);

    setCredentialBusy(true);
    setCredentialStatus(
      Object.keys(payload).length
        ? "正在应用服务配置。"
        : "正在刷新保存状态。"
    );
    try {
      if (!Object.keys(payload).length) {
        await refreshProviderStatuses();
        setCredentialStatus("已刷新保存状态；没有填写新的服务授权，不会覆盖。");
        setProviderCheckStatus(null);
        return;
      }

      const response = await fetch(`${API_BASE}/workspace/provider-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials.workspaceToken
            ? { Authorization: `Bearer ${credentials.workspaceToken}` }
            : {})
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "服务配置应用失败。"));
      }
      const statuses = sanitizeProviderStatusItems(
        (await response.json()) as ProviderStatusItem[]
      );
      setProviderStatuses(statuses);
      setProviderStatusError(null);
      setCredentialStatus("服务配置已应用到工作台，页面不会展示完整内容。");
      setProviderCheckStatus(null);
    } catch (error) {
      setCredentialStatus(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : "服务配置应用失败。")
      );
    } finally {
      setCredentialBusy(false);
    }
  }

  async function checkDraftProvider() {
    setProviderCheckBusy(true);
    setProviderCheckStatus("正在检测撰稿服务连接。");
    try {
      const response = await fetch(`${API_BASE}/workspace/provider-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials.workspaceToken
            ? { Authorization: `Bearer ${credentials.workspaceToken}` }
            : {})
        },
        body: JSON.stringify({ target: "draft" })
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("服务检测暂时不可用，请重新打开应用后再试。");
        }
        throw new Error(await readApiError(response, "撰稿服务检测失败。"));
      }
      const data = (await response.json()) as ProviderCheckResult;
      const message = sanitizeServiceErrorMessage(data.message);
      setProviderCheckStatus(
        data.status === "ok" ? message : `检测未通过：${message}`
      );
    } catch (error) {
      setProviderCheckStatus(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : "撰稿服务检测失败。")
      );
    } finally {
      setProviderCheckBusy(false);
    }
  }

  const credentialFields: Array<{
    backendBound?: boolean;
    helper: string;
    keyName: keyof CredentialSettings;
    label: string;
    placeholder: string;
  }> = [
    {
      keyName: "workspaceToken",
      label: "访问保护（可选）",
      placeholder: "未开启时留空",
      helper: "工作台未开启访问保护；需要控制入口时再填写。"
    },
    {
      keyName: "draftApiKey",
      label: "撰稿服务授权",
      placeholder: "留空则保留已有配置",
      helper: "撰稿服务使用；只有更换服务授权时才需要填写。",
      backendBound: providerBindings.draft
    },
    {
      keyName: "imageApiKey",
      label: "图片服务授权",
      placeholder: "留空则保留已有配置",
      helper: "图片生成服务使用；封面会通过图片服务完成。",
      backendBound: providerBindings.image
    },
    {
      keyName: "rewriteApiKey",
      label: "改写服务授权",
      placeholder: "留空则保留已有配置",
      helper: "改写与口吻润色服务使用；页面不会展示完整内容。",
      backendBound: providerBindings.rewrite
    }
  ];

  function settingsThemeHref(style: InterfaceStyle) {
    return `/?tab=settings&theme=${style}`;
  }

  return (
    <div className="space-y-4">
      <section
        className="glass-panel overflow-hidden rounded-md border"
        data-testid="settings-console-overview"
      >
        <div className="grid gap-5 p-4 lg:grid-cols-[1fr_340px] lg:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="green">Settings Console</Pill>
              <Pill tone="blue">Model Router</Pill>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[0] text-ink">
              AI Key 与安全控制台
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              服务授权、模型路由、人工确认和界面模板集中在这里；页面只展示保存状态，不显示敏感内容。
            </p>
          </div>
          <div className={`${subtleCardClass} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-muted">当前服务状态</div>
                <div className="mt-1 text-2xl font-semibold text-ink">{providerStatusSummary}</div>
              </div>
              <IconBox tone={configuredServiceCount >= 3 ? "green" : "amber"}>
                <KeyRound className="h-4 w-4" />
              </IconBox>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-moss transition-all"
                style={{ width: `${providerStatuses.length ? (configuredServiceCount / 4) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-line/70 p-4 md:grid-cols-2 xl:grid-cols-4 lg:p-5">
          {settingsOverviewCards.map((card) => (
            <article className={`${subtleCardClass} p-4`} key={card.title}>
              <div className="flex items-start justify-between gap-3">
                <IconBox tone={card.tone}>
                  <card.icon className="h-4 w-4" />
                </IconBox>
                <Pill tone={card.tone === "red" ? "red" : card.tone === "amber" ? "amber" : card.tone === "green" ? "green" : "blue"}>
                  {card.pill}
                </Pill>
              </div>
              <div className="mt-4 text-xs font-medium text-muted">{card.title}</div>
              <div className="mt-1 text-lg font-semibold text-ink">{card.value}</div>
              <p className="mt-2 text-xs leading-5 text-muted">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <Panel
        action={<Pill tone="blue">集中管理</Pill>}
        helper="服务授权集中管理；工作台未开启访问保护。"
        title="服务配置"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {credentialFields.map((field) => {
              const localFilled = credentials[field.keyName].trim().length > 0;
              const statusText = field.keyName === "workspaceToken"
                ? (localFilled ? "已填写" : "未开启")
                : localFilled
                  ? "本设备已填写"
                  : field.backendBound
                    ? "已保存"
                    : "未配置";
              const statusToneClass = field.keyName === "workspaceToken" || localFilled || field.backendBound
                ? "bg-mist text-moss"
                : "bg-amber/15 text-[#8a5a00]";

              return (
              <label key={field.keyName} className="block">
                <span className="flex items-center justify-between gap-2 text-xs font-medium text-muted">
                  <span>{field.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusToneClass}`}>
                    {statusText}
                  </span>
                </span>
                <input
                  className={`${formControlClass} h-10`}
                  onChange={(event) => updateCredential(field.keyName, event.target.value)}
                  placeholder={field.placeholder}
                  type="password"
                  value={credentials[field.keyName]}
                />
                <span className="mt-1 block text-xs leading-5 text-muted">{field.helper}</span>
              </label>
              );
            })}
          </div>

          <div className={`${subtleCardClass} p-4`}>
            <div className="flex items-center gap-3">
              <IconBox tone="blue">
                <KeyRound className="h-4 w-4" />
              </IconBox>
              <div>
                <div className="text-sm font-semibold">保存状态</div>
                <p className="mt-1 text-xs leading-5 text-muted">{credentialStatus}</p>
                {providerCheckStatus ? (
                  <p className="mt-2 text-xs leading-5 text-muted">{providerCheckStatus}</p>
                ) : null}
                {providerStatusError ? (
                  <p className="mt-2 text-xs leading-5 text-coral">{providerStatusError}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                aria-label={providerApplyLabel}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canApplyProviderKeys}
                onClick={applyProviderKeys}
                type="button"
              >
                {credentialBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {credentialBusy ? "正在应用" : providerApplyLabel}
              </button>
              <button
                aria-label="检测撰稿连接"
                className={`${secondaryButtonClass} h-10 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={!canCheckProvider}
                onClick={checkDraftProvider}
                type="button"
              >
                {providerCheckBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {providerCheckBusy ? "正在检测" : "检测撰稿连接"}
              </button>
              <button
                className={`${secondaryButtonClass} h-10`}
                onClick={clearCredentials}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                清空本设备保存
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Pill tone={credentials.workspaceToken ? "green" : "amber"}>
                保护 {credentials.workspaceToken ? "已填写" : "未开启"}
              </Pill>
              <Pill tone={credentials.draftApiKey || providerBindings.draft ? "green" : "amber"}>
                撰稿 {credentials.draftApiKey ? "本设备已填写" : providerBindings.draft ? "已保存" : "未配置"}
              </Pill>
              <Pill tone={credentials.imageApiKey || providerBindings.image ? "green" : "amber"}>
                图片 {credentials.imageApiKey ? "本设备已填写" : providerBindings.image ? "已保存" : "未配置"}
              </Pill>
              <Pill tone={credentials.rewriteApiKey || providerBindings.rewrite ? "green" : "amber"}>
                改写 {credentials.rewriteApiKey ? "本设备已填写" : providerBindings.rewrite ? "已保存" : "未配置"}
              </Pill>
              <Pill tone={providerBindings.webSearch ? "green" : "amber"}>
                联网 {providerBindings.webSearch ? "已保存" : "未配置"}
              </Pill>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border border-line" data-testid="settings-router-status">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/40 px-3 py-2">
                <div className="text-xs font-semibold text-ink">Model Router 状态</div>
                <Pill tone={providerStatuses.length ? "green" : "amber"}>
                  {providerStatuses.length ? "已同步" : "待同步"}
                </Pill>
              </div>
              <div className="divide-y divide-line">
                {providerRouteItems.map((item) => {
                  const configured = Boolean(item.status?.configured);
                  return (
                    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 px-3 py-2 text-xs" key={item.name}>
                      <span className="font-semibold text-ink">{item.label}</span>
                      <span className="min-w-0 truncate text-muted">
                        {item.status?.model ?? item.status?.provider ?? item.target}
                      </span>
                      <Pill tone={configured ? "green" : "amber"}>
                        {configured ? "已连接" : "未配置"}
                      </Pill>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <ExternalSkillRadarPanel />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Panel
          action={<Pill tone="green">设置入口固定保留</Pill>}
          helper="切换风格只影响视觉；导航、设置入口和主要按钮始终保留。"
          title="界面显示"
        >
          <div className="space-y-4">
            <section>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">运营模板</div>
                  <div className="mt-1 text-xs text-muted">按工作场景快速套用合适风格。</div>
                </div>
                <div className="text-xs text-muted">当前共 {themeTemplates.length} 个模板。</div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {themeTemplates.map((template, index) => {
                  const selected = template.style === interfaceStyle;
                  return (
                    <a
                      aria-current={selected ? "true" : undefined}
                      aria-label={`${template.label}${selected ? "，当前推荐风格" : ""}`}
                      className={[
                        "rounded-md border px-3 py-2 text-left transition",
                        selected
                          ? "border-steel bg-mist text-ink ring-1 ring-steel/25"
                          : "glass-subtle text-ink hover:border-steel/60"
                      ].join(" ")}
                      href={settingsThemeHref(template.style)}
                      key={`theme-template-${index}-${template.label}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{template.label}</span>
                        {selected ? <Pill tone="blue">当前</Pill> : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {template.description}
                      </span>
                      <ThemeSwatches compact style={template.style} />
                    </a>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">全部主题</div>
                  <div className="mt-1 text-xs text-muted">用于审稿、创作、采集和排障的完整视觉库。</div>
                </div>
                <div className="text-xs text-muted">当前共 {interfaceStyles.length} 种。</div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {interfaceStyles.map((style) => {
                  const selected = style.id === interfaceStyle;
                  return (
                    <a
                      aria-current={selected ? "true" : undefined}
                      aria-label={`${style.label}${selected ? "，当前界面风格" : ""}`}
                      className={[
                        `theme-${style.id}`,
                        "rounded-md border px-4 py-3 text-left transition",
                        selected
                          ? "border-steel bg-mist text-ink ring-1 ring-steel/25"
                          : "border-line bg-paper text-ink shadow-panel hover:border-steel/50"
                      ].join(" ")}
                      href={settingsThemeHref(style.id)}
                      key={style.id}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{style.label}</span>
                        {selected ? <Pill tone="blue">当前</Pill> : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {style.description}
                      </span>
                      <ThemeSwatches style={style.id} />
                    </a>
                  );
                })}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className={`${subtleCardClass} p-4`}>
                <div className="flex items-start gap-3">
                  <IconBox tone={showHelperText ? "green" : "amber"}>
                    {showHelperText ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </IconBox>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">辅助说明</h3>
                      <Pill tone={showHelperText ? "green" : "amber"}>
                        {showHelperText ? "显示中" : "已隐藏"}
                      </Pill>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      控制顶部副标题和侧边说明的显示，不影响导航、设置入口和主要按钮。
                    </p>
                    <button
                      className={`${secondaryButtonClass} mt-4 h-9 px-3`}
                      onClick={() => onShowHelperTextChange(!showHelperText)}
                      type="button"
                    >
                      {showHelperText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showHelperText ? "隐藏辅助说明" : "显示辅助说明"}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`${subtleCardClass} p-4`}>
                <div className="flex items-start gap-3">
                  <IconBox tone="blue">
                    <Settings className="h-4 w-4" />
                  </IconBox>
                  <div>
                    <h3 className="text-sm font-semibold">设置入口</h3>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      左侧导航的“设置”和顶部齿轮按钮不受隐藏状态影响，避免入口被自己藏掉。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

      <div className="space-y-4">
        <Panel
          helper={
            showHelperText
              ? "辅助说明已经显示；设置入口会始终保留。"
              : "如果隐藏了说明文字，可以在这里重新打开，不会重置主题或服务设置。"
          }
          title="说明文字"
        >
          <button
            aria-label={showHelperText ? "说明文字已经显示" : "显示说明文字"}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-60"
            disabled={showHelperText}
            onClick={onReset}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            {showHelperText ? "说明已显示" : "显示说明文字"}
          </button>
          <p className="mt-3 text-xs leading-5 text-muted">
            只恢复顶部页面说明和侧边发布确认说明，不会修改主题、服务设置或内容。
          </p>
        </Panel>

        <Panel helper="项目级安全规则仍然固定启用。" title="安全规则">
          <SafetyGateList />
        </Panel>
      </div>
    </div>
    </div>
  );
}

function ExternalSkillRadarPanel() {
  return (
    <Panel
      action={<Pill tone="blue">只读调研</Pill>}
      helper="把适合本项目的外部公开能力候选沉淀在这里；接入前先看许可证、登录状态和发布风险。"
      title="外部能力接入雷达"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {externalSkillCandidates.map((candidate, index) => (
          <article className={`${subtleCardClass} p-4`} key={`external-skill-${index}-${candidate.source}`}>
            <div className="flex items-start gap-3">
              <IconBox tone={candidate.status === "优先试点" ? "green" : "blue"}>
                <candidate.icon className="h-4 w-4" />
              </IconBox>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-5">{candidate.title}</h3>
                    <p className="mt-1 truncate text-xs text-muted">{candidate.source}</p>
                  </div>
                  <Pill tone={externalSkillStatusTone[candidate.status]}>
                    {candidate.status}
                  </Pill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border border-line bg-mist px-2 py-1 text-muted">
                    {candidate.module}
                  </span>
                  <span className="rounded-md border border-line bg-mist px-2 py-1 text-muted">
                    许可：{externalLicenseLabel(candidate.license)}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-ink/80">{candidate.summary}</p>
                <p className="mt-2 border-l-2 border-amber/60 pl-2 text-xs leading-5 text-muted">
                  {candidate.guardrail}
                </p>
                <a
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-steel hover:text-ink"
                  href={candidate.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  查看来源
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function formatPreviewParagraphs(body: string) {
  return body
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildCoverLines(title: string) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  if (!normalizedTitle) {
    return ["小红书", "图文预览"];
  }
  if (normalizedTitle.includes("不是先套磁")) {
    return ["不是先套磁", "先想清楚", "这 3 件事"];
  }

  const punctuationSegments = normalizedTitle
    .split(/[，,。！？!?:：、]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (punctuationSegments.length > 1) {
    return punctuationSegments.slice(0, 3);
  }
  if (normalizedTitle.length > 20) {
    return [
      normalizedTitle.slice(0, 10),
      normalizedTitle.slice(10, 20),
      normalizedTitle.slice(20, 30)
    ].filter(Boolean);
  }
  return [normalizedTitle];
}

function platformDisplayName(platform: string) {
  if (platform === "xiaohongshu") {
    return "小红书图文";
  }
  if (platform === "douyin") {
    return "抖音图文";
  }
  return platform;
}

function platformIdForPreview(platform: string): PlatformId {
  return isPlatformId(platform) ? platform : "xiaohongshu";
}

function PlatformRecordBadge({ platform }: { platform: string }) {
  if (platform.includes("小红书")) {
    return (
      <PlatformLabel
        className="font-medium text-ink"
        iconSize="sm"
        platform="xiaohongshu"
      />
    );
  }
  if (platform.includes("抖音")) {
    return (
      <PlatformLabel
        className="font-medium text-ink"
        iconSize="sm"
        platform="douyin"
      />
    );
  }
  if (platform.includes("多平台")) {
    return (
      <span className="inline-flex items-center gap-2 font-medium text-ink">
        <span className="inline-flex -space-x-1.5">
          <PlatformIcon platform="xiaohongshu" size="sm" />
          <PlatformIcon platform="douyin" size="sm" />
        </span>
        多平台
      </span>
    );
  }
  return <span className="text-muted">{platform}</span>;
}

function DraftHistoryCard({
  content,
  imageAsset,
  isPinned,
  isSelected,
  onDelete,
  onSelect,
  onTogglePin
}: {
  content: GeneratedContent;
  imageAsset: GeneratedImageAsset | null | undefined;
  isPinned: boolean;
  isSelected: boolean;
  onDelete: (contentId: number) => void;
  onSelect: (content: GeneratedContent) => void;
  onTogglePin: (contentId: number) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverImageUrl = imageAsset ? resolveAssetUrl(imageAsset.image_url) : null;
  const coverLines = buildCoverLines(content.title);
  const platformId = platformIdForPreview(content.platform);

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      setActionsOpen(true);
    }, 520);
  }

  function handlePointerEnd() {
    clearLongPressTimer();
  }

  return (
    <article
      className={[
        "relative w-[174px] flex-none snap-start overflow-hidden rounded-[18px] border bg-paper shadow-sm transition",
        isSelected ? "border-moss ring-2 ring-moss/25" : "border-line hover:border-steel/50"
      ].join(" ")}
      data-testid="draft-history-card"
      role="listitem"
    >
      <button
        aria-label={`查看草稿：${content.title}`}
        className="block w-full text-left"
        onClick={() => onSelect(content)}
        onContextMenu={(event) => {
          event.preventDefault();
          setActionsOpen(true);
        }}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerEnd}
        onPointerUp={handlePointerEnd}
        type="button"
      >
        <div
          className={`relative aspect-[3/4] overflow-hidden ${
            coverImageUrl
              ? "bg-paper"
              : "bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.88),transparent_30%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_48%,#f8cfc0_100%)] p-3"
          }`}
        >
          {coverImageUrl ? (
            <img
              alt="历史草稿封面"
              className="h-full w-full object-cover"
              src={coverImageUrl}
            />
          ) : (
            <div className="absolute inset-x-3 bottom-4">
              <div className="mb-2 h-1 w-8 rounded-full bg-coral" />
              <div className="space-y-1 text-[1.2rem] font-black leading-[1.08] text-ink">
                {coverLines.slice(0, 3).map((line, index) => (
                  <div key={`history-cover-line-${index}-${line}`}>{line}</div>
                ))}
              </div>
            </div>
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-ink shadow-sm">
            <PlatformIcon platform={platformId} size="sm" />
            图文
          </div>
          {isPinned ? (
            <div className="absolute right-2 top-2 rounded-full bg-ink px-2 py-1 text-[10px] font-semibold text-paper">
              置顶
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <div className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink">
            {content.title}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
            <span>{formatDraftTime(content.created_at)}</span>
            <span>{generatedContentStatusLabel(content.status)}</span>
          </div>
        </div>
      </button>

      {actionsOpen ? (
        <div
          className="absolute inset-x-2 bottom-2 grid grid-cols-2 gap-2 rounded-[14px] border border-white/70 bg-paper/95 p-2 shadow-panel backdrop-blur"
          data-testid="draft-history-actions"
        >
          <button
            className="flex h-8 items-center justify-center gap-1 rounded-md border border-line bg-mist text-xs font-semibold text-ink"
            onClick={() => {
              onTogglePin(content.id);
              setActionsOpen(false);
            }}
            type="button"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {isPinned ? "取消" : "置顶"}
          </button>
          <button
            className="flex h-8 items-center justify-center gap-1 rounded-md border border-coral/30 bg-coral/10 text-xs font-semibold text-ink"
            onClick={() => {
              onDelete(content.id);
              setActionsOpen(false);
            }}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      ) : null}
    </article>
  );
}

function DraftPanel({
  content,
  coverImageAsset,
  draftActionError,
  history,
  imageAssetsByContentId,
  loading,
  onDeleteContent,
  onSelectContent,
  onTogglePin,
  pinnedContentIds
}: {
  content: GeneratedContent | null;
  coverImageAsset: GeneratedImageAsset | null;
  draftActionError: string | null;
  history: GeneratedContent[];
  imageAssetsByContentId: Record<number, GeneratedImageAsset | null>;
  loading: boolean;
  onDeleteContent: (contentId: number) => void;
  onSelectContent: (content: GeneratedContent) => void;
  onTogglePin: (contentId: number) => void;
  pinnedContentIds: number[];
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const modalManualCopyRef = useRef<HTMLTextAreaElement | null>(null);
  const previewPlatformId = platformIdForPreview(content?.platform ?? "xiaohongshu");
  const previewPlatformLabel = previewPlatformId === "douyin" ? "抖音" : "小红书";
  const preview = {
    body: content?.body ?? draftPreview.body,
    id: content?.id ?? null,
    platform: content ? platformDisplayName(content.platform) : draftPreview.platform,
    status: content ? "最近草稿" : loading ? "读取中" : draftPreview.status,
    tags: content?.tags ?? draftPreview.tags,
    title: content?.title ?? draftPreview.title
  };
  const coverLines = buildCoverLines(preview.title);
  const paragraphs = formatPreviewParagraphs(preview.body);
  const tagLine = formatTagLine(preview.tags);
  const canCopy = Boolean(content && !isTestDraft(content));
  const coverImageUrl =
    content && coverImageAsset?.content_id === content.id
      ? resolveAssetUrl(coverImageAsset.image_url)
      : null;
  const hasHistory = history.length > 0;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setCopyState("idle");
    setManualCopyText(null);
  }, [content?.id]);

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }
    const targetRef = modalManualCopyRef;
    targetRef.current?.focus();
    targetRef.current?.select();
  }, [manualCopyText]);

  async function handleCopy() {
    if (!content || !canCopy) {
      setCopyState("failed");
      setManualCopyText(null);
      return;
    }
    const copyPayload = buildPlatformCopy(content);
    try {
      await copyText(copyPayload);
      setCopyState("copied");
      setManualCopyText(null);
    } catch (_error) {
      setCopyState("failed");
      setManualCopyText(copyPayload);
    }
  }

  function handleHistorySelect(selectedContent: GeneratedContent) {
    onSelectContent(selectedContent);
    setPreviewOpen(true);
  }

  return (
    <Panel
      action={<Pill tone={content ? "green" : loading ? "blue" : "amber"}>{preview.status}</Pill>}
      helper={`按${previewPlatformLabel}图文卡片和弹窗预览最终展示效果。`}
      title="创作台"
    >
      <section className="mb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">历史图文草稿</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              横向滑动查看之前生成的图文；点击打开预览，长按卡片可置顶或删除。
            </p>
          </div>
          <Pill tone={hasHistory ? "green" : loading ? "blue" : "amber"}>
            {hasHistory ? `${history.length} 条` : loading ? "读取中" : "暂无草稿"}
          </Pill>
        </div>

        {draftActionError ? (
          <div className="mt-3 rounded-md border border-coral/35 bg-coral/10 px-3 py-2 text-xs leading-5 text-ink">
            {draftActionError}
          </div>
        ) : null}

        {hasHistory ? (
          <div
            aria-label="历史图文草稿列表"
            className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            data-testid="draft-history-strip"
            role="list"
          >
            {history.map((item) => (
              <DraftHistoryCard
                content={item}
                imageAsset={imageAssetsByContentId[item.id]}
                isPinned={pinnedContentIds.includes(item.id)}
                isSelected={content?.id === item.id}
                key={item.id}
                onDelete={onDeleteContent}
                onSelect={handleHistorySelect}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-[18px] border border-dashed border-line bg-mist/60 px-4 py-5 text-sm leading-6 text-muted">
            还没有历史草稿。生成第一篇后，这里会保留可滑动的图文卡片。
          </div>
        )}
      </section>

      {previewOpen && portalReady ? createPortal(
        <div
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-md"
          data-testid="xhs-preview-modal"
          role="dialog"
        >
          <div className="grid max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[24px] border border-white/40 bg-paper shadow-2xl lg:grid-cols-[minmax(300px,420px)_1fr] lg:overflow-hidden">
            <div
              className={`relative min-h-[320px] overflow-hidden ${
                coverImageUrl
                  ? "bg-paper"
                  : "bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.95),transparent_32%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_48%,#f8cfc0_100%)] p-7"
              } sm:min-h-[420px]`}
            >
              <button
                aria-label={`关闭${previewPlatformLabel}预览`}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink shadow-sm"
                data-testid="xhs-preview-close"
                onClick={() => setPreviewOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
              {coverImageUrl ? (
                <img
                  alt={`已生成的${previewPlatformLabel}封面预览`}
                  className="h-full min-h-[320px] w-full object-cover sm:min-h-[420px]"
                  data-testid="xhs-preview-real-cover"
                  src={coverImageUrl}
                />
              ) : (
                <>
                  <div className="rounded-md bg-white/75 px-2 py-1 text-[11px] font-semibold text-ink/70 shadow-sm">
                    {previewPlatformLabel}封面预览
                  </div>
                  <div className="absolute inset-x-7 bottom-8">
                    <div className="mb-4 h-1.5 w-14 rounded-full bg-coral" />
                    <div className="space-y-1 text-[2.55rem] font-black leading-[1.06] text-ink">
                      {coverLines.map((line, index) => (
                        <div key={`preview-cover-line-${index}-${line}`}>{line}</div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col lg:max-h-[90vh] lg:overflow-y-auto">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={previewPlatformId} size="lg" />
                  <div>
                    <div className="text-sm font-semibold">OPC 任务平台</div>
                    <div className="text-xs text-muted">发布前预览 - {preview.platform}</div>
                  </div>
                </div>
                <Pill tone={content ? "green" : loading ? "blue" : "amber"}>
                  {content ? "最新草稿" : loading ? "读取中" : "未生成"}
                </Pill>
              </div>

              <div className="px-5 py-5">
                <h3 className="text-xl font-semibold leading-8 text-ink">{preview.title}</h3>
                <div className="mt-4 text-xs font-semibold text-muted">正文全文</div>
                <div
                  className="mt-3 space-y-3 text-sm leading-7 text-ink/82"
                  data-testid="xhs-preview-full-body"
                >
                  {paragraphs.map((paragraph, index) => (
                    <p key={`${index}-${paragraph}`}>{renderXhsExpressionText(paragraph)}</p>
                  ))}
                </div>
                {tagLine ? <div className="mt-5 text-sm font-medium leading-6 text-steel">{tagLine}</div> : null}

                <div className="mt-6 flex items-center justify-between border-y border-line py-3 text-sm text-muted">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    未发布
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    评论预览
                  </span>
                  <span className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    收藏
                  </span>
                  <span className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    分享
                  </span>
                </div>

                <div className="mt-5 rounded-md border border-amber/40 bg-amber/10 p-3 text-xs leading-5 text-ink">
                  这是发布效果预览，不会自动发布；粘贴到{previewPlatformLabel}前仍需要人工确认标题、正文、标签和封面。
                </div>
                {copyState === "failed" ? (
                  <div className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-xs leading-5 text-ink">
                    当前没有可复制的正式草稿，或复制被浏览器拦截；下方已展开正文，可直接全选复制。
                  </div>
                ) : null}
                {manualCopyText ? (
                  <textarea
                    aria-label={`${previewPlatformLabel}手动复制文案`}
                    className="mt-3 min-h-32 w-full resize-y rounded-md border border-coral/30 bg-paper px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
                    data-testid="pc-preview-modal-manual-copy-text"
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    ref={modalManualCopyRef}
                    value={manualCopyText}
                  />
                ) : null}
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  className={`${secondaryButtonClass} h-10 px-4`}
                  onClick={() => setPreviewOpen(false)}
                  type="button"
                >
                  关闭预览
                </button>
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!canCopy}
                  onClick={handleCopy}
                  type="button"
                >
                  <Clipboard className="h-4 w-4" />
                  {copyState === "copied" ? "已复制" : `复制${previewPlatformLabel}文案`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </Panel>
  );
}

function PublishingTable() {
  return (
    <Panel helper="平台发布历史和当前确认状态。" title="发布记录">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead className="bg-mist text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">内容</th>
              <th className="px-4 py-3 font-medium">平台</th>
              <th className="px-4 py-3 font-medium">负责人</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="glass-subtle divide-y divide-line">
            {publishingRecords.map((record, index) => (
              <tr key={`${index}-${record.platform}-${record.content}`}>
                <td className="px-4 py-3 font-medium">{record.content}</td>
                <td className="px-4 py-3">
                  <PlatformRecordBadge platform={record.platform} />
                </td>
                <td className="px-4 py-3 text-muted">{record.owner}</td>
                <td className="px-4 py-3">
                  <Pill>{record.status}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReferencePanel({
  helper,
  items,
  title
}: {
  helper: string;
  items: Array<{ detail: string; icon: typeof PenLine; source?: string; title: string }>;
  title: string;
}) {
  return (
    <Panel helper={helper} title={title}>
      <div className="grid grid-cols-1 gap-3">
        {items.map((item, index) => (
          <div key={`detail-card-${index}-${item.title}`} className={`${subtleCardClass} p-4`}>
            <div className="flex items-start gap-3">
              <IconBox tone="amber">
                <item.icon className="h-4 w-4" />
              </IconBox>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  {item.source ? <Pill tone="blue">{item.source}</Pill> : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SafetyGateList() {
  return (
    <div className="glass-subtle grid grid-cols-1 divide-y divide-line rounded-md border">
      {safetyGates.map((gate, index) => (
        <div key={`safety-gate-${index}-${gate.label}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <gate.icon className="h-4 w-4 text-moss" />
            <span className="text-sm text-ink/80">{gate.label}</span>
          </div>
          <span className="text-xs font-medium text-muted">{gate.state}</span>
        </div>
      ))}
    </div>
  );
}

function CoverReferencePreview({ compact = false }: { compact?: boolean }) {
  const routes = [
    { label: "国内", detail: "周末 / 寒暑假" },
    { label: "港澳", detail: "集中授课" },
    { label: "海外", detail: "认证用途" },
    { label: "合办", detail: "预算周期" }
  ];

  return (
    <div
      className={[
        "rounded-md border border-line bg-[linear-gradient(160deg,#f7fbff,#fffaf2_48%,#eef7f0)] p-4 shadow-panel",
        compact ? "min-h-[300px]" : "mx-auto min-h-[520px] max-w-[390px]"
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-steel">
        <span>小红书封面参考</span>
        <span className="rounded-md bg-white/75 px-2 py-1 text-[11px] text-ink/70">
          版式参考
        </span>
      </div>
      <div className={["font-black leading-tight text-ink", compact ? "mt-5 text-3xl" : "mt-10 text-5xl"].join(" ")}>
        水博路线
        <br />
        先分清
        <br />
        再判断
      </div>
      <div className={["grid grid-cols-2 gap-2 text-xs font-semibold", compact ? "mt-5" : "mt-8"].join(" ")}>
        {routes.map((route, index) => (
          <div key={`route-card-${index}-${route.label}`} className="rounded-md border border-white/80 bg-white/85 px-3 py-2">
            <div className="text-ink">{route.label}</div>
            <div className="mt-1 text-[11px] font-medium text-ink/55">{route.detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-amber/20 bg-amber/10 px-3 py-2 text-[11px] font-medium text-ink/65">
        学校/价格/认证需复核
      </div>
    </div>
  );
}

function Panel({
  action,
  children,
  className = "",
  helper,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  helper?: string;
  title: string;
}) {
  return (
    <section className={["glass-panel overflow-hidden rounded-md border", className].join(" ")}>
      <div className="flex flex-col gap-3 border-b border-line/70 bg-paper/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-5">{title}</h2>
          {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4 lg:p-5">{children}</div>
    </section>
  );
}

function IconBox({ children, tone = "green" }: { children: ReactNode; tone?: keyof typeof iconToneClass }) {
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconToneClass[tone]}`}>
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof pillTone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${pillTone[tone]}`}>
      {children}
    </span>
  );
}

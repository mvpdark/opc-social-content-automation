"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
import {
  isPlatformId,
  PlatformIcon,
  PlatformLabel,
  type PlatformId
} from "@/components/platform-icon";
import { TrendCollectorPanel } from "@/components/trend-collector-panel";
import { getApiBase } from "@/lib/api-base";
import {
  connectionStatuses,
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
  type ProviderStatusItem
} from "@/lib/provider-settings";

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

const API_BASE = getApiBase();
const PC_AUTH_STORAGE_KEY = "opc_pc_auth_v1";
const CREDENTIAL_STORAGE_KEY = "opc_workspace_credentials_v1";
const INTERFACE_STYLE_STORAGE_KEY = "opc_interface_style_v1";
const LAST_GENERATED_CONTENT_STORAGE_KEY = "opc_latest_generated_content_v1";
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
    label: "软 CTA",
    enabled: "结尾用温和提醒引导咨询，不制造焦虑，不承诺结果",
    disabled: "结尾只给中性建议"
  }
] as const;

const hiddenXhsStickerToneGuide =
  "隐藏撰稿规则：如果平台是小红书，生成正文时必须自然少量使用小红书可识别的表情字符码，优先 [笑哭R]、[哭惹R]、[哇R]、[赞R]、[doge]、[蹲后续H]，每篇 2-5 个；字符码要融入正文语气，不要解释字符码，不要列出表情清单。";

const xhsHighAttractionCoverStyle =
  "小红书高吸引封面：真实学习桌/申请材料场景，大字反常识标题，红色风险标签，3个短清单芯片，女性可爱但可信，奶油底+珊瑚红+薄荷绿，避免官方标志和录取承诺。";

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
    return "数据库暂时不可用：安装包/测试模式请重新运行本地启动；自部署模式请检查 DATABASE_URL 和数据库服务。";
  }
  return errorBody?.message ?? errorBody?.detail ?? fallback;
}

function normalizeRewriteServiceMessage(message: string) {
  return message
    .replace(/DeepSeek rewrite provider is not configured yet\./g, "改写服务尚未配置。")
    .replace(/DeepSeek/g, "改写服务");
}

type GeneratedContent = {
  body: string;
  created_at?: string;
  id: number;
  platform: string;
  status: string;
  tags: string[] | null;
  title: string;
};

type GeneratedImageAsset = {
  content_id: number;
  created_at: string;
  created_by: number | null;
  error: string | null;
  id: number;
  image_url: string;
  prompt: string | null;
  status: string;
  template: string | null;
};

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
    throw new Error(await readApiError(response, "服务状态读取失败。"));
  }
  return (await response.json()) as ProviderStatusItem[];
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
        providerStatuses: Array.isArray(data.provider_statuses) ? data.provider_statuses : []
      };
    }

    if (response.status === 404 || response.status === 405) {
      throw new Error("登录服务暂未更新，请重启后端后再试。");
    }
    throw new Error("账号或密码不正确。");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("无法连接登录服务，请确认后端正在运行。");
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

function formatTagLine(tags: string[] | null) {
  const cleanTags = (tags ?? [])
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);
  return cleanTags.map((tag) => `#${tag}`).join(" ");
}

function buildPlatformCopy(content: GeneratedContent) {
  const tagLine = formatTagLine(content.tags);
  return [content.title.trim(), content.body.trim(), tagLine].filter(Boolean).join("\n\n");
}

function resolveAssetUrl(imageUrl: string) {
  const normalizedUrl = imageUrl.trim();
  if (!normalizedUrl) {
    return "";
  }
  if (/^(https?:|data:|blob:|file:)/i.test(normalizedUrl)) {
    return normalizedUrl;
  }
  if (normalizedUrl.startsWith("//")) {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
    return `${protocol}${normalizedUrl}`;
  }
  const apiUrl = new URL(API_BASE);
  return `${apiUrl.origin}${normalizedUrl.startsWith("/") ? normalizedUrl : `/${normalizedUrl}`}`;
}

function complianceWarnings(content: GeneratedContent) {
  const text = `${content.title}\n${content.body}\n${formatTagLine(content.tags)}`;
  return blockedPublishTerms.filter((term) => text.includes(term));
}

function isTestDraft(content: GeneratedContent) {
  return content.body.includes("codex_test") || content.body.includes("【测试草稿】");
}

function isGeneratedContent(value: unknown): value is GeneratedContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const content = value as Partial<GeneratedContent>;
  return (
    typeof content.body === "string" &&
    typeof content.id === "number" &&
    typeof content.platform === "string" &&
    typeof content.status === "string" &&
    typeof content.title === "string" &&
    (Array.isArray(content.tags) || content.tags === null || content.tags === undefined)
  );
}

function isGeneratedImageAsset(value: unknown): value is GeneratedImageAsset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const image = value as Partial<GeneratedImageAsset>;
  return (
    typeof image.content_id === "number" &&
    typeof image.id === "number" &&
    typeof image.image_url === "string" &&
    typeof image.status === "string"
  );
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

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function WorkspaceClient({
  hasInitialTheme,
  initialStyle,
  initialTab
}: {
  hasInitialTheme: boolean;
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
          onOpenSettings={() => handleTabChange("settings")}
          workspaceToken={credentials.workspaceToken}
        />
      ) : null}
      {activeTab === "cover" ? <CoverView /> : null}
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
                    <div className="text-sm text-muted">内容运营中枢</div>
                  </div>
                </div>
                <div className="mt-10 flex flex-wrap gap-2">
                  <Pill tone="blue">PC 工作台</Pill>
                  <Pill tone="green">本地预览</Pill>
                  <Pill tone="amber">人工确认后发布</Pill>
                </div>
                <h1 className="mt-5 max-w-xl text-3xl font-semibold leading-tight text-ink md:text-4xl">
                  登录后即可一键生成小红书图文和封面。
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                  进入工作台后，从一键生成页完成正文、改写和封面，预览成小红书样式，再复制文案用于人工提交。
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted md:grid-cols-3">
                {[
                  { icon: PenLine, title: "生成草稿", body: "标题、正文、标签统一输出。" },
                  { icon: Image, title: "封面预览", body: "先看发布后的首屏效果。" },
                  { icon: ShieldCheck, title: "安全确认", body: "发布前保留人工把关。" }
                ].map((item) => (
                  <div className="rounded-[18px] border border-line bg-paper/55 p-4" key={item.title}>
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
  defaultWritingStyle,
  onDefaultWritingStyleChange
}: {
  defaultWritingStyle: WritingStylePresetId;
  onDefaultWritingStyleChange: (nextStyle: WritingStylePresetId) => void;
}) {
  const coverLines = buildCoverLines(draftPreview.title);
  const statusLanes = [
    {
      title: "素材参考",
      description: "先补 3-5 条公开高赞图文，再进入知识库。",
      action: "去采集",
      href: "/?tab=research",
      icon: Radar,
      tone: "blue" as const,
      value: "待补充"
    },
    {
      title: "知识库",
      description: "只沉淀人工确认过的标题、开头、封面结构。",
      action: "看资产",
      href: "/?tab=knowledge",
      icon: BookOpenText,
      tone: "green" as const,
      value: "可接入"
    },
    {
      title: "安全检查",
      description: "生成后人工确认，避免保录、包过和虚假承诺。",
      action: "看规则",
      href: "/?tab=settings",
      icon: ShieldCheck,
      tone: "red" as const,
      value: "强制"
    }
  ];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="glass-panel overflow-hidden rounded-[24px] border shadow-panel">
          <div className="flex flex-col gap-5 p-5 lg:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone="blue">采集优先</Pill>
                  <Pill tone="green">本地预览</Pill>
                  <Pill tone="amber">人工确认</Pill>
                </div>
                <h2 className="mt-4 text-2xl font-semibold leading-tight text-ink">
                  今天要生产什么？
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  选择平台、主题和风格，一键生成可复制的小红书图文草稿。发布前仍需要人工确认。
                </p>
              </div>
              <div className="hidden rounded-[18px] border border-line bg-mist/60 px-3 py-2 text-xs leading-5 text-muted md:block">
                普通用户入口
                <div className="font-medium text-ink">先生成，再确认，再复制</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
              <div className="rounded-[18px] border border-line bg-paper/65 p-4">
                <div className="text-xs font-medium text-muted">平台</div>
                <PlatformLabel
                  className="mt-2 text-lg font-semibold text-ink"
                  iconSize="lg"
                  platform="xiaohongshu"
                  suffix="图文"
                />
              </div>
              <div className="rounded-[18px] border border-line bg-paper/65 p-4">
                <div className="text-xs font-medium text-muted">主题</div>
                <div className="mt-2 text-lg font-semibold leading-6 text-ink">
                  硕升博申请第一步
                </div>
              </div>
              <div className="rounded-[18px] border border-line bg-paper/65 p-4 md:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-muted">默认风格</div>
                  <span className="text-[11px] text-muted">可在一键生成页细调</span>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {writingStylePresets.map((style) => {
                    const selected = style.id === defaultWritingStyle;
                    return (
                      <button
                        aria-pressed={selected}
                        className={[
                          "rounded-md border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/45",
                          selected
                            ? "border-steel/50 bg-steel/10 text-ink"
                            : "border-line bg-mist/50 text-muted hover:border-steel/40 hover:bg-steel/5 hover:text-ink"
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-steel px-5 text-sm font-semibold text-paper shadow-soft transition hover:translate-y-[-1px] hover:shadow-panel active:translate-y-0"
                href="/?tab=content"
              >
                <PlatformIcon className="ring-white/55" platform="xiaohongshu" size="sm" />
                一键生成图文+封面
              </a>
              <a
                className={`${secondaryButtonClass} h-12 px-4`}
                href="/?tab=research"
              >
                <Search className="h-4 w-4" />
                先补素材参考
              </a>
              <span className="text-xs leading-5 text-muted">
                不会自动发布；复制前仍需人工看一遍标题、正文、标签和封面。
              </span>
            </div>
          </div>
        </div>

        <aside className="glass-panel overflow-hidden rounded-[24px] border shadow-panel">
          <div className="border-b border-line px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">发布前预览</div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <PlatformIcon platform="xiaohongshu" size="sm" />
                  模拟小红书图文卡片，不自动发布。
                </p>
              </div>
              <Pill tone="green">草稿</Pill>
            </div>
          </div>
          <div className="p-4">
            <div className="overflow-hidden rounded-[22px] border border-line bg-paper/70">
              <div className="relative min-h-[260px] bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.95),transparent_32%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_50%,#f8cfc0_100%)] p-5">
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="mb-4 h-1.5 w-14 rounded-full bg-coral" />
                  <div className="space-y-1 text-[2.15rem] font-black leading-[1.06] text-ink">
                    {coverLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-base font-semibold leading-6 text-ink">
                  {draftPreview.title}
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                  不是先套磁，先把问题想清楚。申请第一步要先确认研究方向、匹配导师项目，再定制套磁内容。
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-steel">
                  <span>#硕升博</span>
                  <span>#博士申请</span>
                  <span>#申请规划</span>
                </div>
                <a
                  className={`${secondaryButtonClass} mt-4 h-10 w-full`}
                  href="/?tab=content"
                >
                  <Clipboard className="h-4 w-4" />
                  一键复制文案
                </a>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {statusLanes.map((lane) => (
          <div className="glass-panel rounded-[20px] border p-4" key={lane.title}>
            <div className="flex items-start justify-between gap-3">
              <IconBox tone={lane.tone}>
                <lane.icon className="h-4 w-4" />
              </IconBox>
              <Pill tone={lane.tone}>{lane.value}</Pill>
            </div>
            <div className="mt-4 text-sm font-semibold leading-5 text-ink">{lane.title}</div>
            <p className="mt-2 min-h-10 text-xs leading-5 text-muted">{lane.description}</p>
            <a
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-line bg-paper/60 px-3 text-xs font-medium text-ink transition hover:border-steel/50 hover:bg-mist"
              href={lane.href}
            >
              {lane.action}
            </a>
          </div>
        ))}
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
                    ? "/?tab=research"
                    : index === 1
                      ? "/?tab=knowledge"
                      : index === 2 || index === 3
                        ? "/?tab=content"
                        : "/?tab=settings"
                }
                key={step.title}
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
      helper="开发/测试换电脑时先看这里；Windows 安装包只检查内置运行环境和项目依赖。"
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
                    ? "正在检测本机环境"
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
            {dependencyReport && !hasDependencyIssues ? "无需修复" : "查看修复命令"}
          </button>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {hasDependencyIssues ? (
              <>
                优先命令：<span className="font-mono text-ink">{primaryRepairStep}</span>
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
              {attentionItems.map((item) => (
                <div className={`${subtleCardClass} p-3`} key={`${item.category}-${item.name}`}>
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
              点击“检测依赖”查看本机环境。
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
                当前按钮只生成修复命令，不直接执行系统安装；Windows 安装包模式不需要 Docker，自部署模式才会提示 Docker。
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
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel helper="先保存来源、摘要、标签和人工确认状态，再进入可检索资产。" title="知识资产">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {knowledgeAssets.map((asset) => (
            <div key={asset.title} className={`${subtleCardClass} p-4`}>
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

      <div className="space-y-4">
        <Panel helper="系统默认不跳过的项目规则。" title="入库规则">
          <SafetyGateList />
        </Panel>
        <Panel helper="当前知识库还没有真实图文样本，下一步应从趋势采集页补齐。" title="当前状态">
          <div className={`${subtleCardClass} px-4 py-4 text-sm leading-6 text-muted`}>
            公开样本、内部资料、Prompt 模板和来源链接已经拆成独立入口，等采集任务完成后即可沉淀为知识条目。
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ContentView({
  defaultWritingStyle,
  onOpenSettings,
  workspaceToken
}: {
  defaultWritingStyle: WritingStylePresetId;
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [previewContent, setPreviewContent] = useState<GeneratedContent | null>(null);
  const [previewImageAsset, setPreviewImageAsset] = useState<GeneratedImageAsset | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  function handleGeneratedContent(content: GeneratedContent) {
    setPreviewContent(content);
    setPreviewImageAsset(null);
    saveStoredGeneratedContent(content);
  }

  useEffect(() => {
    let active = true;
    const storedContent = loadStoredGeneratedContent();
    if (storedContent) {
      setPreviewContent(storedContent);
    }

    async function loadLatestImage(contentId: number) {
      try {
        const response = await fetch(`${API_BASE}/image/list?content_id=${contentId}&limit=1`);
        if (!response.ok) {
          return;
        }
        const images = (await response.json()) as unknown;
        if (!Array.isArray(images)) {
          return;
        }
        const latestImage = images.find(isGeneratedImageAsset);
        if (active && latestImage?.content_id === contentId) {
          setPreviewImageAsset(latestImage);
        }
      } catch (_error) {
        // Keep the text preview usable when image history is unavailable.
      }
    }

    if (storedContent) {
      void loadLatestImage(storedContent.id);
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
        const latestContent = contents
          .filter(isGeneratedContent)
          .find((content) => !isTestDraft(content));
        if (active && latestContent) {
          setPreviewContent(latestContent);
          saveStoredGeneratedContent(latestContent);
          void loadLatestImage(latestContent.id);
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

  return (
    <div className="space-y-4">
      <GenerationLauncher
        defaultWritingStyle={defaultWritingStyle}
        latestImageAsset={previewImageAsset}
        latestContent={previewContent}
        onGeneratedContent={handleGeneratedContent}
        onImageGenerated={setPreviewImageAsset}
        onOpenSettings={onOpenSettings}
        workspaceToken={workspaceToken}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <DraftPanel
          content={previewContent}
          coverImageAsset={previewImageAsset}
          loading={previewLoading}
        />
        <div className="space-y-4">
          <Panel helper="生成前需要明确输入、改写和确认边界。" title="生产控制">
            <div className="space-y-3">
              {contentControls.map((control) => (
                <div key={control.title} className={`${subtleCardClass} p-3`}>
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
  const [knowledgeQuery, setKnowledgeQuery] = useState("硕升博 高赞图文 写作参考");
  const [targetAudience, setTargetAudience] = useState("准备硕升博申请的学生");
  const [stylePreset, setStylePreset] = useState<WritingStylePresetId>(defaultWritingStyle);
  const [styleOptions, setStyleOptions] =
    useState<Record<ExpressionOptionKey, boolean>>(defaultExpressionOptions);
  const [tone, setTone] = useState(() =>
    buildWritingTone(defaultWritingStyle, defaultExpressionOptions)
  );
  const [tagsText, setTagsText] = useState("硕升博,博士申请,研究方向,申请规划");
  const [busyAction, setBusyAction] = useState<"draft" | null>(null);
  const [statusText, setStatusText] = useState("填写选题后，点击“一键生成图文+封面”。");
  const [lastContent, setLastContent] = useState<GeneratedContent | null>(null);
  const [needsProviderSettings, setNeedsProviderSettings] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [draftCheckStatus, setDraftCheckStatus] = useState<ProviderCheckResult | null>(null);
  const [draftCheckBusy, setDraftCheckBusy] = useState(false);

  const selectedPlatform: PlatformId = platform === "douyin" ? "douyin" : "xiaohongshu";
  const hasTopic = topic.trim().length > 0;
  const draftProviderStatus = providerStatuses.find((item) => item.name === "Draft generation");
  const draftProviderMissing = Boolean(providerStatuses.length && !draftProviderStatus?.configured);
  const draftProviderCheckFailed = Boolean(
    draftCheckStatus && draftCheckStatus.status !== "ok"
  );
  const draftProviderBlocked = draftProviderMissing || draftProviderCheckFailed;
  const canGenerate = hasTopic && busyAction === null && !draftProviderBlocked;
  const exportContent = lastContent ?? latestContent;
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
        ? "去设置里填写并应用撰稿 API Key"
      : draftProviderCheckFailed
        ? "检测到撰稿服务不可用，请先去设置页更换或重新应用 API Key"
      : undefined;
  const launchStatusText = !hasTopic
      ? "先填写选题，再一键生成图文和封面。"
      : draftProviderMissing
        ? "撰稿服务缺少 API Key，先去设置页填写并应用。"
      : draftProviderCheckFailed
        ? draftCheckStatus?.message ?? "撰稿服务检测未通过，请先去设置页修复。"
      : statusText;
  const primaryGenerateLabel =
    busyAction === "draft"
      ? "正在一键生成"
      : exportContent
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

  async function refreshProviderStatuses() {
    try {
      const data = await fetchProviderStatuses();
      setProviderStatuses(data);
      setProviderStatusError(null);
      return data;
    } catch (error) {
      setProviderStatusError(error instanceof Error ? error.message : "服务状态读取失败。");
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
          setProviderStatusError(error instanceof Error ? error.message : "服务状态读取失败。");
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
          throw new Error("服务检测接口暂不可用，请重启后端服务后再试。");
        }
        throw new Error(await readApiError(response, "撰稿服务检测失败。"));
      }
      const data = (await response.json()) as ProviderCheckResult;
      setDraftCheckStatus(data);
      setNeedsProviderSettings(data.status !== "ok");
      setStatusText(
        data.status === "ok" ? data.message : `检测未通过：${data.message}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "撰稿服务检测失败。";
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

  async function generateDraft() {
    if (!topic.trim()) {
      setStatusText("先填写选题，再一键生成图文和封面。");
      return;
    }

    setBusyAction("draft");
    setNeedsProviderSettings(false);
    setStatusText("正在一键生成：先撰稿，再改写，最后生成封面图。");
    try {
      const response = await fetch(`${API_BASE}/content/generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          platform,
          topic: topic.trim(),
          knowledge_query: knowledgeQuery.trim() || undefined,
          tone: buildGenerationTone(tone, platform, styleOptions),
          target_audience: targetAudience.trim() || undefined,
          knowledge_limit: 5,
          tags: tagsText
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "图文草稿生成失败。"));
      }
      const data = (await response.json()) as GeneratedContent;
      setLastContent(data);
      onGeneratedContent(data);
      setNeedsProviderSettings(false);
      let finalContent = data;
      let rewriteWarning: string | null = null;
      if (!rewriteProviderReady) {
        rewriteWarning = "改写服务未配置或尚未确认，本次未走改写服务。";
        setStatusText(
          `草稿 #${data.id} 已生成。改写服务未配置或尚未确认，本次未走改写服务，正在尝试生成封面图。`
        );
      } else {
        setStatusText(`草稿 #${data.id} 已生成，正在调用改写服务做人味化处理。`);
        try {
          const rewriteResponse = await fetch(`${API_BASE}/content/rewrite`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              content_id: data.id,
              instruction:
                "按当前选题和风格做人味化改写，保留事实边界、关键词、标签语境和合规限制，不制造录取承诺。"
            })
          });
          if (!rewriteResponse.ok) {
            throw new Error(await readApiError(rewriteResponse, "改写服务处理失败。"));
          }
          const rewrittenContent = (await rewriteResponse.json()) as GeneratedContent;
          finalContent = rewrittenContent;
          setLastContent(rewrittenContent);
          onGeneratedContent(rewrittenContent);
          setStatusText(`草稿 #${rewrittenContent.id} 已完成改写，正在生成封面图。`);
        } catch (rewriteError) {
          const rawRewriteMessage =
            rewriteError instanceof Error ? rewriteError.message : "改写服务处理失败。";
          const rewriteMessage = normalizeRewriteServiceMessage(rawRewriteMessage);
          setNeedsProviderSettings(
            rawRewriteMessage.includes("DeepSeek") ||
              rawRewriteMessage.includes("授权失败") ||
              rawRewriteMessage.includes("API Key")
          );
          rewriteWarning = `改写服务未完成：${rewriteMessage}`;
          setStatusText(
            `草稿 #${data.id} 已生成，但改写服务未完成：${rewriteMessage} 正在尝试用当前草稿生成封面图。`
          );
        }
      }

      if (isTestDraft(finalContent)) {
        setStatusText(
          `草稿 #${finalContent.id} 是流程联调用测试草稿，不会创建演示封面。请配置真实撰稿服务后再一键生成。`
        );
        return;
      }

      try {
        const cover = await generateCoverForContent(finalContent);
        const completionMessage = rewriteWarning
          ? `文案 #${finalContent.id} 和封面图 #${cover.id} 已生成，但${rewriteWarning}预览确认后即可复制文案。`
          : `草稿 #${finalContent.id} 和封面图 #${cover.id} 已一键生成。预览确认后即可复制文案。`;
        setStatusText(completionMessage);
      } catch (coverError) {
        const coverMessage =
          coverError instanceof Error ? coverError.message : "封面图生成失败。";
        setNeedsProviderSettings(
          coverMessage.includes("图片服务") ||
            coverMessage.includes("授权失败") ||
            coverMessage.includes("API Key") ||
            coverMessage.includes("image")
        );
        setStatusText(`文案 #${finalContent.id} 已生成，但封面图未完成：${coverMessage}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "图文草稿生成失败。";
      setNeedsProviderSettings(
        message.includes("授权失败") ||
          message.includes("模型") ||
          message.includes("接口") ||
          message.includes("API Key")
      );
      setStatusText(message);
    } finally {
      setBusyAction(null);
    }
  }

  async function generateCoverForContent(content: GeneratedContent) {
    const isDouyinPost = content.platform === "douyin";
    const refreshedStatuses = liveImageProviderReady ? null : await refreshProviderStatuses();
    const refreshedImageProviderReady =
      liveImageProviderReady || hasLiveImageProvider(refreshedStatuses ?? []);
    if (!refreshedImageProviderReady) {
      throw new Error("图片服务还没有通过真实配置检测，请先到设置页应用图片服务 Key。");
    }

    const response = await fetch(`${API_BASE}/image/generate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        aspect_ratio: isDouyinPost ? "9:16" : "3:4",
        content_id: content.id,
        style_notes: isDouyinPost
          ? douyinHighAttractionCoverStyle
          : xhsHighAttractionCoverStyle,
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
          <Pill tone={exportContent ? "green" : "blue"}>
            {exportContent ? `草稿 #${exportContent.id}` : "主入口"}
          </Pill>
        }
        helper="一键生成会创建文案并尝试生成封面，不会自动发布；发布前仍需人工确认。"
        title="一键生成图文+封面"
      >
        <div className="mb-4 rounded-md border border-steel/40 bg-steel/10 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Pill tone={exportContent ? "green" : "blue"}>
                {exportContent ? `草稿 #${exportContent.id}` : "生产入口"}
              </Pill>
              <h3 className="mt-3 text-lg font-semibold leading-6 text-ink">
                选题确认后，点这里一键生成
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                当前会生成一篇营销图文草稿，自动改写并尝试生成封面图；不会自动发布。
              </p>
            </div>
            <button
              aria-label={primaryGenerateLabel}
              className="flex h-12 min-w-44 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-paper shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
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
                onChange={(event) => setPlatform(event.target.value)}
              >
                <option value="xiaohongshu">小红书图文</option>
                <option value="douyin">抖音图文</option>
              </select>
            </label>
            <div className={`${subtleCardClass} px-3 py-2`}>
              <div className="text-xs font-medium text-muted">登录门控</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {workspaceToken ? "令牌已配置" : "策划师测试模式免令牌"}
                </span>
                <button
                  aria-label="打开设置查看登录令牌"
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
                onChange={(event) => setTopic(event.target.value)}
                placeholder="输入要生成的图文主题"
                value={topic}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">知识检索词</span>
              <input
                className={`${formControlClass} h-10`}
                onChange={(event) => setKnowledgeQuery(event.target.value)}
                value={knowledgeQuery}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">目标人群</span>
              <input
                className={`${formControlClass} h-10`}
                onChange={(event) => setTargetAudience(event.target.value)}
                value={targetAudience}
              />
            </label>
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
                className={`${formControlClass} min-h-24 resize-y py-2 leading-6`}
                maxLength={420}
                onChange={(event) => setTone(event.target.value)}
                value={tone}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-muted">标签</span>
              <input
                className={`${formControlClass} h-10`}
                onChange={(event) => setTagsText(event.target.value)}
                value={tagsText}
              />
            </label>
          </div>

          <div className={`${subtleCardClass} p-4`}>
            <div className="text-sm font-semibold">启动状态</div>
            <p className="mt-2 text-sm leading-6 text-muted">{launchStatusText}</p>
            <div className="mt-4 rounded-md border border-line bg-mist/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-ink">服务状态</div>
                <span className="text-[11px] text-muted">已填写不代表授权通过</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {providerStatusError ? (
                  <Pill tone="red">读取失败</Pill>
                ) : providerDisplayItems.some((item) => item.status) ? (
                  providerDisplayItems.map((item) => {
                    const isDraft = item.name === "Draft generation";
                    const configured = Boolean(item.status?.configured);
                    const tone = needsProviderSettings && isDraft ? "red" : configured ? "green" : "amber";
                    const label =
                      needsProviderSettings && isDraft
                        ? "授权失败"
                        : configured
                          ? "已填写"
                          : "未填写";
                    return (
                      <Pill key={item.name} tone={tone}>
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
                去设置检查撰稿 API Key
              </button>
            ) : null}
            <div className="mt-4 border-l-4 border-amber pl-3 text-xs leading-5 text-muted">
              一键生成会按顺序处理文案、改写和封面；发布交付仍保持人工确认，不会自动发布。
            </div>
          </div>
        </div>
        {exportContent ? (
          <GeneratedPostExportCard
            key={exportContent.id}
            content={exportContent}
            generatedImageAsset={latestImageAsset}
            generationBusy={busyAction !== null}
            imageProviderReady={liveImageProviderReady}
            onImageGenerated={onImageGenerated}
            onOpenSettings={onOpenSettings}
            onRefreshProviderStatuses={refreshProviderStatuses}
            workspaceToken={workspaceToken}
          />
        ) : null}
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
  const [imageAsset, setImageAsset] = useState<GeneratedImageAsset | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
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
  const coverStyleNotes = isDouyinPost
    ? douyinHighAttractionCoverStyle
    : xhsHighAttractionCoverStyle;
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

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
    };
  }

  async function handleCopy() {
    if (!canCopy) {
      setCopyState("failed");
      return;
    }
    try {
      await copyText(copyPayload);
      setCopyState("copied");
    } catch (_error) {
      setCopyState("failed");
    }
  }

  async function handleGenerateImage() {
    if (generationBusy) {
      setImageError("一键生成还没完成，请等文案和封面流程结束后再操作。");
      return;
    }
    if (!canCopy) {
      setImageError("测试草稿不可生成封面图，请先生成一篇真实草稿。");
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
        throw new Error("图片服务还没有通过真实配置检测，请先到设置页应用图片服务 Key 后再点生成封面图。");
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
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
      <div className={`${subtleCardClass} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="green">已生成</Pill>
              <Pill tone={content.status === "draft" ? "amber" : "green"}>
                {content.status}
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
                ? "测试草稿不可复制"
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
              当前是流程联调用测试草稿，不可直接发布。
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
              浏览器复制失败，请手动选中正文复制。
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${subtleCardClass} p-4 xl:col-span-2`}>
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
            点击生成时会重新检测真实图片服务；检测未通过不会创建演示图片。
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
              <div className="font-semibold text-ink">图片状态：{imageAsset.status}</div>
              <div className="mt-2">
                非已批准内容生成的封面会保持待确认状态。粘贴到{platformLabel}前，请确认标题、图中文字、封面暗示和正文一致。
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

function CoverView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.9fr)_1fr]">
      <Panel
        action={
          <a
            aria-label="前往一键生成页生成封面"
            className="flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-paper"
            href="/?tab=content"
          >
            <Image className="h-4 w-4" />
            去一键生成
          </a>
        }
        helper="先在一键生成页生成文案和封面；下方展示参考版式。"
        title="封面参考版式"
      >
        <CoverReferencePreview />
      </Panel>

      <div className="space-y-4">
        <Panel helper="从 brief 到复核的图片流程。" title="图片流程">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {imageWorkflow.map((step) => (
              <div key={step.title} className={`${subtleCardClass} p-4`}>
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
      <Panel helper="无已批准内容前保持禁用；批准后再生成导出包和发布记录。" title="交付动作">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {promoterActions.map((action) => (
            <div key={action.title} className={`${subtleCardClass} p-4`}>
              <IconBox tone="green">
                <action.icon className="h-4 w-4" />
              </IconBox>
              <div className="mt-3 text-sm font-semibold">{action.title}</div>
              <div className="mt-1 text-xs leading-5 text-muted">{action.description}</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">{action.status}</span>
                <button
                  aria-label={`${action.command}，需有已批准内容后启用`}
                  className="glass-control flex h-8 items-center gap-2 rounded-md border px-2 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:opacity-55"
                  disabled
                  title="需有已批准内容后启用"
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
        <Panel helper="当前运营 lane 的积压状态。" title="工作队列">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {queues.map((queue) => (
              <div key={queue.name} className={`${subtleCardClass} px-4 py-3`}>
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
  const [credentialStatus, setCredentialStatus] = useState("凭证会保存在当前浏览器本机。");
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [providerCheckStatus, setProviderCheckStatus] = useState<string | null>(null);
  const [providerCheckBusy, setProviderCheckBusy] = useState(false);
  const canApplyProviderKeys = !credentialBusy;
  const canCheckProvider = !credentialBusy && !providerCheckBusy;
  const providerApplyLabel = "应用服务 API Key";
  const providerBindings = providerBindingDefaultsFromStatuses(providerStatuses);

  async function refreshProviderStatuses() {
    try {
      const statuses = await fetchProviderStatuses();
      setProviderStatuses(statuses);
      setProviderStatusError(null);
      return statuses;
    } catch (error) {
      const message = error instanceof Error ? error.message : "服务状态读取失败。";
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
          setProviderStatusError(error instanceof Error ? error.message : "服务状态读取失败。");
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
    setCredentialStatus("已清空本机保存的凭证。");
  }

  async function applyProviderKeys() {
    const payload = providerKeyUpdatePayload(credentials);

    setCredentialBusy(true);
    setCredentialStatus(
      Object.keys(payload).length
        ? "正在应用服务 API Key 到后端运行时。"
        : "正在刷新后端默认绑定状态。"
    );
    try {
      if (!Object.keys(payload).length) {
        await refreshProviderStatuses();
        setCredentialStatus("已刷新后端绑定状态；没有填写新 Key，不会覆盖。");
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
        throw new Error(await readApiError(response, "服务 API Key 应用失败。"));
      }
      const statuses = (await response.json()) as ProviderStatusItem[];
      setProviderStatuses(statuses);
      setProviderStatusError(null);
      setCredentialStatus("服务 API Key 已应用到当前后端运行时，响应未回显密钥。");
      setProviderCheckStatus(null);
    } catch (error) {
      setCredentialStatus(error instanceof Error ? error.message : "服务 API Key 应用失败。");
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
          throw new Error("服务检测接口暂不可用，请重启后端服务后再试。");
        }
        throw new Error(await readApiError(response, "撰稿服务检测失败。"));
      }
      const data = (await response.json()) as ProviderCheckResult;
      setProviderCheckStatus(
        data.status === "ok" ? data.message : `检测未通过：${data.message}`
      );
    } catch (error) {
      setProviderCheckStatus(error instanceof Error ? error.message : "撰稿服务检测失败。");
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
      label: "登录令牌（可选）",
      placeholder: "策划师测试模式下不用填写",
      helper: "当前测试阶段已免登录；以后恢复正式登录时再填写登录凭证。"
    },
    {
      keyName: "draftApiKey",
      label: "撰稿 API Key",
      placeholder: "留空则不覆盖后端现有配置",
      helper: "撰稿服务使用；只有更换 Key 时才需要填写。",
      backendBound: providerBindings.draft
    },
    {
      keyName: "imageApiKey",
      label: "图片 API Key",
      placeholder: "留空则不覆盖后端现有配置",
      helper: "图片生成服务使用；封面生成走服务端。",
      backendBound: providerBindings.image
    },
    {
      keyName: "rewriteApiKey",
      label: "改写 API Key",
      placeholder: "留空则不覆盖后端现有配置",
      helper: "改写和人味化服务使用；响应不会回显密钥。",
      backendBound: providerBindings.rewrite
    }
  ];

  function settingsThemeHref(style: InterfaceStyle) {
    return `/?tab=settings&theme=${style}`;
  }

  return (
    <div className="space-y-4">
      <Panel
        action={<Pill tone="blue">集中管理</Pill>}
        helper="服务 API Key 集中填写；策划师测试阶段不再要求工作台登录令牌。"
        title="API Key 与令牌"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {credentialFields.map((field) => {
              const localFilled = credentials[field.keyName].trim().length > 0;
              const statusText = field.keyName === "workspaceToken"
                ? "测试免填"
                : localFilled
                  ? "本机已填"
                  : field.backendBound
                    ? "后端已绑定"
                    : "未绑定";
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
                <div className="text-sm font-semibold">凭证状态</div>
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
                清空本机凭证
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Pill tone={credentials.workspaceToken ? "green" : "amber"}>
                登录 {credentials.workspaceToken ? "已填" : "测试免填"}
              </Pill>
              <Pill tone={credentials.draftApiKey || providerBindings.draft ? "green" : "amber"}>
                撰稿 {credentials.draftApiKey ? "本机已填" : providerBindings.draft ? "后端已绑定" : "未绑定"}
              </Pill>
              <Pill tone={credentials.imageApiKey || providerBindings.image ? "green" : "amber"}>
                图片 {credentials.imageApiKey ? "本机已填" : providerBindings.image ? "后端已绑定" : "未绑定"}
              </Pill>
              <Pill tone={credentials.rewriteApiKey || providerBindings.rewrite ? "green" : "amber"}>
                改写 {credentials.rewriteApiKey ? "本机已填" : providerBindings.rewrite ? "后端已绑定" : "未绑定"}
              </Pill>
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
                <div className="text-xs text-muted">不影响导航和功能状态。</div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {themeTemplates.map((template) => {
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
                      key={template.label}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{template.label}</span>
                        {selected ? <Pill tone="blue">当前</Pill> : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {template.description}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`theme-${template.style} mt-2 flex gap-1`}
                      >
                        <span className="h-1.5 w-7 rounded-sm bg-steel" />
                        <span className="h-1.5 w-7 rounded-sm bg-moss" />
                        <span className="h-1.5 w-7 rounded-sm bg-coral" />
                      </span>
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
                      <span className="mt-3 flex gap-1">
                        <span className="h-2.5 w-8 rounded-sm bg-steel" />
                        <span className="h-2.5 w-8 rounded-sm bg-moss" />
                        <span className="h-2.5 w-8 rounded-sm bg-coral" />
                      </span>
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
              : "如果隐藏了说明文字，可以在这里重新打开，不会重置主题或凭证。"
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
            只恢复顶部页面说明和侧边安全门说明，不会修改主题、凭证或内容。
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
      helper="把 GitHub 上适合本项目的 Skill/MCP 候选沉淀在这里；接入前先看许可证、登录态和发布风险。"
      title="外部技能接入雷达"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {externalSkillCandidates.map((candidate) => (
          <article className={`${subtleCardClass} p-4`} key={candidate.source}>
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
                    {candidate.license}
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
                  打开 GitHub
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

function DraftPanel({
  content,
  coverImageAsset,
  loading
}: {
  content: GeneratedContent | null;
  coverImageAsset: GeneratedImageAsset | null;
  loading: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
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

  useEffect(() => {
    setPortalReady(true);
  }, []);

  async function handleCopy() {
    if (!content || !canCopy) {
      setCopyState("failed");
      return;
    }
    try {
      await copyText(buildPlatformCopy(content));
      setCopyState("copied");
    } catch (_error) {
      setCopyState("failed");
    }
  }

  return (
    <Panel
      action={<Pill tone={content ? "green" : loading ? "blue" : "amber"}>{preview.status}</Pill>}
      helper={`按${previewPlatformLabel}图文卡片和弹窗预览最终展示效果。`}
      title="创作台"
    >
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(280px,360px)_1fr]">
        <article
          className="glass-subtle overflow-hidden rounded-[22px] border bg-paper shadow-panel"
          data-testid="xhs-preview-card"
        >
          <button
            aria-label={`打开${previewPlatformLabel}发布效果预览`}
            className="group block w-full text-left"
            data-testid="xhs-preview-cover-button"
            onClick={() => setPreviewOpen(true)}
            type="button"
          >
            <div
              className={`relative aspect-[3/4] overflow-hidden ${
                coverImageUrl
                  ? "bg-paper"
                  : "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.9),transparent_32%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_46%,#f8cfc0_100%)] p-5"
              }`}
            >
              {coverImageUrl ? (
                <img
                  alt="已生成的小红书封面预览"
                  className="h-full w-full object-cover"
                  data-testid="xhs-preview-real-cover"
                  src={coverImageUrl}
                />
              ) : (
                <>
                  <div className="absolute left-4 top-4 rounded-md bg-white/75 px-2 py-1 text-[11px] font-semibold text-ink/70 shadow-sm">
                    封面预览
                  </div>
                  <div className="absolute inset-x-5 bottom-6">
                    <div className="mb-3 h-1.5 w-12 rounded-full bg-coral" />
                    <div className="space-y-1 text-[2rem] font-black leading-[1.08] text-ink sm:text-[2.35rem]">
                      {coverLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-xs font-semibold text-ink/70">
                      {coverReferences.slice(0, 3).map((item, index) => (
                        <div key={item.title} className="rounded-md bg-white/82 px-3 py-2">
                          {index + 1}. {item.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </button>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <PlatformLabel
                className="font-semibold text-ink"
                iconSize="sm"
                platform={previewPlatformId}
                suffix="图文"
              />
              <span>{content ? `草稿 #${preview.id}` : loading ? "正在读取最近草稿" : "等待草稿"}</span>
            </div>
            <button
              className="mt-2 block w-full text-left text-base font-semibold leading-6 text-ink transition hover:text-coral"
              data-testid="xhs-preview-title-button"
              onClick={() => setPreviewOpen(true)}
              type="button"
            >
              {preview.title}
            </button>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
              <span className="flex items-center gap-2">
                <PlatformIcon platform={previewPlatformId} size="md" />
                内容运营中枢
              </span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  未发布
                </span>
                <Bookmark className="h-4 w-4" />
              </span>
            </div>
          </div>
        </article>

        <div className="grid content-start gap-4">
          <div className={`${subtleCardClass} p-4`}>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <PenLine className="h-4 w-4 text-steel" />
              发布页摘要
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/80">
              {paragraphs[0] ?? preview.body}
            </p>
            {tagLine ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tagLine.split(" ").map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-line bg-mist px-2 py-1 text-xs font-medium text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              className={`${secondaryButtonClass} h-11`}
              data-testid="xhs-preview-open-button"
              onClick={() => setPreviewOpen(true)}
              type="button"
            >
              <Eye className="h-4 w-4" />
              查看发布效果
            </button>
            <button
              className={`${secondaryButtonClass} h-11 disabled:cursor-not-allowed disabled:opacity-55`}
              disabled={!canCopy}
              onClick={handleCopy}
              type="button"
            >
              {copyState === "copied" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {copyState === "copied" ? "已复制文案" : "复制文案"}
            </button>
            <div className={`${subtleCardClass} flex min-h-11 items-center px-3 text-xs leading-5 text-muted`}>
              {content && coverImageUrl
                ? "已生成真实封面，点击封面可查看发布效果。"
                : content
                ? "封面仍是版式预览，真实图片生成后会在这里替换。"
                : loading
                  ? "正在读取最近生成的全文草稿。"
                  : "生成草稿后，这里会自动切换为最新内容。"}
            </div>
          </div>
        </div>
      </div>

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
                      {coverLines.map((line) => (
                        <div key={line}>{line}</div>
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
                    <div className="text-sm font-semibold">内容运营中枢</div>
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
                  {paragraphs.map((paragraph) => (
                    <p key={paragraph}>{renderXhsExpressionText(paragraph)}</p>
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
                    当前没有可复制的正式草稿，或浏览器复制被拦截。
                  </div>
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
    <Panel helper="平台交付历史和当前门控状态。" title="发布记录">
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
            {publishingRecords.map((record) => (
              <tr key={record.content}>
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
        {items.map((item) => (
          <div key={item.title} className={`${subtleCardClass} p-4`}>
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
      {safetyGates.map((gate) => (
        <div key={gate.label} className="flex items-center justify-between gap-3 px-4 py-3">
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
  return (
    <div
      className={[
        "rounded-md border border-line bg-[linear-gradient(160deg,#fff8e8,#d6f0e2_48%,#f6cdbd)] p-4 shadow-panel",
        compact ? "min-h-[300px]" : "mx-auto min-h-[520px] max-w-[390px]"
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-steel">
        <span>小红书封面参考</span>
        <span className="rounded-md bg-white/75 px-2 py-1 text-[11px] text-ink/70">
          非生成结果
        </span>
      </div>
      <div className={["font-black leading-tight text-ink", compact ? "mt-5 text-3xl" : "mt-10 text-5xl"].join(" ")}>
        不是先套磁
        <br />
        先想清楚
        <br />
        这 3 件事
      </div>
      <div className={["space-y-2 text-xs font-medium text-ink/70", compact ? "mt-5" : "mt-8"].join(" ")}>
        <div className="rounded-md bg-white/85 px-3 py-2">1. 明确研究方向</div>
        <div className="rounded-md bg-white/85 px-3 py-2">2. 匹配导师项目</div>
        <div className="rounded-md bg-white/85 px-3 py-2">3. 再定制套磁</div>
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
    <section className={["glass-panel rounded-md border", className].join(" ")}>
      <div className="flex flex-col gap-3 border-b border-line/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold leading-5">{title}</h2>
          {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
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

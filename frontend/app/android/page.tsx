"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpenText,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Database,
  ExternalLink,
  Home,
  Heart,
  Image,
  LockKeyhole,
  LogOut,
  Loader2,
  MessageCircle,
  PenLine,
  Pin,
  Play,
  Radar,
  Save,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";

import { PlatformIcon, PlatformLabel } from "@/components/platform-icon";
import { getApiBase, isLocalOrPrivateHostname } from "@/lib/api-base";
import { resolveAssetUrl } from "@/lib/asset-url";
import { copyText, tryCopyText } from "@/lib/clipboard";
import {
  collectionJobDiagnosticItems,
  type CollectionJobDiagnosticItem,
  formatCollectionJobStatus,
  isActiveCollectionJob,
  type CollectionJobStatusSnapshot
} from "@/lib/collection-job-status";
import {
  isGeneratedContent,
  isGeneratedImageAsset,
  type GeneratedContent,
  type GeneratedImageAsset
} from "@/lib/generated-assets";
import {
  fetchKnowledgeItems,
  knowledgeItemExcerpt,
  type KnowledgeItem
} from "@/lib/knowledge-api";
import {
  providerBindingDefaultsFromStatuses,
  sanitizeProviderStatusItems,
  type ProviderStatusItem
} from "@/lib/provider-settings";
import {
  SERVICE_CONFIG_READ_ERROR,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import { formatTagLine } from "@/lib/tags";
import {
  buildEditableDraftCopy,
  clearStoredMobileContent,
  clearStoredMobileCover,
  normalizeMobileDraftHistory,
  readStoredDeletedDraftIds,
  readStoredMobileContent,
  readStoredMobileCover,
  readStoredMobileDraftHistory,
  rememberDeletedDraftId,
  saveStoredMobileContent,
  saveStoredMobileCover,
  saveStoredMobileDraftHistory,
  type DraftPreviewState,
  type MobileDraftHistoryItem
} from "@/lib/mobile-draft-storage";
import {
  TOPIC_PRESET_REFRESH_MS,
  TOPIC_PRESET_ROTATION_SIZE,
  buildTopicCoverStyleNotes,
  generationTopicPresets,
  pickGenerationTopicPresetBatch,
  type GenerationTopicPreset
} from "@/lib/topic-presets";
import { renderXhsExpressionText } from "@/lib/xhs-stickers";

type MobileTab = "home" | "collect" | "knowledge" | "create" | "settings";
type MobilePlatform = "douyin" | "xiaohongshu";

type OmpcAndroidBridge = {
  shareToXiaohongshu: (
    title: string,
    text: string,
    imageBase64: string,
    fileName: string
  ) => string | null | undefined;
};

declare global {
  interface Window {
    OMPCAndroid?: OmpcAndroidBridge;
  }
}

type CredentialSettings = {
  draftApiKey: string;
  imageApiKey: string;
  rewriteApiKey: string;
  workspaceToken: string;
};

type MobileLoginResponse = {
  account: string;
  default_keys_bound: boolean;
  key_profile: string;
  provider_statuses: ProviderStatusItem[];
};

type LinkImportTarget = {
  accepted_count: number;
  extracted_count: number;
  links: Array<{
    accepted: boolean;
    link_type: string;
    normalized_url: string;
    reason: string | null;
  }>;
};

type MobileCollectionJob = CollectionJobStatusSnapshot & {
  created_at?: string;
  updated_at?: string;
};

const defaultMobileDraftPreview: DraftPreviewState = {
  body:
    "很多人一上来就急着群发邮件，但研究方向、读博动机和导师匹配没想清楚，反而容易浪费第一印象。",
  points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
  tags: "#硕升博 #博士申请 #研究方向",
  title: "不是先套磁，先想清楚这 3 件事"
};

const API_BASE = getApiBase();
const MOBILE_AUTH_STORAGE_KEY = "opc_mobile_auth_v1";
const CREDENTIAL_STORAGE_KEY = "opc_workspace_credentials_v1";
const COLLECTION_SCHEDULE_STORAGE_KEY = "opc_mobile_collection_schedule_v1";
const MOBILE_COVER_HYDRATION_RETRY_LIMIT = 10;
const MOBILE_COVER_HYDRATION_RETRY_MS = 3000;
const XHS_COVER_WIDTH = 1024;
const XHS_COVER_HEIGHT = 1365;
const XHS_COVER_BASE_WIDTH = 900;
const XHS_COVER_BASE_HEIGHT = 1200;
const MOBILE_PAPER_TEXTURE = "/mobile-assets/paper-texture.png";
const MOBILE_COLLECTION_COLLAGE = "/mobile-assets/collection-collage.png";
const MOBILE_CREATE_CARD_BG = "/mobile-assets/create-card-bg.png";
const mobileScreenArt: Record<MobileTab, { image: string; opacity: string; position: string }> = {
  home: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-80",
    position: "center top"
  },
  collect: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-78",
    position: "center top"
  },
  create: {
    image: MOBILE_CREATE_CARD_BG,
    opacity: "opacity-92",
    position: "center top"
  },
  knowledge: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-72",
    position: "center top"
  },
  settings: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-58",
    position: "center top"
  }
};
const MOBILE_HEADER_ICON_BUTTON_CLASS =
  "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[20px] border border-white/[0.82] bg-[rgba(255,253,247,0.76)] text-ink shadow-[0_10px_24px_rgba(28,54,45,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md active:scale-[0.98]";
const XHS_COPY_TEXT_ONLY_LABEL = "只复制文案";

const emptyCredentials: CredentialSettings = {
  draftApiKey: "",
  imageApiKey: "",
  rewriteApiKey: "",
  workspaceToken: ""
};

const xhsMobileDraftTone = [
  "小红书女性向图文风格，像学姐认真提醒，温柔、轻松、真实、有陪伴感，不要像官方说明文",
  "开头必须有共鸣和反常识冲突，前三行要有停留感",
  "正文必须把 emoji 当成结构标识使用，不是随便撒表情：👉💧 用于开头钩子，👇 用于引出分类，📍 用于路线小节，🔥 用于优点/条件模块，✅ 用于卖点清单，🎓 用于专业池，😎 用于问答判断段，💓 用于申请条件或温柔引导",
  "路线/榜单/资料型图文必须出现 5-9 个结构 emoji，并保持每 2-4 段就有一个视觉锚点",
  "可以额外自然加入 1-3 个小红书表情字符码或轻量颜文字，优先 [笑哭R]、[哭惹R]、[哇R]、[赞R]、[doge]、[蹲后续H]，但不能只靠表情字符码代替结构 emoji",
  "允许使用 ～、！！、？、…… 和短括号吐槽制造口语节奏与表情包感，例如（先别急）（真的别反着来）（会很亏）",
  "自然提高口语语气词密度，在开头、转折和提醒处穿插哦、哟、呀、啊、嘛、呢、啦、哈等，但不要每句都堆",
  "可以少量使用姐妹、宝子、uu、学妹等女性向社媒称呼，但保持专业可信",
  "结尾用温柔提醒或轻引导，不制造焦虑，不承诺录取或导师回复结果"
].join("；");

const shortPostDraftTone =
  "短段正文风格，表达克制、清楚、有行动建议，不制造录取承诺。";

type CollectionScheduleStorage = {
  autoEnabled: boolean;
  intervalMinutes: number;
  keyword: string;
  lastJobId: number | null;
  lastRunAt: string | null;
  maxItems: number;
  nextRunAt: string | null;
  platform: MobilePlatform;
  scheduleMessage: string;
};

function mobileDiagnosticToneClass(tone: CollectionJobDiagnosticItem["tone"]) {
  if (tone === "good") {
    return "border-moss/25 bg-moss/10";
  }
  if (tone === "warning") {
    return "border-[#f3c96b]/[0.40] bg-[#fff5d8]";
  }
  if (tone === "danger") {
    return "border-coral/30 bg-coral/10";
  }
  return "border-[#d6e8df] bg-white";
}

const bottomTabs: Array<{ id: MobileTab; icon: typeof Home; label: string }> = [
  { id: "home", icon: Home, label: "首页" },
  { id: "collect", icon: Radar, label: "采集" },
  { id: "knowledge", icon: BookOpenText, label: "知识" },
  { id: "create", icon: PenLine, label: "创作" },
  { id: "settings", icon: Settings, label: "设置" }
];

const workItems = [
  { label: "补公开图文素材", state: "进入采集", icon: Radar, tab: "collect" },
  { label: "查看知识库", state: "进入知识", icon: BookOpenText, tab: "knowledge" },
  { label: "生成硕升博草稿", state: "进入创作", icon: PenLine, tab: "create" }
] satisfies Array<{
  icon: typeof Radar;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const progressSteps = [
  { label: "采集", state: "当前", icon: Database, tab: "collect" },
  { label: "知识库", state: "可查看", icon: BookOpenText, tab: "knowledge" },
  { label: "确认", state: "待处理", icon: ShieldCheck, tab: "create" }
] satisfies Array<{
  icon: typeof Database;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const quickMetrics = [
  { label: "趋势素材", value: "0", tone: "blue", tab: "collect" },
  { label: "知识条目", value: "查看", tone: "green", tab: "knowledge" },
  { label: "待确认", value: "0", tone: "coral", tab: "create" }
] satisfies Array<{
  label: string;
  tab: MobileTab;
  tone: "blue" | "coral" | "green";
  value: string;
}>;

const taskActionCopy: Record<MobileTab, string> = {
  home: "已回到首页。",
  collect: "已打开采集页，可以切换平台、编辑关键词和保存知识摘要。",
  knowledge: "已打开知识库，可以查看最近入库内容或搜索知识条目。",
  create: "已打开创作项目页，先选择项目再进入生成入口。",
  settings: "已打开设置页，可以查看账号状态和发布确认规则。"
};
const mobileCreationProjects = [
  {
    id: "postgraduate-phd",
    title: "1.硕升博推广",
    iconSrc: "/platform-icons/xiaohongshu-app.webp",
    category: "小红书图文获客",
    status: "可进入",
    description: "硕升博内容获客：生成图文草稿、封面方向和发布清单。",
    inputs: ["趋势参考", "申请人痛点", "项目卖点"],
    outputs: ["图文草稿", "封面方案", "发布清单"],
    workflow: ["采集参考", "一键撰稿+封面", "预览复制", "人工确认发布"],
    enabled: true
  },
  {
    id: "ecommerce-listing",
    title: "2.抖音商品自动化",
    iconSrc: "/platform-icons/douyin-app.webp",
    category: "电商转化",
    status: "规划中",
    description: "面向商品标题、卖点、详情页结构、FAQ 和客服话术。",
    inputs: ["商品信息", "卖点素材", "竞品参考"],
    outputs: ["上架文案", "详情页结构", "客服话术"],
    workflow: ["商品资料", "卖点提炼", "详情页草稿", "人工确认"],
    enabled: false
  },
  {
    id: "private-domain-sales",
    title: "3.私域商品自动化",
    iconSrc: "/platform-icons/wechat-app.webp",
    category: "销售跟进",
    status: "规划中",
    description: "面向朋友圈、社群跟进、异议处理和成交 SOP。",
    inputs: ["产品资料", "客户问题", "成交限制"],
    outputs: ["跟进 SOP", "群发文案", "异议处理"],
    workflow: ["客户分层", "跟进话术", "异议处理", "人工确认"],
    enabled: false
  }
] as const;

type MobileCreationProjectId = (typeof mobileCreationProjects)[number]["id"];

function findEnabledMobileCreationProject(projectId: string | null) {
  return mobileCreationProjects.find((project) => project.enabled && project.id === projectId) ?? null;
}

function mobileCreationProjectActionClass(projectId: MobileCreationProjectId, enabled: boolean) {
  if (!enabled) {
    return "border border-white/[0.84] bg-[rgba(255,253,247,0.86)] text-muted";
  }
  if (projectId === "postgraduate-phd") {
    return "border border-[#ff2442]/[0.38] bg-white text-[#ff2442]";
  }
  if (projectId === "ecommerce-listing") {
    return "border border-[#171a18] bg-[#171a18] text-white";
  }
  return "border border-[#23854f]/[0.35] bg-[#e7f2ea] text-moss";
}

const sampleReferences = [
  {
    body:
      "姐妹们，硕升博别一上来就套磁。[哭惹R]\n\n先确认研究方向、导师项目和自己的材料匹配度，再去写邮件，第一印象会稳很多。\n\n真正要先做的是：把方向拆清楚，把导师近期成果读一遍，把你能贡献什么写成一句话。",
    coverNotes: ["路线矩阵", "决策地图", "封面轮换"],
    cue: "反常识开头 + 路线结构",
    meta: "结构模板 · 参考版式",
    takeaways: ["先打断常见误区", "再给 3 个动作", "结尾给温和提醒"],
    title: "不是先套磁，先确认这 3 件事"
  },
  {
    body:
      "宝子，群发邮件真的不是越早越好～\n\n如果方向没拆清楚，邮件看起来就会像模板，导师也很难判断你到底适不适合他的组。\n\n先做一个小动作：把每位导师的研究主题、近两年成果、你能接上的经历放在同一张表里。",
    coverNotes: ["误区提醒", "邮件场景", "行动表格"],
    cue: "先打断误区，再给动作",
    meta: "结构模板 · 参考版式",
    takeaways: ["用场景切入", "指出群发风险", "给出表格化动作"],
    title: "硕升博申请别急着群发邮件"
  },
  {
    body:
      "导师匹配前，先做一次方向自查！！[赞R]\n\n不是看导师名气有多大，而是看你的经历、兴趣和他正在做的项目能不能接上。\n\n可以从三个问题开始：我能研究什么？我已经做过什么？我为什么适合这个方向？",
    coverNotes: ["步骤化封面", "方向自查", "清爽正文"],
    cue: "步骤化封面 + 低噪正文",
    meta: "封面模板 · 参考版式",
    takeaways: ["问题式开头", "降低焦虑", "强调匹配逻辑"],
    title: "导师匹配前要做的方向自查"
  }
];

function authHeaders(credentials: CredentialSettings) {
  return {
    "Content-Type": "application/json",
    ...(credentials.workspaceToken.trim()
      ? { Authorization: `Bearer ${credentials.workspaceToken.trim()}` }
      : {})
  };
}

async function fetchProviderStatuses() {
  const response = await fetch(`${API_BASE}/workspace/provider-status`);
  if (!response.ok) {
    throw new Error(await readApiError(response, SERVICE_CONFIG_READ_ERROR));
  }
  return sanitizeProviderStatusItems(
    (await response.json()) as ProviderStatusItem[]
  );
}

async function authenticateMobileLogin(account: string, password: string) {
  try {
    const response = await fetch(`${API_BASE}/auth/mobile-login`, {
      body: JSON.stringify({ account, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    if (response.ok) {
      const data = (await response.json()) as Partial<MobileLoginResponse>;
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
      throw new Error("登录服务暂时不可用，请确认应用服务已启动。");
    }
    throw error;
  }
}

async function readApiError(response: Response, fallback: string) {
  const errorBody = (await response.json().catch(() => null)) as
    | { detail?: string; message?: string }
    | null;
  return sanitizeServiceErrorMessage(errorBody?.message ?? errorBody?.detail ?? fallback);
}

function readMobileStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function writeMobileStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

function removeMobileStorage(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (_error) {
    return false;
  }
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "xiaohongshu-cover";
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const lines: string[] = [];
  let currentLine = "";
  for (const char of text) {
    const nextLine = `${currentLine}${char}`;
    if (context.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
      if (lines.length >= maxLines) {
        return lines;
      }
      continue;
    }
    currentLine = nextLine;
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("封面图读取失败。"));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("封面图导出失败。"));
    }, "image/png");
  });
}

async function buildCoverFileFromImage(src: string, title: string) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || XHS_COVER_WIDTH;
  canvas.height = image.naturalHeight || XHS_COVER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持封面图处理。");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToPngBlob(canvas);
  return new File([blob], `${sanitizeFilename(title)}.png`, { type: "image/png" });
}

async function buildFallbackCoverFile(draft: DraftPreviewState) {
  const canvas = document.createElement("canvas");
  canvas.width = XHS_COVER_WIDTH;
  canvas.height = XHS_COVER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持封面图处理。");
  }
  context.scale(canvas.width / XHS_COVER_BASE_WIDTH, canvas.height / XHS_COVER_BASE_HEIGHT);
  const gradient = context.createLinearGradient(0, 0, XHS_COVER_BASE_WIDTH, XHS_COVER_BASE_HEIGHT);
  gradient.addColorStop(0, "#fff7df");
  gradient.addColorStop(0.52, "#d9f1e5");
  gradient.addColorStop(1, "#f7cdbf");
  context.fillStyle = gradient;
  context.fillRect(0, 0, XHS_COVER_BASE_WIDTH, XHS_COVER_BASE_HEIGHT);

  context.fillStyle = "#0f1412";
  context.font = "800 72px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  const titleLines = wrapCanvasText(context, draft.title, 760, 4);
  titleLines.forEach((line, index) => {
    context.fillText(line, 72, 220 + index * 92);
  });

  context.font = "700 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  draft.points.slice(0, 3).forEach((point, index) => {
    const y = 760 + index * 112;
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.beginPath();
    context.roundRect(72, y, 756, 78, 18);
    context.fill();
    context.fillStyle = "#0f1412";
    context.fillText(`${index + 1}. ${point}`, 110, y + 50);
  });

  const blob = await canvasToPngBlob(canvas);
  return new File([blob], `${sanitizeFilename(draft.title)}.png`, { type: "image/png" });
}

async function buildXhsCoverFile(coverImageUrl: string | null, draft: DraftPreviewState) {
  if (coverImageUrl) {
    try {
      return await buildCoverFileFromImage(coverImageUrl, draft.title);
    } catch (_error) {
      return buildFallbackCoverFile(draft);
    }
  }
  return buildFallbackCoverFile(draft);
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileAsBase64Payload(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, payload] = result.split(",", 2);
      if (!payload) {
        reject(new Error("封面图转交给 App 失败。"));
        return;
      }
      resolve(payload);
    };
    reader.onerror = () => reject(new Error("封面图读取失败。"));
    reader.readAsDataURL(file);
  });
}

function getOmpcAndroidBridge() {
  if (typeof window === "undefined") {
    return null;
  }
  const bridge = window.OMPCAndroid;
  return bridge && typeof bridge.shareToXiaohongshu === "function" ? bridge : null;
}

async function shareToNativeXiaohongshu(title: string, text: string, coverFile: File) {
  const bridge = getOmpcAndroidBridge();
  if (!bridge) {
    return { ok: false, message: "当前不是 OMPC App，继续使用浏览器分享。" };
  }
  const imageBase64 = await readFileAsBase64Payload(coverFile);
  const result = bridge.shareToXiaohongshu(title, text, imageBase64, coverFile.name);
  const resultText = typeof result === "string" ? result : "";
  if (resultText === "ok") {
    return { ok: true, message: "已交给小红书：封面图、标题和正文已一起发送，正文也已复制兜底。" };
  }
  return {
    ok: false,
    message: resultText.startsWith("error:") ? resultText.slice(6) : "小红书原生分享失败，继续使用系统分享。"
  };
}

function draftStateFromContent(content: GeneratedContent): DraftPreviewState {
  return {
    body: content.body,
    points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
    tags: formatTagLine(content.tags),
    title: content.title
  };
}

function getPcReturnHref() {
  if (typeof window === "undefined") {
    return "/";
  }
  const from = new URLSearchParams(window.location.search).get("from");
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return "/";
}

function detectNativeShell() {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("shell") === "android" ||
    params.get("app") === "ompc" ||
    window.navigator.userAgent.includes("OMPCWorkstation")
  );
}

function readStoredMobileAccount() {
  const stored = readMobileStorage(MOBILE_AUTH_STORAGE_KEY);
  const account = stored?.trim() ?? "";
  return account.length > 0 && account.length <= 32 ? account : null;
}

function saveStoredMobileAccount(account: string) {
  writeMobileStorage(MOBILE_AUTH_STORAGE_KEY, account);
}

function clearStoredMobileAccount() {
  removeMobileStorage(MOBILE_AUTH_STORAGE_KEY);
}

export default function AndroidPreviewPage() {
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [isNativeShell, setIsNativeShell] = useState(false);
  const [status, setStatus] = useState("手机端操作已就绪");
  const [credentials, setCredentials] = useState<CredentialSettings>(emptyCredentials);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [mobileAccount, setMobileAccount] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);

  useEffect(() => {
    setIsNativeShell(detectNativeShell());
    setMobileAccount(readStoredMobileAccount());
    setAuthLoaded(true);
  }, []);

  useEffect(() => {
    try {
      const stored = readMobileStorage(CREDENTIAL_STORAGE_KEY);
      if (stored) {
        setCredentials({ ...emptyCredentials, ...JSON.parse(stored) });
      }
    } catch (_error) {
      setCredentials(emptyCredentials);
    } finally {
      setCredentialsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!credentialsLoaded) {
      return;
    }
    writeMobileStorage(CREDENTIAL_STORAGE_KEY, JSON.stringify(credentials));
  }, [credentials, credentialsLoaded]);

  useEffect(() => {
    if (!mobileAccount) {
      setProviderStatuses([]);
      return;
    }

    let active = true;

    async function loadProviderStatuses() {
      try {
        const data = await fetchProviderStatuses();
        if (active) {
          setProviderStatuses(data);
        }
      } catch (_error) {
        if (active) {
          setStatus("应用服务状态暂时读取失败，生成时会继续尝试连接。");
        }
      }
    }

    void loadProviderStatuses();
    return () => {
      active = false;
    };
  }, [mobileAccount]);

  function openTab(tab: MobileTab, message = taskActionCopy[tab]) {
    setActiveTab(tab);
    setStatus(message);
  }

  function login(
    account: string,
    nextProviderStatuses: ProviderStatusItem[],
    defaultKeysBound: boolean
  ) {
    saveStoredMobileAccount(account);
    setMobileAccount(account);
    setProviderStatuses(nextProviderStatuses);
    setActiveTab("home");
    setStatus(defaultKeysBound ? `已登录：${account}，默认服务授权已就绪。` : `已登录：${account}，请在电脑端检查服务授权。`);
  }

  function logout() {
    clearStoredMobileAccount();
    setMobileAccount(null);
    setActiveTab("home");
    setStatus("已退出登录。");
  }

  if (!authLoaded || !mobileAccount) {
    return (
      <MobileShell>
        <LoginScreen
          isNativeShell={isNativeShell}
          loading={!authLoaded}
          onLogin={login}
        />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <MobileHeader
        activeTab={activeTab}
        isNativeShell={isNativeShell}
        onNotify={() => setStatus("暂无新通知，发布前确认和安全规则仍保持开启。")}
      />
      <section className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3">
        <MobileScreenBackdrop activeTab={activeTab} />
        <div
          aria-live="polite"
          className="relative z-10 mb-2 ml-1 inline-flex max-w-[calc(100%-0.5rem)] rounded-full border border-white/[0.82] bg-[rgba(255,253,247,0.78)] px-3 py-1.5 text-[11px] font-semibold leading-5 text-ink/[0.70] shadow-[0_10px_24px_rgba(27,58,48,0.06),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md"
          data-testid="mobile-status"
          role="status"
        >
          {status}
        </div>
        <div className="relative z-10" hidden={activeTab !== "home"}>
          <HomeScreen onAction={setStatus} onChangeTab={openTab} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "collect"}>
          <CollectScreen credentials={credentials} onAction={setStatus} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "knowledge"}>
          <KnowledgeScreen onAction={setStatus} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "create"}>
          <CreateScreen credentials={credentials} onAction={setStatus} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "settings"}>
          <SettingsScreen
            mobileAccount={mobileAccount}
            onAction={setStatus}
            onLogout={logout}
            providerStatuses={providerStatuses}
          />
        </div>
      </section>
      <BottomNav activeTab={activeTab} onChange={openTab} />
    </MobileShell>
  );
}

function MobileShell({ children }: { children: ReactNode }) {
  return (
    <main className="opc-mobile-shell min-h-[100dvh] bg-[#d8e6dc] px-0 py-0 text-ink sm:px-6 sm:py-6">
      <div
        className="relative mx-auto h-[100dvh] max-w-[430px] overflow-hidden bg-[#f8f5ec] bg-cover shadow-[0_24px_70px_rgba(20,48,41,0.18)] sm:h-[calc(100dvh-48px)] sm:min-h-[680px] sm:rounded-[30px] sm:border sm:border-white/[0.80]"
        style={{ backgroundImage: `url(${MOBILE_PAPER_TEXTURE})` }}
      >
        <div className="flex h-full flex-col">{children}</div>
      </div>
    </main>
  );
}

function MobileScreenBackdrop({ activeTab }: { activeTab: MobileTab }) {
  const art = mobileScreenArt[activeTab];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[330px] overflow-hidden">
      <div
        className={`absolute inset-x-[-16%] top-[-42px] h-[280px] bg-cover ${art.opacity}`}
        style={{
          backgroundImage: `url(${art.image})`,
          backgroundPosition: art.position
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[330px] bg-[linear-gradient(180deg,rgba(248,245,236,0.08)_0%,rgba(248,245,236,0.34)_38%,rgba(248,245,236,0.84)_74%,rgba(248,245,236,0.98)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[190px] bg-[radial-gradient(circle_at_78%_8%,rgba(255,255,255,0.58),transparent_36%),radial-gradient(circle_at_12%_20%,rgba(231,242,234,0.34),transparent_42%)]" />
    </div>
  );
}

function LoginScreen({
  isNativeShell,
  loading,
  onLogin
}: {
  isNativeShell: boolean;
  loading: boolean;
  onLogin: (
    account: string,
    providerStatuses: ProviderStatusItem[],
    defaultKeysBound: boolean
  ) => void;
}) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAccount = account.trim();

    if (!normalizedAccount || !password) {
      setError("请输入账号和密码。");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const loginResult = await authenticateMobileLogin(normalizedAccount, password);
      onLogin(loginResult.account, loginResult.providerStatuses, loginResult.defaultKeysBound);
    } catch (error) {
      setError(error instanceof Error ? error.message : "账号或密码不正确。");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在检查登录状态
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col justify-center px-6 pb-[calc(26px+env(safe-area-inset-bottom))] pt-3">
      <div className="mb-9">
        <img
          alt=""
          className="h-14 w-14 rounded-[18px] object-cover shadow-[0_18px_36px_rgba(24,64,52,0.18)]"
          src="/app-icon.png"
        />
        <div className="mt-6 text-xs font-black text-moss">{isNativeShell ? "OMPC工作站" : "OPC Mobile"}</div>
        <h1 className="mt-1 text-[34px] font-black leading-10 tracking-normal text-ink">
          登录手机工作台
        </h1>
        <p className="mt-3 max-w-[300px] text-sm font-medium leading-6 text-muted">
          请输入分配给你的账号和密码。
        </p>
      </div>

      <form className="space-y-3" data-testid="mobile-login-form" onSubmit={submitLogin}>
        <label className="block">
          <span className="text-xs font-semibold text-muted">账号</span>
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.88)]">
            <UserRound className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoComplete="username"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
              data-testid="mobile-login-account"
              onChange={(event) => setAccount(event.target.value)}
              placeholder="请输入账号"
              value={account}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted">密码</span>
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.88)]">
            <LockKeyhole className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
              data-testid="mobile-login-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              type="password"
              value={password}
            />
          </div>
        </label>

        {error ? (
          <div
            className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-medium leading-5 text-ink"
            data-testid="mobile-login-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          className="flex h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#161817] text-sm font-black text-white shadow-[0_16px_34px_rgba(22,24,23,0.20)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-login-submit"
          disabled={busy}
          type="submit"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy ? "登录中" : "登录"}
        </button>
      </form>
    </section>
  );
}

function MobileHeader({
  activeTab,
  isNativeShell,
  onNotify
}: {
  activeTab: MobileTab;
  isNativeShell: boolean;
  onNotify: () => void;
}) {
  const titles: Record<MobileTab, string> = {
    home: "今日工作台",
    collect: "趋势采集",
    knowledge: "知识库",
    create: "创作项目",
    settings: "设置"
  };

  return (
    <header className="relative overflow-hidden bg-[rgba(251,247,237,0.82)] px-4 pb-3.5 pt-[calc(12px+env(safe-area-inset-top))] shadow-[0_8px_22px_rgba(31,58,49,0.05),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.70),rgba(255,255,255,0.22)_48%,rgba(210,230,216,0.20))]"
      />
      <div className="relative flex items-center justify-between gap-3">
        {isNativeShell ? (
          <div
            aria-hidden="true"
            className={`${MOBILE_HEADER_ICON_BUTTON_CLASS} pointer-events-none opacity-0`}
          />
        ) : (
          <button
            aria-label="返回 PC 工作台"
            className={MOBILE_HEADER_ICON_BUTTON_CLASS}
            onClick={() => {
              window.location.href = getPcReturnHref();
            }}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black text-moss">
            {isNativeShell ? "OMPC工作站" : "OPC Mobile"}
          </div>
          <h1 className="truncate text-[25px] font-black leading-8">{titles[activeTab]}</h1>
        </div>
        <button
          aria-label="查看通知状态"
          className={MOBILE_HEADER_ICON_BUTTON_CLASS}
          onClick={onNotify}
          title="通知状态"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function HomeScreen({
  onAction,
  onChangeTab
}: {
  onAction: (message: string) => void;
  onChangeTab: (tab: MobileTab, message?: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#a8c7ae]/[0.20] blur-2xl" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(236,244,237,0.58))]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-muted">
              当前流程
            </span>
            <div className="text-right">
              <div className="text-[24px] font-black leading-8 text-moss">采集优先</div>
              <div className="mt-1 text-[11px] font-bold text-muted">人工确认发布</div>
            </div>
          </div>
          <h2 className="mt-5 text-[29px] font-black leading-9">先采集，再创作</h2>
          <p className="mt-2 max-w-[240px] text-sm font-medium leading-6 text-ink/[0.68]">
            先补高赞参考，再启动草稿和封面，发布仍由人工确认。
          </p>
        </div>
        <button
          className="relative mt-5 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#2f9a55] text-sm font-black text-white shadow-[0_16px_34px_rgba(47,154,85,0.24)] active:scale-[0.99]"
          onClick={() => onChangeTab("create", "已打开创作项目页，可以选择项目开始生成。")}
          type="button"
        >
          <PenLine className="h-4 w-4" />
          查看创作预览
        </button>
      </section>

      <MobilePanel title="快捷入口">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Radar className="h-5 w-5" />, label: "采集管理", tab: "collect" as const },
            { icon: <PenLine className="h-5 w-5" />, label: "创作项目", tab: "create" as const },
            { icon: <BookOpenText className="h-5 w-5" />, label: "知识库", tab: "knowledge" as const },
            { icon: <Settings className="h-5 w-5" />, label: "系统设置", tab: "settings" as const }
          ].map((item) => (
            <button
              className="flex min-h-[86px] touch-manipulation flex-col items-center justify-center gap-2 rounded-[24px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] text-xs font-black text-ink shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.98]"
              key={item.label}
              onClick={() => onChangeTab(item.tab)}
              type="button"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#e7f2ea] text-moss">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="历史草稿" action="草稿入口">
        <button
          className="flex w-full touch-manipulation gap-3 rounded-[26px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] p-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
          onClick={() => onChangeTab("create", "已打开历史草稿入口。")}
          type="button"
        >
          <div
            aria-hidden="true"
            className="h-[88px] w-[88px] shrink-0 rounded-[20px] bg-cover bg-center"
            style={{ backgroundImage: `url(${MOBILE_CREATE_CARD_BG})` }}
          />
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full bg-[#e7f2ea] px-2 py-1 text-[10px] font-black text-moss">草稿</div>
            <h3 className="mt-2 text-sm font-black leading-5">查看已生成的图文草稿</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
              <span className="rounded-full bg-white/[0.78] px-2 py-1">封面预览</span>
              <span className="rounded-full bg-white/[0.78] px-2 py-1">复制文案</span>
              <span className="rounded-full bg-white/[0.78] px-2 py-1">人工确认</span>
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 text-muted" />
        </button>
      </MobilePanel>

      <MobilePanel
        title="今日待办"
        action={
          <button
            className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
            onClick={() => onAction("今日待办已展开，所有入口都可以继续处理。")}
            type="button"
          >
            全部
          </button>
        }
      >
        <div className="space-y-2">
          {workItems.map((item) => (
            <TaskRow
              key={item.label}
              icon={<item.icon className="h-4 w-4" />}
              label={item.label}
              onClick={() => onChangeTab(item.tab)}
              state={item.state}
              testId={`task-${item.tab}`}
            />
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="生产节奏">
        <div className="mb-3 grid grid-cols-3 gap-2">
          {quickMetrics.map((metric) => (
            <Metric
              key={metric.label}
              label={metric.label}
              onClick={() => onChangeTab(metric.tab)}
              testId={`metric-${metric.tab}`}
              tone={metric.tone}
              value={metric.value}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {progressSteps.map((step) => (
            <StepTile
              key={step.label}
              icon={<step.icon className="h-4 w-4" />}
              label={step.label}
              onClick={() => onChangeTab(step.tab)}
              state={step.state}
              testId={`step-${step.tab}`}
            />
          ))}
        </div>
      </MobilePanel>
    </div>
  );
}

function CollectScreen({
  credentials,
  onAction
}: {
  credentials: CredentialSettings;
  onAction: (message: string) => void;
}) {
  const [platform, setPlatform] = useState<MobilePlatform>("xiaohongshu");
  const [query, setQuery] = useState("硕升博 高赞图文");
  const [maxItems, setMaxItems] = useState(20);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<number | null>(null);
  const [activeCollectionJobId, setActiveCollectionJobId] = useState<number | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState("定时采集未启用。");
  const [diagnosticItems, setDiagnosticItems] = useState<CollectionJobDiagnosticItem[]>([]);
  const [sourceReviewed, setSourceReviewed] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkResult, setLinkResult] = useState<LinkImportTarget | null>(null);
  const [selectedReference, setSelectedReference] = useState(sampleReferences[0].title);
  const [referencePreview, setReferencePreview] = useState<(typeof sampleReferences)[number] | null>(null);
  const [busyAction, setBusyAction] = useState<"digest" | "job" | "link" | "search" | null>(null);
  const scheduleRunningRef = useRef(false);
  const collectedMetricValue =
    diagnosticItems.find((item) => item.label === "已采集")?.value ?? "0";

  useEffect(() => {
    try {
      const stored = readMobileStorage(COLLECTION_SCHEDULE_STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as Partial<CollectionScheduleStorage>;
      if (parsed.platform === "xiaohongshu" || parsed.platform === "douyin") {
        setPlatform(parsed.platform);
      }
      if (typeof parsed.keyword === "string" && parsed.keyword.trim()) {
        setQuery(parsed.keyword);
      }
      if (typeof parsed.maxItems === "number") {
        setMaxItems(parsed.maxItems);
      }
      if (typeof parsed.intervalMinutes === "number") {
        setIntervalMinutes(parsed.intervalMinutes);
      }
      setAutoEnabled(Boolean(parsed.autoEnabled));
      setNextRunAt(parsed.nextRunAt ?? null);
      setLastRunAt(parsed.lastRunAt ?? null);
      setLastJobId(parsed.lastJobId ?? null);
      setScheduleMessage(parsed.scheduleMessage ?? "已读取定时采集配置。");
    } catch (_error) {
      setScheduleMessage("定时采集配置读取失败，请重新保存。");
    }
  }, []);

  useEffect(() => {
    const payload: CollectionScheduleStorage = {
      autoEnabled,
      intervalMinutes,
      keyword: query,
      lastJobId,
      lastRunAt,
      maxItems,
      nextRunAt,
      platform,
      scheduleMessage
    };
    writeMobileStorage(COLLECTION_SCHEDULE_STORAGE_KEY, JSON.stringify(payload));
  }, [
    autoEnabled,
    intervalMinutes,
    lastJobId,
    lastRunAt,
    maxItems,
    nextRunAt,
    platform,
    query,
    scheduleMessage
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!autoEnabled || !nextRunAt || scheduleRunningRef.current) {
        return;
      }
      if (Date.now() < new Date(nextRunAt).getTime()) {
        return;
      }
      void runCollectionJob("schedule");
    }, 10000);
    return () => window.clearInterval(timer);
  }, [autoEnabled, nextRunAt, platform, query, maxItems, intervalMinutes, credentials]);

  useEffect(() => {
    if (lastJobId || activeCollectionJobId !== null || !credentials.workspaceToken.trim()) {
      return undefined;
    }

    let cancelled = false;

    async function restoreLatestJob() {
      try {
        const job = await fetchLatestCollectionJob();
        if (cancelled || !job) {
          return;
        }
        setLastJobId(job.id);
        setLastRunAt(job.updated_at ?? job.created_at ?? null);
        setScheduleMessage(formatCollectionJobStatus(job, "mobile"));
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (isActiveCollectionJob(job)) {
          setActiveCollectionJobId(job.id);
        }
      } catch {
        // No saved mobile job yet, or the current account cannot read collection history.
      }
    }

    void restoreLatestJob();

    return () => {
      cancelled = true;
    };
  }, [activeCollectionJobId, credentials.workspaceToken, lastJobId]);

  useEffect(() => {
    if (!lastJobId || activeCollectionJobId !== null) {
      return undefined;
    }

    let cancelled = false;

    async function refreshLastJob() {
      try {
        const job = await fetchCollectionJobStatus(lastJobId as number);
        if (cancelled) {
          return;
        }
        setScheduleMessage(formatCollectionJobStatus(job, "mobile"));
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (isActiveCollectionJob(job)) {
          setActiveCollectionJobId(job.id);
        }
      } catch {
        // The user can still create a fresh collection task if the old job no longer exists.
      }
    }

    void refreshLastJob();

    return () => {
      cancelled = true;
    };
  }, [activeCollectionJobId, credentials.workspaceToken, lastJobId]);

  useEffect(() => {
    if (activeCollectionJobId === null) {
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function pollCollectionJob() {
      try {
        const job = await fetchCollectionJobStatus(activeCollectionJobId as number);
        if (cancelled) {
          return;
        }
        const message = formatCollectionJobStatus(job, "mobile");
        setScheduleMessage(message);
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (!isActiveCollectionJob(job)) {
          setActiveCollectionJobId(null);
          onAction(message);
          return;
        }
        timer = window.setTimeout(pollCollectionJob, 3000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setScheduleMessage(error instanceof Error ? error.message : "采集状态刷新失败。");
        setDiagnosticItems([]);
        timer = window.setTimeout(pollCollectionJob, 5000);
      }
    }

    timer = window.setTimeout(pollCollectionJob, 800);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [activeCollectionJobId, credentials.workspaceToken, onAction]);

  function formatScheduleTime(value: string | null) {
    if (!value) {
      return "未安排";
    }
    return new Date(value).toLocaleString("zh-CN", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit"
    });
  }

  function scheduleNextRun(fromDate = new Date()) {
    const safeInterval = Number.isFinite(intervalMinutes) ? Math.max(5, intervalMinutes) : 60;
    const nextDate = new Date(fromDate.getTime() + safeInterval * 60_000);
    setNextRunAt(nextDate.toISOString());
    return nextDate;
  }

  async function fetchLatestCollectionJob() {
    const response = await fetch(`${API_BASE}/trends/jobs?limit=1`, {
      headers: authHeaders(credentials)
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "最近采集状态读取失败。"));
    }
    const jobs = (await response.json()) as MobileCollectionJob[];
    return jobs[0] ?? null;
  }

  async function fetchCollectionJobStatus(jobId: number) {
    const response = await fetch(`${API_BASE}/trends/jobs/${jobId}`, {
      headers: authHeaders(credentials)
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "采集状态刷新失败。"));
    }
    return (await response.json()) as MobileCollectionJob;
  }

  function saveSchedule() {
    if (!query.trim()) {
      onAction("先填写关键词，再保存定时采集设置。");
      return;
    }
    const nextDate = autoEnabled ? scheduleNextRun() : null;
    if (!autoEnabled) {
      setNextRunAt(null);
      setScheduleMessage("定时采集已保存，但当前未启用。");
      onAction("定时采集已保存，当前未启用。");
      return;
    }
    const message = `定时采集已启用，下次运行：${formatScheduleTime(nextDate?.toISOString() ?? null)}。`;
    setScheduleMessage(message);
    onAction(message);
  }

  async function openSearchPage() {
    const keyword = query.trim();
    if (!keyword) {
      onAction("先填关键词，再打开平台搜索。");
      return;
    }

    const searchUrl =
      platform === "xiaohongshu"
        ? `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`
        : `https://www.douyin.com/search/${encodeURIComponent(keyword)}`;
    window.open(searchUrl, "_blank", "noopener,noreferrer");
    onAction(`已打开${platform === "xiaohongshu" ? "小红书" : "抖音"}搜索：${keyword}`);
  }

  async function runCollectionJob(source: "manual" | "schedule") {
    const keyword = query.trim();
    if (!keyword) {
      onAction("先填关键词，再开始采集。");
      return;
    }

    scheduleRunningRef.current = true;
    setBusyAction("job");
    const startedAt = new Date();
    const runLabel = source === "schedule" ? "定时采集" : "立即采集";
    onAction(`${runLabel}正在准备采集。`);
    try {
      const response = await fetch(`${API_BASE}/trends/jobs`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          platform,
          keyword,
          content_kind: "image_text",
          max_items: maxItems,
          min_delay_seconds: 4,
          max_delay_seconds: 12,
          operator_wait_seconds: 30,
          session_label: platform,
          persist_session: true,
          persist_cookies: true
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "开始采集失败。"));
      }
      const data = (await response.json()) as MobileCollectionJob;
      const nextDate = autoEnabled ? scheduleNextRun(startedAt) : null;
      setLastJobId(data.id);
      setLastRunAt(startedAt.toISOString());
      setActiveCollectionJobId(data.id);
      setDiagnosticItems(collectionJobDiagnosticItems(data));
      const message = `${runLabel}已开始，${formatCollectionJobStatus(data, "mobile")}${
        nextDate ? ` 下次运行：${formatScheduleTime(nextDate.toISOString())}。` : ""
      }`;
      setScheduleMessage(message);
      onAction(message);
    } catch (error) {
      const nextDate = autoEnabled ? scheduleNextRun(startedAt) : null;
      const message = error instanceof Error ? error.message : "开始采集失败。";
      setScheduleMessage(
        `${runLabel}失败：${message}${nextDate ? ` 下次重试：${formatScheduleTime(nextDate.toISOString())}。` : ""}`
      );
      setDiagnosticItems([]);
      onAction(message);
    } finally {
      scheduleRunningRef.current = false;
      setBusyAction(null);
    }
  }

  async function parseLinks() {
    if (platform !== "xiaohongshu") {
      onAction("链接导入当前只支持小红书；抖音请用关键词采集。");
      return;
    }
    if (!linkText.trim()) {
      onAction("先粘贴小红书分享文本或链接。");
      return;
    }

    setBusyAction("link");
    onAction("正在解析小红书链接。");
    try {
      const response = await fetch(`${API_BASE}/trends/link-import-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: linkText,
          max_links: 10,
          download_media: false,
          persist_cookies: false
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "链接解析失败。"));
      }
      const data = (await response.json()) as LinkImportTarget;
      setLinkResult(data);
      onAction(`已解析 ${data.extracted_count} 个链接，可导入 ${data.accepted_count} 个。`);
    } catch (error) {
      onAction(error instanceof Error ? error.message : "链接解析失败。");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveKnowledgeDigest() {
    const keyword = query.trim();
    if (!keyword) {
      onAction("先填关键词，再保存知识摘要。");
      return;
    }
    if (!sourceReviewed) {
      onAction("先勾选“来源已人工确认”，再保存知识摘要。");
      return;
    }

    setBusyAction("digest");
    onAction("正在从采集素材生成知识摘要。");
    try {
      const response = await fetch(`${API_BASE}/trends/knowledge-digest`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          platform,
          keyword,
          limit: maxItems,
          category: "trend-insight",
          source_reviewed: true
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "知识摘要生成失败。"));
      }
      const data = (await response.json()) as { item_count: number; knowledge_id: number };
      onAction(`知识条目 #${data.knowledge_id} 已生成，来源素材 ${data.item_count} 条。`);
    } catch (error) {
      onAction(error instanceof Error ? error.message : "知识摘要生成失败。");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="relative mt-10 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-4 shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(232,240,232,0.62))]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-black leading-6">定时采集任务</h2>
            <span className="rounded-full bg-[#e7f2ea]/[0.95] px-3 py-1.5 text-[11px] font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              {autoEnabled ? "运行中" : "待开启"}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-[26px] border border-white/[0.82] bg-[rgba(255,253,247,0.82)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#e7f2ea] text-moss">
              <Radar className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black">高赞图文采集</div>
              <div className="mt-1 text-xs font-semibold text-muted">每 {intervalMinutes} 分钟执行一次</div>
            </div>
            <button
              className="h-9 shrink-0 rounded-full bg-[#2f9a55] px-3 text-xs font-black text-white shadow-[0_10px_22px_rgba(47,154,85,0.20)] active:scale-[0.98]"
              onClick={() => onAction("定时采集任务详情已展开，可以继续修改周期和来源。")}
              type="button"
            >
              查看详情
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[#ded6c7] rounded-[24px] bg-[rgba(255,253,247,0.72)] px-2 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="px-2 text-center">
              <div className="text-lg font-black text-ink">{maxItems}</div>
              <div className="mt-1 text-[10px] font-bold text-muted">今日目标</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-lg font-black text-ink">{collectedMetricValue}</div>
              <div className="mt-1 text-[10px] font-bold text-muted">已采集</div>
            </div>
            <div className="min-w-0 px-2 text-center">
              <div className="truncate text-sm font-black leading-6 text-ink">{formatScheduleTime(nextRunAt)}</div>
              <div className="mt-1 text-[10px] font-bold text-muted">下次执行</div>
            </div>
          </div>
        </div>
      </section>
      <MobilePanel
        title="定时采集任务"
        action={<span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss">{autoEnabled ? "运行中" : "可启用"}</span>}
      >
        <label className="mb-3 flex items-start gap-3 rounded-[26px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-3.5 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
          <input
            checked={autoEnabled}
            className="mt-1 h-4 w-4"
            data-testid="mobile-auto-collect-enabled"
            onChange={(event) => setAutoEnabled(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block font-semibold">启用定时采集</span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              页面保持打开时会按间隔自动开始采集，不参与一键生成。
            </span>
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">关键词</span>
          <div className="mt-2 flex min-h-12 items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              aria-label="采集关键词"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none"
              data-testid="mobile-collect-query"
              onChange={(event) => setQuery(event.target.value)}
              value={query}
            />
          </div>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeChip
            active={platform === "xiaohongshu"}
            label={
              <span className="flex items-center justify-center gap-2">
                <PlatformIcon platform="xiaohongshu" size="sm" />
                小红书
              </span>
            }
            onClick={() => {
              setPlatform("xiaohongshu");
              onAction("已切换到小红书图文采集。");
            }}
            testId="platform-xiaohongshu"
          />
          <ModeChip
            active={platform === "douyin"}
            label={
              <span className="flex items-center justify-center gap-2">
                <PlatformIcon platform="douyin" size="sm" />
                抖音图文
              </span>
            }
            onClick={() => {
              setPlatform("douyin");
              onAction("已切换到抖音图文采集。");
            }}
            testId="platform-douyin"
          />
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted">最大采集条数</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-[#d6e8df] bg-white px-4 text-sm font-medium text-ink outline-none"
            data-testid="mobile-max-items"
            max={100}
            min={1}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setMaxItems(Number.isFinite(nextValue) ? nextValue : 20);
            }}
            type="number"
            value={maxItems}
          />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted">采集间隔（分钟）</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-[#d6e8df] bg-white px-4 text-sm font-medium text-ink outline-none"
            data-testid="mobile-collect-interval"
            max={1440}
            min={5}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setIntervalMinutes(Number.isFinite(nextValue) ? nextValue : 60);
            }}
            type="number"
            value={intervalMinutes}
          />
        </label>
        <div className="mt-3 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-3 text-xs leading-5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
          <div>{scheduleMessage}</div>
          {diagnosticItems.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2" data-testid="mobile-collection-diagnostic-grid">
              {diagnosticItems.map((item) => (
                <div
                  className={`rounded-[16px] border px-3 py-2 ${mobileDiagnosticToneClass(item.tone)}`}
                  data-tone={item.tone}
                  key={`${item.label}-${item.value}`}
                >
                  <div className="text-[11px] text-muted">{item.label}</div>
                  <div className="mt-1 truncate text-xs font-black text-ink">{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}
          <div>下次运行：{formatScheduleTime(nextRunAt)}</div>
          <div>
            上次运行：{formatScheduleTime(lastRunAt)}
            {activeCollectionJobId ? "，正在追踪进度" : lastJobId ? "，已开始" : ""}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-semibold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
            data-testid="mobile-save-schedule"
            onClick={saveSchedule}
            type="button"
          >
            <Save className="h-4 w-4" />
            保存定时
          </button>
          <button
            className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#23854f] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(35,133,79,0.18)] active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-run-collection-now"
            disabled={busyAction === "job"}
            onClick={() => void runCollectionJob("manual")}
            type="button"
          >
            {busyAction === "job" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {busyAction === "job" ? "运行中" : "立即运行"}
          </button>
        </div>
        <button
          className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-semibold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
          data-testid="mobile-open-search"
          onClick={openSearchPage}
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
          手动打开搜索页
        </button>
        <label className="mt-3 flex items-start gap-3 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
          <input
            checked={sourceReviewed}
            className="mt-1 h-4 w-4"
            data-testid="mobile-source-reviewed"
            onChange={(event) => setSourceReviewed(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block font-semibold">来源已人工确认</span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              保存知识摘要前需要确认来源真实公开、可引用。
            </span>
          </span>
        </label>
        <button
          className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-semibold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-save-digest"
          disabled={busyAction === "digest"}
          onClick={saveKnowledgeDigest}
          type="button"
        >
          {busyAction === "digest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busyAction === "digest" ? "保存中" : "保存知识摘要"}
        </button>
      </MobilePanel>

      <MobilePanel title="手动采集">
        <textarea
          className="min-h-24 w-full resize-y rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-3 text-sm leading-6 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none"
          data-testid="mobile-link-text"
          onChange={(event) => setLinkText(event.target.value)}
          placeholder="粘贴小红书分享文本或链接"
          value={linkText}
        />
        <button
          className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#23854f] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(35,133,79,0.18)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-parse-links"
          disabled={busyAction === "link"}
          onClick={parseLinks}
          type="button"
        >
          {busyAction === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busyAction === "link" ? "解析中" : "解析链接"}
        </button>
        {linkResult ? (
          <div className="mt-3 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-3 text-xs leading-5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
            已解析 {linkResult.extracted_count} 个链接，可导入 {linkResult.accepted_count} 个。
          </div>
        ) : null}
      </MobilePanel>

      <MobilePanel title="采集来源">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <CheckCircle2 className="h-4 w-4" />, label: "高赞榜单" },
            { icon: <PenLine className="h-4 w-4" />, label: "热门话题" },
            { icon: <UserRound className="h-4 w-4" />, label: "关注账号" },
            { icon: <ExternalLink className="h-4 w-4" />, label: "自定义链接" }
          ].map((item) => (
            <button
              className="flex min-h-[76px] touch-manipulation flex-col items-center justify-center gap-2 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] text-[11px] font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.98]"
              key={item.label}
              onClick={() => onAction(`已选择采集来源：${item.label}`)}
              type="button"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-[#e7f2ea] text-moss">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="结构模板">
        <div className="space-y-3">
          {sampleReferences.map((item, index) => (
            <button
              aria-pressed={selectedReference === item.title}
              key={item.title}
              className={[
                "block w-full touch-manipulation rounded-[22px] border bg-white p-3 text-left active:scale-[0.99]",
                selectedReference === item.title ? "border-moss ring-2 ring-moss/[0.15]" : "border-[#d6e8df]"
              ].join(" ")}
              data-testid={`reference-${index}`}
              onClick={() => {
                setSelectedReference(item.title);
                setReferencePreview(item);
                onAction(`已打开参考预览：${item.title}`);
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted">{item.meta}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-muted" />
              </div>
              <div className="mt-3 rounded-md bg-[#fff6e3] px-3 py-2 text-xs font-medium text-[#8a5d16]">
                {item.cue}
              </div>
            </button>
          ))}
        </div>
      </MobilePanel>
      {referencePreview ? (
        <ReferencePreviewSheet
          reference={referencePreview}
          onClose={() => {
            setReferencePreview(null);
            onAction("已关闭参考预览。");
          }}
        />
      ) : null}
    </div>
  );
}

function KnowledgeScreen({ onAction }: { onAction: (message: string) => void }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("正在读取最近入库内容...");

  async function loadKnowledge(nextQuery = query, announce = false) {
    const normalizedQuery = nextQuery.trim();
    setLoading(true);
    setStatus(normalizedQuery ? "正在搜索知识库..." : "正在读取最近入库内容...");
    try {
      const data = await fetchKnowledgeItems(API_BASE, {
        limit: 20,
        query: normalizedQuery
      });
      setItems(data);
      const nextStatus = data.length
        ? normalizedQuery
          ? `找到 ${data.length} 条相关知识。`
          : `已显示最近 ${data.length} 条知识。`
        : normalizedQuery
          ? "没有找到匹配知识，可以换个关键词。"
            : "知识库还没有条目，先从采集页保存知识摘要。";
      setStatus(nextStatus);
      if (announce) {
        onAction(nextStatus);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "知识库读取失败，请稍后再试。";
      setItems([]);
      setStatus(message);
      if (announce) {
        onAction(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKnowledge("");
  }, []);

  async function copyKnowledgeItem(item: KnowledgeItem) {
    try {
      await copyText(`${item.title}\n\n${item.content}`);
      onAction("知识条目已复制到剪贴板。");
    } catch (error) {
      onAction(error instanceof Error ? error.message : "复制失败，请手动选择内容。");
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadKnowledge(query, true);
  }

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#70b47d]/[0.18] blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">已入库素材</div>
              <h2 className="mt-1 text-[28px] font-black leading-8">知识库</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">
                查看采集后保存的知识摘要，创作时优先引用这里的事实。
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/[0.84] bg-[#e7f2ea] text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
              <BookOpenText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-[rgba(255,255,255,0.72)] px-3 py-3">
              <div className="text-[20px] font-black text-ink">{items.length}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">当前显示</div>
            </div>
            <div className="rounded-[22px] bg-[#e7f2ea]/[0.82] px-3 py-3">
              <div className="text-[20px] font-black text-moss">{query.trim() ? "搜索" : "最近"}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">查看模式</div>
            </div>
          </div>
        </div>
      </section>

      <MobilePanel title="搜索知识库">
        <form className="space-y-3" onSubmit={submitSearch}>
          <label className="block">
            <span className="text-xs font-bold text-muted">关键词</span>
            <div className="mt-2 flex h-[50px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
                data-testid="mobile-knowledge-search-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例如：水博 排名 学校"
                value={query}
              />
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#2f9a55] text-sm font-black text-white shadow-[0_14px_28px_rgba(47,154,85,0.22)] active:scale-[0.99] disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              搜索
            </button>
            <button
              className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.99] disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                setQuery("");
                void loadKnowledge("", true);
              }}
              type="button"
            >
              <BookOpenText className="h-4 w-4" />
              最近
            </button>
          </div>
          <p className="text-xs font-semibold leading-5 text-muted" data-testid="mobile-knowledge-status">
            {status}
          </p>
        </form>
      </MobilePanel>

      <MobilePanel action={`${items.length} 条`} title="知识条目">
        <div className="space-y-3" data-testid="mobile-knowledge-list">
          {items.map((item) => (
            <article
              className="rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] p-3 shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)]"
              data-testid="mobile-knowledge-item"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-moss">#{item.id}</div>
                  <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5">{item.title}</h3>
                </div>
                <span className="shrink-0 rounded-full bg-[#e7f2ea]/[0.92] px-2 py-1 text-[10px] font-black text-moss">
                  {item.category || "未分类"}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium leading-5 text-muted">
                {knowledgeItemExcerpt(item, 116)}
              </p>
              <button
                className="mt-3 flex h-9 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-white/[0.72] text-xs font-black text-ink active:scale-[0.99]"
                onClick={() => void copyKnowledgeItem(item)}
                type="button"
              >
                <Clipboard className="h-4 w-4" />
                复制条目
              </button>
            </article>
          ))}
          {!loading && items.length === 0 ? (
            <div className="rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-5 text-sm font-semibold leading-6 text-muted">
              这里还没有可以显示的知识。先到采集页确认来源，再保存知识摘要。
            </div>
          ) : null}
        </div>
      </MobilePanel>
    </div>
  );
}

function CreateScreen({
  credentials,
  onAction
}: {
  credentials: CredentialSettings;
  onAction: (message: string) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<MobileCreationProjectId | null>(null);
  const [platform, setPlatform] = useState<MobilePlatform>("xiaohongshu");
  const [contentMode, setContentMode] = useState<"short" | "xiaohongshu">("xiaohongshu");
  const [topic, setTopic] = useState("硕升博申请第一步，不是先套磁");
  const [targetAudience, setTargetAudience] = useState("准备硕升博申请的学生");
  const [tagsText, setTagsText] = useState("硕升博,水博,博士申请,小红书获客");
  const [visibleTopicPresets, setVisibleTopicPresets] = useState<GenerationTopicPreset[]>(() =>
    generationTopicPresets.slice(0, TOPIC_PRESET_ROTATION_SIZE)
  );
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedCover, setGeneratedCover] = useState<GeneratedImageAsset | null>(null);
  const [draftHistory, setDraftHistory] = useState<MobileDraftHistoryItem[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<number[]>([]);
  const [draftPreview, setDraftPreview] = useState<DraftPreviewState>(defaultMobileDraftPreview);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("准备中");
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressCeilingRef = useRef(88);
  const progressLabelRef = useRef("准备中");
  const lastProgressActionRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const completionSoundReadyRef = useRef(false);
  const coverImageUrl = generatedCover ? resolveAssetUrl(generatedCover.image_url) : null;
  const selectedProject = findEnabledMobileCreationProject(selectedProjectId);
  const todayDraftCount = countMobileDraftsToday(draftHistory);
  const selectedDraftIdSet = new Set(selectedDraftIds);
  const selectedDraftItems = draftHistory.filter((item) => selectedDraftIdSet.has(item.content.id));
  const selectionMode = selectedDraftIds.length > 0;

  function persistDraftHistory(nextItems: MobileDraftHistoryItem[]) {
    const normalized = normalizeMobileDraftHistory(nextItems);
    setDraftHistory(normalized);
    saveStoredMobileDraftHistory(normalized);
    return normalized;
  }

  function syncDraftIntoHistory(content: GeneratedContent, cover: GeneratedImageAsset | null) {
    const savedAt = content.created_at ?? new Date().toISOString();
    let normalized: MobileDraftHistoryItem[] = [];
    setDraftHistory((currentItems) => {
      normalized = normalizeMobileDraftHistory([
        {
          content,
          cover,
          pinned: false,
          saved_at: savedAt
        },
        ...currentItems
      ]);
      saveStoredMobileDraftHistory(normalized);
      return normalized;
    });
    return normalized;
  }

  function selectDraftHistoryItem(item: MobileDraftHistoryItem) {
    setGeneratedContent(item.content);
    setDraftPreview(draftStateFromContent(item.content));
    saveStoredMobileContent(item.content);
    if (item.cover) {
      setGeneratedCover(item.cover);
      saveStoredMobileCover(item.cover);
    } else {
      setGeneratedCover(null);
      clearStoredMobileCover();
    }
    setPreviewOpen(true);
    onAction(`已打开草稿：${item.content.title}`);
  }

  function toggleDraftSelection(item: MobileDraftHistoryItem) {
    setSelectedDraftIds((currentIds) =>
      currentIds.includes(item.content.id)
        ? currentIds.filter((contentId) => contentId !== item.content.id)
        : [...currentIds, item.content.id]
    );
  }

  function beginDraftSelection(item: MobileDraftHistoryItem) {
    setSelectedDraftIds((currentIds) =>
      currentIds.includes(item.content.id) ? currentIds : [...currentIds, item.content.id]
    );
    onAction("已进入草稿多选模式。");
  }

  function openOrToggleDraftHistoryItem(item: MobileDraftHistoryItem) {
    if (selectionMode) {
      toggleDraftSelection(item);
      return;
    }
    selectDraftHistoryItem(item);
  }

  function cancelDraftSelection() {
    setSelectedDraftIds([]);
    onAction("已退出草稿多选模式。");
  }

  function applyMobileTopicPreset(preset: GenerationTopicPreset) {
    setTopic(preset.topic);
    setTargetAudience(preset.audience);
    setTagsText(preset.tags);
    onAction(`已套用推荐选题：${preset.topic}`);
  }

  function refreshMobileTopicPresets(manual = false) {
    setVisibleTopicPresets((currentPresets) =>
      pickGenerationTopicPresetBatch({
        currentTopic: topic,
        previousKeys: currentPresets.map((preset) => preset.key)
      })
    );
    if (manual) {
      onAction("已刷新推荐选题。");
    }
  }

  function toggleDraftPin(item: MobileDraftHistoryItem) {
    persistDraftHistory(
      draftHistory.map((draftItem) =>
        draftItem.content.id === item.content.id
          ? { ...draftItem, pinned: !draftItem.pinned, saved_at: new Date().toISOString() }
          : draftItem
      )
    );
    setSelectedDraftIds([]);
    onAction(item.pinned ? "已取消置顶草稿。" : "已置顶草稿。");
  }

  function applyDeletedDraftsToCurrentPreview(
    deletedIds: Set<number>,
    nextItems: MobileDraftHistoryItem[]
  ) {
    if (generatedContent && deletedIds.has(generatedContent.id)) {
      const nextItem = nextItems[0] ?? null;
      if (nextItem) {
        setGeneratedContent(nextItem.content);
        setDraftPreview(draftStateFromContent(nextItem.content));
        saveStoredMobileContent(nextItem.content);
        if (nextItem.cover) {
          setGeneratedCover(nextItem.cover);
          saveStoredMobileCover(nextItem.cover);
        } else {
          setGeneratedCover(null);
          clearStoredMobileCover();
        }
      } else {
        setGeneratedContent(null);
        setGeneratedCover(null);
        setDraftPreview(defaultMobileDraftPreview);
        clearStoredMobileContent();
        clearStoredMobileCover();
        setPreviewOpen(false);
      }
    }
  }

  async function deleteSelectedDraftHistoryItems(items: MobileDraftHistoryItem[]) {
    if (!items.length) {
      return;
    }

    const deletedIds: number[] = [];
    const failedIds: number[] = [];
    let failureMessage = "草稿删除失败，请稍后再试。";

    for (const item of items) {
      try {
        const response = await fetch(`${API_BASE}/content/${item.content.id}`, {
          headers: authHeaders(credentials),
          method: "DELETE"
        });
        if (!response.ok && response.status !== 404) {
          throw new Error(await readApiError(response, failureMessage));
        }
        rememberDeletedDraftId(item.content.id);
        deletedIds.push(item.content.id);
      } catch (error) {
        failedIds.push(item.content.id);
        failureMessage = error instanceof Error ? error.message : failureMessage;
      }
    }

    if (deletedIds.length) {
      const deletedIdSet = new Set(deletedIds);
      const nextItems = persistDraftHistory(
        draftHistory.filter((draftItem) => !deletedIdSet.has(draftItem.content.id))
      );
      applyDeletedDraftsToCurrentPreview(deletedIdSet, nextItems);
    }

    setSelectedDraftIds(failedIds);
    if (failedIds.length) {
      onAction(`已删除 ${deletedIds.length} 篇，${failedIds.length} 篇失败：${failureMessage}`);
      return;
    }
    onAction(`已删除 ${deletedIds.length} 篇草稿，刷新后也不会再出现。`);
  }

  useEffect(() => {
    const visibleDraftIds = new Set(draftHistory.map((item) => item.content.id));
    setSelectedDraftIds((currentIds) => {
      const nextIds = currentIds.filter((contentId) => visibleDraftIds.has(contentId));
      return nextIds.length === currentIds.length ? currentIds : nextIds;
    });
  }, [draftHistory]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshMobileTopicPresets();
    }, TOPIC_PRESET_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [topic]);

  useEffect(() => {
    let active = true;
    let coverHydrationRetryTimer: number | null = null;

    async function fetchLatestCover(contentId: number) {
      try {
        const response = await fetch(`${API_BASE}/image/list?content_id=${contentId}&limit=1`);
        if (!response.ok) {
          return null;
        }

        const images: unknown = await response.json();
        if (!Array.isArray(images)) {
          return null;
        }

        return images.find(
          (image): image is GeneratedImageAsset =>
            isGeneratedImageAsset(image) && image.content_id === contentId
        ) ?? null;
      } catch (_error) {
        return null;
      }
    }

    function applyHistoryCover(latestCover: GeneratedImageAsset) {
      setDraftHistory((currentItems) => {
        const normalized = normalizeMobileDraftHistory(
          currentItems.map((item) =>
            item.content.id === latestCover.content_id ? { ...item, cover: latestCover } : item
          )
        );
        saveStoredMobileDraftHistory(normalized);
        return normalized;
      });
    }

    async function loadLatestCover(contentId: number) {
      try {
        const latestCover = await fetchLatestCover(contentId);
        if (active && latestCover) {
          setGeneratedCover(latestCover);
          saveStoredMobileCover(latestCover);
          applyHistoryCover(latestCover);
          onAction("已找回最近封面图。");
        }
      } catch (_error) {
        // Keep the cached cover visible if the network check fails.
      }
    }

    function scheduleMissingCoverRetry(items: MobileDraftHistoryItem[], attempt: number) {
      if (!active || attempt >= MOBILE_COVER_HYDRATION_RETRY_LIMIT) {
        return;
      }

      if (coverHydrationRetryTimer !== null) {
        window.clearTimeout(coverHydrationRetryTimer);
      }

      coverHydrationRetryTimer = window.setTimeout(() => {
        coverHydrationRetryTimer = null;
        if (!active) {
          return;
        }

        const latestStoredHistory = readStoredMobileDraftHistory().filter(
          (item) => item.content.platform === platform
        );
        const retryItems = latestStoredHistory.length ? latestStoredHistory : items;
        void hydrateMissingHistoryCovers(retryItems, attempt + 1);
      }, MOBILE_COVER_HYDRATION_RETRY_MS);
    }

    async function hydrateMissingHistoryCovers(items: MobileDraftHistoryItem[], attempt = 0) {
      const missingCoverIds = items
        .filter((item) => !item.cover)
        .map((item) => item.content.id)
        .slice(0, 20);
      if (!missingCoverIds.length) {
        return;
      }

      const covers = (await Promise.all(missingCoverIds.map(fetchLatestCover))).filter(
        (cover): cover is GeneratedImageAsset => Boolean(cover)
      );
      if (!active) {
        return;
      }
      if (!covers.length) {
        scheduleMissingCoverRetry(items, attempt);
        return;
      }

      const coverByContentId = new Map(covers.map((cover) => [cover.content_id, cover]));
      const stillMissingCover = missingCoverIds.some((contentId) => !coverByContentId.has(contentId));
      setDraftHistory((currentItems) => {
        const normalized = normalizeMobileDraftHistory(
          currentItems.map((item) => ({
            ...item,
            cover: item.cover ?? coverByContentId.get(item.content.id) ?? null
          }))
        );
        saveStoredMobileDraftHistory(normalized);
        return normalized;
      });

      setGeneratedCover((currentCover) => {
        if (currentCover) {
          return currentCover;
        }
        const storedContent = readStoredMobileContent();
        const visibleContentId = storedContent && !readStoredDeletedDraftIds().has(storedContent.id)
          ? storedContent.id
          : null;
        const recoveredCover = visibleContentId ? coverByContentId.get(visibleContentId) : null;
        if (recoveredCover) {
          saveStoredMobileCover(recoveredCover);
          return recoveredCover;
        }
        return currentCover;
      });

      if (stillMissingCover) {
        scheduleMissingCoverRetry(items, attempt);
      }
    }

    async function loadLatestContent() {
      try {
        const response = await fetch(`${API_BASE}/content/list?platform=${platform}`);
        if (!response.ok) {
          return;
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          return;
        }

        const deletedDraftIds = readStoredDeletedDraftIds();
        const latestItems = data
          .filter(isGeneratedContent)
          .filter((content) => content.platform === platform)
          .filter((content) => !deletedDraftIds.has(content.id))
          .map((content) => ({
            content,
            cover: null,
            pinned: false,
            saved_at: content.created_at ?? new Date().toISOString()
          }));
        if (active && latestItems.length) {
          const storedCover = readStoredMobileCover();
          const currentHistory = readStoredMobileDraftHistory().filter(
            (item) => item.content.platform === platform
          );
          const normalized = normalizeMobileDraftHistory([...currentHistory, ...latestItems]);
          const latestContent = normalized[0].content;
          const latestCover =
            normalized.find((item) => item.content.id === latestContent.id)?.cover ?? null;
          setGeneratedContent(latestContent);
          setDraftPreview(draftStateFromContent(latestContent));
          saveStoredMobileContent(latestContent);
          if (storedCover?.content_id === latestContent.id) {
            setGeneratedCover(storedCover);
            const nextHistory = normalizeMobileDraftHistory(
              normalized.map((item) =>
                item.content.id === latestContent.id ? { ...item, cover: storedCover } : item
              )
            );
            setDraftHistory(nextHistory);
            saveStoredMobileDraftHistory(nextHistory);
          } else if (latestCover) {
            setGeneratedCover(latestCover);
            saveStoredMobileCover(latestCover);
            setDraftHistory(normalized);
            saveStoredMobileDraftHistory(normalized);
          } else {
            setGeneratedCover(null);
            setDraftHistory(normalized);
            saveStoredMobileDraftHistory(normalized);
          }
          void hydrateMissingHistoryCovers(normalized);
          void loadLatestCover(latestContent.id);
        }
      } catch (_error) {
        // The generate action below remains usable even if history cannot be loaded.
      }
    }

    const deletedDraftIds = readStoredDeletedDraftIds();
    const storedContent = readStoredMobileContent();
    const visibleStoredContent =
      storedContent && !deletedDraftIds.has(storedContent.id) ? storedContent : null;
    const storedCover = readStoredMobileCover();
    const storedHistory = readStoredMobileDraftHistory().filter(
      (item) => item.content.platform === platform
    );
    if (storedContent && !visibleStoredContent) {
      clearStoredMobileContent();
      clearStoredMobileCover();
    }
    if (visibleStoredContent?.platform === platform) {
      const normalized = normalizeMobileDraftHistory([
        {
          content: visibleStoredContent,
          cover: storedCover?.content_id === visibleStoredContent.id ? storedCover : null,
          pinned: false,
          saved_at: visibleStoredContent.created_at ?? new Date().toISOString()
        },
        ...storedHistory
      ]);
      setDraftHistory(normalized);
      void hydrateMissingHistoryCovers(normalized);
    } else {
      setDraftHistory(storedHistory);
      void hydrateMissingHistoryCovers(storedHistory);
    }
    if (visibleStoredContent?.platform === platform) {
      setGeneratedContent(visibleStoredContent);
      setDraftPreview(draftStateFromContent(visibleStoredContent));
      if (storedCover?.content_id === visibleStoredContent.id) {
        setGeneratedCover(storedCover);
      }
      void loadLatestCover(visibleStoredContent.id);
    }

    void loadLatestContent();
    return () => {
      active = false;
      if (coverHydrationRetryTimer !== null) {
        window.clearTimeout(coverHydrationRetryTimer);
      }
    };
  }, [platform, onAction]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.isSecureContext || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/opc-mobile-sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!busy || progressPercent <= 0) {
      return;
    }

    const message = `${progressLabel}：${progressPercent}%，切换页面也会继续运行。`;
    if (lastProgressActionRef.current === message) {
      return;
    }

    lastProgressActionRef.current = message;
    onAction(message);
  }, [busy, onAction, progressLabel, progressPercent]);

  function stopProgressTimer() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function setProgressStage(label: string, floor: number, ceiling: number) {
    progressLabelRef.current = label;
    progressCeilingRef.current = ceiling;
    setProgressLabel(label);
    setProgressPercent((current) => Math.max(current, floor));
  }

  function startProgress(label: string) {
    stopProgressTimer();
    progressLabelRef.current = label;
    progressCeilingRef.current = 62;
    lastProgressActionRef.current = "";
    setProgressLabel(label);
    setProgressPercent(3);
    progressTimerRef.current = setInterval(() => {
      setProgressPercent((current) => {
        const ceiling = progressCeilingRef.current;
        if (current >= ceiling) {
          return current;
        }
        const step = current < 30 ? 4 : current < 65 ? 3 : 1;
        const next = Math.min(ceiling, current + step);
        return next;
      });
    }, 700);
  }

  function finishProgress(label: string) {
    stopProgressTimer();
    progressLabelRef.current = label;
    setProgressLabel(label);
    setProgressPercent(100);
  }

  function getCompletionAudioContext() {
    if (typeof window === "undefined") {
      return null;
    }

    if (audioContextRef.current?.state === "closed") {
      audioContextRef.current = null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    return audioContextRef.current;
  }

  function playAudioUnlockTick(context: AudioContext) {
    const now = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.0001, now);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.03);
  }

  function playCompletionChime(context: AudioContext) {
    const now = context.currentTime;
    const notes = [
      { delay: 0, duration: 0.14, frequency: 659.25, volume: 0.22 },
      { delay: 0.15, duration: 0.16, frequency: 783.99, volume: 0.24 },
      { delay: 0.32, duration: 0.28, frequency: 1046.5, volume: 0.2 }
    ];

    notes.forEach((note) => {
      const startAt = now + note.delay;
      const gain = context.createGain();
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(note.volume, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + note.duration + 0.03);
    });
  }

  async function prepareCompletionFeedback() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const context = getCompletionAudioContext();
      if (context?.state === "suspended") {
        await context.resume();
      }
      if (context?.state === "running") {
        playAudioUnlockTick(context);
        completionSoundReadyRef.current = true;
      }
    } catch (_error) {
      audioContextRef.current = null;
      completionSoundReadyRef.current = false;
    }

    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  }

  async function playCompletionSound() {
    const context = getCompletionAudioContext();
    if (!context) {
      return false;
    }

    try {
      if (context.state === "suspended") {
        await context.resume();
      }
      if (context.state !== "running") {
        return false;
      }
      playCompletionChime(context);
      completionSoundReadyRef.current = true;
      return true;
    } catch (_error) {
      // Audio feedback is best-effort; completion status and notification still work.
      completionSoundReadyRef.current = false;
      return false;
    }
  }

  async function showCompletionNotification(content: GeneratedContent) {
    if ("Notification" in window && Notification.permission === "granted") {
      const title = "一键生成完成";
      const options: NotificationOptions = {
        body: "文案和封面图已生成。",
        icon: platform === "douyin" ? "/platform-icons/douyin.ico" : "/platform-icons/xiaohongshu.ico",
        tag: `opc-mobile-generation-${content.id}`
      };

      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration?.showNotification) {
            await registration.showNotification(title, options);
            return;
          }
        }

        new Notification(title, options);
      } catch (_error) {
        // Some mobile browsers only allow ServiceWorkerRegistration.showNotification().
      }
    }
  }

  async function notifyGenerationComplete(content: GeneratedContent) {
    const soundPlayed = await playCompletionSound();
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
    await showCompletionNotification(content);
    if (!soundPlayed && !completionSoundReadyRef.current) {
      onAction("已完成；提示音被浏览器拦截了，下次请先点一次一键生成按钮解锁声音。");
    }
  }

  async function generateDraftAndCover() {
    if (!topic.trim()) {
      onAction("先填写选题，再生成草稿。");
      return;
    }

    void prepareCompletionFeedback();
    setBusy(true);
    setGeneratedCover(null);
    clearStoredMobileCover();
    startProgress("撰稿服务生成中");
    try {
      const response = await fetch(`${API_BASE}/content/generate`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          platform,
          topic: topic.trim(),
          tone: contentMode === "xiaohongshu" ? xhsMobileDraftTone : shortPostDraftTone,
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
      setGeneratedContent(data);
      setDraftPreview(draftStateFromContent(data));
      saveStoredMobileContent(data);
      syncDraftIntoHistory(data, null);
      clearStoredMobileCover();
      setProgressStage("封面图生成中", 68, 94);

      const isDouyinPost = platform === "douyin";
      const baseCoverStyleNotes = isDouyinPost
        ? "抖音图文封面，强标题、高对比、真实学习/申请材料场景，避免录取承诺。"
        : "小红书高吸引封面，按选题轮换路线矩阵、决策地图、学术蓝图、杂志页、黑板批注或手机信息拼贴；水博/在职博士类可用榜单矩阵，但学校和项目细节必须来自已核实知识库，避免录取承诺。";
      const coverStyleNotes = buildTopicCoverStyleNotes(baseCoverStyleNotes, data.title);
      const imageResponse = await fetch(`${API_BASE}/image/generate`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          aspect_ratio: isDouyinPost ? "9:16" : "3:4",
          content_id: data.id,
          style_notes: coverStyleNotes,
          template: isDouyinPost ? "douyin-cover" : "xiaohongshu-cover"
        })
      });
      if (!imageResponse.ok) {
        throw new Error(
          `文案草稿已生成，但封面图失败：${await readApiError(imageResponse, "封面图生成失败。")}`
        );
      }
      const cover = (await imageResponse.json()) as GeneratedImageAsset;
      setGeneratedCover(cover);
      saveStoredMobileCover(cover);
      syncDraftIntoHistory(data, cover);
      finishProgress("已完成");
      void notifyGenerationComplete(data);
      onAction("文案和封面图已生成。");
    } catch (error) {
      stopProgressTimer();
      setProgressLabel("生成失败");
      onAction(
        sanitizeServiceErrorMessage(
          error instanceof Error ? error.message : "一键撰稿和封面生成失败。"
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    try {
      await copyText(buildEditableDraftCopy(draftPreview));
      onAction(generatedContent ? "已尝试复制当前草稿。" : "已尝试复制当前预览文案。");
      return true;
    } catch (_error) {
      onAction("复制失败，请长按正文区域手动选择复制。");
      return false;
    }
  }

  const heroProgressPercent = busy ? progressPercent : generatedContent ? 100 : 0;
  const heroProgressLabel = busy
    ? progressLabel
    : generatedContent
      ? "草稿和封面可继续编辑"
      : "点击下方按钮开始生成";
  const heroProgressValue = busy ? `${progressPercent}%` : generatedContent ? "已就绪" : "未开始";

  function enterProject(projectId: MobileCreationProjectId) {
    const project = findEnabledMobileCreationProject(projectId);
    if (!project) {
      onAction("这个项目还在规划中，暂时不能进入。");
      return;
    }
    setSelectedProjectId(project.id);
    onAction(`已进入${project.title}，可以开始生成图文和封面。`);
  }

  function returnToProjects() {
    setSelectedProjectId(null);
    onAction("已返回创作项目卡片。");
  }

  if (!selectedProject) {
    return (
      <MobileCreationProjectGateway
        draftCount={draftHistory.length}
        onSelect={enterProject}
        todayDraftCount={todayDraftCount}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        className="flex h-12 w-full touch-manipulation items-center justify-between rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-black text-ink shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
        data-testid="mobile-return-projects"
        onClick={returnToProjects}
        type="button"
      >
        <span className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          返回项目
        </span>
        <span className="text-xs text-muted">{selectedProject.title}</span>
      </button>
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.90)] p-4 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-85"
          style={{ backgroundImage: `url(${MOBILE_CREATE_CARD_BG})` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,244,0.94)_0%,rgba(255,252,244,0.76)_48%,rgba(255,252,244,0.36)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#ff2442]/[0.12] blur-2xl"
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">一键生产</div>
              <h2 className="mt-1 text-[25px] font-black leading-8">撰稿 + 封面图</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/[0.84] bg-[rgba(255,253,247,0.78)] text-[#ff2442] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-sm">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_74px] gap-2">
            <div className="rounded-[20px] border border-white/[0.84] bg-[rgba(255,253,247,0.76)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-sm">
              <div className="text-[11px] font-black text-ink/[0.45]">流程进度</div>
              <div className="mt-1 truncate text-xs font-black text-ink/[0.72]">{heroProgressLabel}</div>
            </div>
            <div className="flex items-center justify-center rounded-[20px] border border-[#ffdbe2] bg-[#fff5f7]/[0.86] text-center text-xs font-black text-[#a2152c] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-sm">
              {heroProgressValue}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-[#ff2442] transition-all duration-500"
              style={{ width: `${heroProgressPercent}%` }}
            />
          </div>
        </div>
      </section>
      <MobilePanel
        title="一键生成"
        action={<span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss">撰稿 + 封面</span>}
      >
        <label className="block">
          <span className="text-xs font-medium text-muted">选题</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none focus:border-moss focus:ring-2 focus:ring-moss/[0.15]"
            data-testid="mobile-topic"
            onChange={(event) => setTopic(event.target.value)}
            value={topic}
          />
        </label>
        <div className="mt-3" data-testid="mobile-topic-preset-list">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted">推荐选题</span>
            <button
              className="flex h-7 items-center gap-1 rounded-full border border-white/[0.9] bg-[rgba(255,253,247,0.82)] px-2 text-[11px] font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
              data-testid="mobile-topic-preset-refresh"
              onClick={() => refreshMobileTopicPresets(true)}
              type="button"
            >
              <Sparkles className="h-3 w-3" />
              换一批
            </button>
          </div>
          <div className="mt-1 text-[11px] font-medium text-muted">
            每 45 秒自动换一批，可自定义
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {visibleTopicPresets.map((preset) => (
              <button
                className="min-w-[128px] rounded-[18px] border border-white/[0.88] bg-[rgba(255,253,247,0.86)] px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] active:scale-[0.99]"
                data-testid={`mobile-topic-preset-${preset.key}`}
                key={preset.key}
                onClick={() => applyMobileTopicPreset(preset)}
                type="button"
              >
                <span className="block text-[11px] font-black text-moss">
                  {preset.mobileLabel}
                </span>
                <span className="mt-1 block text-xs font-black leading-4 text-ink">
                  {preset.topic}
                </span>
                <span className="mt-1 block text-[10px] font-medium text-muted">
                  {preset.mobileHelper}
                </span>
              </button>
            ))}
          </div>
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted">目标人群</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none focus:border-moss focus:ring-2 focus:ring-moss/[0.15]"
            data-testid="mobile-audience"
            onChange={(event) => setTargetAudience(event.target.value)}
            value={targetAudience}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeChip
            active={platform === "xiaohongshu"}
            label={<PlatformLabel className="justify-center" iconSize="sm" platform="xiaohongshu" />}
            onClick={() => {
              setPlatform("xiaohongshu");
              onAction("已切换到小红书生成。");
            }}
            testId="create-platform-xiaohongshu"
          />
          <ModeChip
            active={platform === "douyin"}
            label={
              <span className="flex items-center justify-center gap-2">
                <PlatformIcon platform="douyin" size="sm" />
                抖音
              </span>
            }
            onClick={() => {
              setPlatform("douyin");
              onAction("已切换到抖音生成。");
            }}
            testId="create-platform-douyin"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeChip
            active={contentMode === "xiaohongshu"}
            label={
              <PlatformLabel
                className="justify-center"
                iconSize="sm"
                platform="xiaohongshu"
                suffix="图文"
              />
            }
            onClick={() => {
              setContentMode("xiaohongshu");
              onAction("已切换到小红书图文版式。");
            }}
            testId="mode-xiaohongshu"
          />
          <ModeChip
            active={contentMode === "short"}
            label="短段正文"
            onClick={() => {
              setContentMode("short");
              onAction("已切换到短段正文版式。");
            }}
            testId="mode-short"
          />
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted">标签</span>
          <input
            className="mt-2 h-11 w-full rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none focus:border-moss focus:ring-2 focus:ring-moss/[0.15]"
            data-testid="mobile-tags"
            onChange={(event) => setTagsText(event.target.value)}
            value={tagsText}
          />
        </label>
        <button
          aria-label="一键完成撰稿和封面图"
          className="mt-4 flex h-[54px] w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#ff2442] text-sm font-black text-white shadow-[0_16px_34px_rgba(255,36,66,0.22)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-generate-draft"
          disabled={busy}
          onClick={generateDraftAndCover}
          type="button"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy
            ? `${progressLabel} ${progressPercent}%`
            : generatedContent
              ? "重新一键生成"
              : "一键撰稿+封面图"}
        </button>
        {busy || progressPercent === 100 || progressLabel === "生成失败" ? (
          <div className="mt-3" data-testid="mobile-generation-progress">
            <div className="h-2 overflow-hidden rounded-full bg-[#eadfd6]">
              <div
                className={[
                  "h-full rounded-full transition-all duration-500",
                  progressLabel === "生成失败" ? "bg-coral" : "bg-[#ff2442]"
                ].join(" ")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted">
              <span>{progressLabel}</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-[11px] leading-5 text-muted">
          会先生成文案，再自动生成封面图；不会自动发布。
        </p>
      </MobilePanel>

      <DraftHistoryCarousel
        activeContentId={generatedContent?.id ?? null}
        items={draftHistory}
        onLongPress={beginDraftSelection}
        onOpen={openOrToggleDraftHistoryItem}
        onToggleSelection={toggleDraftSelection}
        selectedDraftIds={selectedDraftIds}
        selectionMode={selectionMode}
      />

      {selectionMode ? (
        <DraftHistorySelectionBar
          onCancel={cancelDraftSelection}
          onDelete={() => deleteSelectedDraftHistoryItems(selectedDraftItems)}
          onPinToggle={() => {
            const item = selectedDraftItems[0] ?? null;
            if (selectedDraftItems.length === 1 && item) {
              toggleDraftPin(item);
            }
          }}
          selectedCount={selectedDraftItems.length}
          selectedItem={selectedDraftItems.length === 1 ? selectedDraftItems[0] : null}
        />
      ) : null}

      {previewOpen ? (
        <DraftPreviewEditor
          coverImageUrl={coverImageUrl}
          draft={draftPreview}
          generatedContent={generatedContent}
          onChange={setDraftPreview}
          onClose={() => setPreviewOpen(false)}
          onCopy={copyDraft}
          onExportStatus={onAction}
        />
      ) : null}
    </div>
  );
}

function MobileCreationProjectGateway({
  draftCount,
  onSelect,
  todayDraftCount
}: {
  draftCount: number;
  onSelect: (projectId: MobileCreationProjectId) => void;
  todayDraftCount: number;
}) {
  return (
    <div className="space-y-4" data-testid="mobile-creation-project-gateway">
      <section className="-mx-4 -mt-3 mb-[-8px] flex min-h-[260px] flex-col justify-end overflow-hidden px-8 pb-6 pt-20 text-center">
        <div className="mx-auto mb-2 h-1 w-28 rounded-full bg-[#5ea66b]/[0.60]" />
        <h2 className="text-[30px] font-black leading-9 text-ink drop-shadow-[0_1px_0_rgba(255,255,255,0.88)]">
          一键创建，高效出稿
        </h2>
        <p className="mt-2 text-[15px] font-semibold leading-6 text-ink/[0.58]">
          从灵感到草稿，只需一步
        </p>
      </section>

      <div className="space-y-3">
        {mobileCreationProjects.map((project) => (
          <button
            aria-label={`${project.enabled ? "进入" : "查看"}${project.title}${project.enabled ? "创作流程" : "规划状态"}`}
            className="flex min-h-[94px] w-full touch-manipulation items-center gap-3 rounded-[30px] border border-white/[0.90] bg-[rgba(255,253,247,0.93)] px-4 py-3.5 text-left shadow-[0_14px_34px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-sm active:scale-[0.99]"
            data-testid={`mobile-creation-project-${project.id}`}
            key={project.id}
            onClick={() => onSelect(project.id)}
            type="button"
          >
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] shadow-[0_14px_28px_rgba(31,58,49,0.14)] ring-1 ring-black/10"
            >
              <img alt="" className="h-full w-full object-cover" src={project.iconSrc} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-black leading-6">{project.title}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-muted">{project.category}</span>
            </span>
            <span
              className={[
                "inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-black",
                mobileCreationProjectActionClass(project.id, project.enabled)
              ].join(" ")}
            >
              {project.enabled ? "进入创作" : project.status}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </div>

      <MobilePanel
        title="项目状态"
        action={draftCount ? "已有草稿" : "待生成"}
      >
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "草稿总数", value: String(draftCount), tone: "text-moss" },
            { label: "项目数", value: String(mobileCreationProjects.length), tone: "text-[#e58a00]" },
            { label: "今日生成", value: String(todayDraftCount), tone: "text-[#1d72d2]" },
            { label: "已发布", value: "0", tone: "text-moss" }
          ].map((item) => (
            <div
              className="rounded-[20px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
              key={item.label}
            >
              <div className={`text-2xl font-black leading-7 ${item.tone}`}>{item.value}</div>
              <div className="mt-1 text-[10px] font-bold text-muted">{item.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-[20px] bg-[#fff6d8]/[0.78] px-3 py-2 text-xs font-medium leading-5 text-[#8a5d16]">
          发布仍需人工确认，不会自动发布，也不会伪造采集、图片或效果数据。
        </p>
      </MobilePanel>

    </div>
  );
}

function SettingsScreen({
  mobileAccount,
  onAction,
  onLogout,
  providerStatuses
}: {
  mobileAccount: string;
  onAction: (message: string) => void;
  onLogout: () => void;
  providerStatuses: ProviderStatusItem[];
}) {
  const providerBindings = providerBindingDefaultsFromStatuses(providerStatuses);
  const providerStatusLoaded = providerStatuses.length > 0;
  const providerSummary = !providerStatusLoaded
    ? "正在读取服务状态。"
    : providerBindings.draft && providerBindings.image && providerBindings.rewrite
      ? "默认服务已就绪，生成链路可直接使用。"
      : "默认服务未完整，请在电脑端工作台完成授权后再生成。";

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_16px_38px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-28"
          style={{ backgroundImage: `url(${MOBILE_COLLECTION_COLLAGE})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,244,0.96)_0%,rgba(255,252,244,0.88)_48%,rgba(255,252,244,0.70)_100%)]" />
        <div aria-hidden="true" className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#38bf6b]/[0.12] blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">当前账号</div>
              <h2 className="mt-1 text-[24px] font-black leading-7">{mobileAccount}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">{providerSummary}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/[0.84] bg-[rgba(231,242,234,0.88)] text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["撰稿", providerBindings.draft],
              ["图片", providerBindings.image],
              ["改写", providerBindings.rewrite]
            ].map(([label, bound]) => (
              <div
                className={`rounded-[20px] border border-white/[0.72] px-3 py-2 text-center text-xs font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.80)] ${
                  bound ? "bg-[#e7f2ea]/[0.88] text-moss" : "bg-[#fff6d8]/[0.88] text-[#8a5a00]"
                }`}
                key={String(label)}
              >
                <div>{label}</div>
                <div className="mt-1 text-[10px]">{bound ? "已绑定" : "待授权"}</div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.99]"
            data-testid="mobile-logout"
            onClick={onLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            退出当前账号
          </button>
        </div>
      </section>
      <MobilePanel title="安全规则">
        <div className="space-y-2">
          <SettingRow label="采集先于生成" onClick={() => onAction("安全规则已确认：采集先于生成。")} state="启用" testId="gate-collect-first" positive />
          <SettingRow label="发布需人工确认" onClick={() => onAction("安全规则已确认：发布仍需人工确认。")} state="强制" testId="gate-manual-review" positive />
          <SettingRow label="图片标题需复核" onClick={() => onAction("安全规则已确认：图片标题需要复核。")} state="提醒" testId="gate-cover-review" />
        </div>
      </MobilePanel>
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: MobileTab; onChange: (tab: MobileTab) => void }) {
  return (
    <nav
      aria-label="安卓端主导航"
      className="absolute bottom-3 left-4 right-4 z-20 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(31,58,49,0.08),0_18px_42px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0.20)_62%,rgba(216,230,220,0.20))]"
      />
      <div className="relative grid grid-cols-5 gap-1">
        {bottomTabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              aria-label={`${tab.label}${active ? "，当前页面" : ""}`}
              aria-pressed={active}
              key={tab.id}
              className={[
                 "flex min-h-[54px] touch-manipulation flex-col items-center justify-center gap-1 rounded-[22px] border text-[11px] font-black transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-moss/[0.35]",
                 active
                  ? "border-[#2c9053] bg-[linear-gradient(180deg,#30975a,#237f49)] text-white shadow-[0_12px_24px_rgba(35,133,79,0.24),inset_0_1px_0_rgba(255,255,255,0.22)]"
                  : "border-transparent bg-transparent text-muted active:bg-white/[0.48]"
              ].join(" ")}
              data-testid={`mobile-tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MobilePanel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-[28px] border border-white/[0.88] bg-[rgba(255,253,247,0.88)] p-4 shadow-[0_12px_32px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black">{title}</h2>
        {typeof action === "string" ? (
          <span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">{action}</span>
        ) : (
          action
        )}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  onClick,
  testId,
  tone = "blue",
  value
}: {
  label: string;
  onClick: () => void;
  testId: string;
  tone?: "blue" | "coral" | "green";
  value: string;
}) {
  const toneClass = {
    blue: "bg-[#edf5f8] text-steel",
    coral: "bg-[#fff1ec] text-coral",
    green: "bg-[#e7f2ea] text-moss"
  };
  return (
    <button
      className={["min-h-[82px] touch-manipulation rounded-[24px] border border-white/[0.82] p-3 text-left shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.82)] active:scale-[0.98]", toneClass[tone]].join(" ")}
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-[11px] font-bold">{label}</div>
    </button>
  );
}

function TaskRow({
  icon,
  label,
  onClick,
  state,
  testId
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  state: string;
  testId: string;
}) {
  return (
    <button
      className="flex min-h-[70px] w-full touch-manipulation items-center gap-3 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-3.5 py-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99] active:border-moss"
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#e7f2ea] text-moss">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black">{label}</div>
        <div className="mt-0.5 text-xs font-medium text-muted">{state}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted" />
    </button>
  );
}

function StepTile({
  icon,
  label,
  onClick,
  state,
  testId
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  state: string;
  testId: string;
}) {
  return (
    <button
      className="min-h-[118px] touch-manipulation rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] p-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.98] active:border-moss"
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white text-steel shadow-[0_8px_18px_rgba(31,58,49,0.08)]">
        {icon}
      </div>
      <div className="mt-3 text-sm font-black">{label}</div>
      <div className="mt-1 text-xs font-medium text-muted">{state}</div>
    </button>
  );
}

function ModeChip({
  active = false,
  label,
  onClick,
  testId
}: {
  active?: boolean;
  label: ReactNode;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "min-h-12 touch-manipulation rounded-full border px-3 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition active:scale-[0.98]",
        active ? "border-[#23854f] bg-[#23854f] text-white shadow-[0_12px_26px_rgba(35,133,79,0.18)]" : "border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-muted active:bg-white"
      ].join(" ")}
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ReferencePreviewSheet({
  onClose,
  reference
}: {
  onClose: () => void;
  reference: (typeof sampleReferences)[number];
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-center bg-white"
      data-testid="reference-preview"
      role="dialog"
    >
      <div className="flex h-[100dvh] w-full max-w-[430px] flex-col bg-[#f6fbf6] text-ink">
        <header className="shrink-0 border-b border-[#d6e8df] bg-white px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="关闭参考预览"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5] text-ink"
              data-testid="reference-preview-close"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-moss">结构模板</div>
              <h2 className="truncate text-lg font-semibold leading-6">参考预览</h2>
            </div>
            <span className="rounded-full bg-[#fff6e3] px-3 py-1 text-[11px] font-semibold text-[#8a5d16]">
              待确认
            </span>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto pb-[calc(24px+env(safe-area-inset-bottom))]">
          <div className="bg-[linear-gradient(160deg,#fff7df,#d9f1e5_52%,#f7cdbf)] px-5 pb-8 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-steel">封面结构</span>
              <span className="rounded-full bg-white/[0.75] px-3 py-1 text-[11px] font-semibold text-ink/[0.70]">
                参考
              </span>
            </div>
            <h1 className="mt-10 text-[32px] font-black leading-tight text-ink">{reference.title}</h1>
            <div className="mt-8 space-y-2 text-xs font-semibold text-ink/[0.70]">
              {reference.coverNotes.map((note, index) => (
                <div className="rounded-md bg-white/[0.85] px-3 py-2" key={note}>
                  {index + 1}. {note}
                </div>
              ))}
            </div>
          </div>

          <article className="bg-white px-4 pb-6 pt-4">
            <div className="flex items-center justify-between gap-3 border-b border-[#f1f1f1] pb-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold leading-6">{reference.title}</h3>
                <p className="mt-1 text-xs text-muted">{reference.meta}</p>
              </div>
            </div>

            <div className="mt-4 rounded-md bg-[#fff6e3] px-3 py-2 text-xs font-semibold text-[#8a5d16]">
              {reference.cue}
            </div>

            <div className="mt-4 space-y-3 text-[15px] leading-7 text-ink">
              {reference.body.split(/\n+/).map((paragraph, index) => (
                <p key={`${index}-${paragraph}`}>{renderXhsExpressionText(paragraph)}</p>
              ))}
            </div>

            <div className="mt-6 border-t border-[#f1f1f1] pt-4">
              <div className="text-xs font-semibold text-muted">可借鉴点</div>
              <div className="mt-3 space-y-2">
                {reference.takeaways.map((takeaway, index) => (
                  <div
                    className="flex gap-3 rounded-md border border-[#d6e8df] bg-[#f6fbf6] px-3 py-2 text-sm font-medium"
                    key={takeaway}
                  >
                    <span className="text-moss">{index + 1}</span>
                    <span>{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-md border border-[#d6e8df] bg-[#f6fbf6] px-3 py-2 text-xs leading-5 text-muted">
              这是参考预览，不是自动发布内容；真实采集来源仍需要人工确认。
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function CoverImagePreview({
  alt,
  className,
  src,
  testId
}: {
  alt: string;
  className: string;
  src: string;
  testId: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-2 bg-[#f7f7f7] px-5 text-center text-xs font-semibold text-ink/[0.65]`}
        data-testid={`${testId}-fallback`}
      >
        <Image className="h-7 w-7 text-steel" />
        <span>封面图加载失败</span>
        <span className="text-[11px] font-medium text-ink/[0.45]">请重新生成封面或检查图片服务</span>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      data-testid={testId}
      decoding="async"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}

function formatMobileDraftDate(value?: string) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function countMobileDraftsToday(items: MobileDraftHistoryItem[]) {
  const now = new Date();
  return items.filter((item) => {
    const date = new Date(item.content.created_at ?? item.saved_at);
    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }).length;
}

const localDraftCoverPalettes = [
  { accent: "#ff2442", backgroundEnd: "#ffd9df", backgroundMid: "#d9f1e5", backgroundStart: "#fff7df" },
  { accent: "#209b5a", backgroundEnd: "#dff7ee", backgroundMid: "#f4ead4", backgroundStart: "#ffffff" },
  { accent: "#111111", backgroundEnd: "#e9efe8", backgroundMid: "#f7e6cd", backgroundStart: "#fffdf7" },
  { accent: "#1f6feb", backgroundEnd: "#d9e8ff", backgroundMid: "#f5ead9", backgroundStart: "#fffaf0" }
];

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunkCoverText(value: string, size: number, maxLines: number) {
  const compact = value.replace(/\s+/g, "");
  const chars = Array.from(compact || "草稿");
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += size) {
    lines.push(chars.slice(index, index + size).join(""));
  }
  return lines.length ? lines : ["草稿"];
}

function buildLocalDraftHistoryCoverUrl(content: GeneratedContent) {
  const palette = localDraftCoverPalettes[Math.abs(content.id) % localDraftCoverPalettes.length];
  const titleLines = chunkCoverText(content.title, 7, 3);
  const excerpt = Array.from(content.body.replace(/\s+/g, " ").trim()).slice(0, 24).join("");
  const tag = content.tags?.find((value) => value.trim())?.trim() ?? "草稿";
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="86" y="${392 + index * 92}" class="title">${escapeSvgText(line)}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${XHS_COVER_WIDTH}" height="${XHS_COVER_HEIGHT}" viewBox="0 0 ${XHS_COVER_BASE_WIDTH} ${XHS_COVER_BASE_HEIGHT}">
<defs>
<linearGradient id="cover-bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${palette.backgroundStart}"/>
<stop offset="54%" stop-color="${palette.backgroundMid}"/>
<stop offset="100%" stop-color="${palette.backgroundEnd}"/>
</linearGradient>
<style>
.label{font:800 34px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:${palette.accent}}
.title{font:900 74px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111}
.meta{font:700 30px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#5f6a61}
</style>
</defs>
<rect width="${XHS_COVER_BASE_WIDTH}" height="${XHS_COVER_BASE_HEIGHT}" fill="url(#cover-bg)"/>
<rect x="64" y="74" width="190" height="78" rx="39" fill="rgba(255,255,255,0.78)"/>
<text x="100" y="126" class="label">${escapeSvgText(tag.slice(0, 8))}</text>
<path d="M92 278H808" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" opacity="0.16"/>
${titleSvg}
<rect x="70" y="812" width="760" height="158" rx="38" fill="rgba(255,255,255,0.54)"/>
<text x="104" y="882" class="meta">${escapeSvgText(excerpt || "本地草稿封面预览")}</text>
<text x="104" y="930" class="meta">本地预览 · 等待真实封面记录</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function DraftHistoryCarousel({
  activeContentId,
  items,
  onLongPress,
  onOpen,
  onToggleSelection,
  selectedDraftIds,
  selectionMode
}: {
  activeContentId: number | null;
  items: MobileDraftHistoryItem[];
  onLongPress: (item: MobileDraftHistoryItem) => void;
  onOpen: (item: MobileDraftHistoryItem) => void;
  onToggleSelection: (item: MobileDraftHistoryItem) => void;
  selectedDraftIds: number[];
  selectionMode: boolean;
}) {
  const selectedDraftIdSet = new Set(selectedDraftIds);

  return (
    <section
      className="rounded-[28px] border border-white/[0.88] bg-[rgba(255,253,247,0.88)] p-4 shadow-[0_12px_32px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.90)]"
      data-testid="mobile-draft-history"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-black">草稿历史</h2>
          <div className="mt-1 text-[11px] font-semibold text-muted">
            横向滑动浏览，长按多选
          </div>
        </div>
        <span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss">
          {selectionMode ? `已选 ${selectedDraftIds.length}` : items.length ? `${items.length} 篇` : "暂无"}
        </span>
      </div>

      {items.length ? (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {items.map((item) => (
            <DraftHistoryCard
              active={activeContentId === item.content.id}
              item={item}
              key={item.content.id}
              selected={selectedDraftIdSet.has(item.content.id)}
              selectionMode={selectionMode}
              onLongPress={() => onLongPress(item)}
              onOpen={() => onOpen(item)}
              onToggleSelection={() => onToggleSelection(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-5 text-sm font-semibold leading-6 text-muted">
          生成第一篇图文后，会自动出现在这里。
        </div>
      )}
    </section>
  );
}

function DraftHistoryCard({
  active,
  item,
  onLongPress,
  onOpen,
  onToggleSelection,
  selected,
  selectionMode
}: {
  active: boolean;
  item: MobileDraftHistoryItem;
  onLongPress: () => void;
  onOpen: () => void;
  onToggleSelection: () => void;
  selected: boolean;
  selectionMode: boolean;
}) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const draft = draftStateFromContent(item.content);
  const excerpt = draft.body.replace(/\s+/g, " ").slice(0, 54);
  const hasGeneratedCover = Boolean(item.cover);
  const coverUrl = item.cover
    ? resolveAssetUrl(item.cover.image_url)
    : buildLocalDraftHistoryCoverUrl(item.content);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function startLongPressTimer() {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress();
    }, 560);
  }

  function handleClick() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectionMode) {
      onToggleSelection();
      return;
    }
    onOpen();
  }

  return (
    <button
      aria-pressed={selectionMode ? selected : undefined}
      className={[
        "relative w-[214px] shrink-0 snap-start touch-manipulation overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_12px_26px_rgba(31,58,49,0.08)] active:scale-[0.99]",
        selected
          ? "border-[#111111] ring-2 ring-[#111111]/[0.18]"
          : active
            ? "border-[#ff2442] ring-2 ring-[#ff2442]/[0.16]"
            : "border-white/[0.88]"
      ].join(" ")}
      data-testid={`mobile-draft-history-card-${item.content.id}`}
      onClick={handleClick}
      onContextMenu={(event) => {
        event.preventDefault();
        onLongPress();
      }}
      onPointerCancel={clearLongPressTimer}
      onPointerDown={startLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerUp={clearLongPressTimer}
      type="button"
    >
      {selectionMode ? (
        <span
          className={[
            "absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-[0_8px_18px_rgba(0,0,0,0.12)]",
            selected ? "border-[#111111] bg-[#111111] text-white" : "border-white bg-white/[0.84] text-transparent"
          ].join(" ")}
        >
          <CheckCircle2 className="h-4 w-4" />
        </span>
      ) : null}
      <div className="relative">
        <CoverImagePreview
          alt={hasGeneratedCover ? "草稿封面" : "本地封面预览"}
          className="aspect-[3/4] w-full bg-[#f7f7f7] object-cover"
          src={coverUrl}
          testId={`mobile-draft-history-cover-${item.content.id}`}
        />
        {!hasGeneratedCover ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-white/[0.78] px-2 py-1 text-[10px] font-black text-moss shadow-[0_8px_18px_rgba(31,58,49,0.10)]">
            本地预览
          </span>
        ) : null}
        {item.pinned ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/[0.80] p-1.5 text-[#ff2442] shadow-[0_8px_18px_rgba(31,58,49,0.10)]">
            <Pin className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="space-y-2 px-3 pb-3 pt-2">
        <div className="line-clamp-2 min-h-[40px] text-[13px] font-black leading-5 text-ink">
          {draft.title}
        </div>
        <div className="line-clamp-2 min-h-[34px] text-[11px] font-semibold leading-[17px] text-muted">
          {excerpt}
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] font-black text-muted">
          <span>{formatMobileDraftDate(item.content.created_at ?? item.saved_at)}</span>
          <span className={item.pinned ? "text-[#ff2442]" : "text-moss"}>
            {item.pinned ? "置顶" : `#${item.content.id}`}
          </span>
        </div>
      </div>
    </button>
  );
}

function DraftHistorySelectionBar({
  onCancel,
  onDelete,
  onPinToggle,
  selectedCount,
  selectedItem
}: {
  onCancel: () => void;
  onDelete: () => void;
  onPinToggle: () => void;
  selectedCount: number;
  selectedItem: MobileDraftHistoryItem | null;
}) {
  const canPin = selectedCount === 1 && selectedItem !== null;

  return (
    <div
      className="rounded-[26px] border border-[#111111]/[0.12] bg-[rgba(255,253,247,0.94)] p-3 shadow-[0_16px_34px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm"
      data-testid="mobile-draft-selection-toolbar"
      role="toolbar"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black text-[#ff2442]">草稿多选</div>
          <div className="mt-1 text-sm font-black text-ink">已选 {selectedCount} 篇</div>
        </div>
        <button
          className="h-9 rounded-full border border-[#eeeeee] bg-white px-4 text-xs font-black text-muted active:scale-[0.99]"
          data-testid="mobile-draft-selection-cancel"
          onClick={onCancel}
          type="button"
        >
          取消
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#111111] text-sm font-black text-white active:scale-[0.99] disabled:bg-[#d9d9d9] disabled:text-white"
          data-testid="mobile-draft-selection-pin"
          disabled={!canPin}
          onClick={onPinToggle}
          type="button"
        >
          <Pin className="h-4 w-4" />
          {canPin ? (selectedItem.pinned ? "取消置顶" : "置顶") : "选 1 篇置顶"}
        </button>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff2442] text-sm font-black text-white active:scale-[0.99]"
          data-testid="mobile-draft-selection-delete"
          onClick={onDelete}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
          删除所选
        </button>
      </div>
    </div>
  );
}

function DraftPreviewEditor({
  coverImageUrl,
  draft,
  generatedContent,
  onChange,
  onClose,
  onCopy,
  onExportStatus
}: {
  coverImageUrl: string | null;
  draft: DraftPreviewState;
  generatedContent: GeneratedContent | null;
  onChange: (nextDraft: DraftPreviewState) => void;
  onClose: () => void;
  onCopy: () => Promise<boolean>;
  onExportStatus: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const [xhsExporting, setXhsExporting] = useState(false);
  const [xhsExportMessage, setXhsExportMessage] = useState<string | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement | null>(null);
  const titleLines = draft.title.split(/[，,]/).slice(0, 3);
  const bodyParagraphs = draft.body
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const tags = draft.tags
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }
    manualCopyRef.current?.focus();
    manualCopyRef.current?.select();
  }, [manualCopyText]);

  function updatePoint(index: number, value: string) {
    onChange({
      ...draft,
      points: draft.points.map((point, pointIndex) => (pointIndex === index ? value : point))
    });
  }

  function publishExportStatus(message: string) {
    setXhsExportMessage(message);
    onExportStatus(message);
  }

  function toggleEditing() {
    setManualCopyText(null);
    setXhsExportMessage(null);
    setEditing((current) => !current);
  }

  async function copyDraftTextOnly() {
    setEditing(false);
    const draftText = buildEditableDraftCopy(draft);
    const copied = await onCopy();
    setManualCopyText(draftText);
    const message = copied
      ? "已尝试复制文案；下方也保留了正文，可长按全选再确认。"
      : "浏览器拦截了剪贴板，文案已展开，可长按全选复制。";
    publishExportStatus(message);
  }

  async function handleOpenXiaohongshu() {
    const draftText = buildEditableDraftCopy(draft);
    setEditing(false);
    setManualCopyText(draftText);
    setXhsExporting(true);
    publishExportStatus("正在准备封面图、标题和正文；下方会保留文案兜底。");
    try {
      const textCopied = await tryCopyText(draftText);
      setManualCopyText(draftText);
      const coverFile = await buildXhsCoverFile(coverImageUrl, draft);

      const nativeBridge = getOmpcAndroidBridge();
      if (nativeBridge) {
        publishExportStatus("正在打开小红书发布入口；封面图、标题和正文会一起发送。");
        const nativeResult = await shareToNativeXiaohongshu(draft.title, draftText, coverFile);
        if (nativeResult.ok) {
          publishExportStatus(
            textCopied
              ? nativeResult.message
              : "已交给小红书；如果正文没有自动带入，下方文案可长按全选复制。"
          );
          return;
        }
        publishExportStatus(`${nativeResult.message} 已切换到系统分享兜底。`);
      }

      const shareData: ShareData = {
        files: [coverFile],
        text: draftText,
        title: draft.title
      };
      const canShareFiles =
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [coverFile] }));

      if (canShareFiles) {
        let systemShareFailed = false;
        publishExportStatus(
          textCopied
            ? "已尝试复制文案，正在打开系统分享；选择小红书即可带入封面图。"
            : "文案已展开兜底，正在打开系统分享；选择小红书即可带入封面图。"
        );
        try {
          await navigator.share(shareData);
        } catch (error) {
          const errorName = error instanceof DOMException ? error.name : "";
          if (errorName === "AbortError") {
            const restored = await tryCopyText(draftText);
            setManualCopyText(draftText);
            const abortMessage = restored
              ? "已取消系统分享；已重新尝试复制文案，下方也保留了正文，可长按全选确认。"
              : `已取消系统分享；文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。`;
            publishExportStatus(abortMessage);
            return;
          }
          systemShareFailed = true;
          publishExportStatus("系统分享没有打开，已切换到下载封面和手动发布兜底。");
        }
        if (!systemShareFailed) {
          const sharedCopyRestored = await tryCopyText(draftText);
          setManualCopyText(draftText);
          const sharedMessage = sharedCopyRestored
            ? "已交给系统分享；请选择小红书发布入口。已重新尝试复制文案，下方也保留了正文，如果没有自动带入请直接粘贴。"
            : `已交给系统分享；请选择小红书发布入口。如果正文没有自动带入，文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。`;
          publishExportStatus(sharedMessage);
          return;
        }
      }

      downloadFile(coverFile);
      const fallbackTextRestored = await tryCopyText(draftText);
      setManualCopyText(draftText);
      const fallbackMessage = fallbackTextRestored
        ? "封面图已下载，文案已尝试复制。当前浏览器不能把图文直接带入小红书发布器，请手动打开小红书发布入口，选择刚下载的封面图后粘贴正文。"
        : `封面图已下载；当前浏览器拦截了剪贴板，文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。请手动打开小红书发布入口并选择刚下载的封面图。`;
      publishExportStatus(fallbackMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "打开小红书失败。";
      publishExportStatus(message);
    } finally {
      setXhsExporting(false);
    }
  }

  async function copyPreviewLink() {
    if (!generatedContent) {
      const message = "先生成草稿，才会有可分享的预览链接。";
      publishExportStatus(message);
      return;
    }

    const previewUrl = `${window.location.origin}/preview/${generatedContent.id}`;
    const copied = await tryCopyText(previewUrl);
    setManualCopyText(copied ? null : previewUrl);
    const isLocalPreview = isLocalOrPrivateHostname(window.location.hostname);
    let message = "浏览器拦截了剪贴板，预览链接已展开，可长按全选复制。";
    if (copied) {
      message = isLocalPreview
        ? "已尝试复制预览链接；当前是这台设备或同一网络地址，外部用户需要部署到公网后才能打开。"
        : "已尝试复制预览链接，可以发给别人查看。";
    }
    publishExportStatus(message);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-center bg-white"
      data-testid="draft-preview-editor"
      role="dialog"
    >
      <div className="relative flex h-[100dvh] w-full max-w-[430px] flex-col bg-white text-ink">
        <header className="shrink-0 border-b border-[#eeeeee] bg-white px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="关闭草稿预览"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5] text-ink"
              data-testid="draft-preview-close"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#ff2442]">
                {generatedContent ? "当前草稿" : "本地草稿"}
              </div>
              <h2 className="truncate text-lg font-semibold leading-6">图文预览</h2>
            </div>
            <button
              className="h-10 rounded-full bg-[#111111] px-4 text-sm font-semibold text-white"
              data-testid={editing ? "draft-preview-save" : "draft-preview-edit-toggle"}
              onClick={toggleEditing}
              type="button"
            >
              {editing ? "完成" : "编辑"}
            </button>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto pb-[calc(196px+env(safe-area-inset-bottom))]">
          <article className="bg-white">
            {coverImageUrl ? (
              <CoverImagePreview
                alt="小红书图文封面预览"
                className="aspect-[3/4] w-full bg-[#f7f7f7] object-contain"
                src={coverImageUrl}
                testId="draft-preview-cover-image"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-[linear-gradient(160deg,#fff7df,#d9f1e5_48%,#f7cdbf)] px-6 pb-8 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-steel">封面预览</span>
                  <span className="rounded-full bg-white/[0.75] px-3 py-1 text-[11px] font-semibold text-ink/[0.70]">
                    文字版
                  </span>
                </div>
                <div className="mt-14 text-[34px] font-black leading-tight text-ink">
                  {titleLines.map((line) => (
                  <span className="block" key={line}>
                    {line}
                  </span>
                ))}
                </div>
                <div className="mt-8 space-y-2 text-xs font-semibold text-ink/[0.70]">
                  {draft.points.map((point, index) => (
                    <div className="rounded-md bg-white/[0.85] px-3 py-2" key={`${point}-${index}`}>
                      {index + 1}. {point}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 pb-5 pt-4">
              <div className="flex items-center justify-between gap-3 border-b border-[#f1f1f1] pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff2442] text-sm font-bold text-white">
                    O
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">OPC 任务平台</div>
                    <div className="text-[11px] text-muted">刚刚 · 图文草稿</div>
                  </div>
                </div>
                <button
                  className="h-8 rounded-full bg-[#ff2442] px-4 text-xs font-semibold text-white"
                  type="button"
                >
                  关注
                </button>
              </div>

              {editing ? (
                <textarea
                  aria-label="编辑标题"
                  className="mt-4 block min-h-[72px] w-full resize-none rounded-md border border-[#ffd4dc] bg-[#fff8fa] px-3 py-2 text-xl font-bold leading-7 text-ink outline-none focus:border-[#ff2442]"
                  data-testid="draft-edit-title"
                  onChange={(event) => onChange({ ...draft, title: event.target.value })}
                  value={draft.title}
                />
              ) : (
                <h1 className="mt-4 text-xl font-bold leading-7">{draft.title}</h1>
              )}

              {editing ? (
                <textarea
                  aria-label="编辑正文"
                  className="mt-3 block min-h-[260px] w-full resize-y rounded-md border border-[#eeeeee] bg-[#fbfbfb] px-3 py-3 text-[15px] leading-7 text-ink outline-none focus:border-[#ff2442]"
                  data-testid="draft-edit-body"
                  onChange={(event) => onChange({ ...draft, body: event.target.value })}
                  rows={Math.min(16, Math.max(8, draft.body.split("\n").length + 5))}
                  value={draft.body}
                />
              ) : (
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink">
                  {bodyParagraphs.length ? (
                    bodyParagraphs.map((paragraph, index) => (
                      <p key={`${index}-${paragraph}`}>{renderXhsExpressionText(paragraph)}</p>
                    ))
                  ) : (
                    <p>{renderXhsExpressionText(draft.body)}</p>
                  )}
                </div>
              )}

              {editing ? (
                <div className="mt-4 space-y-2 rounded-md border border-[#eeeeee] bg-[#fbfbfb] p-3">
                  <div className="text-xs font-semibold text-muted">封面清单</div>
                  {draft.points.map((point, index) => (
                    <input
                      aria-label={`编辑封面清单 ${index + 1}`}
                      className="h-11 w-full rounded-md border border-[#d6e8df] bg-white px-3 text-sm font-medium text-ink outline-none focus:border-[#ff2442]"
                      data-testid={`draft-edit-point-${index}`}
                      key={index}
                      onChange={(event) => updatePoint(index, event.target.value)}
                      value={point}
                    />
                  ))}
                </div>
              ) : null}

              {editing ? (
                <input
                  aria-label="编辑标签"
                  className="mt-4 h-11 w-full rounded-md border border-[#d6e8df] bg-white px-3 text-sm font-medium text-[#346cb0] outline-none focus:border-[#ff2442]"
                  data-testid="draft-edit-tags"
                  onChange={(event) => onChange({ ...draft, tags: event.target.value })}
                  value={draft.tags}
                />
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium text-[#346cb0]">
                  {tags.map((tag) => (
                    <span key={tag}>{tag.startsWith("#") ? tag : `#${tag}`}</span>
                  ))}
                </div>
              )}

              <div className="mt-5 text-xs text-muted">
                {editing ? "正在原地编辑 · 点右上角完成回到预览" : "发布前预览 · 不会自动发布"}
              </div>
            </div>
          </article>
        </section>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#eeeeee] bg-white/[0.95] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
          <button
            className="mb-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ff2442] px-4 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
            data-testid="draft-open-xiaohongshu"
            disabled={xhsExporting}
            onClick={handleOpenXiaohongshu}
            type="button"
          >
            {xhsExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {xhsExporting ? "正在准备" : "复制文案+封面，去小红书"}
          </button>
          <button
            className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#eeeeee] bg-white px-4 text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-50"
            data-testid="draft-preview-copy"
            disabled={xhsExporting}
            onClick={copyDraftTextOnly}
            type="button"
          >
            <Clipboard className="h-4 w-4" />
            {XHS_COPY_TEXT_ONLY_LABEL}
          </button>
          <button
            className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#eeeeee] bg-white px-4 text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-50"
            data-testid="draft-copy-preview-link"
            disabled={!generatedContent}
            onClick={copyPreviewLink}
            type="button"
          >
            <ExternalLink className="h-4 w-4" />
            复制预览链接
          </button>
          {xhsExportMessage ? (
            <div
              aria-live="polite"
              className="mb-2 rounded-md bg-[#fff6e3] px-3 py-2 text-[11px] font-medium leading-4 text-[#8a5d16]"
              role="status"
            >
              {xhsExportMessage}
            </div>
          ) : null}
          {manualCopyText ? (
            <textarea
              aria-label="手动复制内容"
              className="mb-2 max-h-28 w-full resize-none rounded-[18px] border border-[#ffd78f] bg-[#fffaf0] px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-[#ff2442] focus:ring-2 focus:ring-[#ff2442]/[0.15]"
              data-testid="draft-manual-copy-text"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              ref={manualCopyRef}
              value={manualCopyText}
            />
          ) : null}
          <div className="flex items-center justify-between">
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <Heart className="h-5 w-5" />
              赞
            </button>
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <MessageCircle className="h-5 w-5" />
              评论
            </button>
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <Bookmark className="h-5 w-5" />
              收藏
            </button>
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <Share2 className="h-5 w-5" />
              分享
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function SettingRow({
  label,
  onClick,
  positive = false,
  state,
  testId
}: {
  label: string;
  onClick: () => void;
  positive?: boolean;
  state: string;
  testId: string;
}) {
  return (
    <button
      className="flex min-h-[56px] w-full touch-manipulation items-center justify-between gap-3 rounded-full border border-[#d6e8df] bg-white px-4 py-3 text-left active:scale-[0.99] active:border-moss"
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 className={["h-4 w-4", positive ? "text-moss" : "text-amber"].join(" ")} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="shrink-0 rounded-full bg-[#eef6f1] px-2.5 py-1 text-xs font-semibold text-muted">{state}</span>
    </button>
  );
}

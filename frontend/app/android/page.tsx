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
  Layers3,
  LockKeyhole,
  LogOut,
  Loader2,
  MessageCircle,
  PenLine,
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
  COLLECTION_JOB_TERMINAL_STATUSES,
  formatCollectionJobStatus,
  type CollectionJobStatusSnapshot
} from "@/lib/collection-job-status";
import {
  isGeneratedContent,
  isGeneratedImageAsset,
  type GeneratedContent,
  type GeneratedImageAsset
} from "@/lib/generated-assets";
import {
  providerBindingDefaultsFromStatuses,
  providerKeyUpdatePayload,
  sanitizeProviderStatusItems,
  type ProviderStatusItem
} from "@/lib/provider-settings";
import {
  SERVICE_CONFIG_READ_ERROR,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import { formatTagLine } from "@/lib/tags";
import { renderXhsExpressionText } from "@/lib/xhs-stickers";

type MobileTab = "home" | "collect" | "create" | "settings";
type MobilePlatform = "douyin" | "xiaohongshu";

type CredentialSettings = {
  draftApiKey: string;
  imageApiKey: string;
  rewriteApiKey: string;
  workspaceToken: string;
};

type ProviderCheckResult = {
  configured: boolean;
  message: string;
  status: string;
  target: string;
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

type MobileCollectionJob = CollectionJobStatusSnapshot;

type DraftPreviewState = {
  body: string;
  points: string[];
  tags: string;
  title: string;
};

const API_BASE = getApiBase();
const MOBILE_AUTH_STORAGE_KEY = "opc_mobile_auth_v1";
const CREDENTIAL_STORAGE_KEY = "opc_workspace_credentials_v1";
const COLLECTION_SCHEDULE_STORAGE_KEY = "opc_mobile_collection_schedule_v1";
const MOBILE_LAST_CONTENT_STORAGE_KEY = "opc_mobile_last_generated_content_v1";
const MOBILE_LAST_COVER_STORAGE_KEY = "opc_mobile_last_generated_cover_v1";
const MOBILE_PAPER_TEXTURE = "/mobile-assets/paper-texture.png";
const MOBILE_COLLECTION_COLLAGE = "/mobile-assets/collection-collage.png";
const MOBILE_CREATE_CARD_BG = "/mobile-assets/create-card-bg.png";
const MOBILE_HEADER_ICON_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-[16px] border border-white/70 bg-white/40 text-ink shadow-[0_10px_26px_rgba(28,54,45,0.10),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl active:scale-[0.98]";
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

const bottomTabs: Array<{ id: MobileTab; icon: typeof Home; label: string }> = [
  { id: "home", icon: Home, label: "首页" },
  { id: "collect", icon: Radar, label: "采集" },
  { id: "create", icon: PenLine, label: "创作" },
  { id: "settings", icon: Settings, label: "设置" }
];

const workItems = [
  { label: "补公开图文素材", state: "进入采集", icon: Radar, tab: "collect" },
  { label: "生成硕升博草稿", state: "进入创作", icon: PenLine, tab: "create" },
  { label: "复核封面标题", state: "查看封面", icon: Image, tab: "create" }
] satisfies Array<{
  icon: typeof Radar;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const progressSteps = [
  { label: "采集", state: "当前", icon: Database, tab: "collect" },
  { label: "知识库", state: "就绪", icon: BookOpenText, tab: "settings" },
  { label: "确认", state: "待处理", icon: ShieldCheck, tab: "create" }
] satisfies Array<{
  icon: typeof Database;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const quickMetrics = [
  { label: "趋势素材", value: "0", tone: "blue", tab: "collect" },
  { label: "知识条目", value: "0", tone: "green", tab: "settings" },
  { label: "待确认", value: "0", tone: "coral", tab: "create" }
] satisfies Array<{
  label: string;
  tab: MobileTab;
  tone: "blue" | "coral" | "green";
  value: string;
}>;

const taskActionCopy: Record<MobileTab, string> = {
  home: "已回到首页。",
  collect: "已打开采集页，可以切平台、编辑关键词和查看参考卡片。",
  create: "已打开创作页，可以切换版式并进入生成入口。",
  settings: "已打开设置页，可以查看配置和发布确认状态。"
};

const sampleReferences = [
  {
    body:
      "姐妹们，硕升博别一上来就套磁。[哭惹R]\n\n先确认研究方向、导师项目和自己的材料匹配度，再去写邮件，第一印象会稳很多。\n\n真正要先做的是：把方向拆清楚，把导师近期成果读一遍，把你能贡献什么写成一句话。",
    coverNotes: ["大字反常识标题", "三点清单", "低噪奶油底"],
    cue: "反常识开头 + 三点清单",
    meta: "结构模板 · 非采集素材",
    takeaways: ["先打断常见误区", "再给 3 个动作", "结尾给温和提醒"],
    title: "不是先套磁，先确认这 3 件事"
  },
  {
    body:
      "宝子，群发邮件真的不是越早越好～\n\n如果方向没拆清楚，邮件看起来就会像模板，导师也很难判断你到底适不适合他的组。\n\n先做一个小动作：把每位导师的研究主题、近两年成果、你能接上的经历放在同一张表里。",
    coverNotes: ["误区提醒", "邮件场景", "行动表格"],
    cue: "先打断误区，再给动作",
    meta: "结构模板 · 非采集素材",
    takeaways: ["用场景切入", "指出群发风险", "给出表格化动作"],
    title: "硕升博申请别急着群发邮件"
  },
  {
    body:
      "导师匹配前，先做一次方向自查！！[赞R]\n\n不是看导师名气有多大，而是看你的经历、兴趣和他正在做的项目能不能接上。\n\n可以从三个问题开始：我能研究什么？我已经做过什么？我为什么适合这个方向？",
    coverNotes: ["步骤化封面", "方向自查", "清爽正文"],
    cue: "步骤化封面 + 低噪正文",
    meta: "封面模板 · 非采集素材",
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
      throw new Error("登录服务暂未更新，请重启应用服务后再试。");
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

function readStoredMobileContent() {
  const raw = readMobileStorage(MOBILE_LAST_CONTENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isGeneratedContent(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function saveStoredMobileContent(content: GeneratedContent) {
  writeMobileStorage(MOBILE_LAST_CONTENT_STORAGE_KEY, JSON.stringify(content));
}

function readStoredMobileCover() {
  const raw = readMobileStorage(MOBILE_LAST_COVER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isGeneratedImageAsset(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function saveStoredMobileCover(cover: GeneratedImageAsset) {
  writeMobileStorage(MOBILE_LAST_COVER_STORAGE_KEY, JSON.stringify(cover));
}

function clearStoredMobileCover() {
  removeMobileStorage(MOBILE_LAST_COVER_STORAGE_KEY);
}

function buildPlatformCopy(content: GeneratedContent) {
  return [content.title.trim(), content.body.trim(), formatTagLine(content.tags)]
    .filter(Boolean)
    .join("\n\n");
}

function buildEditableDraftCopy(draft: DraftPreviewState) {
  return [
    draft.title.trim(),
    draft.body.trim(),
    draft.points.map((point, index) => `${index + 1}. ${point.trim()}`).join("\n"),
    draft.tags.trim()
  ]
    .filter(Boolean)
    .join("\n\n");
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
  canvas.width = image.naturalWidth || 900;
  canvas.height = image.naturalHeight || 1200;
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
  canvas.width = 900;
  canvas.height = 1200;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持封面图处理。");
  }
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#fff7df");
  gradient.addColorStop(0.52, "#d9f1e5");
  gradient.addColorStop(1, "#f7cdbf");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

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
  const [status, setStatus] = useState("手机端操作已就绪");
  const [credentials, setCredentials] = useState<CredentialSettings>(emptyCredentials);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [mobileAccount, setMobileAccount] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);

  useEffect(() => {
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
    setStatus(defaultKeysBound ? `已登录：${account}，默认服务配置已就绪。` : `已登录：${account}，请检查服务配置。`);
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
        onNotify={() => setStatus("暂无新通知，发布前确认和安全规则仍保持开启。")}
      />
      <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-4">
        <div
          aria-live="polite"
          className="mb-4 rounded-[18px] border border-white/70 bg-white/78 px-3.5 py-2.5 text-xs font-semibold leading-5 text-ink shadow-[0_10px_30px_rgba(27,58,48,0.08)] backdrop-blur"
          data-testid="mobile-status"
          role="status"
        >
          {status}
        </div>
        <div hidden={activeTab !== "home"}>
          <HomeScreen onAction={setStatus} onChangeTab={openTab} />
        </div>
        <div hidden={activeTab !== "collect"}>
          <CollectScreen credentials={credentials} onAction={setStatus} />
        </div>
        <div hidden={activeTab !== "create"}>
          <CreateScreen credentials={credentials} onAction={setStatus} />
        </div>
        <div hidden={activeTab !== "settings"}>
          <SettingsScreen
            credentials={credentials}
            mobileAccount={mobileAccount}
            onAction={setStatus}
            onCredentialsChange={setCredentials}
            onLogout={logout}
            onProviderStatusesChange={setProviderStatuses}
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
        className="relative mx-auto h-[100dvh] max-w-[430px] overflow-hidden bg-[#f8f5ec] bg-cover shadow-[0_24px_70px_rgba(20,48,41,0.18)] sm:h-[calc(100dvh-48px)] sm:min-h-[680px] sm:rounded-[30px] sm:border sm:border-white/80"
        style={{ backgroundImage: `url(${MOBILE_PAPER_TEXTURE})` }}
      >
        <div className="flex h-full flex-col">{children}</div>
      </div>
    </main>
  );
}

function LoginScreen({
  loading,
  onLogin
}: {
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
        <div className="mt-6 text-xs font-black text-moss">OPC Mobile</div>
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
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-[16px] border border-white/75 bg-white/88 px-3.5 shadow-[0_12px_30px_rgba(31,58,49,0.08)]">
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
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-[16px] border border-white/75 bg-white/88 px-3.5 shadow-[0_12px_30px_rgba(31,58,49,0.08)]">
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

function MobileHeader({ activeTab, onNotify }: { activeTab: MobileTab; onNotify: () => void }) {
  const titles: Record<MobileTab, string> = {
    home: "今日工作台",
    collect: "趋势采集",
    create: "内容创作",
    settings: "设置"
  };

  return (
    <header className="relative overflow-hidden border-b border-white/55 bg-white/40 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] shadow-[0_16px_38px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.52),rgba(255,255,255,0.16)_46%,rgba(210,230,216,0.22))]"
      />
      <div className="relative flex items-center justify-between gap-3">
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
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black text-moss">
            OPC Mobile
          </div>
          <h1 className="truncate text-[22px] font-black leading-7">{titles[activeTab]}</h1>
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
      <section className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/55 p-4 text-ink shadow-[0_22px_46px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-55"
          style={{ backgroundImage: `url(${MOBILE_COLLECTION_COLLAGE})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,244,0.94)_0%,rgba(255,252,244,0.78)_48%,rgba(255,252,244,0.44)_100%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#e7f2ea]/90 px-2.5 py-1 text-[11px] font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              今天先做
            </span>
            <span className="rounded-full bg-[#fff6d8] px-2.5 py-1 text-[11px] font-black text-[#6f5412]">
              3 项待处理
            </span>
          </div>
          <h2 className="mt-4 text-[25px] font-black leading-8">先采集，再生成</h2>
          <p className="mt-2 max-w-[230px] text-[13px] font-medium leading-5 text-ink/68">
            先补公开素材，再启动硕升博草稿，节奏更稳。
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-ink/52">
            <span>采集参考</span>
            <span className="h-px flex-1 bg-ink/12" />
            <span>撰稿</span>
            <span className="h-px flex-1 bg-ink/12" />
            <span>封面</span>
          </div>
        </div>
        <button
          className="relative mt-4 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[17px] border border-white/75 bg-white/82 text-sm font-black text-ink shadow-[0_12px_28px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur active:scale-[0.99]"
          onClick={() => onChangeTab("create", "已进入创作预览，手机端按钮现在可直接操作。")}
          type="button"
        >
          <PenLine className="h-4 w-4" />
          打开创作入口
        </button>
      </section>

      <div className="grid grid-cols-3 gap-2">
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

      <MobilePanel
        title="今日任务"
        action={
          <button
            className="min-h-9 touch-manipulation rounded-md px-2 text-xs font-semibold text-moss active:bg-[#e5f2ec]"
            onClick={() => onAction("今日 3 个任务都可以在手机端点开处理。")}
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

      <MobilePanel title="生产进度">
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
  const [sourceReviewed, setSourceReviewed] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkResult, setLinkResult] = useState<LinkImportTarget | null>(null);
  const [selectedReference, setSelectedReference] = useState(sampleReferences[0].title);
  const [referencePreview, setReferencePreview] = useState<(typeof sampleReferences)[number] | null>(null);
  const [busyAction, setBusyAction] = useState<"digest" | "job" | "link" | "search" | null>(null);
  const scheduleRunningRef = useRef(false);

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
        if (!COLLECTION_JOB_TERMINAL_STATUSES.has(job.status)) {
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
        if (COLLECTION_JOB_TERMINAL_STATUSES.has(job.status)) {
          setActiveCollectionJobId(null);
          onAction(message);
          return;
        }
        timer = window.setTimeout(pollCollectionJob, 3000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setScheduleMessage(error instanceof Error ? error.message : "采集任务状态刷新失败。");
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

  async function fetchCollectionJobStatus(jobId: number) {
    const response = await fetch(`${API_BASE}/trends/jobs/${jobId}`, {
      headers: authHeaders(credentials)
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "采集任务状态刷新失败。"));
    }
    return (await response.json()) as MobileCollectionJob;
  }

  function saveSchedule() {
    if (!query.trim()) {
      onAction("先填写关键词，再保存定时采集任务。");
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
          persist_session: true,
          persist_cookies: false
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "采集任务创建失败。"));
      }
      const data = (await response.json()) as MobileCollectionJob;
      const nextDate = autoEnabled ? scheduleNextRun(startedAt) : null;
      setLastJobId(data.id);
      setLastRunAt(startedAt.toISOString());
      setActiveCollectionJobId(data.id);
      const message = `${runLabel}已开始，${formatCollectionJobStatus(data, "mobile")}${
        nextDate ? ` 下次运行：${formatScheduleTime(nextDate.toISOString())}。` : ""
      }`;
      setScheduleMessage(message);
      onAction(message);
    } catch (error) {
      const nextDate = autoEnabled ? scheduleNextRun(startedAt) : null;
      const message = error instanceof Error ? error.message : "采集任务创建失败。";
      setScheduleMessage(
        `${runLabel}失败：${message}${nextDate ? ` 下次重试：${formatScheduleTime(nextDate.toISOString())}。` : ""}`
      );
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
      <section className="overflow-hidden rounded-[26px] border border-white/70 bg-white/82 shadow-[0_18px_42px_rgba(31,58,49,0.10)]">
        <div
          aria-hidden="true"
          className="h-32 bg-cover bg-center"
          style={{ backgroundImage: `url(${MOBILE_COLLECTION_COLLAGE})` }}
        />
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">自动采集</div>
              <h2 className="mt-1 text-xl font-black leading-6">把公开参考变成素材池</h2>
            </div>
            <span className="rounded-[12px] bg-[#ff2442] px-3 py-1.5 text-[11px] font-black text-white">
              {autoEnabled ? "运行中" : "待开启"}
            </span>
          </div>
        </div>
      </section>
      <MobilePanel
        title="定时自动采集"
        action={<span className="text-xs font-semibold text-moss">自动获取</span>}
      >
        <label className="mb-3 flex items-start gap-3 rounded-[24px] border border-white/75 bg-[#f9fbf6] px-3.5 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
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
          <div className="mt-2 flex min-h-12 items-center gap-2 rounded-full border border-[#d6e8df] bg-white px-4 py-2">
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
        <div className="mt-3 rounded-[22px] border border-[#d6e8df] bg-white px-4 py-3 text-xs leading-5 text-muted">
          <div>{scheduleMessage}</div>
          <div>下次运行：{formatScheduleTime(nextRunAt)}</div>
          <div>
            上次运行：{formatScheduleTime(lastRunAt)}
            {activeCollectionJobId ? "，正在追踪进度" : lastJobId ? "，已开始" : ""}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full border border-[#d6e8df] bg-white text-sm font-semibold text-ink active:scale-[0.99]"
            data-testid="mobile-save-schedule"
            onClick={saveSchedule}
            type="button"
          >
            <Save className="h-4 w-4" />
            保存定时
          </button>
          <button
            className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
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
          className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-[#d6e8df] bg-white text-sm font-semibold text-ink active:scale-[0.99]"
          data-testid="mobile-open-search"
          onClick={openSearchPage}
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
          手动打开搜索页
        </button>
        <label className="mt-3 flex items-start gap-3 rounded-[22px] border border-[#d6e8df] bg-white px-4 py-3 text-sm">
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
          className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-[#d6e8df] bg-white text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-save-digest"
          disabled={busyAction === "digest"}
          onClick={saveKnowledgeDigest}
          type="button"
        >
          {busyAction === "digest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busyAction === "digest" ? "保存中" : "保存知识摘要"}
        </button>
      </MobilePanel>

      <MobilePanel title="小红书链接导入">
        <textarea
          className="min-h-24 w-full resize-y rounded-[22px] border border-[#d6e8df] bg-white px-4 py-3 text-sm leading-6 text-ink outline-none"
          data-testid="mobile-link-text"
          onChange={(event) => setLinkText(event.target.value)}
          placeholder="粘贴小红书分享文本或链接"
          value={linkText}
        />
        <button
          className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-parse-links"
          disabled={busyAction === "link"}
          onClick={parseLinks}
          type="button"
        >
          {busyAction === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busyAction === "link" ? "解析中" : "解析链接"}
        </button>
        {linkResult ? (
          <div className="mt-3 rounded-[22px] border border-[#d6e8df] bg-white px-4 py-3 text-xs leading-5 text-muted">
            已解析 {linkResult.extracted_count} 个链接，可导入 {linkResult.accepted_count} 个。
          </div>
        ) : null}
      </MobilePanel>

      <MobilePanel title="结构模板">
        <div className="space-y-3">
          {sampleReferences.map((item, index) => (
            <button
              aria-pressed={selectedReference === item.title}
              key={item.title}
              className={[
                "block w-full touch-manipulation rounded-[22px] border bg-white p-3 text-left active:scale-[0.99]",
                selectedReference === item.title ? "border-moss ring-2 ring-moss/15" : "border-[#d6e8df]"
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

function CreateScreen({
  credentials,
  onAction
}: {
  credentials: CredentialSettings;
  onAction: (message: string) => void;
}) {
  const [platform, setPlatform] = useState<MobilePlatform>("xiaohongshu");
  const [contentMode, setContentMode] = useState<"short" | "xiaohongshu">("xiaohongshu");
  const [topic, setTopic] = useState("硕升博申请第一步，不是先套磁");
  const [targetAudience, setTargetAudience] = useState("准备硕升博申请的学生");
  const [tagsText, setTagsText] = useState("硕升博,博士申请,研究方向,申请规划");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedCover, setGeneratedCover] = useState<GeneratedImageAsset | null>(null);
  const [draftPreview, setDraftPreview] = useState<DraftPreviewState>({
    body:
      "很多人一上来就急着群发邮件，但研究方向、读博动机和导师匹配没想清楚，反而容易浪费第一印象。",
    points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
    tags: "#硕升博 #博士申请 #研究方向",
    title: "不是先套磁，先想清楚这 3 件事"
  });
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

  useEffect(() => {
    let active = true;

    async function loadLatestCover(contentId: number) {
      try {
        const response = await fetch(`${API_BASE}/image/list?content_id=${contentId}&limit=1`);
        if (!response.ok) {
          return;
        }

        const images: unknown = await response.json();
        if (!Array.isArray(images)) {
          return;
        }

        const latestCover = images.find(
          (image): image is GeneratedImageAsset =>
            isGeneratedImageAsset(image) && image.content_id === contentId
        );
        if (active && latestCover) {
          setGeneratedCover(latestCover);
          saveStoredMobileCover(latestCover);
          onAction("已找回最近封面图。");
        }
      } catch (_error) {
        // Keep the cached cover visible if the network check fails.
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

        const latestContent = data.find(isGeneratedContent);
        if (active && latestContent) {
          const storedCover = readStoredMobileCover();
          setGeneratedContent(latestContent);
          setDraftPreview(draftStateFromContent(latestContent));
          saveStoredMobileContent(latestContent);
          if (storedCover?.content_id === latestContent.id) {
            setGeneratedCover(storedCover);
          } else {
            setGeneratedCover(null);
          }
          void loadLatestCover(latestContent.id);
        }
      } catch (_error) {
        // The generate action below remains usable even if history cannot be loaded.
      }
    }

    const storedContent = readStoredMobileContent();
    const storedCover = readStoredMobileCover();
    if (storedContent?.platform === platform) {
      setGeneratedContent(storedContent);
      setDraftPreview(draftStateFromContent(storedContent));
      if (storedCover?.content_id === storedContent.id) {
        setGeneratedCover(storedCover);
      }
      void loadLatestCover(storedContent.id);
    }

    void loadLatestContent();
    return () => {
      active = false;
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

  async function showCompletionNotification(content: GeneratedContent, cover: GeneratedImageAsset) {
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

  async function notifyGenerationComplete(content: GeneratedContent, cover: GeneratedImageAsset) {
    const soundPlayed = await playCompletionSound();
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
    await showCompletionNotification(content, cover);
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
      clearStoredMobileCover();
      setProgressStage("封面图生成中", 68, 94);

      const isDouyinPost = platform === "douyin";
      const imageResponse = await fetch(`${API_BASE}/image/generate`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          aspect_ratio: isDouyinPost ? "9:16" : "3:4",
          content_id: data.id,
          style_notes: isDouyinPost
            ? "抖音图文封面，强标题、高对比、真实学习/申请材料场景，避免录取承诺。"
            : "小红书高吸引封面，真实学习/申请材料场景，大字反常识标题，三点清单，避免录取承诺。",
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
      finishProgress("已完成");
      void notifyGenerationComplete(data, cover);
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
      onAction(generatedContent ? "当前草稿已复制。" : "当前预览文案已复制。");
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

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/55 p-4 text-ink shadow-[0_22px_48px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-xl">
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
          className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#ff2442]/12 blur-2xl"
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">一键生产</div>
              <h2 className="mt-1 text-[25px] font-black leading-8">撰稿 + 封面图</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/70 bg-white/62 text-[#ff2442] shadow-[inset_0_1px_0_rgba(255,255,255,0.80)] backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_74px] gap-2">
            <div className="rounded-[17px] border border-white/70 bg-white/50 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] backdrop-blur-md">
              <div className="text-[11px] font-black text-ink/45">当前状态</div>
              <div className="mt-1 truncate text-xs font-black text-ink/72">{heroProgressLabel}</div>
            </div>
            <div className="flex items-center justify-center rounded-[17px] border border-[#ffdbe2] bg-[#fff5f7]/86 text-center text-xs font-black text-[#a2152c] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur">
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
        title="手机端生成"
        action={<span className="text-xs font-semibold text-moss">生成入口</span>}
      >
        <label className="block">
          <span className="text-xs font-medium text-muted">选题</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-[#d6e8df] bg-white px-4 text-sm font-medium text-ink outline-none"
            data-testid="mobile-topic"
            onChange={(event) => setTopic(event.target.value)}
            value={topic}
          />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted">目标人群</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-[#d6e8df] bg-white px-4 text-sm font-medium text-ink outline-none"
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
            className="mt-2 h-11 w-full rounded-md border border-[#d6e8df] bg-white px-3 text-sm font-medium text-ink outline-none"
            data-testid="mobile-tags"
            onChange={(event) => setTagsText(event.target.value)}
            value={tagsText}
          />
        </label>
        <button
          aria-label="一键完成撰稿和封面图"
          className="mt-4 flex h-[54px] w-full touch-manipulation items-center justify-center gap-2 rounded-[20px] bg-[#ff2442] text-sm font-black text-white shadow-[0_16px_34px_rgba(255,36,66,0.22)] active:scale-[0.99] disabled:opacity-60"
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

      <DraftPreviewCard
        coverImageUrl={coverImageUrl}
        draft={draftPreview}
        generatedContent={generatedContent}
        onClick={() => setPreviewOpen(true)}
      />
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

function SettingsScreen({
  credentials,
  mobileAccount,
  onAction,
  onCredentialsChange,
  onLogout,
  onProviderStatusesChange,
  providerStatuses
}: {
  credentials: CredentialSettings;
  mobileAccount: string;
  onAction: (message: string) => void;
  onCredentialsChange: (nextCredentials: CredentialSettings) => void;
  onLogout: () => void;
  onProviderStatusesChange: (nextStatuses: ProviderStatusItem[]) => void;
  providerStatuses: ProviderStatusItem[];
}) {
  const [busyAction, setBusyAction] = useState<"apply" | "check" | null>(null);
  const [checkStatus, setCheckStatus] = useState<ProviderCheckResult | null>(null);
  const providerBindings = providerBindingDefaultsFromStatuses(providerStatuses);

  function updateCredential(key: keyof CredentialSettings, value: string) {
    onCredentialsChange({ ...credentials, [key]: value });
  }

  function clearCredentials() {
    onCredentialsChange(emptyCredentials);
    setCheckStatus(null);
    onAction("已清空这台设备保存的服务配置。");
  }

  async function applyProviderKeys() {
    const payload = providerKeyUpdatePayload(credentials);

    setBusyAction("apply");
    onAction(
      Object.keys(payload).length
        ? "正在应用服务配置。"
        : "正在刷新当前保存状态。"
    );
    try {
      if (!Object.keys(payload).length) {
        const statuses = await fetchProviderStatuses();
        onProviderStatusesChange(statuses);
        onAction("已刷新保存状态；没有填写新密钥，不会覆盖。");
        setCheckStatus(null);
        return;
      }

      const response = await fetch(`${API_BASE}/workspace/provider-keys`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "服务配置应用失败。"));
      }
      const statuses = sanitizeProviderStatusItems(
        (await response.json()) as ProviderStatusItem[]
      );
      onProviderStatusesChange(statuses);
      onAction("服务配置已应用到当前工作台。");
      setCheckStatus(null);
    } catch (error) {
      onAction(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : "服务配置应用失败。")
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function checkDraftProvider() {
    setBusyAction("check");
    onAction("正在检测撰稿服务连接。");
    try {
      const response = await fetch(`${API_BASE}/workspace/provider-check`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({ target: "draft" })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "撰稿服务检测失败。"));
      }
      const data = (await response.json()) as ProviderCheckResult;
      const displayData = { ...data, message: sanitizeServiceErrorMessage(data.message) };
      setCheckStatus(displayData);
      onAction(
        displayData.status === "ok"
          ? displayData.message
          : `检测未通过：${displayData.message}`
      );
    } catch (error) {
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "撰稿服务检测失败。"
      );
      setCheckStatus({
        configured: false,
        message,
        status: "failed",
        target: "draft"
      });
      onAction(message);
    } finally {
      setBusyAction(null);
    }
  }

  const credentialFields: Array<{
    keyName: keyof CredentialSettings;
    label: string;
    placeholder: string;
    testId: string;
    backendBound?: boolean;
  }> = [
    {
      keyName: "workspaceToken",
      label: "登录验证（可选）",
      placeholder: "无需填写",
      testId: "mobile-token"
    },
    {
      keyName: "draftApiKey",
      label: "撰稿服务密钥",
      placeholder: "留空则保留已有配置",
      testId: "mobile-draft-key",
      backendBound: providerBindings.draft
    },
    {
      keyName: "imageApiKey",
      label: "图片服务密钥",
      placeholder: "留空则保留已有配置",
      testId: "mobile-image-key",
      backendBound: providerBindings.image
    },
    {
      keyName: "rewriteApiKey",
      label: "改写服务密钥",
      placeholder: "留空则保留已有配置",
      testId: "mobile-rewrite-key",
      backendBound: providerBindings.rewrite
    }
  ];

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/55 p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: `url(${MOBILE_COLLECTION_COLLAGE})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,244,0.96)_0%,rgba(255,252,244,0.82)_48%,rgba(255,252,244,0.58)_100%)]" />
        <div aria-hidden="true" className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#38bf6b]/12 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">当前账号</div>
              <h2 className="mt-1 text-[24px] font-black leading-7">{mobileAccount}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">默认服务 Key 已绑定，生成链路可直接使用。</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/58 text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur">
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
                className={`rounded-[16px] border border-white/60 px-3 py-2 text-center text-xs font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] backdrop-blur ${
                  bound ? "bg-[#e7f2ea]/88 text-moss" : "bg-[#fff6d8]/88 text-[#8a5a00]"
                }`}
                key={String(label)}
              >
                <div>{label}</div>
                <div className="mt-1 text-[10px]">{bound ? "已绑定" : "待配置"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <MobilePanel title="登录状态" action={mobileAccount}>
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/70 bg-[#f9fbf6] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">{mobileAccount}</div>
            <div className="mt-1 text-xs text-muted">当前工作台无需登录验证；需要时可在设置中开启。</div>
          </div>
          <button
            className="flex h-10 shrink-0 touch-manipulation items-center gap-2 rounded-md border border-[#d6e8df] bg-[#f6fbf6] px-3 text-xs font-semibold text-ink active:scale-[0.98]"
            data-testid="mobile-logout"
            onClick={onLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      </MobilePanel>
      <MobilePanel title="服务配置" action="此设备可配置">
        <p className="mb-3 text-xs leading-5 text-muted">
          服务密钥只保存在这台设备；应用后由当前工作台调用服务，不会展示完整密钥。
        </p>
        <div className="space-y-3">
          {credentialFields.map((field) => {
            const localFilled = credentials[field.keyName].trim().length > 0;
            const statusText = field.keyName === "workspaceToken"
              ? "无需填写"
              : localFilled
                ? "当前设备已填写"
                : field.backendBound
                  ? "已保存"
                  : "未配置";
            const statusClass = field.keyName === "workspaceToken" || localFilled || field.backendBound
              ? "bg-[#e5f2ec] text-moss"
              : "bg-[#fff3d8] text-[#8a5a00]";

            return (
            <label className="block" key={field.keyName}>
              <span className="flex items-center justify-between gap-2 text-xs font-medium text-muted">
                <span>{field.label}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                  {statusText}
                </span>
              </span>
              <input
                className="mt-2 h-11 w-full rounded-full border border-[#d6e8df] bg-white px-4 text-sm font-medium text-ink outline-none focus:border-moss focus:ring-2 focus:ring-moss/15"
                data-testid={field.testId}
                onChange={(event) => updateCredential(field.keyName, event.target.value)}
                placeholder={field.placeholder}
                type="password"
                value={credentials[field.keyName]}
              />
            </label>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-paper active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-apply-keys"
            disabled={busyAction === "apply"}
            onClick={applyProviderKeys}
            type="button"
          >
            {busyAction === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busyAction === "apply" ? "应用中" : "应用服务配置"}
          </button>
          <button
            className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full border border-[#d6e8df] bg-white text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-check-draft"
            disabled={busyAction === "check"}
            onClick={checkDraftProvider}
            type="button"
          >
            {busyAction === "check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {busyAction === "check" ? "检测中" : "检测撰稿连接"}
          </button>
          <button
            className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full border border-[#d6e8df] bg-white text-sm font-semibold text-ink active:scale-[0.99]"
            data-testid="mobile-clear-credentials"
            onClick={clearCredentials}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            清空此设备保存
          </button>
        </div>
        {checkStatus ? (
          <div className="mt-3 rounded-[22px] border border-[#d6e8df] bg-white px-4 py-2 text-xs leading-5 text-muted">
            {checkStatus.status === "ok" ? "检测通过：" : "检测未通过："}
            {checkStatus.message}
          </div>
        ) : null}
      </MobilePanel>
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
      className="absolute bottom-0 left-0 right-0 z-20 overflow-hidden border-t border-white/60 bg-white/40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_42px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-2xl sm:rounded-b-[30px]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.54),rgba(255,255,255,0.20)_58%,rgba(216,230,220,0.26))]"
      />
      <div className="relative grid grid-cols-4 gap-1">
        {bottomTabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              aria-label={`${tab.label}${active ? "，当前页面" : ""}`}
              aria-pressed={active}
              key={tab.id}
              className={[
                "flex min-h-[54px] touch-manipulation flex-col items-center justify-center gap-1 rounded-[18px] border text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] backdrop-blur-xl transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-moss/35",
                active
                  ? "border-white/30 bg-black/70 text-white shadow-[0_12px_28px_rgba(18,24,20,0.20),inset_0_1px_0_rgba(255,255,255,0.14)]"
                  : "border-white/0 bg-white/10 text-muted active:bg-white/40"
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
    <section className="rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_16px_40px_rgba(31,58,49,0.09)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black">{title}</h2>
        {typeof action === "string" ? (
          <span className="rounded-full bg-[#e7f2ea] px-2.5 py-1 text-xs font-black text-moss">{action}</span>
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
      className={["min-h-[82px] touch-manipulation rounded-[20px] border border-white/70 p-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.07)] active:scale-[0.98]", toneClass[tone]].join(" ")}
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
      className="flex min-h-[68px] w-full touch-manipulation items-center gap-3 rounded-[20px] border border-white/70 bg-[#fffdf7]/88 px-3 py-3 text-left shadow-[0_10px_28px_rgba(31,58,49,0.07)] active:scale-[0.99] active:border-moss"
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
      className="min-h-[118px] touch-manipulation rounded-[20px] border border-white/70 bg-[#f9fbf6]/90 p-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.07)] active:scale-[0.98] active:border-moss"
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
        "min-h-12 touch-manipulation rounded-full border px-3 text-sm font-black active:scale-[0.98]",
        active ? "border-[#161817] bg-[#161817] text-white shadow-[0_10px_24px_rgba(22,24,23,0.13)]" : "border-white/75 bg-white/86 text-muted active:bg-white"
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
              <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold text-ink/70">
                参考
              </span>
            </div>
            <h1 className="mt-10 text-[32px] font-black leading-tight text-ink">{reference.title}</h1>
            <div className="mt-8 space-y-2 text-xs font-semibold text-ink/70">
              {reference.coverNotes.map((note, index) => (
                <div className="rounded-md bg-white/85 px-3 py-2" key={note}>
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
              {reference.body.split(/\n+/).map((paragraph) => (
                <p key={paragraph}>{renderXhsExpressionText(paragraph)}</p>
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
        className={`${className} flex flex-col items-center justify-center gap-2 bg-[#f7f7f7] px-5 text-center text-xs font-semibold text-ink/65`}
        data-testid={`${testId}-fallback`}
      >
        <Image className="h-7 w-7 text-steel" />
        <span>封面图加载失败</span>
        <span className="text-[11px] font-medium text-ink/45">请重新生成封面或检查图片服务</span>
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

function DraftPreviewCard({
  coverImageUrl,
  draft,
  generatedContent,
  onClick
}: {
  coverImageUrl: string | null;
  draft: DraftPreviewState;
  generatedContent: GeneratedContent | null;
  onClick: () => void;
}) {
  return (
    <button
      className="block w-full touch-manipulation overflow-hidden rounded-md border border-[#d6e8df] bg-[linear-gradient(160deg,#fff7df,#d9f1e5_48%,#f7cdbf)] p-4 text-left active:scale-[0.99]"
      data-testid="draft-card"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-steel">草稿</span>
        <span className="rounded-md bg-white/75 px-2 py-1 text-[11px] font-semibold text-ink/70">
          {generatedContent ? `#${generatedContent.id}` : "可编辑预览"}
        </span>
        <Layers3 className="h-4 w-4 text-steel" />
      </div>
      {coverImageUrl ? (
        <CoverImagePreview
          alt="已生成封面图"
          className="mt-4 aspect-[3/4] w-full rounded-md bg-[#f7f7f7] object-contain"
          src={coverImageUrl}
          testId="draft-cover-image"
        />
      ) : (
        <div className="mt-5 text-3xl font-black leading-tight text-ink">
          {draft.title.split(/[，,]/).slice(0, 3).map((line) => (
            <span className="block" key={line}>
              {line}
            </span>
          ))}
        </div>
      )}
      <div className="mt-5 space-y-2 text-xs font-semibold text-ink/70">
        {draft.points.map((point, index) => (
          <div className="rounded-md bg-white/85 px-3 py-2" key={`${point}-${index}`}>
            {index + 1}. {point}
          </div>
        ))}
      </div>
    </button>
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
    const copied = await onCopy();
    setManualCopyText(copied ? null : buildEditableDraftCopy(draft));
    const message = copied ? "文案已复制，可以直接去小红书粘贴。" : "浏览器拦截了剪贴板，文案已展开，可长按全选复制。";
    publishExportStatus(message);
  }

  async function handleOpenXiaohongshu() {
    const draftText = buildEditableDraftCopy(draft);
    setEditing(false);
    setManualCopyText(null);
    setXhsExporting(true);
    publishExportStatus("正在复制文案并准备封面图。");
    try {
      const textCopied = await tryCopyText(draftText);
      if (!textCopied) {
        setManualCopyText(draftText);
        throw new Error("浏览器拦截了剪贴板，文案已展开，可长按全选复制。");
      }
      const coverFile = await buildXhsCoverFile(coverImageUrl, draft);

      const shareData: ShareData = {
        files: [coverFile],
        text: draftText,
        title: draft.title
      };
      const canShareFiles =
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [coverFile] }));

      if (canShareFiles) {
        publishExportStatus("文案已复制，正在打开系统分享；选择小红书即可带入封面图。");
        try {
          await navigator.share(shareData);
        } catch (error) {
          const errorName = error instanceof DOMException ? error.name : "";
          if (errorName === "AbortError") {
            const restored = await tryCopyText(draftText);
            setManualCopyText(restored ? null : draftText);
            const abortMessage = restored
              ? "已取消系统分享；文案已重新复制，可以直接去小红书粘贴。"
              : `已取消系统分享；文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。`;
            publishExportStatus(abortMessage);
            return;
          }
          throw error;
        }
        const sharedCopyRestored = await tryCopyText(draftText);
        setManualCopyText(sharedCopyRestored ? null : draftText);
        const sharedMessage = sharedCopyRestored
          ? "已交给系统分享；文案已重新复制，如果小红书没有自动带入正文，请直接粘贴。"
          : `已交给系统分享；如果小红书没有自动带入正文，文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。`;
        publishExportStatus(sharedMessage);
        return;
      }

      downloadFile(coverFile);
      const fallbackTextRestored = await tryCopyText(draftText);
      setManualCopyText(fallbackTextRestored ? null : draftText);
      const fallbackMessage = fallbackTextRestored
        ? "文案已复制，封面图已下载；正在打开小红书，请新建图文后粘贴正文。"
        : "封面图已下载；浏览器拦截了剪贴板，文案已展开，可长按全选复制。";
      publishExportStatus(fallbackMessage);
      window.location.href = "https://www.xiaohongshu.com/explore";
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
        ? "预览链接已复制；当前是这台设备或同一网络地址，外部用户需要部署到公网后才能打开。"
        : "预览链接已复制，可以发给别人查看。";
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
                  <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold text-ink/70">
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
                <div className="mt-8 space-y-2 text-xs font-semibold text-ink/70">
                  {draft.points.map((point, index) => (
                    <div className="rounded-md bg-white/85 px-3 py-2" key={`${point}-${index}`}>
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
                    <div className="truncate text-sm font-semibold">OPC 内容运营</div>
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
                    bodyParagraphs.map((paragraph) => (
                      <p key={paragraph}>{renderXhsExpressionText(paragraph)}</p>
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

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#eeeeee] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
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
              className="mb-2 max-h-28 w-full resize-none rounded-[18px] border border-[#ffd78f] bg-[#fffaf0] px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-[#ff2442] focus:ring-2 focus:ring-[#ff2442]/15"
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

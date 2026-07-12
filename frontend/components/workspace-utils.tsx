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
  type GeneratedContent
} from "@/lib/generated-assets";
import {
  sanitizeProviderStatusItems,
  type ProviderStatusItem
} from "@/lib/provider-settings";
import {
  SERVICE_CONFIG_READ_ERROR,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import { hiddenXhsStickerToneGuide } from "@/lib/xhs-sticker-catalog";

import { isTestDraft } from "@/lib/workspace-prepublish-checklist";

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
export const CREDENTIAL_STORAGE_KEY = "opc_pc_credentials_v1";
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

export function isDependencyItem(value: unknown): value is DependencyItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.category === "string" &&
    (v.detected === null || typeof v.detected === "string") &&
    (v.fix === null || typeof v.fix === "string") &&
    typeof v.message === "string" &&
    (v.minimum === null || typeof v.minimum === "string") &&
    typeof v.name === "string" &&
    typeof v.required === "boolean" &&
    (v.status === "ok" || v.status === "warning" || v.status === "missing" || v.status === "outdated")
  );
}

export function isDependencyReport(value: unknown): value is DependencyReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const summary = v.summary;
  return (
    typeof v.generated_at === "string" &&
    Array.isArray(v.items) &&
    v.items.every(isDependencyItem) &&
    Array.isArray(v.repair_steps) &&
    v.repair_steps.every((s) => typeof s === "string") &&
    (v.status === "ok" || v.status === "attention" || v.status === "blocked") &&
    typeof summary === "object" && summary !== null &&
    typeof (summary as Record<string, unknown>).blocking === "number" &&
    typeof (summary as Record<string, unknown>).ok === "number" &&
    typeof (summary as Record<string, unknown>).total === "number" &&
    typeof (summary as Record<string, unknown>).warning === "number"
  );
}

export const emptyCredentials: CredentialSettings = {
  workspaceToken: "",
  draftApiKey: "",
  imageApiKey: "",
  rewriteApiKey: ""
};

export {
  creationProjects,
  type CreationProjectId,
  findEnabledCreationProject,
  updateCreationProjectQuery
} from "@/lib/creation-projects";

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

export const defaultGenerationKnowledgeQuery = "硕升博 高赞图文 写作参考";
export const defaultGenerationTargetAudience = "准备硕升博申请的学生";
export const defaultGenerationTagsText = "硕升博,水博,博士申请,小红书获客";

export const xhsHighAttractionCoverStyle =
  "小红书高吸引封面：先按选题选择不同封面路线，优先轮换路线/榜单矩阵、决策地图、学术蓝图、杂志页、黑板批注、手机信息拼贴等结构；只有需要时才用学习桌或清单芯片。水博/在职博士/升博类内容可参考“水博榜”的路线矩阵思路，但学校、价格、认证和毕业难度必须来自已核实知识库，不能编造；避免官方标志、校徽、录取承诺和重复的奶油珊瑚薄荷模板。";

export const douyinHighAttractionCoverStyle =
  "抖音图文封面：9:16高对比竖版首屏，强结果标题，真实学习/申请材料场景，短清单信息块，明亮但不杂乱，避免官方标志和录取承诺。";

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
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (_error) {
    // Some embedded browsers disable localStorage. The workspace must keep working without it.
  }
}

export function removeLocalStorage(key: string) {
  if (typeof window === "undefined") return;
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

export function isProviderCheckResult(value: unknown): value is ProviderCheckResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Partial<ProviderCheckResult>;
  return (
    typeof result.configured === "boolean" &&
    typeof result.message === "string" &&
    typeof result.status === "string" &&
    typeof result.target === "string"
  );
}

export type WorkspaceLoginResponse = {
  account: string;
  access_token?: string;
  default_keys_bound: boolean;
  key_profile: string;
  provider_statuses: ProviderStatusItem[];
};

export function isWorkspaceLoginResponse(value: unknown): value is WorkspaceLoginResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.account === "string" &&
    (v.access_token === undefined || typeof v.access_token === "string") &&
    typeof v.default_keys_bound === "boolean" &&
    typeof v.key_profile === "string" &&
    Array.isArray(v.provider_statuses)
  );
}

export async function fetchProviderStatuses(workspaceToken?: string, signal?: AbortSignal) {
  const headers = workspaceToken ? { "Content-Type": "application/json", Authorization: `Bearer ${workspaceToken}` } : undefined;
  const response = await fetch(`${API_BASE}/workspace/provider-status`, {
    headers,
    signal
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, SERVICE_CONFIG_READ_ERROR));
  }
  const raw: unknown = await response.json().catch(() => null);
  return sanitizeProviderStatusItems(raw);
}

export async function authenticateWorkspaceLogin(account: string, password: string, signal?: AbortSignal) {
  try {
    const response = await fetch(`${API_BASE}/auth/mobile-login`, {
      body: JSON.stringify({ account, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal
    });

    if (response.ok) {
      const raw: unknown = await response.json().catch(() => null);
      if (!isWorkspaceLoginResponse(raw) || !raw.account.trim()) {
        throw new Error("登录服务响应异常，请稍后再试。");
      }
      const accessToken = typeof raw.access_token === "string" ? raw.access_token : "";
      if (!accessToken) {
        throw new Error("登录服务未返回有效的访问令牌，请稍后再试。");
      }
      return {
        account: raw.account.trim(),
        accessToken,
        defaultKeysBound: raw.default_keys_bound,
        providerStatuses: sanitizeProviderStatusItems(raw.provider_statuses)
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

export {
  blockedPublishTerms,
  localDraftMarkers,
  pcReviewQueueStatuses,
  buildPlatformCopy,
  complianceWarnings,
  isTestDraft,
  isPcReviewQueueCandidate,
  type PrepublishChecklistState,
  type PrepublishChecklistItem,
  prepublishChecklistTone,
  prepublishChecklistStateLabel,
  missingGeneratedContentFields,
  buildPrepublishChecklist
} from "@/lib/workspace-prepublish-checklist";

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

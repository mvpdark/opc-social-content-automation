"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  Heart,
  Image,
  KeyRound,
  Loader2,
  MessageCircle,
  PenLine,
  RotateCcw,
  Save,
  Settings,
  Share2,
  ShieldCheck,
  Terminal,
  Trash2,
  X
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatStrip } from "@/components/stat-strip";
import { TrendCollectorPanel } from "@/components/trend-collector-panel";
import {
  commandFocus,
  connectionStatuses,
  contentControls,
  coverReferences,
  dashboardActionLinks,
  draftPreview,
  imageWorkflow,
  interfaceStyles,
  knowledgeAssets,
  nextActions,
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

const stateTone = {
  当前重点: "border-steel bg-steel/10 text-ink",
  可用: "border-moss bg-moss/10 text-ink",
  配置后可用: "border-amber bg-amber/10 text-ink",
  强制: "border-coral bg-coral/10 text-ink",
  追踪: "border-amber bg-amber/10 text-ink"
} satisfies Record<(typeof pipeline)[number]["state"], string>;

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8010/api";
const CREDENTIAL_STORAGE_KEY = "opc_workspace_credentials_v1";
const INTERFACE_STYLE_STORAGE_KEY = "opc_interface_style_v1";

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
      "偏女性可爱风，像学姐认真提醒：语气温柔、轻松、有陪伴感，开头要有共鸣，不要像硬广"
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
type ExpressionOptionKey = "emoji" | "punctuation" | "meme" | "softCta";

const defaultExpressionOptions: Record<ExpressionOptionKey, boolean> = {
  emoji: true,
  punctuation: true,
  meme: true,
  softCta: true
};

const expressionOptions = [
  {
    key: "emoji",
    label: "轻量表情",
    enabled: "每 2-3 段可以放 1 个 emoji 或颜文字",
    disabled: "不使用 emoji 或颜文字"
  },
  {
    key: "punctuation",
    label: "活泼标点",
    enabled: "允许使用 ～、！！、？ 来制造口语节奏，但不要连续堆叠",
    disabled: "标点保持克制"
  },
  {
    key: "meme",
    label: "表情包感",
    enabled: "可以用短括号吐槽和口语停顿制造表情包感，例如“先别急”“真的别反着来”",
    disabled: "不使用吐槽式表达"
  },
  {
    key: "softCta",
    label: "软 CTA",
    enabled: "结尾用温和提醒引导咨询，不制造焦虑，不承诺结果",
    disabled: "结尾只给中性建议"
  }
] as const;

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

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return workspaceTabIds.includes(value as WorkspaceTab);
}

function isInterfaceStyle(value: string | null): value is InterfaceStyle {
  return interfaceStyles.some((style) => style.id === value);
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

async function readApiError(response: Response, fallback: string) {
  const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
  if (errorBody?.detail === "database_unavailable") {
    return "数据库暂时不可用，请检查 PostgreSQL 服务和 DATABASE_URL。";
  }
  return errorBody?.message ?? errorBody?.detail ?? fallback;
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

type ProviderStatusItem = {
  configured: boolean;
  model: string | null;
  name: string;
  note: string;
  provider: string;
  status: string;
};

type ProviderCheckResult = {
  configured: boolean;
  message: string;
  status: string;
  target: string;
};

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

function complianceWarnings(content: GeneratedContent) {
  const text = `${content.title}\n${content.body}\n${formatTagLine(content.tags)}`;
  return blockedPublishTerms.filter((term) => text.includes(term));
}

function isTestDraft(content: GeneratedContent) {
  return content.body.includes("codex_test") || content.body.includes("【测试草稿】");
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
  const [showHelperText, setShowHelperText] = useState(true);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [credentials, setCredentials] = useState<CredentialSettings>(emptyCredentials);

  useEffect(() => {
    function syncStateFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      const theme = params.get("theme");

      if (tab === "review") {
        params.set("tab", "content");
        window.history.replaceState(null, "", `/?${params.toString()}`);
        setActiveTab("content");
      } else {
        setActiveTab(isWorkspaceTab(tab) ? tab : "dashboard");
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

  return (
    <AppShell
      activeTab={activeTab}
      interfaceStyle={interfaceStyle}
      showHelperText={showHelperText}
    >
      {activeTab === "dashboard" ? <DashboardView /> : null}
      {activeTab === "research" ? (
        <ResearchView
          onOpenSettings={() => handleTabChange("settings")}
          workspaceToken={credentials.workspaceToken}
        />
      ) : null}
      {activeTab === "knowledge" ? <KnowledgeView /> : null}
      {activeTab === "content" ? (
        <ContentView
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

function DashboardView() {
  const primaryFocus = commandFocus[0];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          action={
            <Pill tone="blue">
              <ShieldCheck className="h-3.5 w-3.5" />
              公开采集优先
            </Pill>
          }
          helper="首页只保留当前最重要的动作，细节进入对应标签页处理。"
          title="今日重点"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
            <div className="glass-subtle flex items-start gap-4 rounded-md border p-4">
              <IconBox tone="blue">
                <primaryFocus.icon className="h-4 w-4" />
              </IconBox>
              <div>
                <div className="text-lg font-semibold leading-7">{primaryFocus.title}</div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{primaryFocus.detail}</p>
              </div>
            </div>
            <div className="glass-subtle divide-y divide-line rounded-md border">
              {nextActions.map((action, index) => (
                <div key={action} className="flex items-center gap-3 px-3 py-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-semibold text-paper">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium leading-5">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel helper="首页只放能直接进入的动作。" title="继续推进">
          <div className="grid grid-cols-1 gap-3">
            {dashboardActionLinks.map((item) => (
              <a
                className="glass-subtle flex items-start gap-3 rounded-md border p-3 transition hover:border-coral/50 hover:bg-mist/70"
                href={item.href}
                key={item.title}
              >
                <IconBox tone={item.status === "当前重点" ? "blue" : "green"}>
                  <item.icon className="h-4 w-4" />
                </IconBox>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-5">{item.title}</div>
                  <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
                </div>
                <span className="shrink-0 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink">
                  {item.command}
                </span>
              </a>
            ))}
          </div>
        </Panel>
      </section>

      <DependencyDoctorPanel />

      <StatStrip />

      <Panel helper="完整流程保留，但首页只展示状态概览。" title="MVP 生产线">
        <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-3 xl:grid-cols-6">
          {pipeline.map((step, index) => (
            <div key={step.title} className="px-3 py-3 md:first:pl-0 xl:px-3">
              <div className="flex items-center justify-between gap-3">
                <IconBox tone={index === 0 ? "blue" : step.state === "强制" ? "red" : "green"}>
                  <step.icon className="h-4 w-4" />
                </IconBox>
                <span
                  className={[
                    "rounded-md border px-2 py-1 text-xs font-medium",
                    stateTone[step.state]
                  ].join(" ")}
                >
                  {step.state}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold leading-5">{step.title}</div>
              <p className="mt-2 text-xs leading-5 text-muted xl:hidden 2xl:block">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Panel>
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
  onOpenSettings,
  workspaceToken
}: {
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [previewContent, setPreviewContent] = useState<GeneratedContent | null>(null);

  return (
    <div className="space-y-4">
      <GenerationLauncher
        onGeneratedContent={setPreviewContent}
        onOpenSettings={onOpenSettings}
        workspaceToken={workspaceToken}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <DraftPanel content={previewContent} />
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
  onGeneratedContent,
  onOpenSettings,
  workspaceToken
}: {
  onGeneratedContent: (content: GeneratedContent) => void;
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [platform, setPlatform] = useState("xiaohongshu");
  const [topic, setTopic] = useState("硕升博申请第一步，不是先套磁");
  const [knowledgeQuery, setKnowledgeQuery] = useState("硕升博 高赞图文 写作参考");
  const [targetAudience, setTargetAudience] = useState("准备硕升博申请的学生");
  const [stylePreset, setStylePreset] = useState<WritingStylePresetId>("warm_cute");
  const [styleOptions, setStyleOptions] =
    useState<Record<ExpressionOptionKey, boolean>>(defaultExpressionOptions);
  const [tone, setTone] = useState(() =>
    buildWritingTone("warm_cute", defaultExpressionOptions)
  );
  const [tagsText, setTagsText] = useState("硕升博,博士申请,研究方向,申请规划");
  const [busyAction, setBusyAction] = useState<"draft" | null>(null);
  const [statusText, setStatusText] = useState("填写选题后，点击“开始生产图文”创建草稿。");
  const [lastContent, setLastContent] = useState<GeneratedContent | null>(null);
  const [needsProviderSettings, setNeedsProviderSettings] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [draftCheckStatus, setDraftCheckStatus] = useState<ProviderCheckResult | null>(null);
  const [draftCheckBusy, setDraftCheckBusy] = useState(false);

  const hasTopic = topic.trim().length > 0;
  const draftProviderStatus = providerStatuses.find((item) => item.name === "Draft generation");
  const draftProviderMissing = Boolean(providerStatuses.length && !draftProviderStatus?.configured);
  const draftProviderCheckFailed = Boolean(
    draftCheckStatus && draftCheckStatus.status !== "ok"
  );
  const draftProviderBlocked = draftProviderMissing || draftProviderCheckFailed;
  const canGenerate = hasTopic && busyAction === null && !draftProviderBlocked;
  const generateButtonLabel = !hasTopic
      ? "先填写选题"
      : draftProviderMissing
        ? "先配置撰稿服务"
      : draftProviderCheckFailed
        ? "先修复撰稿服务"
      : "开始生产图文";
  const generateButtonTitle = !hasTopic
      ? "先填写选题，再开始生产图文"
      : draftProviderMissing
        ? "去设置里填写并应用撰稿 API Key"
      : draftProviderCheckFailed
        ? "检测到撰稿服务不可用，请先去设置页更换或重新应用 API Key"
      : undefined;
  const launchStatusText = !hasTopic
      ? "先填写选题，再开始生产图文。"
      : draftProviderMissing
        ? "撰稿服务缺少 API Key，先去设置页填写并应用。"
      : draftProviderCheckFailed
        ? draftCheckStatus?.message ?? "撰稿服务检测未通过，请先去设置页修复。"
      : statusText;
  const primaryGenerateLabel =
    busyAction === "draft"
      ? "正在生产草稿"
      : lastContent
        ? "重新生产草稿"
        : generateButtonLabel;
  const providerDisplayItems = [
    { label: "撰稿", name: "Draft generation" },
    { label: "改写", name: "Humanization rewrite" },
    { label: "图片", name: "Image generation" }
  ].map((item) => ({
    ...item,
    status: providerStatuses.find((statusItem) => statusItem.name === item.name)
  }));

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
    };
  }

  useEffect(() => {
    let active = true;

    async function loadProviderStatuses() {
      try {
        const response = await fetch(`${API_BASE}/workspace/provider-status`);
        if (!response.ok) {
          throw new Error(await readApiError(response, "服务状态读取失败。"));
        }
        const data = (await response.json()) as ProviderStatusItem[];
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
      setStatusText("先填写选题，再开始生产图文。");
      return;
    }

    setBusyAction("draft");
    setNeedsProviderSettings(false);
    setStatusText("正在生成图文草稿，生成后不会自动发布。");
    try {
      const response = await fetch(`${API_BASE}/content/generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          platform,
          topic: topic.trim(),
          knowledge_query: knowledgeQuery.trim() || undefined,
          tone: tone.trim() || undefined,
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
      setStatusText(
        `草稿 #${data.id} 已生成，当前状态：${data.status}。单独确认页已暂停，发布前仍需人工确认。`
      );
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

  return (
    <div data-testid="generation-launcher">
      <Panel
        action={
          <Pill tone={lastContent ? "green" : "blue"}>
            {lastContent ? `草稿 #${lastContent.id}` : "主入口"}
          </Pill>
        }
        helper="生成只创建草稿，不会自动发布；单独确认页暂时隐藏，发布前仍需人工确认。"
        title="开始生产图文"
      >
        <div className="mb-4 rounded-md border border-steel/40 bg-steel/10 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Pill tone={lastContent ? "green" : "blue"}>
                {lastContent ? `草稿 #${lastContent.id}` : "生产入口"}
              </Pill>
              <h3 className="mt-3 text-lg font-semibold leading-6 text-ink">
                选题确认后，点这里开始生产
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                当前会生成一篇营销图文草稿，不会自动发布。
              </p>
            </div>
            <button
              aria-label={primaryGenerateLabel}
              className="flex h-12 min-w-44 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-paper shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
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
              <span className="text-xs font-medium text-muted">平台</span>
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
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
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
              封面和发布交付仍保持禁用，等确认流程重新接入后再开放。
            </div>
          </div>
        </div>
        {lastContent ? <GeneratedPostExportCard content={lastContent} /> : null}
      </Panel>
    </div>
  );
}

function GeneratedPostExportCard({ content }: { content: GeneratedContent }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const warnings = complianceWarnings(content);
  const testDraft = isTestDraft(content);
  const canCopy = !testDraft;
  const copyPayload = buildPlatformCopy(content);
  const tagLine = formatTagLine(content.tags);

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
          <button
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-60"
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
                : "一键复制小红书文案"}
          </button>
        </div>

        <div className="mt-4 rounded-md border border-line bg-mist/70 p-4">
          <div className="whitespace-pre-wrap text-sm leading-7 text-ink">{content.body}</div>
          {tagLine ? (
            <div className="mt-4 text-sm font-medium leading-6 text-steel">{tagLine}</div>
          ) : null}
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          复制内容包含标题、正文和话题标签；不会自动发布，粘贴到小红书前仍需人工看一遍。
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
            封面图仍需单独生成和人工复核；不要使用假录取通知、校徽或保证录取视觉。
          </div>
          {copyState === "failed" && !testDraft ? (
            <div className="rounded-md border border-coral/40 bg-coral/10 p-3 text-ink">
              浏览器复制失败，请手动选中正文复制。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CoverView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.9fr)_1fr]">
      <Panel
        action={
          <button
            aria-label="生成封面，需确认流程重新接入后启用"
            className="flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-55"
            disabled
            title="需确认流程重新接入后启用"
            type="button"
          >
            <Image className="h-4 w-4" />
            生成封面
          </button>
        }
        helper="确认流程重新接入前保持禁用；下方仅展示参考版式，不代表已生成图片。"
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
  const [providerCheckStatus, setProviderCheckStatus] = useState<string | null>(null);
  const [providerCheckBusy, setProviderCheckBusy] = useState(false);
  const hasWorkspaceToken = credentials.workspaceToken.trim().length > 0;
  const canApplyProviderKeys = !credentialBusy;
  const canCheckProvider = !credentialBusy && !providerCheckBusy;
  const providerApplyLabel = "应用服务 API Key";

  function updateCredential(key: keyof CredentialSettings, value: string) {
    onCredentialsChange({ ...credentials, [key]: value });
  }

  function clearCredentials() {
    onCredentialsChange(emptyCredentials);
    setCredentialStatus("已清空本机保存的凭证。");
  }

  async function applyProviderKeys() {
    setCredentialBusy(true);
    setCredentialStatus("正在应用服务 API Key 到后端运行时。");
    try {
      const response = await fetch(`${API_BASE}/workspace/provider-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials.workspaceToken
            ? { Authorization: `Bearer ${credentials.workspaceToken}` }
            : {})
        },
        body: JSON.stringify({
          draft_api_key: credentials.draftApiKey,
          image_api_key: credentials.imageApiKey,
          deepseek_api_key: credentials.rewriteApiKey
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "服务 API Key 应用失败。"));
      }
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
    helper: string;
    keyName: keyof CredentialSettings;
    label: string;
    placeholder: string;
  }> = [
    {
      keyName: "workspaceToken",
      label: "登录令牌（可选）",
      placeholder: "策划师测试模式下不用填写",
      helper: "当前测试阶段已免登录；以后恢复正式登录时再填写 Bearer token。"
    },
    {
      keyName: "draftApiKey",
      label: "撰稿 API Key",
      placeholder: "sk-...",
      helper: "撰稿服务使用；应用到后端后由服务端调用。"
    },
    {
      keyName: "imageApiKey",
      label: "图片 API Key",
      placeholder: "sk-...",
      helper: "图片生成服务使用；封面生成走服务端。"
    },
    {
      keyName: "rewriteApiKey",
      label: "改写 API Key",
      placeholder: "sk-...",
      helper: "正文改写和人味化使用。"
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
            {credentialFields.map((field) => (
              <label key={field.keyName} className="block">
                <span className="text-xs font-medium text-muted">{field.label}</span>
                <input
                  className={`${formControlClass} h-10`}
                  onChange={(event) => updateCredential(field.keyName, event.target.value)}
                  placeholder={field.placeholder}
                  type="password"
                  value={credentials[field.keyName]}
                />
                <span className="mt-1 block text-xs leading-5 text-muted">{field.helper}</span>
              </label>
            ))}
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
              <Pill tone={credentials.draftApiKey ? "green" : "amber"}>
                撰稿 {credentials.draftApiKey ? "已填" : "未填"}
              </Pill>
              <Pill tone={credentials.imageApiKey ? "green" : "amber"}>
                图片 {credentials.imageApiKey ? "已填" : "未填"}
              </Pill>
              <Pill tone={credentials.rewriteApiKey ? "green" : "amber"}>
                改写 {credentials.rewriteApiKey ? "已填" : "未填"}
              </Pill>
            </div>
          </div>
        </div>
      </Panel>

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

function DraftPanel({ content }: { content: GeneratedContent | null }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const preview = {
    body: content?.body ?? draftPreview.body,
    id: content?.id ?? null,
    platform: content ? platformDisplayName(content.platform) : draftPreview.platform,
    status: content ? "可预览" : draftPreview.status,
    tags: content?.tags ?? draftPreview.tags,
    title: content?.title ?? draftPreview.title
  };
  const coverLines = buildCoverLines(preview.title);
  const paragraphs = formatPreviewParagraphs(preview.body);
  const tagLine = formatTagLine(preview.tags);
  const canCopy = Boolean(content && !isTestDraft(content));

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
      action={<Pill tone={content ? "green" : "amber"}>{preview.status}</Pill>}
      helper="按小红书笔记卡片和弹窗预览最终展示效果。"
      title="创作台"
    >
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(280px,360px)_1fr]">
        <article
          className="glass-subtle overflow-hidden rounded-[22px] border bg-paper shadow-panel"
          data-testid="xhs-preview-card"
        >
          <button
            aria-label="打开小红书发布效果预览"
            className="group block w-full text-left"
            data-testid="xhs-preview-cover-button"
            onClick={() => setPreviewOpen(true)}
            type="button"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.9),transparent_32%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_46%,#f8cfc0_100%)] p-5">
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
            </div>
          </button>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span>{preview.platform}</span>
              <span>{content ? `草稿 #${preview.id}` : "示例预览"}</span>
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
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral/12 text-coral">
                  OPC
                </span>
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
              {content ? "封面仍是版式预览，真实图片生成后会在这里替换。" : "生成草稿后，这里会自动切换为最新内容。"}
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
          <div className="grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[24px] border border-white/40 bg-paper shadow-2xl lg:grid-cols-[minmax(300px,420px)_1fr]">
            <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.95),transparent_32%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_48%,#f8cfc0_100%)] p-7">
              <button
                aria-label="关闭小红书预览"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink shadow-sm"
                data-testid="xhs-preview-close"
                onClick={() => setPreviewOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="rounded-md bg-white/75 px-2 py-1 text-[11px] font-semibold text-ink/70 shadow-sm">
                小红书封面预览
              </div>
              <div className="absolute inset-x-7 bottom-8">
                <div className="mb-4 h-1.5 w-14 rounded-full bg-coral" />
                <div className="space-y-1 text-[2.55rem] font-black leading-[1.06] text-ink">
                  {coverLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex max-h-[90vh] flex-col overflow-y-auto">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12 text-sm font-bold text-coral">
                    OPC
                  </span>
                  <div>
                    <div className="text-sm font-semibold">内容运营中枢</div>
                    <div className="text-xs text-muted">发布前预览 - {preview.platform}</div>
                  </div>
                </div>
                <Pill tone={content ? "green" : "amber"}>{content ? "最新草稿" : "示例"}</Pill>
              </div>

              <div className="px-5 py-5">
                <h3 className="text-xl font-semibold leading-8 text-ink">{preview.title}</h3>
                <div className="mt-4 space-y-3 text-sm leading-7 text-ink/82">
                  {paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
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
                  这是发布效果预览，不会自动发布；粘贴到小红书前仍需要人工确认标题、正文、标签和封面。
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
                  {copyState === "copied" ? "已复制" : "复制小红书文案"}
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
                <td className="px-4 py-3 text-muted">{record.platform}</td>
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

"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ClipboardCheck,
  Eye,
  EyeOff,
  Image,
  KeyRound,
  Loader2,
  PenLine,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Trash2
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatStrip } from "@/components/stat-strip";
import { TrendCollectorPanel } from "@/components/trend-collector-panel";
import {
  commandFocus,
  connectionStatuses,
  contentControls,
  coverReferences,
  draftPreview,
  imageWorkflow,
  interfaceStyles,
  knowledgeAssets,
  nextActions,
  pipeline,
  promoterActions,
  publishingRecords,
  queues,
  reviewQueue,
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
  id: number;
  platform: string;
  status: string;
  tags: string[] | null;
  title: string;
};

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

      setActiveTab(isWorkspaceTab(tab) ? tab : "dashboard");
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
      {activeTab === "review" ? <ReviewView credentials={credentials} /> : null}
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

        <Panel helper="发布前必须处理的卡点。" title="待处理">
          <div className="divide-y divide-line">
            {reviewQueue.map((item) => (
              <QueueRow key={item.title} item={item} />
            ))}
          </div>
        </Panel>
      </section>

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
  return (
    <div className="space-y-4">
      <GenerationLauncher onOpenSettings={onOpenSettings} workspaceToken={workspaceToken} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <DraftPanel />
        <div className="space-y-4">
          <Panel helper="生成前需要明确输入、改写和审核边界。" title="生产控制">
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
  onOpenSettings,
  workspaceToken
}: {
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
  const [busyAction, setBusyAction] = useState<"draft" | "review" | null>(null);
  const [statusText, setStatusText] = useState("填写选题后，点击“开始生产图文”创建草稿。");
  const [lastContent, setLastContent] = useState<GeneratedContent | null>(null);

  const hasTopic = topic.trim().length > 0;
  const canGenerate = hasTopic && busyAction === null;
  const canRequestReview = lastContent !== null && busyAction === null;
  const generateButtonLabel = !hasTopic
      ? "先填写选题"
      : "开始生产图文";
  const reviewButtonLabel = !lastContent
    ? "先生成草稿"
    : "提交审核";
  const generateButtonTitle = !hasTopic
      ? "先填写选题，再开始生产图文"
      : undefined;
  const reviewButtonTitle = !lastContent
    ? "先生成草稿，再提交人工审核"
    : undefined;
  const launchStatusText = !hasTopic
      ? "先填写选题，再开始生产图文。"
      : statusText;
  const primaryGenerateLabel =
    busyAction === "draft"
      ? "正在生产草稿"
      : lastContent
        ? "重新生产草稿"
        : generateButtonLabel;

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
    };
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
      setStatusText(`草稿 #${data.id} 已生成，当前状态：${data.status}。下一步请提交人工审核。`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "图文草稿生成失败。");
    } finally {
      setBusyAction(null);
    }
  }

  async function requestReview() {
    if (!lastContent) {
      setStatusText("先生成草稿，再提交审核。");
      return;
    }

    setBusyAction("review");
    setStatusText(`正在提交草稿 #${lastContent.id} 进入人工审核。`);
    try {
      const response = await fetch(`${API_BASE}/content/${lastContent.id}/review-request`, {
        method: "POST",
        headers: authHeaders()
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "提交审核失败。"));
      }
      const data = (await response.json()) as GeneratedContent;
      setLastContent(data);
      setStatusText(`草稿 #${data.id} 已进入审核，审核通过后再到“封面”页生成图片。`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "提交审核失败。");
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
        helper="生成只创建草稿，不会自动发布；通过人工审核后才进入封面和交付。"
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
                当前会生成一篇营销图文草稿，后续仍需人工审核。
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
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                aria-label={reviewButtonLabel}
                className={`${secondaryButtonClass} h-10 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={!canRequestReview}
                onClick={requestReview}
                title={reviewButtonTitle}
                type="button"
              >
                {busyAction === "review" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                {busyAction === "review" ? "正在提交" : reviewButtonLabel}
              </button>
            </div>
            <div className="mt-4 border-l-4 border-amber pl-3 text-xs leading-5 text-muted">
              封面图片要等内容人工批准后，在“封面”页生成。
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ReviewView({ credentials }: { credentials: CredentialSettings }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel helper="所有内容在发布前都先进入这里。" title="审核队列">
        <div className="divide-y divide-line">
          {reviewQueue.map((item) => (
            <QueueRow key={item.title} item={item} />
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel helper="读取设置页的本机配置状态，不暴露具体供应商和底层配置。" title="服务状态">
          <div className="space-y-3">
            {connectionStatuses.map((status) => {
              const configured = Boolean(credentials[status.credentialKey]);
              return (
                <div key={status.name} className={`${subtleCardClass} p-3`}>
                  <div className="flex items-start gap-3">
                    <IconBox tone={configured ? "green" : "amber"}>
                      <status.icon className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{status.name}</span>
                        <Pill tone={configured ? "green" : "amber"}>
                          {configured ? "已配置" : "未配置"}
                        </Pill>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted">{status.note}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel helper="发布前必须逐项确认。" title="安全门">
          <SafetyGateList />
        </Panel>
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
            aria-label="生成封面，需审核通过后启用"
            className="flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-55"
            disabled
            title="需审核通过后启用"
            type="button"
          >
            <Image className="h-4 w-4" />
            生成封面
          </button>
        }
        helper="内容审核通过前保持禁用；下方仅展示参考版式，不代表已生成图片。"
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
  const hasWorkspaceToken = credentials.workspaceToken.trim().length > 0;
  const canApplyProviderKeys = !credentialBusy;
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
    } catch (error) {
      setCredentialStatus(error instanceof Error ? error.message : "服务 API Key 应用失败。");
    } finally {
      setCredentialBusy(false);
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
      label: "GPT-5.5 API Key",
      placeholder: "sk-...",
      helper: "撰稿服务使用；应用到后端后由服务端调用。"
    },
    {
      keyName: "imageApiKey",
      label: "image2 API Key",
      placeholder: "sk-...",
      helper: "图片生成服务使用；封面生成走服务端。"
    },
    {
      keyName: "rewriteApiKey",
      label: "DeepSeek API Key",
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

function DraftPanel() {
  return (
    <Panel
      action={<Pill tone="red">{draftPreview.status}</Pill>}
      helper="选题、正文、人味化和封面需求统一查看。"
      title="创作台"
    >
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_260px]">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-steel">
            <PenLine className="h-4 w-4" />
            {draftPreview.platform}
          </div>
          <h3 className="mt-3 text-2xl font-semibold leading-8">{draftPreview.title}</h3>
          <p className="mt-3 text-sm leading-7 text-ink/80">{draftPreview.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {draftPreview.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-line bg-mist px-2 py-1 text-xs font-medium text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-muted sm:grid-cols-2">
            <div className="border-l-4 border-steel pl-3">标题关键词保留</div>
            <div className="border-l-4 border-moss pl-3">正文仅返回 Body</div>
          </div>
        </div>
        <CoverReferencePreview compact />
      </div>
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

function QueueRow({
  item
}: {
  item: { icon: typeof ClipboardCheck; source: string; status: string; title: string };
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <IconBox tone="blue">
        <item.icon className="h-4 w-4" />
      </IconBox>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-5">{item.title}</div>
        <div className="mt-1 text-xs text-muted">{item.source}</div>
      </div>
      <Pill tone={item.status === "需复核" ? "red" : "neutral"}>{item.status}</Pill>
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

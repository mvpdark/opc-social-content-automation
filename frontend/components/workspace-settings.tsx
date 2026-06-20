"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  Radar,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Trash2
} from "lucide-react";
import {
  externalSkillCandidates,
  interfaceStyles,
  themeTemplates,
  type InterfaceStyle
} from "@/lib/dashboard-data";
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
import {
  API_BASE,
  emptyCredentials,
  externalLicenseLabel,
  externalSkillStatusTone,
  fetchProviderStatuses,
  formControlClass,
  iconToneClass,
  readApiError,
  secondaryButtonClass,
  subtleCardClass,
  type CredentialSettings,
  type ProviderCheckResult
} from "./workspace-utils";
import { IconBox, Panel, Pill, ThemeSwatches } from "./workspace-ui";
import { SafetyGateList } from "./workspace-delivery";

export function ExternalSkillRadarPanel() {
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
                  aria-label={`查看外部能力来源：${candidate.title}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-steel hover:text-ink"
                  href={candidate.href}
                  rel="noopener noreferrer"
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

export function SettingsView({
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
    <div className="workspace-settings-layout space-y-4">
      <section
        className="workspace-settings-overview glass-panel overflow-hidden rounded-md border"
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
                className="workspace-button workspace-button-primary flex h-10 items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-60"
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
                        "workspace-theme-card",
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
                        "workspace-theme-card",
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

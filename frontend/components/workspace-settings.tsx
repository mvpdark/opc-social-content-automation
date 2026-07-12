"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  KeyRound,
  Radar,
  RotateCcw,
  Settings,
  ShieldCheck
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
  isProviderCheckResult,
  readApiError,
  subtleCardClass,
  type CredentialSettings
} from "./workspace-utils";
import { IconBox, Panel, Pill } from "./workspace-ui";
import { SafetyGateList } from "./workspace-delivery";
import { SettingsInterfacePanel } from "./workspace-settings-interface";
import { SettingsOverviewSection, type SettingsOverviewCard } from "./workspace-settings-overview";
import { SettingsServiceConfig, type CredentialField } from "./workspace-settings-service-config";

export const ExternalSkillRadarPanel = memo(function ExternalSkillRadarPanel() {
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
});

export const SettingsView = memo(function SettingsView({
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
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;
  const activeRef = useRef(true);
  const providerStatusRequestIdRef = useRef(0);
  const providerCheckRequestIdRef = useRef(0);
  const providerStatusAbortRef = useRef<AbortController | null>(null);
  const providerKeyAbortRef = useRef<AbortController | null>(null);
  const providerCheckAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      providerStatusAbortRef.current?.abort();
      providerKeyAbortRef.current?.abort();
      providerCheckAbortRef.current?.abort();
    };
  }, []);
  const canApplyProviderKeys = !credentialBusy;
  const canCheckProvider = !credentialBusy && !providerCheckBusy;
  const providerApplyLabel = "应用服务配置";
  const providerBindings = useMemo(
    () => providerBindingDefaultsFromStatuses(providerStatuses),
    [providerStatuses]
  );
  const configuredServiceCount = useMemo(
    () => [
      providerBindings.draft,
      providerBindings.image,
      providerBindings.rewrite,
      providerBindings.webSearch
    ].filter(Boolean).length,
    [providerBindings]
  );
  const providerStatusSummary = useMemo(
    () => providerStatuses.length
      ? `${configuredServiceCount} / 4 已连接`
      : providerStatusError
        ? "读取失败"
        : "正在读取",
    [configuredServiceCount, providerStatuses, providerStatusError]
  );
  const currentStyleLabel = useMemo(
    () => interfaceStyles.find((style) => style.id === interfaceStyle)?.label ?? "当前主题",
    [interfaceStyle]
  );
  const providerRouteItems = useMemo(
    () => [
      { label: "撰稿", name: "Draft generation", target: "正文草稿" },
      { label: "改写", name: "Humanization rewrite", target: "口吻润色" },
      { label: "图片", name: "Image generation", target: "封面生成" },
      { label: "联网", name: "Web search", target: "Tavily 搜索" }
    ].map((item) => ({
      ...item,
      status: providerStatuses.find((statusItem) => statusItem.name === item.name)
    })),
    [providerStatuses]
  );
  const settingsOverviewCards: SettingsOverviewCard[] = useMemo(() => [
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
  ], [providerStatuses, configuredServiceCount, providerStatusSummary, currentStyleLabel]);

  const refreshProviderStatuses = useCallback(async () => {
    const requestId = ++providerStatusRequestIdRef.current;
    providerStatusAbortRef.current?.abort();
    const controller = new AbortController();
    providerStatusAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const statuses = await fetchProviderStatuses(credentials.workspaceToken, controller.signal);
      if (!activeRef.current || providerStatusRequestIdRef.current !== requestId) return null;
      setProviderStatuses(statuses);
      setProviderStatusError(null);
      return statuses;
    } catch (error) {
      if (!activeRef.current || providerStatusRequestIdRef.current !== requestId) return null;
      if (error instanceof Error && error.name === "AbortError") return null;
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR
      );
      setProviderStatusError(message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [credentials.workspaceToken]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadProviderStatuses() {
      const requestId = ++providerStatusRequestIdRef.current;
      try {
        const statuses = await fetchProviderStatuses(credentials.workspaceToken, controller.signal);
        if (active && providerStatusRequestIdRef.current === requestId) {
          setProviderStatuses(statuses);
          setProviderStatusError(null);
        }
      } catch (error) {
        if (active && providerStatusRequestIdRef.current === requestId && !(error instanceof Error && error.name === "AbortError")) {
          setProviderStatusError(
            sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
          );
        }
      }
    }

    void loadProviderStatuses();
    return () => {
      active = false;
      controller.abort();
    };
  }, [credentials.workspaceToken]);

  const updateCredential = useCallback((key: keyof CredentialSettings, value: string) => {
    onCredentialsChange({ ...credentialsRef.current, [key]: value });
  }, [onCredentialsChange]);

  const clearCredentials = useCallback(() => {
    onCredentialsChange(emptyCredentials);
    setCredentialStatus("已清空这台设备保存的服务配置。");
  }, [onCredentialsChange]);

  const applyProviderKeys = useCallback(async () => {
    if (credentialBusy) return;
    const payload = providerKeyUpdatePayload(credentials);

    setCredentialBusy(true);
    setCredentialStatus(
      Object.keys(payload).length
        ? "正在应用服务配置。"
        : "正在刷新保存状态。"
    );
    providerKeyAbortRef.current?.abort();
    const controller = new AbortController();
    providerKeyAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      if (!Object.keys(payload).length) {
        await refreshProviderStatuses();
        if (!activeRef.current) return;
        setCredentialStatus("已刷新保存状态；没有填写新的服务授权，不会覆盖。");
        setProviderCheckStatus(null);
        return;
      }

      const response = await fetch(`${API_BASE}/workspace/provider-keys`, {
        method: "POST",
        signal: controller.signal,
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
        await response.json()
      );
      if (!activeRef.current) return;
      setProviderStatuses(statuses);
      setProviderStatusError(null);
      setCredentialStatus("服务配置已应用到工作台，页面不会展示完整内容。");
      setProviderCheckStatus(null);
    } catch (error) {
      if (!activeRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;
      setCredentialStatus(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : "服务配置应用失败。")
      );
    } finally {
      clearTimeout(timeoutId);
      if (!activeRef.current) return;
      setCredentialBusy(false);
    }
  }, [credentials, credentialBusy, refreshProviderStatuses]);

  const checkDraftProvider = useCallback(async () => {
    if (providerCheckBusy) return;
    const requestId = ++providerCheckRequestIdRef.current;
    setProviderCheckBusy(true);
    setProviderCheckStatus("正在检测撰稿服务连接。");
    providerCheckAbortRef.current?.abort();
    const controller = new AbortController();
    providerCheckAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${API_BASE}/workspace/provider-check`, {
        method: "POST",
        signal: controller.signal,
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
      const raw = await response.json();
      if (!isProviderCheckResult(raw)) {
        throw new Error("撰稿服务检测返回数据格式异常。");
      }
      const data = raw;
      if (!activeRef.current || providerCheckRequestIdRef.current !== requestId) return;
      const message = sanitizeServiceErrorMessage(data.message);
      setProviderCheckStatus(
        data.status === "ok" ? message : `检测未通过：${message}`
      );
    } catch (error) {
      if (!activeRef.current || providerCheckRequestIdRef.current !== requestId) return;
      if (error instanceof Error && error.name === "AbortError") return;
      setProviderCheckStatus(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : "撰稿服务检测失败。")
      );
    } finally {
      clearTimeout(timeoutId);
      if (!activeRef.current || providerCheckRequestIdRef.current !== requestId) return;
      setProviderCheckBusy(false);
    }
  }, [credentials, providerCheckBusy]);

  const credentialFields: CredentialField[] = useMemo(() => [
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
  ], [providerBindings]);

  return (
    <div className="workspace-settings-layout space-y-4">
      <SettingsOverviewSection
        configuredServiceCount={configuredServiceCount}
        providerStatuses={providerStatuses}
        providerStatusSummary={providerStatusSummary}
        settingsOverviewCards={settingsOverviewCards}
      />

      <SettingsServiceConfig
        applyProviderKeys={applyProviderKeys}
        canApplyProviderKeys={canApplyProviderKeys}
        canCheckProvider={canCheckProvider}
        checkDraftProvider={checkDraftProvider}
        clearCredentials={clearCredentials}
        credentialBusy={credentialBusy}
        credentialFields={credentialFields}
        credentialStatus={credentialStatus}
        credentials={credentials}
        providerApplyLabel={providerApplyLabel}
        providerBindings={providerBindings}
        providerCheckBusy={providerCheckBusy}
        providerCheckStatus={providerCheckStatus}
        providerRouteItems={providerRouteItems}
        providerStatusError={providerStatusError}
        providerStatuses={providerStatuses}
        updateCredential={updateCredential}
      />

      <ExternalSkillRadarPanel />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <SettingsInterfacePanel
        interfaceStyle={interfaceStyle}
        showHelperText={showHelperText}
        onShowHelperTextChange={onShowHelperTextChange}
      />

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
});

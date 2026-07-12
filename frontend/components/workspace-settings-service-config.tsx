"use client";

import { memo } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Save,
  Trash2
} from "lucide-react";
import {
  type ProviderBindingDefaults,
  type ProviderStatusItem
} from "@/lib/provider-settings";
import {
  formControlClass,
  secondaryButtonClass,
  subtleCardClass,
  type CredentialSettings
} from "./workspace-utils";
import { IconBox, Panel, Pill } from "./workspace-ui";

export type CredentialField = {
  backendBound?: boolean;
  helper: string;
  keyName: keyof CredentialSettings;
  label: string;
  placeholder: string;
};

export type ProviderRouteItem = {
  label: string;
  name: string;
  status?: ProviderStatusItem;
  target: string;
};

export const SettingsServiceConfig = memo(function SettingsServiceConfig({
  applyProviderKeys,
  canApplyProviderKeys,
  canCheckProvider,
  checkDraftProvider,
  clearCredentials,
  credentialBusy,
  credentialFields,
  credentialStatus,
  credentials,
  providerApplyLabel,
  providerBindings,
  providerCheckBusy,
  providerCheckStatus,
  providerRouteItems,
  providerStatusError,
  providerStatuses,
  updateCredential
}: {
  applyProviderKeys: () => Promise<void> | void;
  canApplyProviderKeys: boolean;
  canCheckProvider: boolean;
  checkDraftProvider: () => Promise<void> | void;
  clearCredentials: () => void;
  credentialBusy: boolean;
  credentialFields: CredentialField[];
  credentialStatus: string;
  credentials: CredentialSettings;
  providerApplyLabel: string;
  providerBindings: ProviderBindingDefaults;
  providerCheckBusy: boolean;
  providerCheckStatus: string | null;
  providerRouteItems: ProviderRouteItem[];
  providerStatusError: string | null;
  providerStatuses: ProviderStatusItem[];
  updateCredential: (key: keyof CredentialSettings, value: string) => void;
}) {
  return (
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
              : "bg-amber/15 text-amber-ink";

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
  );
});

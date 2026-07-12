"use client";

import { memo } from "react";
import { CheckCircle2, Loader2, Settings } from "lucide-react";
import { type ProviderStatusItem } from "@/lib/provider-settings";
import {
  secondaryButtonClass,
  subtleCardClass,
  type ProviderCheckResult
} from "./workspace-utils";
import { Pill } from "./workspace-ui";

interface LauncherStatusPanelProps {
  launchStatusText: string;
  mismatchedExportContentMessage: string | null;
  providerStatusError: string | null;
  providerDisplayItems: ReadonlyArray<{
    label: string;
    name: string;
    status?: ProviderStatusItem;
  }>;
  needsProviderSettings: boolean;
  draftCheckStatus: ProviderCheckResult | null;
  draftCheckBusy: boolean;
  busyAction: "draft" | null;
  onCheckDraftProvider: () => void;
  onOpenSettings: () => void;
}

export const LauncherStatusPanel = memo(function LauncherStatusPanel({
  launchStatusText,
  mismatchedExportContentMessage,
  providerStatusError,
  providerDisplayItems,
  needsProviderSettings,
  draftCheckStatus,
  draftCheckBusy,
  busyAction,
  onCheckDraftProvider,
  onOpenSettings
}: LauncherStatusPanelProps) {
  return (
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
          onClick={onCheckDraftProvider}
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
  );
});

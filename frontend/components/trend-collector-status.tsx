"use client";

import { memo } from "react";
import { Loader2, Play, Search } from "lucide-react";

import {
  diagnosticToneClass,
  restartCollectionJobLabel,
  secondaryButtonClass,
  type SearchTarget
} from "@/components/trend-collector-helpers";
import { type CollectionJobDiagnosticItem } from "@/lib/collection-job-status";

type BusyAction = "target" | "job" | "restart" | "digest" | "link" | null;

interface TrendCollectorStatusProps {
  statusText: string;
  diagnosticItems: CollectionJobDiagnosticItem[];
  hasRestartableJob: boolean;
  canRestartJob: boolean;
  busyAction: BusyAction;
  restartableJobStatus: string | null;
  isPollingJob: boolean;
  target: SearchTarget | null;
  onStartExistingJob: () => void;
  onFocusLinkImportFallback: () => void;
}

export const TrendCollectorStatus = memo(function TrendCollectorStatus({
  statusText,
  diagnosticItems,
  hasRestartableJob,
  canRestartJob,
  busyAction,
  restartableJobStatus,
  isPollingJob,
  target,
  onStartExistingJob,
  onFocusLinkImportFallback
}: TrendCollectorStatusProps) {
  return (
    <div className="workspace-trend-status px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="glass-subtle flex h-10 w-10 items-center justify-center rounded-md border text-steel">
          <Search className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">采集状态</div>
          <p className="mt-1 text-sm leading-5 text-muted">{statusText}</p>
          {diagnosticItems.length ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="collection-diagnostic-grid">
              {diagnosticItems.map((item, index) => (
                <div
                  className={`rounded-md border px-3 py-2 text-xs ${diagnosticToneClass(item.tone)}`}
                  data-tone={item.tone}
                  key={`collector-diagnostic-${index}-${item.label}-${item.value}`}
                >
                  <div className="text-muted">{item.label}</div>
                  <div className="mt-1 truncate font-semibold text-ink">{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}
          {hasRestartableJob ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                className={`${secondaryButtonClass} px-3`}
                disabled={!canRestartJob}
                onClick={onStartExistingJob}
                type="button"
              >
                {busyAction === "restart" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {busyAction === "restart" ? "正在启动" : restartCollectionJobLabel(restartableJobStatus)}
              </button>
              <button
                className={`${secondaryButtonClass} px-3`}
                disabled={busyAction !== null || isPollingJob}
                onClick={onFocusLinkImportFallback}
                type="button"
              >
                <Search className="h-4 w-4" />
                改用链接导入
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 divide-y divide-line border-y border-line text-sm">
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-muted">内容类型</span>
          <span className="font-medium">
            {target?.content_kind === "image_text" ? "仅图文" : "待打开搜索"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-muted">视频采集</span>
          <span className="font-medium">
            {target?.video_collection_enabled ? "已启用" : "已禁用"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-muted">目标链接</span>
          <span className="min-w-0 truncate text-right font-medium">
            {target?.search_url ?? "先打开搜索生成"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-muted">访问方式</span>
          <span className="font-medium">
            {target?.requires_manual_login === false ? "公开优先" : "需人工处理"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-muted">登录状态保存</span>
          <span className="font-medium text-moss">固定会话保存</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-muted">采集方式</span>
          <span className="font-medium">
            {target?.automation_mode ?? "采集浏览器"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div className="border-l-4 border-moss pl-3">先试公开搜索，人工登录只作兜底。</div>
        <div className="border-l-4 border-steel pl-3">采集素材先确认，再进入知识摘要。</div>
      </div>
    </div>
  );
});

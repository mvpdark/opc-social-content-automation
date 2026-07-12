"use client";

import { memo, type ChangeEvent } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Save,
  Search,
  X,
  Zap
} from "lucide-react";

import { PlatformIcon } from "@/components/platform-icon";
import { type CollectionJobDiagnosticItem } from "@/lib/collection-job-status";
import {
  formatScheduleTime,
  mobileDiagnosticToneClass
} from "@/components/mobile-collect-utils";
import { type MobilePlatform } from "@/lib/mobile-runtime";

type BusyAction = "digest" | "job" | "link" | "search" | null;

interface CollectScheduleSettingsProps {
  autoEnabled: boolean;
  intervalMinutes: number;
  maxItems: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  query: string;
  platform: MobilePlatform;
  busyAction: BusyAction;
  diagnosticItems: CollectionJobDiagnosticItem[];
  visibleDiagnosticItems: CollectionJobDiagnosticItem[];
  scheduleMessage: string;
  diagnosticSummary: string;
  onAutoEnabledChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearQuery: () => void;
  onSelectXiaohongshu: () => void;
  onSelectDouyin: () => void;
  onMaxItemsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onIntervalMinutesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSaveSchedule: () => void;
  onRunManualCollection: () => void;
}

export const CollectScheduleSettings = memo(function CollectScheduleSettings({
  autoEnabled,
  intervalMinutes,
  maxItems,
  nextRunAt,
  lastRunAt,
  query,
  platform,
  busyAction,
  diagnosticItems,
  visibleDiagnosticItems,
  scheduleMessage,
  diagnosticSummary,
  onAutoEnabledChange,
  onQueryChange,
  onClearQuery,
  onSelectXiaohongshu,
  onSelectDouyin,
  onMaxItemsChange,
  onIntervalMinutesChange,
  onSaveSchedule,
  onRunManualCollection
}: CollectScheduleSettingsProps) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/[0.92] bg-[rgba(255,253,247,0.90)] p-2.5 shadow-[0_18px_42px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
      <div aria-hidden="true" className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-moss/[0.08] blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[21px] font-black leading-7">定时采集设置</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sage/[0.88] px-2.5 py-1 text-[11px] font-black text-moss">
              {autoEnabled ? "运行中" : "可启用"}
            </span>
            <label className="relative inline-flex h-8 w-[58px] touch-manipulation items-center">
              <input
                checked={autoEnabled}
                className="peer sr-only"
                name="auto-collect-enabled" data-testid="mobile-auto-collect-enabled"
                onChange={onAutoEnabledChange}
                type="checkbox"
              />
              <span className="absolute inset-0 rounded-full border border-white/[0.88] bg-sage shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition peer-checked:bg-moss-gradient" />
              <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-[0_7px_16px_rgba(31,58,49,0.16)] transition peer-checked:translate-x-6" />
            </label>
          </div>
        </div>

        <label className="mt-2.5 flex items-start gap-2.5">
          <input
            checked={autoEnabled}
            className="peer sr-only"
            name="auto-collect-confirm"
            onChange={onAutoEnabledChange}
            type="checkbox"
          />
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border border-moss/[0.38] bg-moss text-white shadow-[0_10px_18px_rgba(47,154,85,0.18)] peer-focus-visible:ring-2 peer-focus-visible:ring-moss/[0.25]">
            <Check className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[16px] font-black leading-5">启用定时采集</span>
            <span className="mt-0.5 block line-clamp-1 text-[10px] font-semibold leading-4 text-muted">
              页面保持打开时会按间隔自动开始采集，不参与一键生成。
            </span>
          </span>
        </label>

        <label className="mt-2 block">
          <span className="sr-only">关键词</span>
          <div className="flex h-9 items-center gap-2.5 rounded-full border border-sand bg-[rgba(255,253,247,0.82)] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <Search className="h-5 w-5 shrink-0 text-muted" />
            <input
              aria-label="采集关键词"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
              name="collect-query" data-testid="mobile-collect-query"
              onChange={onQueryChange}
              value={query}
            />
            {query ? (
              <button
                aria-label="清空关键词"
                className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted active:bg-white/[0.62]"
                onClick={onClearQuery}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </label>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            aria-pressed={platform === "xiaohongshu"}
            className={[
              "flex h-9 touch-manipulation items-center justify-center gap-2 rounded-full border text-sm font-black transition active:scale-[0.98]",
              platform === "xiaohongshu"
                ? "border-moss bg-moss-gradient text-white shadow-moss-md"
                : "border-sand bg-[rgba(255,253,247,0.70)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
            ].join(" ")}
            data-testid="platform-xiaohongshu"
            onClick={onSelectXiaohongshu}
            type="button"
          >
            <PlatformIcon platform="xiaohongshu" size="sm" />
            小红书
          </button>
          <button
            aria-pressed={platform === "douyin"}
            className={[
              "flex h-9 touch-manipulation items-center justify-center gap-2 rounded-full border text-sm font-black transition active:scale-[0.98]",
              platform === "douyin"
                ? "border-moss bg-moss-gradient text-white shadow-moss-md"
                : "border-sand bg-[rgba(255,253,247,0.70)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
            ].join(" ")}
            data-testid="platform-douyin"
            onClick={onSelectDouyin}
            type="button"
          >
            <PlatformIcon platform="douyin" size="sm" />
            抖音图文
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="rounded-[20px] border border-sand bg-[rgba(255,253,247,0.76)] px-4 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <span className="text-xs font-semibold text-muted">最大采集</span>
            <div className="mt-1 flex items-end gap-2">
              <input
                className="min-w-0 flex-1 bg-transparent text-[20px] font-black leading-6 text-ink outline-none"
                name="max-items" data-testid="mobile-max-items"
                max={100}
                min={1}
                onChange={onMaxItemsChange}
                type="number"
                value={maxItems}
              />
              <span className="pb-1 text-sm font-semibold text-muted">条</span>
              <ChevronDown className="mb-1 h-4 w-4 text-muted" />
            </div>
          </label>
          <label className="rounded-[20px] border border-sand bg-[rgba(255,253,247,0.76)] px-4 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <span className="text-xs font-semibold text-muted">间隔</span>
            <div className="mt-1 flex items-end gap-2">
              <input
                className="min-w-0 flex-1 bg-transparent text-[20px] font-black leading-6 text-ink outline-none"
                name="collect-interval" data-testid="mobile-collect-interval"
                max={1440}
                min={5}
                onChange={onIntervalMinutesChange}
                type="number"
                value={intervalMinutes}
              />
              <span className="pb-1 text-sm font-semibold text-muted">分钟</span>
              <ChevronDown className="mb-1 h-4 w-4 text-muted" />
            </div>
          </label>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full border border-moss/[0.48] bg-[rgba(255,253,247,0.72)] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
            data-testid="mobile-save-schedule"
            onClick={onSaveSchedule}
            type="button"
          >
            <Save className="h-5 w-5" />
            保存定时
          </button>
          <button
            className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full bg-moss-gradient text-sm font-black text-white shadow-moss-lg active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-run-collection-now"
            disabled={busyAction === "job"}
            onClick={onRunManualCollection}
            type="button"
          >
            {busyAction === "job" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            {busyAction === "job" ? "运行中" : "立即运行"}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2" data-testid="mobile-collection-diagnostic-grid">
          {diagnosticItems.length ? (
            visibleDiagnosticItems.map((item, index) => (
              <div
                className={`min-w-0 rounded-[18px] border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] ${mobileDiagnosticToneClass(item.tone)}`}
                key={`mobile-diagnostic-${item.label}-${index}`}
              >
                <div className="truncate text-[11px] font-black leading-4 opacity-75">{item.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[14px] font-black leading-5">{item.value}</div>
              </div>
            ))
          ) : (
            <div className="col-span-2 rounded-[18px] border border-sand bg-[rgba(255,253,247,0.72)] px-3 py-2 text-[13px] font-bold leading-5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
              {scheduleMessage}
            </div>
          )}
        </div>

        <div className="sr-only">
          {scheduleMessage}
          {diagnosticSummary}
          下次运行：{formatScheduleTime(nextRunAt)}
          上次运行：{formatScheduleTime(lastRunAt)}
        </div>
      </div>
    </section>
  );
});

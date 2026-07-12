"use client";

import { memo } from "react";
import { ChevronRight, Clock3 } from "lucide-react";

import { COLLECTION_COLLAGE_BG, formatScheduleTime } from "@/components/mobile-collect-utils";

type CollectHeroSectionProps = {
  autoEnabled: boolean;
  collectedMetricValue: string;
  intervalMinutes: number;
  maxItems: number;
  nextRunAt: string | null;
  onViewScheduleDetails: () => void;
};
export const CollectHeroSection = memo(function CollectHeroSection({
  autoEnabled,
  collectedMetricValue,
  intervalMinutes,
  maxItems,
  nextRunAt,
  onViewScheduleDetails
}: CollectHeroSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/[0.92] bg-[rgba(255,253,247,0.82)] px-3.5 pb-2 pt-2.5 shadow-[0_22px_46px_rgba(31,58,49,0.13),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={COLLECTION_COLLAGE_BG}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,253,247,0.96)_0%,rgba(255,253,247,0.84)_52%,rgba(234,241,232,0.72)_100%)]" />
      <div aria-hidden="true" className="absolute -left-7 top-9 h-[74px] w-[74px] rounded-full border border-dashed border-moss/[0.28]" />
      <div aria-hidden="true" className="absolute left-8 top-[66px] flex h-14 w-14 items-center justify-center rounded-full bg-[conic-gradient(rgb(var(--moss))_0_28%,rgb(var(--moss)/0.12)_28%_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,253,247,0.94)] text-moss shadow-[0_10px_24px_rgba(31,58,49,0.08)]">
          <Clock3 className="h-5 w-5" />
        </div>
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <h2 className="max-w-[210px] text-[23px] font-black leading-7 tracking-normal text-ink">
            高赞图文采集
          </h2>
          <span className="shrink-0 rounded-full border border-white/[0.88] bg-sage/[0.82] px-3.5 py-1.5 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.90)]">
            {autoEnabled ? "运行中" : "待开启"}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-[70px_1fr] items-center gap-3">
          <div aria-hidden="true" className="h-14" />
          <div className="min-w-0">
            <p className="text-[14px] font-black leading-5 text-ink">
              每 <span className="px-1 text-[20px] text-moss">{intervalMinutes}</span> 分钟执行一次
            </p>
            <button
              className="mt-1 flex h-9 w-full touch-manipulation items-center justify-center gap-3 rounded-full bg-moss-gradient text-sm font-black text-white shadow-moss-lg active:scale-[0.99]"
              onClick={onViewScheduleDetails}
              type="button"
            >
              查看详情
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-1.5 grid grid-cols-3 divide-x divide-line rounded-[23px] border border-white/[0.82] bg-[rgba(255,253,247,0.76)] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
          <div className="px-2 text-center">
            <div className="text-[21px] font-black leading-6 text-moss">{maxItems}</div>
            <div className="mt-1 text-[11px] font-bold text-muted">今日目标</div>
          </div>
          <div className="px-2 text-center">
            <div className="text-[21px] font-black leading-6 text-ink">{collectedMetricValue}</div>
            <div className="mt-1 text-[11px] font-bold text-muted">已采集</div>
          </div>
          <div className="min-w-0 px-2 text-center">
            <div className="truncate text-[17px] font-black leading-6 text-ink">{formatScheduleTime(nextRunAt)}</div>
            <div className="mt-1 text-[11px] font-bold text-muted">下次执行</div>
          </div>
        </div>
      </div>
    </section>
  );
});

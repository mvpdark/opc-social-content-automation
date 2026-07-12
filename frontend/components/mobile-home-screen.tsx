"use client";

import { memo, useMemo } from "react";
import {
  BookOpenText,
  ChevronRight,
  Database,
  PenLine,
  Radar,
  Settings,
  ShieldCheck
} from "lucide-react";

import { MobilePanel, Metric, StepTile, TaskRow } from "@/components/mobile-ui";
import type { MobileTab } from "@/lib/mobile-runtime";

const workItems = [
  { label: "补公开图文素材", state: "进入采集", icon: Radar, tab: "collect" },
  { label: "查看知识库", state: "进入知识", icon: BookOpenText, tab: "knowledge" },
  { label: "生成硕升博草稿", state: "进入创作", icon: PenLine, tab: "create" },
  { label: "确认待发布草稿", state: "进入确认", icon: ShieldCheck, tab: "review" }
] satisfies Array<{
  icon: typeof Radar;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const progressSteps = [
  { label: "采集", state: "当前", icon: Database, tab: "collect" },
  { label: "知识库", state: "可查看", icon: BookOpenText, tab: "knowledge" },
  { label: "确认", state: "待处理", icon: ShieldCheck, tab: "review" }
] satisfies Array<{
  icon: typeof Database;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const quickMetrics = [
  { label: "趋势素材", value: "待采集", tone: "blue", tab: "collect" },
  { label: "知识条目", value: "待检索", tone: "green", tab: "knowledge" },
  { label: "待确认", value: "0", tone: "coral", tab: "review" }
] satisfies Array<{
  label: string;
  tab: MobileTab;
  tone: "blue" | "coral" | "green";
  value: string;
}>;

const homeShortcuts: Array<{ icon: typeof Radar; label: string; tab: MobileTab }> = [
  { icon: Radar, label: "采集管理", tab: "collect" },
  { icon: PenLine, label: "创作项目", tab: "create" },
  { icon: BookOpenText, label: "知识库", tab: "knowledge" },
  { icon: Settings, label: "系统设置", tab: "settings" }
];

export const HomeScreen = memo(function HomeScreen({
  onAction,
  onChangeTab,
  reviewPendingCount
}: {
  onAction: (message: string) => void;
  onChangeTab: (tab: MobileTab, message?: string) => void;
  reviewPendingCount: number;
}) {
  const visibleQuickMetrics = useMemo(
    () => quickMetrics.map((metric) =>
      metric.tab === "review" ? { ...metric, value: String(reviewPendingCount) } : metric
    ),
    [reviewPendingCount]
  );
  const visibleProgressSteps = useMemo(
    () => progressSteps.map((step) =>
      step.tab === "review"
        ? { ...step, state: reviewPendingCount > 0 ? `${reviewPendingCount} 条` : "待处理" }
        : step
    ),
    [reviewPendingCount]
  );
  const todoAction = useMemo(
    () => (
      <button
        className="rounded-full bg-sage/[0.90] px-2.5 py-1 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
        onClick={() => onAction("今日待办已展开，所有入口都可以继续处理。")}
        type="button"
      >
        全部
      </button>
    ),
    [onAction]
  );

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-moss/[0.20] blur-2xl" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(236,244,237,0.58))]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-muted">
              当前流程
            </span>
            <div className="text-right">
              <div className="text-[24px] font-black leading-8 text-moss">采集优先</div>
              <div className="mt-1 text-[11px] font-bold text-muted">人工确认发布</div>
            </div>
          </div>
          <h2 className="mt-5 text-[22px] font-black leading-7">先采集，再创作</h2>
          <p className="mt-2 max-w-[240px] text-sm font-medium leading-6 text-ink/[0.68]">
            先补高赞参考，再启动草稿和封面，发布仍由人工确认。
          </p>
        </div>
        <button
          className="relative mt-5 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-sm font-black text-white shadow-[0_16px_34px_rgba(47,154,85,0.24)] active:scale-[0.99]"
          onClick={() => onChangeTab("create", "已打开创作项目页，可以选择项目开始生成。")}
          type="button"
        >
          <PenLine className="h-4 w-4" />
          查看创作预览
        </button>
      </section>

      <MobilePanel title="快捷入口">
        <div className="grid grid-cols-4 gap-2">
          {homeShortcuts.map((item, index) => (
            <button
              className="flex min-h-[86px] touch-manipulation flex-col items-center justify-center gap-2 rounded-[24px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] text-xs font-black text-ink shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.98]"
              key={`home-shortcut-${index}-${item.tab}`}
              onClick={() => onChangeTab(item.tab)}
              type="button"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-sage text-moss">
                <item.icon className="h-5 w-5" />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="历史草稿" action="草稿入口">
        <button
          className="flex w-full touch-manipulation gap-3 rounded-[26px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] p-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
          onClick={() => onChangeTab("create", "已打开历史草稿入口。")}
          type="button"
        >
          <div
            aria-hidden="true"
            className="h-[88px] w-[88px] shrink-0 rounded-[20px] bg-gradient-to-br from-sage to-sage"
          />
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full bg-sage px-2 py-1 text-[10px] font-black text-moss">草稿</div>
            <h3 className="mt-2 text-sm font-black leading-5">查看已生成的图文草稿</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
              <span className="rounded-full bg-white/[0.78] px-2 py-1">封面预览</span>
              <span className="rounded-full bg-white/[0.78] px-2 py-1">复制文案</span>
              <span className="rounded-full bg-white/[0.78] px-2 py-1">人工确认</span>
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 text-muted" />
        </button>
      </MobilePanel>

      <MobilePanel
        title="今日待办"
        action={todoAction}
      >
        <div className="space-y-2">
          {workItems.map((item, index) => (
            <TaskRow
              key={`home-work-item-${index}-${item.tab}`}
              Icon={item.icon}
              label={item.label}
              onClick={onChangeTab}
              state={item.state}
              tab={item.tab}
              testId={`task-${item.tab}`}
            />
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="生产节奏">
        <div className="mb-3 grid grid-cols-3 gap-2">
          {visibleQuickMetrics.map((metric, index) => (
            <Metric
              key={`home-metric-${index}-${metric.tab}`}
              label={metric.label}
              onClick={onChangeTab}
              tab={metric.tab}
              testId={`metric-${metric.tab}`}
              tone={metric.tone}
              value={metric.value}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {visibleProgressSteps.map((step, index) => (
            <StepTile
              key={`home-progress-${index}-${step.tab}`}
              Icon={step.icon}
              label={step.label}
              onClick={onChangeTab}
              state={step.state}
              tab={step.tab}
              testId={`step-${step.tab}`}
            />
          ))}
        </div>
      </MobilePanel>
    </div>
  );
});

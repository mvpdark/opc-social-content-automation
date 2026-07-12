"use client";

import { memo, useMemo } from "react";
import {
  BookOpenText,
  Clipboard,
  KeyRound,
  PenLine,
  Radar,
  Search,
  ShieldCheck
} from "lucide-react";
import {
  pipeline,
  type WorkspaceTab
} from "@/lib/dashboard-data";
import {
  type WritingStylePresetId,
  writingStylePresets
} from "./workspace-utils";
import { IconBox, Pill } from "./workspace-ui";
import { DependencyDoctorPanel } from "./workspace-dependency-doctor";

const RECENT_ACTIVITIES = [
  { time: "--:--", title: "趋势采集", detail: "运行采集后显示真实完成记录", status: "待运行", tone: "neutral" as const },
  { time: "--:--", title: "知识处理", detail: "保存摘要后显示真实入库记录", status: "待入库", tone: "neutral" as const },
  { time: "--:--", title: "内容生成", detail: "一键生成后显示真实草稿记录", status: "待生成", tone: "neutral" as const },
  { time: "--:--", title: "联网搜索", detail: "按需查询后显示 Tavily 结果", status: "按需触发", tone: "neutral" as const }
];

const PRODUCTIVITY_METRICS = [
  { label: "采集话题", value: "--", trend: "连接后显示" },
  { label: "入库知识", value: "--", trend: "连接后显示" },
  { label: "生成内容", value: "--", trend: "连接后显示" },
  { label: "发布内容", value: "手动", trend: "不自动发布" },
  { label: "互动数据", value: "--", trend: "连接后显示" }
];

const WORKSPACE_HEALTH = [
  { icon: KeyRound, label: "模型 Key", state: "设置可查", tone: "blue" as const },
  { icon: Search, label: "联网检索", state: "按需触发", tone: "green" as const },
  { icon: ShieldCheck, label: "人工确认", state: "固定开启", tone: "red" as const },
  { icon: Clipboard, label: "复制发布", state: "手动执行", tone: "amber" as const }
];

const TOP_WRITING_STYLE_PRESETS = writingStylePresets.slice(0, 4);
const TOP_PIPELINE_STEPS = pipeline.slice(0, 5);

export const DashboardView = memo(function DashboardView({
  buildWorkspaceUrl,
  defaultWritingStyle,
  onDefaultWritingStyleChange,
  workspaceToken
}: {
  buildWorkspaceUrl: (tab: WorkspaceTab) => string;
  defaultWritingStyle: WritingStylePresetId;
  onDefaultWritingStyleChange: (nextStyle: WritingStylePresetId) => void;
  workspaceToken: string;
}) {
  const keyTasks = useMemo(() => [
    {
      title: "趋势采集",
      description: "发现热门话题与优质内容",
      primaryMetric: "待同步",
      secondaryMetric: "待确认",
      tertiaryMetric: "待筛选",
      primaryLabel: "今日完成",
      secondaryLabel: "素材结果",
      tertiaryLabel: "高热话题",
      progress: "0%",
      action: "开始采集",
      href: buildWorkspaceUrl("research"),
      icon: Radar,
      tone: "green" as const
    },
    {
      title: "知识加工",
      description: "沉淀知识，构建可复用资产",
      primaryMetric: "待同步",
      secondaryMetric: "待关联",
      tertiaryMetric: "待入库",
      primaryLabel: "待处理",
      secondaryLabel: "证据来源",
      tertiaryLabel: "知识条目",
      progress: "0%",
      action: "去处理",
      href: buildWorkspaceUrl("knowledge"),
      icon: BookOpenText,
      tone: "green" as const
    },
    {
      title: "内容创作",
      description: "基于知识生产优质内容",
      primaryMetric: "待生成",
      secondaryMetric: "待审核",
      tertiaryMetric: "手动发布",
      primaryLabel: "草稿",
      secondaryLabel: "人工确认",
      tertiaryLabel: "发布动作",
      progress: "0%",
      action: "去创作",
      href: buildWorkspaceUrl("content"),
      icon: PenLine,
      tone: "green" as const
    }
  ], [buildWorkspaceUrl]);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="workspace-dashboard-hero glass-panel rounded-md border p-5 shadow-panel">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[2rem] font-semibold leading-tight text-ink lg:text-[2.35rem]">
                  今日工作台
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  采集、知识、创作和审核按顺序推进；系统只生成草稿，不会自动发布。
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>工作中</span>
                <span className="h-2 w-2 rounded-full bg-moss" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {WORKSPACE_HEALTH.map((item) => (
                <a
                  className="workspace-health-card flex min-h-[86px] items-center gap-3 rounded-md border border-line/70 bg-paper/58 px-4 py-3"
                  href={item.label === "模型 Key" ? buildWorkspaceUrl("settings") : buildWorkspaceUrl("content")}
                  key={`workspace-health-${item.label}`}
                >
                  <IconBox tone={item.tone}>
                    <item.icon className="h-4 w-4" />
                  </IconBox>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{item.label}</div>
                    <div className="mt-1 text-xs text-muted">{item.state}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-md border p-4 lg:p-5 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">关键任务</div>
                <p className="mt-1 text-xs text-muted">按参考图的桌面工作流排列，不再像手机卡片堆叠。</p>
              </div>
              <Pill tone="green">系统状态</Pill>
            </div>
            <div className="space-y-3">
              {keyTasks.map((task) => (
                <div
                  className="workspace-task-row grid gap-3 rounded-md border border-line/70 bg-paper/58 p-4 lg:grid-cols-[230px_repeat(3,92px)_minmax(120px,1fr)_120px] lg:items-center"
                  key={`key-task-${task.title}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <IconBox tone={task.tone}>
                      <task.icon className="h-4 w-4" />
                    </IconBox>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-ink">{task.title}</div>
                      <div className="mt-1 truncate text-xs text-muted">{task.description}</div>
                    </div>
                  </div>
                  {[
                    [task.primaryMetric, task.primaryLabel],
                    [task.secondaryMetric, task.secondaryLabel],
                    [task.tertiaryMetric, task.tertiaryLabel]
                  ].map(([value, label]) => (
                    <div className="border-line/70 lg:border-l lg:pl-4" key={`${task.title}-${label}`}>
                      <div className="text-lg font-semibold leading-6 text-ink">{value}</div>
                      <div className="mt-1 text-xs text-muted">{label}</div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/70">
                      <div className="h-full rounded-full bg-moss" style={{ width: task.progress }} />
                    </div>
                    <span className="w-10 text-xs text-muted">{task.progress}</span>
                  </div>
                  <a
                    className="flex h-10 items-center justify-center rounded-md bg-moss px-4 text-sm font-semibold text-white"
                    href={task.href}
                  >
                    {task.action}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="glass-panel rounded-md border p-4 lg:p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">最近动态</div>
              <p className="mt-1 text-xs text-muted">真实流程入口，发布仍需人工确认。</p>
            </div>
            <Pill tone="neutral">全部类型</Pill>
          </div>
          <div className="mt-5 space-y-4">
            {RECENT_ACTIVITIES.map((activity) => (
              <div className="grid grid-cols-[52px_1fr_auto] gap-3" key={`${activity.time}-${activity.title}`}>
                <div className="text-xs text-muted">{activity.time}</div>
                <div className="min-w-0 border-l border-line pl-4">
                  <div className="text-sm font-semibold text-ink">{activity.title}</div>
                  <div className="mt-1 truncate text-xs text-muted">{activity.detail}</div>
                </div>
                <Pill tone={activity.tone}>{activity.status}</Pill>
              </div>
            ))}
          </div>
          <a
            className="mt-6 flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-paper/58 text-sm font-semibold text-ink"
            href={buildWorkspaceUrl("content")}
          >
            查看全部动态
          </a>
        </aside>
      </section>

      <section className="glass-panel rounded-md border p-4 lg:p-5 shadow-panel">
        <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-[repeat(5,minmax(0,1fr))_320px] lg:divide-x lg:divide-y-0">
          {PRODUCTIVITY_METRICS.map((metric) => (
            <div className="workspace-metric-tile px-3 py-3" key={`productivity-${metric.label}`}>
              <div className="text-xs text-muted">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold leading-none text-ink">{metric.value}</div>
              <div className="mt-2 text-xs font-semibold text-moss">{metric.trend}</div>
              <div className="mt-4 h-6 rounded-sm bg-[linear-gradient(135deg,rgb(var(--moss)/0.18)_25%,transparent_25%,transparent_50%,rgb(var(--moss)/0.18)_50%,rgb(var(--moss)/0.18)_75%,transparent_75%)] bg-[length:12px_12px]" />
            </div>
          ))}
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-ink">默认风格</div>
            <p className="mt-1 text-xs leading-5 text-muted">可在创作项目中细调。</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TOP_WRITING_STYLE_PRESETS.map((style) => {
                const selected = style.id === defaultWritingStyle;
                return (
                  <button
                    aria-pressed={selected}
                    className={[
                      "rounded-md border px-3 py-2 text-left text-xs font-medium transition",
                      selected
                        ? "border-steel/50 bg-steel/10 text-ink"
                        : "border-line bg-mist/50 text-muted hover:border-steel/40 hover:text-ink"
                    ].join(" ")}
                    data-testid={`dashboard-writing-style-${style.id}`}
                    key={style.id}
                    onClick={() => onDefaultWritingStyleChange(style.id)}
                    type="button"
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[20px] border px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">生产流程</div>
            <p className="mt-1 text-xs leading-5 text-muted">
              数据先确认，再生成；发布动作不在自动流程里。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TOP_PIPELINE_STEPS.map((step, index) => (
              <a
                className="workspace-pipeline-chip group flex items-center gap-2 rounded-md border border-line bg-paper/55 px-3 py-2 text-xs font-medium text-ink"
                href={
                  index === 0
                    ? buildWorkspaceUrl("research")
                    : index === 1
                      ? buildWorkspaceUrl("knowledge")
                      : index === 2 || index === 3
                        ? buildWorkspaceUrl("content")
                        : buildWorkspaceUrl("settings")
                }
                key={`pipeline-step-${index}-${step.title}`}
              >
                <step.icon className="h-3.5 w-3.5 text-steel transition group-hover:text-ink" />
                {step.title}
              </a>
            ))}
            <span className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-medium text-ink">
              人工确认后再发布
            </span>
          </div>
        </div>
      </section>

      <DependencyDoctorPanel workspaceToken={workspaceToken} />
    </div>
  );
});

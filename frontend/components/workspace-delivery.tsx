"use client";

import { memo } from "react";
import { Image, PenLine } from "lucide-react";
import { TrendCollectorPanel } from "@/components/trend-collector-panel";
import {
  coverReferences,
  imageWorkflow,
  promoterActions,
  publishingRecords,
  queues,
  safetyGates,
  writingReferences
} from "@/lib/dashboard-data";
import { subtleCardClass } from "./workspace-utils";
import { IconBox, Panel, Pill, PlatformRecordBadge } from "./workspace-ui";

export const ResearchView = memo(function ResearchView({
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
});

export const CoverView = memo(function CoverView({ contentHref }: { contentHref: string }) {
  return (
    <div className="workspace-cover-layout grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.9fr)_1fr]">
      <Panel
        action={
          <a
            aria-label="前往创作项目生成封面"
            className="flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-paper"
            href={contentHref}
          >
            <Image className="h-4 w-4" />
            去创作项目
          </a>
        }
        helper="先在创作项目中选择项目并生成文案和封面；下方展示参考版式。"
        title="封面参考版式"
      >
        <CoverReferencePreview />
      </Panel>

      <div className="space-y-4">
        <Panel helper="从封面需求到人工复核的图片流程。" title="图片流程">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {imageWorkflow.map((step, index) => (
              <div key={`image-workflow-${index}-${step.title}`} className={`${subtleCardClass} p-4`}>
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
});

export const DeliveryView = memo(function DeliveryView() {
  return (
    <div className="workspace-delivery-layout space-y-4">
      <Panel helper="没有已确认内容时保持禁用；确认后再生成复制包和发布记录。" title="发布动作">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {promoterActions.map((action, index) => (
            <div
              className={`${subtleCardClass} p-4`}
              data-testid={`delivery-action-${index}`}
              key={`promoter-action-${index}-${action.title}`}
            >
              <IconBox tone="green">
                <action.icon className="h-4 w-4" />
              </IconBox>
              <div className="mt-3 text-sm font-semibold">{action.title}</div>
              <div className="mt-1 text-xs leading-5 text-muted">{action.description}</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span
                  className="text-xs font-medium text-muted"
                  data-testid={`delivery-action-status-${index}`}
                >
                  {action.status}
                </span>
                <button
                  aria-label={`${action.command}，需有已确认内容后启用`}
                  className="glass-control flex h-8 items-center gap-2 rounded-md border px-2 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:opacity-55"
                  disabled
                  title="需有已确认内容后启用"
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

      <section className="workspace-delivery-grid grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel helper="运营队列里的待处理事项。" title="工作队列">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {queues.map((queue, index) => (
              <div
                className={`${subtleCardClass} px-4 py-3`}
                data-testid={`delivery-queue-${index}`}
                key={`publish-queue-${index}-${queue.name}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{queue.name}</div>
                    <div className="mt-1 text-xs text-muted">{queue.owner}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-2xl font-semibold"
                      data-testid={`delivery-queue-count-${index}`}
                    >
                      {queue.count}
                    </div>
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
});

export const PublishingTable = memo(function PublishingTable() {
  return (
    <Panel helper="平台发布历史和当前确认状态。" title="发布记录">
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
            {publishingRecords.map((record, index) => (
              <tr key={`${index}-${record.platform}-${record.content}`}>
                <td className="px-4 py-3 font-medium">{record.content}</td>
                <td className="px-4 py-3">
                  <PlatformRecordBadge platform={record.platform} />
                </td>
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
});

export const ReferencePanel = memo(function ReferencePanel({
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
        {items.map((item, index) => (
          <div key={`detail-card-${index}-${item.title}`} className={`${subtleCardClass} p-4`}>
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
});

export const SafetyGateList = memo(function SafetyGateList() {
  return (
    <div className="glass-subtle grid grid-cols-1 divide-y divide-line rounded-md border">
      {safetyGates.map((gate, index) => (
        <div key={`safety-gate-${index}-${gate.label}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <gate.icon className="h-4 w-4 text-moss" />
            <span className="text-sm text-ink/80">{gate.label}</span>
          </div>
          <span className="text-xs font-medium text-muted">{gate.state}</span>
        </div>
      ))}
    </div>
  );
});

const COVER_ROUTES = [
  { label: "国内", detail: "周末 / 寒暑假" },
  { label: "港澳", detail: "集中授课" },
  { label: "海外", detail: "认证用途" },
  { label: "合办", detail: "预算周期" }
];

export const CoverReferencePreview = memo(function CoverReferencePreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "rounded-md border border-line bg-[linear-gradient(160deg,#f7fbff,#fffaf2_48%,#eef7f0)] p-4 shadow-panel",
        compact ? "min-h-[300px]" : "mx-auto min-h-[520px] max-w-[390px]"
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-steel">
        <span>小红书封面参考</span>
        <span className="rounded-md bg-white/75 px-2 py-1 text-[11px] text-ink/70">
          版式参考
        </span>
      </div>
      <div className={["font-black leading-tight text-ink", compact ? "mt-5 text-3xl" : "mt-10 text-5xl"].join(" ")}>
        水博路线
        <br />
        先分清
        <br />
        再判断
      </div>
      <div className={["grid grid-cols-2 gap-2 text-xs font-semibold", compact ? "mt-5" : "mt-8"].join(" ")}>
        {COVER_ROUTES.map((route, index) => (
          <div key={`route-card-${index}-${route.label}`} className="rounded-md border border-white/80 bg-white/85 px-3 py-2">
            <div className="text-ink">{route.label}</div>
            <div className="mt-1 text-[11px] font-medium text-ink/55">{route.detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-amber/20 bg-amber/10 px-3 py-2 text-[11px] font-medium text-ink/65">
        学校/价格/认证需复核
      </div>
    </div>
  );
});

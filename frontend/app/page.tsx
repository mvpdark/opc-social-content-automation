"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Image,
  PenLine,
  ShieldCheck
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatStrip } from "@/components/stat-strip";
import { TrendCollectorPanel } from "@/components/trend-collector-panel";
import {
  commandFocus,
  connectionStatuses,
  contentControls,
  coverReferences,
  draftPreview,
  imageWorkflow,
  knowledgeAssets,
  nextActions,
  pipeline,
  promoterActions,
  publishingRecords,
  queues,
  reviewQueue,
  safetyGates,
  timeline,
  type WorkspaceTab,
  writingReferences
} from "@/lib/dashboard-data";

const stateTone: Record<string, string> = {
  当前重点: "border-steel bg-steel/10 text-steel",
  可用: "border-moss bg-moss/10 text-moss",
  已接入: "border-moss bg-moss/10 text-moss",
  强制: "border-coral bg-coral/10 text-coral",
  追踪: "border-amber bg-amber/10 text-amber"
};

const pillTone: Record<string, string> = {
  neutral: "border-line bg-mist text-muted",
  green: "border-moss/40 bg-moss/10 text-moss",
  blue: "border-steel/40 bg-steel/10 text-steel",
  red: "border-coral/40 bg-coral/10 text-coral",
  amber: "border-amber/40 bg-amber/10 text-amber"
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "dashboard" ? <DashboardView /> : null}
      {activeTab === "research" ? <ResearchView /> : null}
      {activeTab === "knowledge" ? <KnowledgeView /> : null}
      {activeTab === "content" ? <ContentView /> : null}
      {activeTab === "review" ? <ReviewView /> : null}
      {activeTab === "cover" ? <CoverView /> : null}
      {activeTab === "delivery" ? <DeliveryView /> : null}
    </AppShell>
  );
}

function DashboardView() {
  return (
    <div className="space-y-4">
      <StatStrip />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          action={
            <Pill tone="green">
              <ShieldCheck className="h-3.5 w-3.5" />
              人工审核必需
            </Pill>
          }
          helper="把复杂工作收拢成采集、沉淀、生成、审核、交付五步。"
          title="今日指挥"
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {commandFocus.map((item) => (
              <div key={item.title} className="rounded-md border border-line bg-mist/60 p-4">
                <div className="flex items-center gap-3">
                  <IconBox tone="blue">
                    <item.icon className="h-4 w-4" />
                  </IconBox>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="mt-1 text-xs font-medium text-steel">{item.state}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel helper="下一步只放可执行动作，避免首页变成清单仓库。" title="下一步">
          <div className="space-y-3">
            {nextActions.map((action, index) => (
              <div key={action} className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-semibold text-white">
                  {index + 1}
                </div>
                <span className="text-sm font-medium">{action}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_360px]">
        <Panel helper="首页只显示进度和阻塞点，具体操作分散到左侧标签页。" title="MVP 生产线">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pipeline.map((step, index) => (
              <div key={step.title} className="relative rounded-md border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <IconBox tone={index === 0 ? "blue" : "green"}>
                    <step.icon className="h-4 w-4" />
                  </IconBox>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-5">{step.title}</div>
                    <div
                      className={[
                        "mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-medium",
                        stateTone[step.state] ?? pillTone.neutral
                      ].join(" ")}
                    >
                      {step.state}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel helper="发布前必须处理的卡点。" title="待处理">
          <div className="divide-y divide-line">
            {reviewQueue.map((item) => (
              <QueueRow key={item.title} item={item} />
            ))}
          </div>
        </Panel>
      </section>

      <Panel helper="从公开样本到可交付内容，中间始终保留人工确认。" title="工作节奏">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {timeline.map((item, index) => (
            <div key={item.label} className="flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3">
              <IconBox tone="amber">
                <item.icon className="h-4 w-4" />
              </IconBox>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-muted">{item.helper}</div>
              </div>
              {index < timeline.length - 1 ? (
                <ArrowRight className="ml-auto hidden h-4 w-4 text-muted/60 lg:block" />
              ) : null}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ResearchView() {
  return (
    <div className="space-y-4">
      <TrendCollectorPanel />
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
}

function KnowledgeView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel helper="先保存来源、摘要、标签和人工确认状态，再进入可检索资产。" title="知识资产">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {knowledgeAssets.map((asset) => (
            <div key={asset.title} className="rounded-md border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <IconBox tone="green">
                  <asset.icon className="h-4 w-4" />
                </IconBox>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{asset.title}</h3>
                    <Pill>{asset.status}</Pill>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">{asset.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel helper="系统默认不跳过的项目规则。" title="入库规则">
          <SafetyGateList />
        </Panel>
        <Panel helper="当前知识库还没有真实图文样本，下一步应从趋势采集页补齐。" title="当前状态">
          <div className="rounded-md border border-line bg-mist px-4 py-4 text-sm leading-6 text-muted">
            公开样本、内部资料、Prompt 模板和来源链接已经拆成独立入口，等采集任务完成后即可沉淀为知识条目。
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ContentView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <DraftPanel />
      <div className="space-y-4">
        <Panel helper="生成前需要明确输入、改写和审核边界。" title="生产控制">
          <div className="space-y-3">
            {contentControls.map((control) => (
              <div key={control.title} className="rounded-md border border-line bg-white p-3">
                <div className="flex items-center gap-3">
                  <IconBox tone="blue">
                    <control.icon className="h-4 w-4" />
                  </IconBox>
                  <div>
                    <div className="text-sm font-semibold">{control.title}</div>
                    <p className="mt-1 text-xs leading-5 text-muted">{control.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <ReferencePanel
          helper="用于降低模板感、提高开头吸引力。"
          items={writingReferences}
          title="可用参考"
        />
      </div>
    </div>
  );
}

function ReviewView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <Panel helper="所有内容在发布前都先进入这里。" title="审核队列">
        <div className="divide-y divide-line">
          {reviewQueue.map((item) => (
            <QueueRow key={item.title} item={item} />
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel helper="前端只展示能力状态，不暴露供应商和底层配置。" title="服务状态">
          <div className="space-y-3">
            {connectionStatuses.map((status) => (
              <div key={status.name} className="rounded-md border border-line bg-white p-3">
                <div className="flex items-start gap-3">
                  <IconBox tone="green">
                    <status.icon className="h-4 w-4" />
                  </IconBox>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{status.name}</span>
                      <Pill tone="green">{status.status}</Pill>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">{status.note}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel helper="发布前必须逐项确认。" title="安全门">
          <SafetyGateList />
        </Panel>
      </div>
    </div>
  );
}

function CoverView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.9fr)_1fr]">
      <Panel
        action={
          <button
            className="flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white"
            type="button"
          >
            <Image className="h-4 w-4" />
            生成封面
          </button>
        }
        helper="标题和封面文字仍需人工复核，避免图片里出现错字或含义偏差。"
        title="封面预览"
      >
        <CoverMock />
      </Panel>

      <div className="space-y-4">
        <Panel helper="从 brief 到复核的图片流程。" title="图片流程">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {imageWorkflow.map((step) => (
              <div key={step.title} className="rounded-md border border-line bg-white p-4">
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
}

function DeliveryView() {
  return (
    <div className="space-y-4">
      <Panel helper="批准内容、导出包和发布记录集中在这里。" title="交付动作">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {promoterActions.map((action) => (
            <div key={action.title} className="rounded-md border border-line bg-white p-4">
              <IconBox tone="green">
                <action.icon className="h-4 w-4" />
              </IconBox>
              <div className="mt-3 text-sm font-semibold">{action.title}</div>
              <div className="mt-1 text-xs leading-5 text-muted">{action.description}</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">{action.status}</span>
                <button
                  className="flex h-8 items-center gap-2 rounded-md border border-line bg-white px-2 text-xs font-medium text-ink"
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel helper="当前运营 lane 的积压状态。" title="工作队列">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {queues.map((queue) => (
              <div key={queue.name} className="rounded-md border border-line bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{queue.name}</div>
                    <div className="mt-1 text-xs text-muted">{queue.owner}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">{queue.count}</div>
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
}

function DraftPanel() {
  return (
    <Panel
      action={<Pill tone="red">{draftPreview.status}</Pill>}
      helper="选题、正文、人味化和封面需求统一查看。"
      title="创作台"
    >
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_260px]">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-steel">
            <PenLine className="h-4 w-4" />
            {draftPreview.platform}
          </div>
          <h3 className="mt-3 text-2xl font-semibold leading-8">{draftPreview.title}</h3>
          <p className="mt-3 text-sm leading-7 text-ink/80">{draftPreview.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {draftPreview.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-line bg-mist px-2 py-1 text-xs font-medium text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-muted sm:grid-cols-2">
            <div className="border-l-4 border-steel pl-3">标题关键词保留</div>
            <div className="border-l-4 border-moss pl-3">正文仅返回 Body</div>
          </div>
        </div>
        <CoverMock compact />
      </div>
    </Panel>
  );
}

function PublishingTable() {
  return (
    <Panel helper="平台交付历史和当前门控状态。" title="发布记录">
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
          <tbody className="divide-y divide-line bg-white">
            {publishingRecords.map((record) => (
              <tr key={record.content}>
                <td className="px-4 py-3 font-medium">{record.content}</td>
                <td className="px-4 py-3 text-muted">{record.platform}</td>
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
}

function ReferencePanel({
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
        {items.map((item) => (
          <div key={item.title} className="rounded-md border border-line bg-white p-4">
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
}

function SafetyGateList() {
  return (
    <div className="grid grid-cols-1 divide-y divide-line rounded-md border border-line bg-white">
      {safetyGates.map((gate) => (
        <div key={gate.label} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <gate.icon className="h-4 w-4 text-moss" />
            <span className="text-sm text-ink/80">{gate.label}</span>
          </div>
          <span className="text-xs font-medium text-muted">{gate.state}</span>
        </div>
      ))}
    </div>
  );
}

function QueueRow({
  item
}: {
  item: { icon: typeof ClipboardCheck; source: string; status: string; title: string };
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <IconBox tone="blue">
        <item.icon className="h-4 w-4" />
      </IconBox>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-5">{item.title}</div>
        <div className="mt-1 text-xs text-muted">{item.source}</div>
      </div>
      <Pill tone={item.status === "需复核" ? "red" : "neutral"}>{item.status}</Pill>
    </div>
  );
}

function CoverMock({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "rounded-md border border-line bg-[linear-gradient(160deg,#fff8e8,#d6f0e2_48%,#f6cdbd)] p-4 shadow-panel",
        compact ? "min-h-[300px]" : "mx-auto min-h-[520px] max-w-[390px]"
      ].join(" ")}
    >
      <div className="text-xs font-medium text-steel">小红书封面</div>
      <div className={["font-black leading-tight text-ink", compact ? "mt-5 text-3xl" : "mt-10 text-5xl"].join(" ")}>
        不是先套磁
        <br />
        先想清楚
        <br />
        这 3 件事
      </div>
      <div className={["space-y-2 text-xs font-medium text-ink/70", compact ? "mt-5" : "mt-8"].join(" ")}>
        <div className="rounded-md bg-white/85 px-3 py-2">1. 明确研究方向</div>
        <div className="rounded-md bg-white/85 px-3 py-2">2. 匹配导师项目</div>
        <div className="rounded-md bg-white/85 px-3 py-2">3. 再定制套磁</div>
      </div>
    </div>
  );
}

function Panel({
  action,
  children,
  className = "",
  helper,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  helper?: string;
  title: string;
}) {
  return (
    <section className={["rounded-md border border-line bg-white shadow-panel", className].join(" ")}>
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold leading-5">{title}</h2>
          {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function IconBox({ children, tone = "green" }: { children: ReactNode; tone?: "amber" | "blue" | "green" | "red" }) {
  const toneClass = {
    amber: "bg-amber/10 text-amber",
    blue: "bg-steel/10 text-steel",
    green: "bg-moss/10 text-moss",
    red: "bg-coral/10 text-coral"
  };

  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneClass[tone]}`}>
      {children}
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof pillTone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${pillTone[tone]}`}>
      {children}
    </span>
  );
}

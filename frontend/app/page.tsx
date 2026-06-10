import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Image,
  PenLine,
  ShieldCheck
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatStrip } from "@/components/stat-strip";
import { TrendCollectorPanel } from "@/components/trend-collector-panel";
import {
  draftPreview,
  pipeline,
  promoterActions,
  providerStatuses,
  publishingRecords,
  queues,
  reviewQueue,
  safetyGates
} from "@/lib/dashboard-data";

const stateTone: Record<string, string> = {
  当前重点: "border-steel bg-steel/5 text-steel",
  可用: "border-moss bg-moss/5 text-moss",
  已接入: "border-moss bg-moss/5 text-moss",
  强制: "border-coral bg-coral/5 text-coral",
  追踪: "border-ink bg-ink/5 text-ink"
};

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-4">
        <StatStrip />

        <section className="rounded-md border border-line bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold leading-5">MVP 生产流水线</h2>
              <p className="text-xs text-slate-500">
                数据先行，生成受控，审核后才进入发布交付。
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 text-xs font-medium text-slate-600">
              <ShieldCheck className="h-4 w-4 text-moss" />
              Human review required
            </div>
          </div>
          <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-6 lg:divide-x lg:divide-y-0">
            {pipeline.map((step, index) => (
              <div key={step.title} className="relative px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper text-steel">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-5">{step.title}</div>
                    <div
                      className={[
                        "mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-medium",
                        stateTone[step.state] ?? "border-line bg-paper text-slate-600"
                      ].join(" ")}
                    >
                      {step.state}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{step.description}</p>
                {index < pipeline.length - 1 ? (
                  <ArrowRight className="absolute right-3 top-4 hidden h-4 w-4 text-slate-300 lg:block" />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,1fr)_minmax(300px,0.9fr)_260px] 2xl:grid-cols-[1.05fr_0.95fr_360px]">
          <div className="min-w-0">
            <TrendCollectorPanel />
          </div>

          <section className="rounded-md border border-line bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold leading-5">创作台预览</h2>
                <p className="text-xs text-slate-500">选题、正文、人味化和封面需求统一查看。</p>
              </div>
              <div className="inline-flex rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium text-slate-600">
                {draftPreview.status}
              </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-line 2xl:grid-cols-[1fr_220px] 2xl:divide-x 2xl:divide-y-0">
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-steel">
                  <PenLine className="h-4 w-4" />
                  {draftPreview.platform}
                </div>
                <h3 className="mt-3 text-xl font-semibold leading-7">{draftPreview.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{draftPreview.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {draftPreview.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div className="border-l-4 border-steel pl-3">标题关键词保留</div>
                  <div className="border-l-4 border-moss pl-3">正文仅返回 Body</div>
                </div>
              </div>
              <div className="p-4">
                <div className="aspect-[3/4] rounded-md border border-line bg-[linear-gradient(160deg,#f8fafc,#dfe9f2_55%,#f2ddd6)] p-4">
                  <div className="text-xs font-medium text-steel">Xiaohongshu cover</div>
                  <div className="mt-6 text-3xl font-black leading-tight text-ink">
                    不是先套磁
                    <br />
                    先想清楚
                    <br />
                    这 3 件事
                  </div>
                  <div className="mt-5 space-y-2 text-xs font-medium text-slate-600">
                    <div className="rounded-md bg-white/80 px-3 py-2">1. 明确研究方向</div>
                    <div className="rounded-md bg-white/80 px-3 py-2">2. 匹配导师项目</div>
                    <div className="rounded-md bg-white/80 px-3 py-2">3. 再定制套磁</div>
                  </div>
                </div>
                <button
                  className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-white"
                  type="button"
                >
                  <Image className="h-4 w-4" />
                  生成封面
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-md border border-line bg-white shadow-panel">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold leading-5">审核队列</h2>
                <p className="text-xs text-slate-500">发布前需要处理的卡点。</p>
              </div>
              <div className="divide-y divide-line">
                {reviewQueue.map((item) => (
                  <div key={item.title} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-paper text-steel">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-5">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.source}</div>
                    </div>
                    <span className="rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium text-slate-600">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-md border border-line bg-white shadow-panel">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold leading-5">安全门</h2>
                <p className="text-xs text-slate-500">系统默认不跳过的规则。</p>
              </div>
              <div className="grid grid-cols-1 divide-y divide-line">
                {safetyGates.map((gate) => (
                  <div key={gate.label} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <gate.icon className="h-4 w-4 text-moss" />
                      <span className="text-sm text-slate-700">{gate.label}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{gate.state}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-md border border-line bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold leading-5">发布交付</h2>
                <p className="text-xs text-slate-500">批准内容、导出包和发布记录。</p>
              </div>
              <Download className="h-4 w-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {promoterActions.map((action) => (
                <div key={action.title} className="px-4 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-paper text-moss">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-sm font-semibold">{action.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{action.description}</div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-600">{action.status}</span>
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
          </section>

          <section className="rounded-md border border-line bg-white shadow-panel">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold leading-5">工作队列</h2>
              <p className="text-xs text-slate-500">当前运营 lane 的积压状态。</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-line">
              {queues.map((queue) => (
                <div key={queue.name} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{queue.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{queue.owner}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">{queue.count}</div>
                      <div className="text-xs text-slate-500">{queue.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-md border border-line bg-white shadow-panel">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold leading-5">模型路由状态</h2>
              <p className="text-xs text-slate-500">只展示连接状态，不暴露密钥。</p>
            </div>
            <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {providerStatuses.map((provider) => (
                <div key={provider.name} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-paper text-steel">
                      <provider.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{provider.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {provider.provider} / {provider.model}
                      </div>
                      <div className="mt-3 inline-flex rounded-md border border-moss bg-moss/5 px-2 py-1 text-xs font-medium text-moss">
                        {provider.status}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-600">{provider.note}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white shadow-panel">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold leading-5">发布记录</h2>
              <p className="text-xs text-slate-500">平台交付历史和当前门控状态。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead className="bg-paper text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">内容</th>
                    <th className="px-4 py-3 font-medium">平台</th>
                    <th className="px-4 py-3 font-medium">负责人</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {publishingRecords.map((record) => (
                    <tr key={record.content}>
                      <td className="px-4 py-3 font-medium">{record.content}</td>
                      <td className="px-4 py-3 text-slate-600">{record.platform}</td>
                      <td className="px-4 py-3 text-slate-600">{record.owner}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium text-slate-600">
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </AppShell>
  );
}

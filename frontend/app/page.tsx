import { AppShell } from "@/components/app-shell";
import { StatStrip } from "@/components/stat-strip";
import {
  pipeline,
  promoterActions,
  providerStatuses,
  publishingRecords,
  queues
} from "@/lib/dashboard-data";

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-6">
        <StatStrip />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold leading-6">Promoter handoff</h2>
                <p className="text-sm text-slate-500">
                  Approved content moves into export and publish tracking.
                </p>
              </div>
            </div>
            <div className="divide-y divide-line">
              {promoterActions.map((action) => (
                <div
                  key={action.title}
                  className="grid grid-cols-[40px_1fr] gap-4 px-5 py-4 sm:grid-cols-[40px_1fr_104px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-moss">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{action.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{action.description}</div>
                    <div className="mt-2 text-xs font-medium text-slate-600">{action.status}</div>
                  </div>
                  <button
                    className="col-span-2 flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white text-sm font-medium text-ink sm:col-span-1 sm:self-start"
                    type="button"
                  >
                    <action.icon className="h-4 w-4" />
                    {action.command}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white shadow-soft">
            <div className="border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold leading-6">Publishing records</h2>
                <p className="text-sm text-slate-500">
                  Platform handoff history and current gate state.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead className="bg-paper text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Content</th>
                    <th className="px-5 py-3 font-medium">Platform</th>
                    <th className="px-5 py-3 font-medium">Owner</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {publishingRecords.map((record) => (
                    <tr key={record.content}>
                      <td className="px-5 py-4 font-medium">{record.content}</td>
                      <td className="px-5 py-4 text-slate-600">{record.platform}</td>
                      <td className="px-5 py-4 text-slate-600">{record.owner}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium text-slate-600">
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-md border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold leading-6">MVP pipeline</h2>
                <p className="text-sm text-slate-500">
                  Data stays ahead of generation, with review before publishing.
                </p>
              </div>
            </div>
            <div className="divide-y divide-line">
              {pipeline.map((step) => (
                <div
                  key={step.title}
                  className="grid grid-cols-[40px_1fr] gap-4 px-5 py-4 sm:grid-cols-[40px_1fr_110px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-steel">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{step.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{step.description}</div>
                  </div>
                  <div className="col-span-2 rounded-md border border-line bg-paper px-3 py-1 text-center text-xs font-medium text-slate-600 sm:col-span-1 sm:self-start">
                    {step.state}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white shadow-soft">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold leading-6">Work queues</h2>
              <p className="text-sm text-slate-500">Current operational lanes</p>
            </div>
            <div className="divide-y divide-line">
              {queues.map((queue) => (
                <div key={queue.name} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{queue.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{queue.owner}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold">{queue.count}</div>
                      <div className="text-xs text-slate-500">{queue.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-line bg-white shadow-soft">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold leading-6">Provider status</h2>
            <p className="text-sm text-slate-500">Model routing without exposing keys</p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {providerStatuses.map((provider) => (
              <div key={provider.name} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-steel">
                    <provider.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{provider.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {provider.provider} / {provider.model}
                    </div>
                    <div className="mt-3 inline-flex rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium text-slate-600">
                      {provider.status}
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-600">{provider.note}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white px-5 py-4 shadow-soft">
          <h2 className="text-base font-semibold leading-6">Safety gates</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div className="border-l-4 border-moss pl-3">
              Prompt templates are stored outside service modules.
            </div>
            <div className="border-l-4 border-coral pl-3">
              Publishing requires human approval.
            </div>
            <div className="border-l-4 border-steel pl-3">
              Collection speed will never outrank account safety.
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

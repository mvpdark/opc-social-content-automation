import { Bell, Command, Search, ShieldCheck } from "lucide-react";

import { modelRouterChecks, navigation } from "@/lib/dashboard-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[264px_1fr]">
        <aside className="border-b border-line bg-white xl:border-b-0 xl:border-r">
          <div className="flex h-[72px] items-center border-b border-line px-5 py-4 xl:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <Command className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <div className="text-base font-semibold leading-5">OPC</div>
              <div className="text-xs text-slate-500">内容运营中枢</div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 xl:block xl:p-4">
            {navigation.map((item) => (
              <button
                key={item.label}
                className={[
                  "mb-1 flex h-10 min-w-max items-center gap-3 rounded-md px-3 text-sm transition xl:w-full",
                  item.active
                    ? "bg-ink text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                ].join(" ")}
                type="button"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="hidden border-t border-line p-4 xl:block">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4 text-moss" />
              发布安全门
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              所有内容必须先经过人工审核，图片标题需要二次确认。
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-line bg-white px-5 py-4 lg:px-6">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div>
                <h1 className="text-xl font-semibold leading-7">Content Command Center</h1>
                <p className="text-xs text-slate-500">
                  采集、知识库、撰稿、审核、封面和发布交付的一体化 PC 工作台
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-2">
                  {modelRouterChecks.map((item) => (
                    <div
                      key={item.label}
                      className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-paper px-2.5 text-xs font-medium text-slate-600"
                    >
                      <item.icon className="h-3.5 w-3.5 text-moss" />
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-slate-500 lg:w-72 lg:flex-none">
                    <Search className="h-4 w-4" />
                    <input
                      aria-label="Search assets"
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="搜索素材、选题、稿件"
                    />
                  </label>
                  <button
                    aria-label="Notifications"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600"
                    type="button"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </header>
          <div className="p-4 lg:p-6">{children}</div>
        </section>
      </div>
    </main>
  );
}

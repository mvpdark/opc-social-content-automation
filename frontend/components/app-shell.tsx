import { Bell, Search } from "lucide-react";

import { navigation } from "@/lib/dashboard-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-line bg-white lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center border-b border-line px-5 lg:px-6">
            <div>
              <div className="text-base font-semibold leading-5">OPC</div>
              <div className="text-xs text-slate-500">Content operations</div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 lg:block">
            {navigation.map((item) => (
              <button
                key={item.label}
                className={[
                  "mb-1 flex h-10 min-w-max items-center gap-3 rounded-md px-3 text-sm transition lg:w-full",
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
        </aside>

        <section className="min-w-0">
          <header className="flex min-h-16 flex-col gap-3 border-b border-line bg-white px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <h1 className="text-lg font-semibold leading-6">Promoter workspace</h1>
              <p className="text-xs text-slate-500">Approved content, exports, publishing</p>
            </div>
            <div className="flex w-full items-center gap-3 md:w-auto">
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-slate-500 md:w-72 md:flex-none">
                <Search className="h-4 w-4" />
                <input
                  aria-label="Search assets"
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search assets"
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
          </header>
          <div className="p-5 lg:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

"use client";

import type React from "react";
import {
  Bell,
  Command,
  PenLine,
  Search,
  Settings,
  ShieldCheck,
  Smartphone
} from "lucide-react";

import { navigation, tabMeta, type WorkspaceTab } from "@/lib/dashboard-data";

type AppShellProps = {
  activeTab: WorkspaceTab;
  children: React.ReactNode;
  onTabChange: (tab: WorkspaceTab) => void;
  showHelperText: boolean;
};

export function AppShell({ activeTab, children, onTabChange, showHelperText }: AppShellProps) {
  const activeMeta = tabMeta[activeTab];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[252px_1fr]">
        <aside className="border-b border-line bg-white xl:border-b-0 xl:border-r">
          <div className="flex h-[72px] items-center border-b border-line px-5 py-4 xl:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <Command className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <div className="text-base font-semibold leading-5">OPC</div>
              <div className="text-xs text-muted">内容运营中枢</div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 xl:block xl:p-4">
            {navigation.map((item) => {
              const active = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  className={[
                    "mb-1 flex h-10 min-w-max items-center gap-3 rounded-md px-3 text-sm transition xl:w-full",
                    active
                      ? "bg-ink text-white shadow-panel"
                      : "text-muted hover:bg-mist hover:text-ink"
                  ].join(" ")}
                  onClick={() => onTabChange(item.id)}
                  type="button"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="hidden border-t border-line p-4 xl:block">
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <ShieldCheck className="h-4 w-4 text-moss" />
              发布安全门
            </div>
            {showHelperText ? (
              <p className="mt-2 text-xs leading-5 text-muted">
                所有内容必须先经过人工审核，图片标题需要二次确认。
              </p>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-line bg-white px-5 py-4 lg:px-6">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div>
                <h1 className="text-xl font-semibold leading-7">{activeMeta.title}</h1>
                {showHelperText ? <p className="text-xs text-muted">{activeMeta.description}</p> : null}
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {showHelperText ? (
                  <div className="hidden flex-wrap gap-2 xl:flex">
                  <div className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-mist px-2.5 text-xs font-medium text-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-moss" />
                    人工审核开启
                  </div>
                  <div className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-mist px-2.5 text-xs font-medium text-muted">
                    公开采集优先
                  </div>
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <button
                    className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                    onClick={() => {
                      window.location.href = "/android";
                    }}
                    type="button"
                  >
                    <Smartphone className="h-4 w-4" />
                    安卓端
                  </button>
                  <button
                    className="flex h-9 shrink-0 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white"
                    onClick={() => onTabChange("content")}
                    type="button"
                  >
                    <PenLine className="h-4 w-4" />
                    生成图文
                  </button>
                  <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-mist px-3 text-sm text-muted lg:w-72 lg:flex-none">
                    <Search className="h-4 w-4" />
                    <input
                      aria-label="Search assets"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
                      placeholder="搜索素材、选题、稿件"
                    />
                  </label>
                  <button
                    aria-label="Notifications"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-muted"
                    type="button"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="打开设置"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-muted"
                    onClick={() => onTabChange("settings")}
                    type="button"
                  >
                    <Settings className="h-4 w-4" />
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

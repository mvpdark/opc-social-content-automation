"use client";

import type React from "react";
import {
  Command,
  Palette,
  PenLine,
  Settings,
  ShieldCheck,
  Smartphone
} from "lucide-react";

import {
  interfaceStyles,
  navigation,
  tabMeta,
  tabThemeRecommendations,
  type InterfaceStyle,
  type WorkspaceTab
} from "@/lib/dashboard-data";

type AppShellProps = {
  activeTab: WorkspaceTab;
  children: React.ReactNode;
  interfaceStyle: InterfaceStyle;
  showHelperText: boolean;
};

export function AppShell({
  activeTab,
  children,
  interfaceStyle,
  showHelperText
}: AppShellProps) {
  const activeMeta = tabMeta[activeTab];
  const tabHref = (tab: WorkspaceTab) => {
    const params = new URLSearchParams();
    if (tab !== "dashboard") {
      params.set("tab", tab);
    }
    params.set("theme", interfaceStyle);
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };
  const themeHref = (style: InterfaceStyle) => {
    const params = new URLSearchParams();
    if (activeTab !== "dashboard") {
      params.set("tab", activeTab);
    }
    params.set("theme", style);
    return `/?${params.toString()}`;
  };
  const androidHref = `/android?from=${encodeURIComponent(tabHref(activeTab))}`;
  const recommendedTheme = tabThemeRecommendations[activeTab];
  const recommendedStyle = interfaceStyles.find((style) => style.id === recommendedTheme.style);
  const usingRecommendedTheme = recommendedTheme.style === interfaceStyle;

  return (
    <main className={`theme-${interfaceStyle} workspace-shell min-h-screen text-ink`}>
      <div className="relative z-10 grid min-h-screen grid-cols-1 xl:grid-cols-[252px_1fr]">
        <aside className="glass-sidebar border-b border-line xl:border-b-0 xl:border-r">
          <div className="flex h-[72px] items-center border-b border-line px-5 py-4 xl:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-paper">
              <Command className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <div className="text-base font-semibold leading-5">OPC</div>
              <div className="text-xs text-muted">内容运营中枢</div>
            </div>
          </div>
          <nav
            aria-label="工作台主导航"
            className="flex gap-1 overflow-x-auto p-3 xl:block xl:p-4"
          >
            {navigation.map((item) => {
              const active = item.id === activeTab;
              return (
                <a
                  aria-current={active ? "page" : undefined}
                  href={tabHref(item.id)}
                  key={item.id}
                  className={[
                    "mb-1 flex h-10 min-w-max items-center gap-3 rounded-md px-3 text-sm transition xl:w-full",
                    active
                      ? "glass-selected"
                      : "text-muted hover:bg-mist/70 hover:text-ink"
                  ].join(" ")}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
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
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted">
                <Palette className="h-4 w-4 text-steel" />
                当前页推荐
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {recommendedStyle?.label ?? "苹果风"}
                  </div>
                  <div className={`theme-${recommendedTheme.style} mt-2 flex gap-1`} aria-hidden="true">
                    <span className="h-1.5 w-8 rounded-sm bg-steel" />
                    <span className="h-1.5 w-8 rounded-sm bg-moss" />
                    <span className="h-1.5 w-8 rounded-sm bg-coral" />
                  </div>
                  {showHelperText ? (
                    <p className="mt-1 text-xs leading-5 text-muted">{recommendedTheme.reason}</p>
                  ) : null}
                </div>
                {usingRecommendedTheme ? (
                  <span className="glass-control shrink-0 rounded-md border px-2 py-1 text-xs font-medium text-moss">
                    已使用
                  </span>
                ) : (
                  <a
                    aria-label={`切换到${recommendedStyle?.label ?? "推荐"}主题`}
                    className="glass-control shrink-0 rounded-md border px-2 py-1 text-xs font-medium text-ink"
                    href={themeHref(recommendedTheme.style)}
                  >
                    切换
                  </a>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="glass-topbar border-b border-line px-5 py-4 lg:px-6">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div>
                <h1 className="text-xl font-semibold leading-7">{activeMeta.title}</h1>
                {showHelperText ? <p className="text-xs text-muted">{activeMeta.description}</p> : null}
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {showHelperText ? (
                  <div className="hidden xl:flex">
                    <div className="glass-control inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium text-muted">
                      <ShieldCheck className="h-3.5 w-3.5 text-moss" />
                      人工审核开启
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <a
                    className="glass-control flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium text-ink"
                    href={androidHref}
                  >
                    <Smartphone className="h-4 w-4" />
                    安卓端
                  </a>
                  <a
                    className={[
                      "flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium",
                      activeTab === "content"
                        ? "glass-selected"
                        : "glass-control border text-ink"
                    ].join(" ")}
                    href={tabHref("content")}
                  >
                    <PenLine className="h-4 w-4" />
                    生成图文
                  </a>
                  <a
                    aria-label="打开设置"
                    className="glass-control flex h-9 w-9 items-center justify-center rounded-md border text-muted"
                    href={tabHref("settings")}
                  >
                    <Settings className="h-4 w-4" />
                  </a>
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

"use client";

import {
  memo,
  type CSSProperties
} from "react";
import {
  ArrowLeft,
  Bell,
  BookOpenText,
  Home,
  PenLine,
  Radar,
  Settings
} from "lucide-react";

import type { MobileTab } from "@/lib/mobile-runtime";

const MOBILE_HEADER_ICON_BUTTON_CLASS =
  "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[20px] border border-white/[0.82] bg-[rgba(255,253,247,0.76)] text-ink shadow-[0_10px_24px_rgba(28,54,45,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md active:scale-[0.98]";

const COLLECTION_COLLAGE_COVER_BG: CSSProperties = { backgroundImage: "url(/mobile-assets/collection-collage.png)", backgroundPosition: "center top" };

const bottomTabs: Array<{ id: MobileTab; icon: typeof Home; label: string }> = [
  { id: "home", icon: Home, label: "首页" },
  { id: "collect", icon: Radar, label: "采集" },
  { id: "knowledge", icon: BookOpenText, label: "知识" },
  { id: "create", icon: PenLine, label: "创作" },
  { id: "settings", icon: Settings, label: "设置" }
];

function getPcReturnHref() {
  if (typeof window === "undefined") {
    return "/";
  }
  const from = new URLSearchParams(window.location.search).get("from");
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return "/";
}

const MOBILE_HEADER_TITLES: Record<MobileTab, string> = {
  home: "今日工作台",
  collect: "趋势采集",
  knowledge: "知识库",
  review: "人工确认",
  create: "创作项目",
  settings: "设置"
};
const MOBILE_HEADER_SUBTITLES: Partial<Record<MobileTab, string>> = {
  collect: "自动采集优质内容，持续补给选题灵感"
};
export const MobileHeader = memo(function MobileHeader({
  activeTab,
  isNativeShell,
  onNotify
}: {
  activeTab: MobileTab;
  isNativeShell: boolean;
  onNotify: () => void;
}) {
  const isCollect = activeTab === "collect";

  return (
    <header
      className={[
        "relative overflow-hidden px-4 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-xl",
        isCollect
          ? "bg-[rgba(241,247,242,0.54)] pb-4"
          : "bg-[rgba(241,247,242,0.82)] pb-3.5 shadow-[0_8px_22px_rgba(31,58,49,0.05),inset_0_1px_0_rgba(255,255,255,0.86)]"
      ].join(" ")}
    >
      {isCollect ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-[-22%] top-[-80px] h-[240px] bg-cover opacity-10"
          style={COLLECTION_COLLAGE_COVER_BG}
        />
      ) : null}
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0",
          isCollect
            ? "bg-[linear-gradient(180deg,rgba(255,253,247,0.70)_0%,rgba(255,253,247,0.22)_74%,rgba(255,253,247,0)_100%)]"
            : "bg-[linear-gradient(135deg,rgba(255,255,255,0.70),rgba(255,255,255,0.22)_48%,rgba(210,230,216,0.20))]"
        ].join(" ")}
      />
      <div className={["relative flex items-start justify-between gap-3", isCollect ? "pt-1" : "items-center"].join(" ")}>
        {isNativeShell ? (
          <div
            aria-hidden="true"
            className={`${MOBILE_HEADER_ICON_BUTTON_CLASS} pointer-events-none ${isCollect ? "hidden" : "opacity-0"}`}
          />
        ) : (
          <button
            aria-label="返回 PC 工作台"
            className={`${MOBILE_HEADER_ICON_BUTTON_CLASS} ${isCollect ? "mt-1" : ""}`}
            onClick={() => {
              window.location.href = getPcReturnHref();
            }}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className={["font-black text-moss", isCollect ? "text-[17px] leading-6" : "text-[11px]"].join(" ")}>
            {isNativeShell ? "OMPC工作站" : "OPC Mobile"}
          </div>
          <h1 className={isCollect ? "mt-1 text-[28px] font-black leading-[1.15] tracking-normal" : "truncate text-[24px] font-black leading-7"}>
            {MOBILE_HEADER_TITLES[activeTab]}
          </h1>
          {MOBILE_HEADER_SUBTITLES[activeTab] ? (
            <p className="mt-3 text-base font-semibold leading-6 text-ink/[0.62]">
              {MOBILE_HEADER_SUBTITLES[activeTab]}
            </p>
          ) : null}
        </div>
        <button
          aria-label="查看通知状态"
          className={`${MOBILE_HEADER_ICON_BUTTON_CLASS} ${isCollect ? "mt-3 h-[58px] w-[58px] rounded-[24px]" : ""}`}
          onClick={onNotify}
          title="通知状态"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
});

export const BottomNav = memo(function BottomNav({ activeTab, onChange }: { activeTab: MobileTab; onChange: (tab: MobileTab) => void }) {
  return (
    <nav
      aria-label="安卓端主导航"
      className="absolute bottom-3 left-4 right-4 z-20 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(31,58,49,0.08),0_18px_42px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0.20)_62%,rgba(216,230,220,0.20))]"
      />
      <div className="relative grid grid-cols-5 gap-1">
        {bottomTabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              aria-label={`${tab.label}${active ? "，当前页面" : ""}`}
              aria-pressed={active}
              key={tab.id}
              className={[
                 "relative flex min-h-[54px] touch-manipulation flex-col items-center justify-center gap-1 rounded-[22px] border text-[11px] font-black transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-moss/[0.35]",
                 active
                  ? "border-moss/20 bg-sage text-moss shadow-[0_6px_16px_rgba(35,133,79,0.10)] before:content-[''] before:absolute before:top-[6px] before:left-1/2 before:ml-[-5px] before:h-2.5 before:w-2.5 before:rounded-full before:bg-moss before:shadow-[0_0_6px_rgba(44,151,88,0.5)]"
                  : "border-transparent bg-transparent text-muted active:bg-white/[0.48]"
              ].join(" ")}
              data-testid={`mobile-tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

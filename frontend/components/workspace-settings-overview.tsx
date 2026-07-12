"use client";

import { memo } from "react";
import { KeyRound } from "lucide-react";
import { subtleCardClass } from "./workspace-utils";
import { IconBox, Pill } from "./workspace-ui";
import type { ProviderStatusItem } from "@/lib/provider-settings";

export type SettingsOverviewCard = {
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  pill: string;
  title: string;
  tone: "amber" | "blue" | "green" | "red";
  value: string;
};

export const SettingsOverviewSection = memo(function SettingsOverviewSection({
  configuredServiceCount,
  providerStatuses,
  providerStatusSummary,
  settingsOverviewCards
}: {
  configuredServiceCount: number;
  providerStatuses: ProviderStatusItem[];
  providerStatusSummary: string;
  settingsOverviewCards: SettingsOverviewCard[];
}) {
  return (
    <section
      className="workspace-settings-overview glass-panel overflow-hidden rounded-md border"
      data-testid="settings-console-overview"
    >
      <div className="grid gap-5 p-4 lg:grid-cols-[1fr_340px] lg:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="green">Settings Console</Pill>
            <Pill tone="blue">Model Router</Pill>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[0] text-ink">
            AI Key 与安全控制台
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            服务授权、模型路由、人工确认和界面模板集中在这里；页面只展示保存状态，不显示敏感内容。
          </p>
        </div>
        <div className={`${subtleCardClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-muted">当前服务状态</div>
              <div className="mt-1 text-2xl font-semibold text-ink">{providerStatusSummary}</div>
            </div>
            <IconBox tone={configuredServiceCount >= 3 ? "green" : "amber"}>
              <KeyRound className="h-4 w-4" />
            </IconBox>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-moss transition-all"
              style={{ width: `${providerStatuses.length ? (configuredServiceCount / 4) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 border-t border-line/70 p-4 md:grid-cols-2 xl:grid-cols-4 lg:p-5">
        {settingsOverviewCards.map((card) => (
          <article className={`${subtleCardClass} p-4`} key={card.title}>
            <div className="flex items-start justify-between gap-3">
              <IconBox tone={card.tone}>
                <card.icon className="h-4 w-4" />
              </IconBox>
              <Pill tone={card.tone === "red" ? "red" : card.tone === "amber" ? "amber" : card.tone === "green" ? "green" : "blue"}>
                {card.pill}
              </Pill>
            </div>
            <div className="mt-4 text-xs font-medium text-muted">{card.title}</div>
            <div className="mt-1 text-lg font-semibold text-ink">{card.value}</div>
            <p className="mt-2 text-xs leading-5 text-muted">{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
});

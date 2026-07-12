"use client";

import { memo, type ComponentType } from "react";
import { Loader2, PenLine } from "lucide-react";

import { IconBox, Pill } from "./workspace-ui";
import { iconToneClass } from "./workspace-utils";

interface LauncherChecklistItem {
  detail: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: keyof typeof iconToneClass;
}

interface LauncherHeroSectionProps {
  busyAction: "draft" | null;
  canGenerate: boolean;
  exportContentMatchesCurrentInputs: boolean;
  generateButtonTitle: string | undefined;
  hasExportContent: boolean;
  launcherChecklist: ReadonlyArray<LauncherChecklistItem>;
  onGenerate: () => void;
  primaryGenerateLabel: string;
}

export const LauncherHeroSection = memo(function LauncherHeroSection({
  busyAction,
  canGenerate,
  exportContentMatchesCurrentInputs,
  generateButtonTitle,
  hasExportContent,
  launcherChecklist,
  onGenerate,
  primaryGenerateLabel
}: LauncherHeroSectionProps) {
  return (
    <div className="mb-5 overflow-hidden rounded-md border border-line/80 bg-paper/60 p-4 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.52)] lg:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] xl:items-center">
        <div>
          <Pill
            tone={exportContentMatchesCurrentInputs ? "green" : hasExportContent ? "amber" : "blue"}
          >
            {exportContentMatchesCurrentInputs ? "当前草稿" : hasExportContent ? "历史草稿" : "生产入口"}
          </Pill>
          <h3 className="mt-3 text-xl font-black leading-7 text-ink">
            选题确认后，点这里一键生成
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            当前会生成一篇营销图文草稿，自动改写并尝试生成封面图；知识依据、标签和封面方向会跟随当前选题，不会自动发布。
          </p>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {launcherChecklist.map((item) => (
              <div
                className="rounded-[18px] border border-line/70 bg-paper/58 px-3 py-3"
                key={`launcher-checklist-${item.label}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <IconBox tone={item.tone}>
                    <item.icon className="h-4 w-4" />
                  </IconBox>
                  <span className="text-[11px] font-semibold text-muted">{item.detail}</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-ink">{item.label}</div>
              </div>
            ))}
          </div>
          <button
            aria-label={primaryGenerateLabel}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-moss px-5 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            data-flow="one-click-generate"
            data-testid="start-production-button"
            disabled={!canGenerate}
            onClick={onGenerate}
            title={generateButtonTitle}
            type="button"
          >
            {busyAction === "draft" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PenLine className="h-4 w-4" />
            )}
            {primaryGenerateLabel}
          </button>
        </div>
      </div>
    </div>
  );
});

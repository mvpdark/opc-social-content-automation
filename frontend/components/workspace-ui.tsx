"use client";

import type { ReactNode } from "react";
import {
  isPlatformId,
  PlatformIcon,
  PlatformLabel,
  type PlatformId
} from "@/components/platform-icon";
import { type InterfaceStyle } from "@/lib/dashboard-data";
import { iconToneClass, pillTone } from "./workspace-utils";

export function ThemeSwatches({
  compact = false,
  style
}: {
  compact?: boolean;
  style: InterfaceStyle;
}) {
  const sizeClass = compact ? "h-1.5 w-7" : "h-2.5 w-8";
  const marginClass = compact ? "mt-2" : "mt-3";
  if (style === "cyberpunk") {
    return (
      <span
        aria-hidden="true"
        className={`theme-cyberpunk cyberpunk-theme-preview ${marginClass} ${compact ? "h-7" : "h-10"}`}
        data-testid="cyberpunk-theme-preview"
      >
        <span className="h-1.5 w-10 rounded-sm bg-moss shadow-[0_0_14px_rgb(var(--moss)/0.42)]" />
        <span className="h-1.5 w-8 rounded-sm bg-steel shadow-[0_0_14px_rgb(var(--steel)/0.38)]" />
        <span className="h-1.5 w-2.5 rounded-full bg-coral shadow-[0_0_12px_rgb(var(--coral)/0.45)]" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`theme-${style} ${marginClass} flex gap-1`}>
      <span className={`${sizeClass} rounded-sm bg-steel`} />
      <span className={`${sizeClass} rounded-sm bg-moss`} />
      <span className={`${sizeClass} rounded-sm bg-coral`} />
    </span>
  );
}

export function Panel({
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
    <section className={["workspace-panel glass-panel overflow-hidden rounded-md border", className].join(" ")}>
      <div className="workspace-panel-header flex flex-col gap-3 border-b border-line/70 bg-paper/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-5">{title}</h2>
          {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
        </div>
        {action}
      </div>
      <div className="workspace-panel-body p-4 lg:p-5">{children}</div>
    </section>
  );
}

export function IconBox({ children, tone = "green" }: { children: ReactNode; tone?: keyof typeof iconToneClass }) {
  return (
    <div className={`workspace-icon-box flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconToneClass[tone]}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof pillTone }) {
  return (
    <span className={`workspace-pill inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${pillTone[tone]}`}>
      {children}
    </span>
  );
}

export function PlatformRecordBadge({ platform }: { platform: string }) {
  if (platform.includes("小红书")) {
    return (
      <PlatformLabel
        className="font-medium text-ink"
        iconSize="sm"
        platform="xiaohongshu"
      />
    );
  }
  if (platform.includes("抖音")) {
    return (
      <PlatformLabel
        className="font-medium text-ink"
        iconSize="sm"
        platform="douyin"
      />
    );
  }
  if (platform.includes("多平台")) {
    return (
      <span className="inline-flex items-center gap-2 font-medium text-ink">
        <span className="inline-flex -space-x-1.5">
          <PlatformIcon platform="xiaohongshu" size="sm" />
          <PlatformIcon platform="douyin" size="sm" />
        </span>
        多平台
      </span>
    );
  }
  return <span className="text-muted">{platform}</span>;
}

export function formatPreviewParagraphs(body: string) {
  return body
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function buildCoverLines(title: string) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  if (!normalizedTitle) {
    return ["小红书", "图文预览"];
  }
  if (normalizedTitle.includes("不是先套磁")) {
    return ["不是先套磁", "先想清楚", "这 3 件事"];
  }

  const punctuationSegments = normalizedTitle
    .split(/[，,。！？!?:：、]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (punctuationSegments.length > 1) {
    return punctuationSegments.slice(0, 3);
  }
  if (normalizedTitle.length > 20) {
    return [
      normalizedTitle.slice(0, 10),
      normalizedTitle.slice(10, 20),
      normalizedTitle.slice(20, 30)
    ].filter(Boolean);
  }
  return [normalizedTitle];
}

export function platformDisplayName(platform: string) {
  if (platform === "xiaohongshu") {
    return "小红书图文";
  }
  if (platform === "douyin") {
    return "抖音图文";
  }
  return platform;
}

export function platformIdForPreview(platform: string): PlatformId {
  return isPlatformId(platform) ? platform : "xiaohongshu";
}

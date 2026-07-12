"use client";

import { memo, type ReactNode } from "react";

export type PlatformId = "xiaohongshu" | "douyin";

const platformMeta = {
  xiaohongshu: {
    iconSrc: "/platform-icons/xiaohongshu.ico",
    label: "小红书"
  },
  douyin: {
    iconSrc: "/platform-icons/douyin.ico",
    label: "抖音"
  }
} satisfies Record<PlatformId, { iconSrc: string; label: string }>;

const iconSizeClass = {
  sm: "h-5 w-5 rounded-[6px]",
  md: "h-7 w-7 rounded-[8px]",
  lg: "h-9 w-9 rounded-[10px]"
} satisfies Record<string, string>;

export function isPlatformId(platform: string): platform is PlatformId {
  return platform === "xiaohongshu" || platform === "douyin";
}

export const PlatformIcon = memo(function PlatformIcon({
  className = "",
  platform,
  size = "md"
}: {
  className?: string;
  platform: PlatformId;
  size?: keyof typeof iconSizeClass;
}) {
  const meta = platformMeta[platform];

  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-black/10",
        iconSizeClass[size],
        className
      ].join(" ")}
      title={meta.label}
    >
      <img alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" src={meta.iconSrc} />
    </span>
  );
});

export const PlatformLabel = memo(function PlatformLabel({
  children,
  className = "",
  iconClassName = "",
  iconSize = "md",
  platform,
  suffix = ""
}: {
  children?: ReactNode;
  className?: string;
  iconClassName?: string;
  iconSize?: keyof typeof iconSizeClass;
  platform: PlatformId;
  suffix?: string;
}) {
  const meta = platformMeta[platform];

  return (
    <span className={["inline-flex items-center gap-2", className].join(" ")}>
      <PlatformIcon className={iconClassName} platform={platform} size={iconSize} />
      <span>{children ?? `${meta.label}${suffix}`}</span>
    </span>
  );
});

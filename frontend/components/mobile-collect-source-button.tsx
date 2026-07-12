"use client";

import { memo, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, PenLine, UserRound } from "lucide-react";

export const COLLECT_SOURCE_ITEMS = [
  { icon: <CheckCircle2 className="h-4 w-4" />, label: "高赞榜单" },
  { icon: <PenLine className="h-4 w-4" />, label: "热门话题" },
  { icon: <UserRound className="h-4 w-4" />, label: "关注账号" },
  { icon: <ExternalLink className="h-4 w-4" />, label: "自定义链接" }
];

export const CollectSourceButton = memo(function CollectSourceButton({
  icon,
  label,
  onSelect
}: {
  icon: ReactNode;
  label: string;
  onSelect: (label: string) => void;
}) {
  return (
    <button
      className="flex min-h-[76px] touch-manipulation flex-col items-center justify-center gap-2 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] text-[11px] font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.98]"
      type="button"
      onClick={() => onSelect(label)}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-sage text-moss">
        {icon}
      </span>
      {label}
    </button>
  );
});

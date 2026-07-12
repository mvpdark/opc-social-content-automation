"use client";

import { memo, type ChangeEvent } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";

import { MobilePanel } from "@/components/mobile-ui";
import type { LinkImportTarget } from "@/components/mobile-collect-utils";

export type CollectBusyAction = "digest" | "job" | "link" | "search" | null;

interface CollectManualPanelProps {
  busyAction: CollectBusyAction;
  linkResult: LinkImportTarget | null;
  linkText: string;
  onLinkTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onOpenSearchPage: () => void;
  onParseLinks: () => void;
}

export const CollectManualPanel = memo(function CollectManualPanel({
  busyAction,
  linkResult,
  linkText,
  onLinkTextChange,
  onOpenSearchPage,
  onParseLinks
}: CollectManualPanelProps) {
  return (
    <MobilePanel title="手动采集">
      <textarea
        aria-label="小红书分享文本或链接输入框"
        className="min-h-24 w-full resize-y rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-3 text-sm leading-6 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none"
        name="link-text" data-testid="mobile-link-text"
        onChange={onLinkTextChange}
        placeholder="粘贴小红书分享文本或链接"
        value={linkText}
      />
      <button
        aria-busy={busyAction === "link"}
        className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-sm font-semibold text-white shadow-moss-sm active:scale-[0.99] disabled:opacity-60"
        data-testid="mobile-parse-links"
        disabled={busyAction === "link"}
        onClick={onParseLinks}
        type="button"
      >
        {busyAction === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {busyAction === "link" ? "解析中" : "解析链接"}
      </button>
      <button
        className="mt-3 flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.82] bg-white/[0.58] text-sm font-black text-muted active:scale-[0.99]"
        data-testid="mobile-open-search"
        onClick={onOpenSearchPage}
        type="button"
      >
        <ExternalLink className="h-4 w-4" />
        手动打开搜索页
      </button>
      {linkResult ? (
        <div className="mt-3 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-3 text-xs leading-5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]" role="status">
          已解析 {linkResult.extracted_count} 个链接，可导入 {linkResult.accepted_count} 个。
        </div>
      ) : null}
    </MobilePanel>
  );
});

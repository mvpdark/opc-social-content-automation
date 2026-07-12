"use client";

import { Loader2, Search } from "lucide-react";
import { memo, type ChangeEvent, type RefObject } from "react";

import {
  secondaryButtonClass,
  type LinkImportTarget
} from "@/components/trend-collector-helpers";

type BusyAction = "target" | "job" | "restart" | "digest" | "link" | null;

export interface TrendCollectorLinkImporterProps {
  linkImportText: string;
  linkImportTarget: LinkImportTarget | null;
  onLinkImportTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onParseLinks: () => void;
  canParseLinks: boolean;
  parseLinksLabel: string;
  busyAction: BusyAction;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
}

export const TrendCollectorLinkImporter = memo(function TrendCollectorLinkImporter({
  linkImportText,
  linkImportTarget,
  onLinkImportTextChange,
  onParseLinks,
  canParseLinks,
  parseLinksLabel,
  busyAction,
  textAreaRef
}: TrendCollectorLinkImporterProps) {
  return (
    <div className="glass-subtle mt-4 rounded-md border p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">小红书链接导入器</div>
          <p className="mt-1 text-xs leading-5 text-muted">
            参考 XHS-Downloader 的“粘贴分享链接”入口，但这里先只解析链接，不下载、不抓取详情。
          </p>
        </div>
        <span className="rounded-md border border-line bg-mist px-2 py-1 text-xs font-medium text-muted">
          安全解析
        </span>
      </div>
      <textarea
        className="glass-control mt-3 min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm leading-6 text-ink outline-none"
        onChange={onLinkImportTextChange}
        placeholder="粘贴小红书分享文本、https://www.xiaohongshu.com/explore/... 或 https://xhslink.com/..."
        ref={textAreaRef}
        value={linkImportText}
      />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted">
          短链只会标记为“待授权解析”，不会在这里绕过登录或平台限制。
        </p>
        <button
          className={`${secondaryButtonClass} px-3`}
          disabled={!canParseLinks}
          onClick={onParseLinks}
          type="button"
        >
          {busyAction === "link" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {busyAction === "link" ? "正在解析" : parseLinksLabel}
        </button>
      </div>
      {linkImportTarget ? (
        <div className="mt-3 rounded-md border border-line bg-paper/65">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-xs">
            <span className="font-medium text-ink">
              可导入 {linkImportTarget.accepted_count}/{linkImportTarget.extracted_count}
            </span>
            <span className="text-muted">
              下载媒体：{linkImportTarget.download_media_enabled ? "启用" : "禁用"}
            </span>
          </div>
          <div className="max-h-44 divide-y divide-line overflow-auto">
            {linkImportTarget.links.length ? (
              linkImportTarget.links.map((item, index) => (
                <div className="px-3 py-2 text-xs" key={`import-link-${index}-${item.original_url}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{item.link_type}</span>
                    <span className={item.accepted ? "text-moss" : "text-coral"}>
                      {item.accepted ? "可导入" : "暂不支持"}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-muted">{item.normalized_url}</div>
                  {item.reason ? (
                    <div className="mt-1 text-muted">{item.reason}</div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-muted">
                没有识别到可解析链接。
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
});

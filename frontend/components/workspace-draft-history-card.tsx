"use client";

import { useState, useRef, type PointerEvent } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import { resolveAssetUrl } from "@/lib/asset-url";
import {
  type GeneratedContent,
  type GeneratedImageAsset
} from "@/lib/generated-assets";
import { generatedContentStatusLabel } from "@/lib/status-labels";
import { formatDraftTime } from "./workspace-utils";
import { buildCoverLines, platformIdForPreview } from "./workspace-ui";

export function DraftHistoryCard({
  content,
  imageAsset,
  isPinned,
  isSelected,
  onDelete,
  onSelect,
  onTogglePin
}: {
  content: GeneratedContent;
  imageAsset: GeneratedImageAsset | null | undefined;
  isPinned: boolean;
  isSelected: boolean;
  onDelete: (contentId: number) => void;
  onSelect: (content: GeneratedContent) => void;
  onTogglePin: (contentId: number) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverImageUrl = imageAsset ? resolveAssetUrl(imageAsset.image_url) : null;
  const coverLines = buildCoverLines(content.title);
  const platformId = platformIdForPreview(content.platform);

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      setActionsOpen(true);
    }, 520);
  }

  function handlePointerEnd() {
    clearLongPressTimer();
  }

  return (
    <article
      className={[
        "relative w-[174px] flex-none snap-start overflow-hidden rounded-[18px] border bg-paper shadow-sm transition",
        isSelected ? "border-moss ring-2 ring-moss/25" : "border-line hover:border-steel/50"
      ].join(" ")}
      data-testid="draft-history-card"
      role="listitem"
    >
      <button
        aria-label={`查看草稿：${content.title}`}
        className="block w-full text-left"
        onClick={() => onSelect(content)}
        onContextMenu={(event) => {
          event.preventDefault();
          setActionsOpen(true);
        }}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerEnd}
        onPointerUp={handlePointerEnd}
        type="button"
      >
        <div
          className={`relative aspect-[3/4] overflow-hidden ${
            coverImageUrl
              ? "bg-paper"
              : "bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.88),transparent_30%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_48%,#f8cfc0_100%)] p-3"
          }`}
        >
          {coverImageUrl ? (
            <img
              alt="历史草稿封面"
              className="h-full w-full object-cover"
              src={coverImageUrl}
            />
          ) : (
            <div className="absolute inset-x-3 bottom-4">
              <div className="mb-2 h-1 w-8 rounded-full bg-coral" />
              <div className="space-y-1 text-[1.2rem] font-black leading-[1.08] text-ink">
                {coverLines.slice(0, 3).map((line, index) => (
                  <div key={`history-cover-line-${index}-${line}`}>{line}</div>
                ))}
              </div>
            </div>
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-ink shadow-sm">
            <PlatformIcon platform={platformId} size="sm" />
            图文
          </div>
          {isPinned ? (
            <div className="absolute right-2 top-2 rounded-full bg-ink px-2 py-1 text-[10px] font-semibold text-paper">
              置顶
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <div className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink">
            {content.title}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
            <span>{formatDraftTime(content.created_at)}</span>
            <span>{generatedContentStatusLabel(content.status)}</span>
          </div>
        </div>
      </button>

      {actionsOpen ? (
        <div
          className="absolute inset-x-2 bottom-2 grid grid-cols-2 gap-2 rounded-[14px] border border-white/70 bg-paper/95 p-2 shadow-panel backdrop-blur"
          data-testid="draft-history-actions"
        >
          <button
            className="flex h-8 items-center justify-center gap-1 rounded-md border border-line bg-mist text-xs font-semibold text-ink"
            onClick={() => {
              onTogglePin(content.id);
              setActionsOpen(false);
            }}
            type="button"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {isPinned ? "取消" : "置顶"}
          </button>
          <button
            className="flex h-8 items-center justify-center gap-1 rounded-md border border-coral/30 bg-coral/10 text-xs font-semibold text-ink"
            onClick={() => {
              onDelete(content.id);
              setActionsOpen(false);
            }}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      ) : null}
    </article>
  );
}

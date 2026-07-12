"use client";

import { memo, useMemo, useRef, useEffect } from "react";
import { CheckCircle2, FileText, Pin, Trash2 } from "lucide-react";

import { CoverImagePreview } from "@/components/mobile-cover-image-preview";
import { resolveAssetUrl } from "@/lib/asset-url";
import type { MobileDraftHistoryItem } from "@/lib/mobile-draft-storage";
import { buildLocalCoverUrl } from "@/lib/mobile-cover-palette";

function formatMobileDraftDate(value?: string) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function countMobileDraftsToday(items: MobileDraftHistoryItem[]) {
  const now = new Date();
  return items.filter((item) => {
    const date = new Date(item.content.created_at ?? item.saved_at);
    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }).length;
}

export const DraftHistoryCarousel = memo(function DraftHistoryCarousel({
  activeContentId,
  error,
  items,
  onLongPress,
  onOpen,
  onRetry,
  onToggleSelection,
  selectedDraftIds,
  selectionMode
}: {
  activeContentId: number | null;
  error: string | null;
  items: MobileDraftHistoryItem[];
  onLongPress: (item: MobileDraftHistoryItem) => void;
  onOpen: (item: MobileDraftHistoryItem) => void;
  onRetry: () => void;
  onToggleSelection: (item: MobileDraftHistoryItem) => void;
  selectedDraftIds: number[];
  selectionMode: boolean;
}) {
  const selectedDraftIdSet = useMemo(() => new Set(selectedDraftIds), [selectedDraftIds]);

  return (
    <section
      className="rounded-[28px] border border-white/[0.88] bg-[rgba(255,253,247,0.88)] p-4 shadow-[0_12px_32px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.90)]"
      data-testid="mobile-draft-history"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-black">草稿历史</h2>
          <div className="mt-1 text-[11px] font-semibold text-muted">
            横向滑动浏览，长按多选
          </div>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-black",
            error ? "bg-blush text-coral" : "bg-sage/[0.90] text-moss"
          ].join(" ")}
        >
          {error ? "读取失败" : selectionMode ? `已选 ${selectedDraftIds.length}` : items.length ? `${items.length} 篇` : "暂无"}
        </span>
      </div>

      {error ? (
        <div
          className="mb-3 rounded-[22px] border border-coral/30 bg-blush px-3 py-3 text-xs font-bold leading-5 text-coral"
          data-testid="mobile-draft-history-error"
          role="alert"
        >
          <div>草稿历史读取失败</div>
          <p className="mt-1 text-muted">{error}</p>
          <p className="mt-1 text-muted">
            这不会触发生成、改写、确认或发布；可以重新读取历史草稿。
          </p>
          <button
            className="mt-3 h-9 rounded-full bg-moss px-4 text-xs font-black text-white active:scale-[0.99]"
            data-testid="mobile-draft-history-retry"
            onClick={onRetry}
            type="button"
          >
            重新读取草稿
          </button>
        </div>
      ) : null}

      {items.length ? (
        <div
          className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
          data-project-swipe-ignore="true"
        >
          {items.map((item) => (
            <DraftHistoryCard
              active={activeContentId === item.content.id}
              item={item}
              key={item.content.id}
              selected={selectedDraftIdSet.has(item.content.id)}
              selectionMode={selectionMode}
              onLongPress={onLongPress}
              onOpen={onOpen}
              onToggleSelection={onToggleSelection}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-6 text-center text-sm font-semibold leading-6 text-muted">
          <FileText className="h-6 w-6 text-sage/70" strokeWidth={2} />
          <span>生成第一篇图文后，会自动出现在这里。</span>
        </div>
      )}
    </section>
  );
});

const DraftHistoryCard = memo(function DraftHistoryCard({
  active,
  item,
  onLongPress,
  onOpen,
  onToggleSelection,
  selected,
  selectionMode
}: {
  active: boolean;
  item: MobileDraftHistoryItem;
  onLongPress: (item: MobileDraftHistoryItem) => void;
  onOpen: (item: MobileDraftHistoryItem) => void;
  onToggleSelection: (item: MobileDraftHistoryItem) => void;
  selected: boolean;
  selectionMode: boolean;
}) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const excerpt = useMemo(() => item.content.body.replace(/\s+/g, " ").slice(0, 54), [item]);
  const hasGeneratedCover = Boolean(item.cover);
  const coverUrl = useMemo(
    () => (item.cover ? resolveAssetUrl(item.cover.image_url) : buildLocalCoverUrl(item.content)),
    [item]
  );

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  function startLongPressTimer() {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress(item);
    }, 560);
  }

  function handleClick() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectionMode) {
      onToggleSelection(item);
      return;
    }
    onOpen(item);
  }

  return (
    <button
      aria-pressed={selectionMode ? selected : undefined}
      className={[
        "relative w-[214px] shrink-0 snap-start touch-manipulation overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_12px_26px_rgba(31,58,49,0.08)] active:scale-[0.99]",
        selected
          ? "border-moss ring-2 ring-moss/[0.18]"
          : active
            ? "border-coral ring-2 ring-coral/[0.16]"
            : "border-white/[0.88]"
      ].join(" ")}
      data-testid={`mobile-draft-history-card-${item.content.id}`}
      onClick={handleClick}
      onContextMenu={(event) => {
        event.preventDefault();
        onLongPress(item);
      }}
      onPointerCancel={clearLongPressTimer}
      onPointerDown={startLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerUp={clearLongPressTimer}
      type="button"
    >
      {selectionMode ? (
        <span
          className={[
            "absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-[0_8px_18px_rgba(0,0,0,0.12)]",
            selected ? "border-moss bg-moss text-white" : "border-white bg-white/[0.84] text-transparent"
          ].join(" ")}
        >
          <CheckCircle2 className="h-4 w-4" />
        </span>
      ) : null}
      <div className="relative">
        <CoverImagePreview
          alt={hasGeneratedCover ? "草稿封面" : "本地封面预览"}
          className="aspect-[3/4] w-full bg-mist object-cover"
          src={coverUrl}
          testId={`mobile-draft-history-cover-${item.content.id}`}
        />
        {!hasGeneratedCover ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-white/[0.78] px-2 py-1 text-[10px] font-black text-moss shadow-[0_8px_18px_rgba(31,58,49,0.10)]">
            本地预览
          </span>
        ) : null}
        {item.pinned ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/[0.80] p-1.5 text-coral shadow-[0_8px_18px_rgba(31,58,49,0.10)]">
            <Pin className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="space-y-2 px-3 pb-3 pt-2">
        <div className="line-clamp-2 min-h-[40px] text-[13px] font-black leading-5 text-ink">
          {item.content.title}
        </div>
        <div className="line-clamp-2 min-h-[34px] text-[11px] font-semibold leading-[17px] text-muted">
          {excerpt}
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] font-black text-muted">
          <span>{formatMobileDraftDate(item.content.created_at ?? item.saved_at)}</span>
          <span className={item.pinned ? "text-coral" : "text-moss"}>
            {item.pinned ? "置顶" : `#${item.content.id}`}
          </span>
        </div>
      </div>
    </button>
  );
});

export const DraftHistorySelectionBar = memo(function DraftHistorySelectionBar({
  onCancel,
  onDelete,
  onPinToggle,
  selectedCount,
  selectedItem
}: {
  onCancel: () => void;
  onDelete: () => void;
  onPinToggle: () => void;
  selectedCount: number;
  selectedItem: MobileDraftHistoryItem | null;
}) {
  const canPin = selectedCount === 1 && selectedItem !== null;

  return (
    <div
      className="rounded-[26px] border border-moss/[0.12] bg-[rgba(255,253,247,0.94)] p-3 shadow-[0_16px_34px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm"
      data-testid="mobile-draft-selection-toolbar"
      role="toolbar"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black text-coral">草稿多选</div>
          <div className="mt-1 text-sm font-black text-ink">已选 {selectedCount} 篇</div>
        </div>
        <button
          className="h-9 rounded-full border border-line bg-white px-4 text-xs font-black text-muted active:scale-[0.99]"
          data-testid="mobile-draft-selection-cancel"
          onClick={onCancel}
          type="button"
        >
          取消
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-moss text-sm font-black text-white active:scale-[0.99] disabled:bg-line disabled:text-white"
          data-testid="mobile-draft-selection-pin"
          disabled={!canPin}
          onClick={onPinToggle}
          type="button"
        >
          <Pin className="h-4 w-4" />
          {canPin ? (selectedItem.pinned ? "取消置顶" : "置顶") : "选 1 篇置顶"}
        </button>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-coral text-sm font-black text-white active:scale-[0.99]"
          data-testid="mobile-draft-selection-delete"
          onClick={onDelete}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
          删除所选
        </button>
      </div>
    </div>
  );
});

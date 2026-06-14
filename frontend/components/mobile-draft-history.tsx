"use client";

import { useRef } from "react";
import { CheckCircle2, Pin, Trash2 } from "lucide-react";

import { CoverImagePreview } from "@/components/mobile-cover-image-preview";
import { resolveAssetUrl } from "@/lib/asset-url";
import type { GeneratedContent } from "@/lib/generated-assets";
import type { MobileDraftHistoryItem } from "@/lib/mobile-draft-storage";
import {
  XHS_COVER_BASE_HEIGHT,
  XHS_COVER_BASE_WIDTH,
  XHS_COVER_HEIGHT,
  XHS_COVER_WIDTH
} from "@/lib/mobile-cover-share";

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

const localDraftCoverPalettes = [
  { accent: "#ff2442", backgroundEnd: "#ffd9df", backgroundMid: "#d9f1e5", backgroundStart: "#fff7df" },
  { accent: "#209b5a", backgroundEnd: "#dff7ee", backgroundMid: "#f4ead4", backgroundStart: "#ffffff" },
  { accent: "#111111", backgroundEnd: "#e9efe8", backgroundMid: "#f7e6cd", backgroundStart: "#fffdf7" },
  { accent: "#1f6feb", backgroundEnd: "#d9e8ff", backgroundMid: "#f5ead9", backgroundStart: "#fffaf0" }
];

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunkCoverText(value: string, size: number, maxLines: number) {
  const compact = value.replace(/\s+/g, "");
  const chars = Array.from(compact || "草稿");
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += size) {
    lines.push(chars.slice(index, index + size).join(""));
  }
  return lines.length ? lines : ["草稿"];
}

function buildLocalDraftHistoryCoverUrl(content: GeneratedContent) {
  const palette = localDraftCoverPalettes[Math.abs(content.id) % localDraftCoverPalettes.length];
  const titleLines = chunkCoverText(content.title, 7, 3);
  const excerpt = Array.from(content.body.replace(/\s+/g, " ").trim()).slice(0, 24).join("");
  const tag = content.tags?.find((value) => value.trim())?.trim() ?? "草稿";
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="86" y="${392 + index * 92}" class="title">${escapeSvgText(line)}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${XHS_COVER_WIDTH}" height="${XHS_COVER_HEIGHT}" viewBox="0 0 ${XHS_COVER_BASE_WIDTH} ${XHS_COVER_BASE_HEIGHT}">
<defs>
<linearGradient id="cover-bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${palette.backgroundStart}"/>
<stop offset="54%" stop-color="${palette.backgroundMid}"/>
<stop offset="100%" stop-color="${palette.backgroundEnd}"/>
</linearGradient>
<style>
.label{font:800 34px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:${palette.accent}}
.title{font:900 74px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111}
.meta{font:700 30px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#5f6a61}
</style>
</defs>
<rect width="${XHS_COVER_BASE_WIDTH}" height="${XHS_COVER_BASE_HEIGHT}" fill="url(#cover-bg)"/>
<rect x="64" y="74" width="190" height="78" rx="39" fill="rgba(255,255,255,0.78)"/>
<text x="100" y="126" class="label">${escapeSvgText(tag.slice(0, 8))}</text>
<path d="M92 278H808" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" opacity="0.16"/>
${titleSvg}
<rect x="70" y="812" width="760" height="158" rx="38" fill="rgba(255,255,255,0.54)"/>
<text x="104" y="882" class="meta">${escapeSvgText(excerpt || "本地草稿封面预览")}</text>
<text x="104" y="930" class="meta">本地预览 · 等待真实封面记录</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function DraftHistoryCarousel({
  activeContentId,
  items,
  onLongPress,
  onOpen,
  onToggleSelection,
  selectedDraftIds,
  selectionMode
}: {
  activeContentId: number | null;
  items: MobileDraftHistoryItem[];
  onLongPress: (item: MobileDraftHistoryItem) => void;
  onOpen: (item: MobileDraftHistoryItem) => void;
  onToggleSelection: (item: MobileDraftHistoryItem) => void;
  selectedDraftIds: number[];
  selectionMode: boolean;
}) {
  const selectedDraftIdSet = new Set(selectedDraftIds);

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
        <span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss">
          {selectionMode ? `已选 ${selectedDraftIds.length}` : items.length ? `${items.length} 篇` : "暂无"}
        </span>
      </div>

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
              onLongPress={() => onLongPress(item)}
              onOpen={() => onOpen(item)}
              onToggleSelection={() => onToggleSelection(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-5 text-sm font-semibold leading-6 text-muted">
          生成第一篇图文后，会自动出现在这里。
        </div>
      )}
    </section>
  );
}

function DraftHistoryCard({
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
  onLongPress: () => void;
  onOpen: () => void;
  onToggleSelection: () => void;
  selected: boolean;
  selectionMode: boolean;
}) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const excerpt = item.content.body.replace(/\s+/g, " ").slice(0, 54);
  const hasGeneratedCover = Boolean(item.cover);
  const coverUrl = item.cover
    ? resolveAssetUrl(item.cover.image_url)
    : buildLocalDraftHistoryCoverUrl(item.content);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function startLongPressTimer() {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress();
    }, 560);
  }

  function handleClick() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectionMode) {
      onToggleSelection();
      return;
    }
    onOpen();
  }

  return (
    <button
      aria-pressed={selectionMode ? selected : undefined}
      className={[
        "relative w-[214px] shrink-0 snap-start touch-manipulation overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_12px_26px_rgba(31,58,49,0.08)] active:scale-[0.99]",
        selected
          ? "border-[#111111] ring-2 ring-[#111111]/[0.18]"
          : active
            ? "border-[#ff2442] ring-2 ring-[#ff2442]/[0.16]"
            : "border-white/[0.88]"
      ].join(" ")}
      data-testid={`mobile-draft-history-card-${item.content.id}`}
      onClick={handleClick}
      onContextMenu={(event) => {
        event.preventDefault();
        onLongPress();
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
            selected ? "border-[#111111] bg-[#111111] text-white" : "border-white bg-white/[0.84] text-transparent"
          ].join(" ")}
        >
          <CheckCircle2 className="h-4 w-4" />
        </span>
      ) : null}
      <div className="relative">
        <CoverImagePreview
          alt={hasGeneratedCover ? "草稿封面" : "本地封面预览"}
          className="aspect-[3/4] w-full bg-[#f7f7f7] object-cover"
          src={coverUrl}
          testId={`mobile-draft-history-cover-${item.content.id}`}
        />
        {!hasGeneratedCover ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-white/[0.78] px-2 py-1 text-[10px] font-black text-moss shadow-[0_8px_18px_rgba(31,58,49,0.10)]">
            本地预览
          </span>
        ) : null}
        {item.pinned ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/[0.80] p-1.5 text-[#ff2442] shadow-[0_8px_18px_rgba(31,58,49,0.10)]">
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
          <span className={item.pinned ? "text-[#ff2442]" : "text-moss"}>
            {item.pinned ? "置顶" : `#${item.content.id}`}
          </span>
        </div>
      </div>
    </button>
  );
}

export function DraftHistorySelectionBar({
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
      className="rounded-[26px] border border-[#111111]/[0.12] bg-[rgba(255,253,247,0.94)] p-3 shadow-[0_16px_34px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm"
      data-testid="mobile-draft-selection-toolbar"
      role="toolbar"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black text-[#ff2442]">草稿多选</div>
          <div className="mt-1 text-sm font-black text-ink">已选 {selectedCount} 篇</div>
        </div>
        <button
          className="h-9 rounded-full border border-[#eeeeee] bg-white px-4 text-xs font-black text-muted active:scale-[0.99]"
          data-testid="mobile-draft-selection-cancel"
          onClick={onCancel}
          type="button"
        >
          取消
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#111111] text-sm font-black text-white active:scale-[0.99] disabled:bg-[#d9d9d9] disabled:text-white"
          data-testid="mobile-draft-selection-pin"
          disabled={!canPin}
          onClick={onPinToggle}
          type="button"
        >
          <Pin className="h-4 w-4" />
          {canPin ? (selectedItem.pinned ? "取消置顶" : "置顶") : "选 1 篇置顶"}
        </button>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff2442] text-sm font-black text-white active:scale-[0.99]"
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
}

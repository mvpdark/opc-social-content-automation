"use client";

import { memo, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Trash2
} from "lucide-react";

import { PlatformIcon, type PlatformId } from "@/components/platform-icon";
import {
  formatMobileTrendDate,
  mobileTrendAuthor,
  mobileTrendBodyText,
  mobileTrendCoverUrl,
  mobileTrendExcerpt,
  mobileTrendLikes,
  mobileTrendMetricItems,
  mobilePlatformText,
  type MobileTrendContent
} from "@/lib/mobile-trend-utils";
import { COLLECTION_COLLAGE_BG } from "@/components/mobile-collect-utils";

export type { MobileTrendContent } from "@/lib/mobile-trend-utils";
export { mobilePlatformText, sanitizeMobileTrendItems } from "@/lib/mobile-trend-utils";

function MobileOverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export function TrendSourceCard({
  deleting = false,
  item,
  onConfirmSwipe,
  onDeleteSwipe,
  onOpen,
  onOpenUrl,
  onToggle,
  reviewed,
  selected
}: {
  deleting?: boolean;
  item: MobileTrendContent;
  onConfirmSwipe: () => void;
  onDeleteSwipe: () => void;
  onOpen: () => void;
  onOpenUrl: () => void;
  onToggle: () => void;
  reviewed: boolean;
  selected: boolean;
}) {
  const { knownPlatform, coverUrl, platformLabel, author, date, metrics, bodyText } = useMemo(() => {
    const knownPlatform = item.platform === "xiaohongshu" || item.platform === "douyin" ? (item.platform as PlatformId) : null;
    const coverUrl = mobileTrendCoverUrl(item);
    const platformLabel = mobilePlatformText(item.platform);
    const author = mobileTrendAuthor(item);
    const date = item.publish_time
      ? formatMobileTrendDate(item.publish_time)
      : formatMobileTrendDate(item.created_at);
    const metrics = `赞 ${mobileTrendLikes(item)} · 藏 ${item.favorites} · 评 ${item.comments} · 转 ${item.shares}`;
    const bodyText = mobileTrendBodyText(item);
    return { knownPlatform, coverUrl, platformLabel, author, date, metrics, bodyText };
  }, [item]);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const swipeThreshold = 86;

  useEffect(() => {
    return () => {
      if (suppressClickTimerRef.current) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    };
  }, []);

  function clampDrag(value: number) {
    return Math.max(-116, Math.min(116, value));
  }

  function suppressNextClick() {
    if (!suppressClickRef.current) {
      return false;
    }
    suppressClickRef.current = false;
    if (suppressClickTimerRef.current) {
      window.clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }
    return true;
  }

  function armSuppressNextClick() {
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 450);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (deleting || event.button !== 0) {
      return;
    }
    if ((event.target as HTMLElement).closest("[data-swipe-ignore='true']")) {
      return;
    }
    movedRef.current = false;
    startRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaY) > 42 && Math.abs(deltaY) > Math.abs(deltaX) * 1.3) {
      startRef.current = null;
      setDragging(false);
      setDragX(0);
      return;
    }
    if (Math.abs(deltaX) > 8) {
      movedRef.current = true;
      setDragX(clampDrag(deltaX));
    }
  }

  function resetSwipe() {
    startRef.current = null;
    setDragging(false);
    setDragX(0);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start || start.pointerId !== event.pointerId) {
      resetSwipe();
      return;
    }
    const finalDrag = clampDrag(event.clientX - start.x);
    if (finalDrag >= swipeThreshold) {
      armSuppressNextClick();
      resetSwipe();
      onConfirmSwipe();
      return;
    }
    if (finalDrag <= -swipeThreshold) {
      armSuppressNextClick();
      resetSwipe();
      onDeleteSwipe();
      return;
    }
    if (movedRef.current) {
      armSuppressNextClick();
    }
    resetSwipe();
  }

  function handlePointerCancel() {
    resetSwipe();
  }

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[24px] text-left",
        deleting ? "opacity-55" : ""
      ].join(" ")}
      data-testid={`mobile-trend-source-${item.id}`}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div aria-hidden="true" className="absolute inset-0 grid grid-cols-2 rounded-[24px]">
        <div className="flex items-center gap-2 bg-moss px-4 text-xs font-black text-white">
          <CheckCircle2 className="h-4 w-4" />
          右滑确认
        </div>
        <div className="flex items-center justify-end gap-2 bg-coral px-4 text-xs font-black text-white">
          左滑删除
          <Trash2 className="h-4 w-4" />
        </div>
      </div>
      <div
        className={[
          "relative rounded-[24px] border bg-paper p-2.5 shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.90)]",
          dragging ? "" : "transition-transform duration-200 ease-out",
          selected ? "border-moss ring-2 ring-moss/[0.12]" : "border-white/[0.86]"
        ].join(" ")}
        style={{ transform: `translateX(${dragX}px)` }}
      >
        <div className="flex items-center gap-3">
          <button
            className="h-[74px] w-[74px] shrink-0 overflow-hidden rounded-[18px] border border-white/[0.88] bg-sage shadow-[0_8px_18px_rgba(31,58,49,0.08)] active:scale-[0.98]"
            onClick={() => {
              if (!suppressNextClick()) {
                onOpen();
              }
            }}
            type="button"
          >
            {coverUrl ? (
              <img alt={`${item.title}封面`} className="h-full w-full object-cover" loading="lazy" decoding="async" src={coverUrl} />
            ) : (
              <span
                aria-hidden="true"
                className="block h-full w-full bg-cover bg-center"
                style={COLLECTION_COLLAGE_BG}
              />
            )}
          </button>

          <button
            className="min-w-0 flex-1 touch-manipulation text-left active:scale-[0.995]"
            onClick={() => {
              if (!suppressNextClick()) {
                onOpen();
              }
            }}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={[
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black text-white",
                  item.platform === "douyin" ? "bg-ink" : "bg-coral"
                ].join(" ")}
              >
                {knownPlatform ? <PlatformIcon platform={knownPlatform} size="sm" /> : null}
                {platformLabel}
              </span>
              {reviewed ? (
                <span className="shrink-0 rounded-full bg-sage px-2 py-0.5 text-[10px] font-black text-moss">
                  已确认
                </span>
              ) : null}
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-[14px] font-black leading-5 text-ink">{item.title}</h3>
            <div className="mt-1 truncate text-xs font-semibold leading-5 text-muted">
              {author} · {date}
            </div>
            <div className="mt-0.5 truncate text-xs font-black text-ink/[0.70]">{metrics}</div>
            {bodyText ? (
              <p
                className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-ink/[0.64]"
                data-testid={`mobile-trend-source-body-${item.id}`}
              >
                {mobileTrendExcerpt(item, 72)}
              </p>
            ) : (
              <div
                className="mt-1 inline-flex max-w-full items-center rounded-full bg-amber/15 px-2 py-1 text-[11px] font-black leading-none text-amber-ink"
                data-testid={`mobile-trend-source-body-${item.id}`}
              >
                正文未采到，打开来源人工确认。
              </div>
            )}
          </button>

          <div className="flex w-12 shrink-0 flex-col items-center gap-1">
            <button
              aria-label={selected ? "取消选择" : "选择"}
              className={[
                "flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border text-[11px] font-black active:scale-[0.98]",
                selected
                  ? "border-moss bg-moss text-white"
                  : "border-transparent bg-mist text-muted"
              ].join(" ")}
              data-swipe-ignore="true"
              onClick={onToggle}
              type="button"
            >
              <CheckCircle2 className="h-5 w-5" />
            </button>
            <span className="text-xs font-black text-muted">{selected ? "已选" : "选择"}</span>
            <button
              aria-label="打开来源链接"
              className="mt-1 flex h-7 w-7 touch-manipulation items-center justify-center rounded-full border border-line bg-white/[0.72] text-muted active:scale-[0.98] disabled:opacity-40"
              data-swipe-ignore="true"
              disabled={!item.url}
              onClick={onOpenUrl}
              type="button"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export const MemoizedTrendSourceCard = memo(function MemoizedTrendSourceCard({
  deleting = false,
  item,
  onConfirmSwipe,
  onDeleteSwipe,
  onOpen,
  onOpenUrl,
  onToggle,
  reviewed,
  selected
}: {
  deleting?: boolean;
  item: MobileTrendContent;
  onConfirmSwipe: (item: MobileTrendContent) => void;
  onDeleteSwipe: (item: MobileTrendContent) => void;
  onOpen: (item: MobileTrendContent) => void;
  onOpenUrl: (item: MobileTrendContent) => void;
  onToggle: (id: number) => void;
  reviewed: boolean;
  selected: boolean;
}) {
  return (
    <TrendSourceCard
      deleting={deleting}
      item={item}
      onConfirmSwipe={() => onConfirmSwipe(item)}
      onDeleteSwipe={() => void onDeleteSwipe(item)}
      onOpen={() => onOpen(item)}
      onOpenUrl={() => onOpenUrl(item)}
      onToggle={() => onToggle(item.id)}
      reviewed={reviewed}
      selected={selected}
    />
  );
});

export const TrendSourceReviewSheet = memo(function TrendSourceReviewSheet({
  item,
  onClose,
  onConfirm,
  onOpenUrl,
  reviewed,
  selected
}: {
  item: MobileTrendContent;
  onClose: () => void;
  onConfirm: () => void;
  onOpenUrl: () => void;
  reviewed: boolean;
  selected: boolean;
}) {
  const { knownPlatform, tags, coverUrl, publishedAt, collectedAt, bodyText } = useMemo(() => {
    const knownPlatform = item.platform === "xiaohongshu" || item.platform === "douyin" ? (item.platform as PlatformId) : null;
    const tags = item.tags?.filter((tag) => tag.trim()) ?? [];
    const coverUrl = mobileTrendCoverUrl(item);
    const publishedAt = item.publish_time ? formatMobileTrendDate(item.publish_time) : "未记录";
    const collectedAt = formatMobileTrendDate(item.created_at);
    const bodyText = mobileTrendBodyText(item);
    return { knownPlatform, tags, coverUrl, publishedAt, collectedAt, bodyText };
  }, [item]);

  return (
    <MobileOverlayPortal>
      <div
        aria-modal="true"
        className="fixed inset-0 z-[80] flex justify-center bg-white"
        data-testid="mobile-trend-source-detail"
        role="dialog"
      >
        <div className="flex h-[100dvh] w-full max-w-[430px] flex-col bg-paper text-ink">
          <header className="shrink-0 border-b border-sand bg-[rgba(255,253,247,0.96)] px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-3">
              <button
                aria-label="关闭采集素材详情"
                className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_20px_rgba(31,58,49,0.08)]"
                onClick={onClose}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-black text-moss">
                  {knownPlatform ? <PlatformIcon platform={knownPlatform} size="sm" /> : null}
                  {mobilePlatformText(item.platform)}
                </div>
                <h2 className="mt-1 truncate text-lg font-black leading-6">采集素材详情</h2>
              </div>
              <span
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-black",
                  reviewed ? "bg-sage text-moss" : "bg-amber/15 text-amber-ink"
                ].join(" ")}
              >
                {reviewed ? "已确认" : selected ? "已选择" : "待确认"}
              </span>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
            <article className="rounded-[28px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-4 shadow-[0_12px_32px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.90)]">
              {coverUrl ? (
                <div className="mb-4 overflow-hidden rounded-[24px] border border-white/[0.88] bg-sage">
                  <img alt={`${item.title}封面`} className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" src={coverUrl} />
                </div>
              ) : null}
              <h3 className="break-words text-[20px] font-black leading-7">{item.title}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-muted">
                <div className="min-w-0 rounded-[18px] bg-white/[0.72] px-3 py-2">
                  作者<br />
                  <span className="block break-words text-sm text-ink">{mobileTrendAuthor(item)}</span>
                </div>
                <div className="min-w-0 rounded-[18px] bg-white/[0.72] px-3 py-2">
                  发布时间<br />
                  <span className="block text-sm text-ink">{publishedAt}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">采集 {collectedAt}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {mobileTrendMetricItems(item).map((metric) => (
                  <div
                    className="min-w-0 rounded-[16px] bg-sage/[0.68] px-2 py-2 text-center"
                    key={`${item.id}-${metric.label}`}
                  >
                    <div className="text-[10px] font-black text-moss/[0.72]">{metric.label}</div>
                    <div className="mt-0.5 truncate text-sm font-black text-moss">{metric.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[22px] bg-white/[0.72] px-3.5 py-3">
                <div className="text-xs font-black text-ink/[0.52]">正文</div>
                <div className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-ink/[0.78]">
                  {bodyText || "正文未采到，请打开来源人工确认后再入库。"}
                </div>
              </div>
              {item.video_transcript ? (
                <div className="mt-3 whitespace-pre-wrap break-words rounded-[22px] bg-amber/15 px-3.5 py-3 text-xs font-semibold leading-6 text-amber-ink">
                  {item.video_transcript}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.length ? (
                  tags.map((tag, index) => (
                    <span
                      className="rounded-full bg-white/[0.82] px-2.5 py-1 text-[11px] font-black text-ink/[0.60]"
                      key={`detail-${item.id}-${index}-${tag}`}
                    >
                      #{tag.replace(/^#/, "")}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-semibold text-muted">暂无标签</span>
                )}
              </div>
              <div className="mt-4 rounded-[20px] border border-sand bg-white/[0.68] px-3 py-2 text-xs font-semibold leading-5 text-muted">
                <div className="font-black text-ink/[0.58]">来源</div>
                <div className="mt-1 break-all">{item.url || "未保存来源链接"}</div>
              </div>
            </article>
          </section>

          <footer className="shrink-0 border-t border-sand bg-[rgba(255,253,247,0.96)] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-black text-ink active:scale-[0.99] disabled:opacity-50"
                disabled={!item.url}
                onClick={onOpenUrl}
                type="button"
              >
                <ExternalLink className="h-4 w-4" />
                打开来源
              </button>
              <button
                className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-sm font-black text-white shadow-moss-sm active:scale-[0.99]"
                onClick={onConfirm}
                type="button"
              >
                <CheckCircle2 className="h-4 w-4" />
                确认这条
              </button>
            </div>
          </footer>
        </div>
      </div>
    </MobileOverlayPortal>
  );
});

"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Trash2
} from "lucide-react";

import { PlatformIcon } from "@/components/platform-icon";
import { resolveAssetUrl } from "@/lib/asset-url";

const COMPACT_XHS_METADATA_RE =
  /(.{2,60}?)\s+(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|\d+\s*天前|昨天|前天|刚刚)\s*(\d+(?:\.\d+)?\s*(?:万|w|W|k|K|千)?)?$/;

export type MobileTrendContent = {
  id: number;
  platform: string;
  title: string;
  content: string;
  author: string | null;
  publish_time: string | null;
  url: string | null;
  tags: string[] | null;
  likes: number;
  favorites: number;
  comments: number;
  shares: number;
  cover_url: string | null;
  video_transcript: string | null;
  screenshot_url: string | null;
  created_at: string;
};

function isMobileTrendContent(value: unknown): value is MobileTrendContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Partial<MobileTrendContent>;
  return (
    typeof item.id === "number" &&
    typeof item.platform === "string" &&
    typeof item.title === "string" &&
    typeof item.content === "string"
  );
}

export function sanitizeMobileTrendItems(value: unknown) {
  return Array.isArray(value) ? value.filter(isMobileTrendContent) : [];
}

export function mobilePlatformText(platform: string) {
  if (platform === "xiaohongshu") {
    return "小红书";
  }
  if (platform === "douyin") {
    return "抖音";
  }
  return platform || "未知平台";
}

function mobileTrendExcerpt(item: MobileTrendContent, maxLength = 96) {
  const text = item.content.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text || "这条素材没有正文摘要。";
  }
  return `${text.slice(0, maxLength)}...`;
}

function formatMobileTrendDate(value: string | null) {
  if (!value) {
    return "时间未知";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function mobileTrendCoverUrl(item: MobileTrendContent) {
  const url = item.cover_url || item.screenshot_url;
  return url ? resolveAssetUrl(url) : null;
}

function mobileTrendMetricItems(item: MobileTrendContent) {
  return [
    { label: "点赞", value: mobileTrendLikes(item) },
    { label: "收藏", value: item.favorites },
    { label: "评论", value: item.comments },
    { label: "转发", value: item.shares }
  ];
}

function parseCompactMetric(value: string | undefined) {
  if (!value) {
    return 0;
  }
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(万|w|W|k|K|千)?/);
  if (!match) {
    return 0;
  }
  let count = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === "万" || unit === "w") {
    count *= 10000;
  } else if (unit === "千" || unit === "k") {
    count *= 1000;
  }
  return Math.max(0, Math.floor(count));
}

function compactXhsMetadata(item: MobileTrendContent) {
  let text = item.content.replace(/\s+/g, " ").trim();
  const title = item.title.replace(/\s+/g, " ").trim();
  for (let index = 0; index < 2; index += 1) {
    if (title && text.startsWith(title)) {
      text = text.slice(title.length).trim();
    }
  }
  const match = text.match(COMPACT_XHS_METADATA_RE);
  if (!match) {
    return { author: null as string | null, likes: 0 };
  }
  const author = match[1]?.trim();
  const noisyAuthor = /赞|收藏|评论|分享|转发|关注|登录|小红书/.test(author);
  return {
    author: author && !noisyAuthor ? author : null,
    likes: parseCompactMetric(match[3])
  };
}

function mobileTrendAuthor(item: MobileTrendContent) {
  return item.author || compactXhsMetadata(item).author || "未知作者";
}

function mobileTrendLikes(item: MobileTrendContent) {
  return item.likes || compactXhsMetadata(item).likes;
}

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
  const knownPlatform = item.platform === "xiaohongshu" || item.platform === "douyin" ? item.platform : null;
  const coverUrl = mobileTrendCoverUrl(item);
  const platformLabel = mobilePlatformText(item.platform);
  const author = mobileTrendAuthor(item);
  const date = item.publish_time || formatMobileTrendDate(item.created_at);
  const metrics = `赞 ${mobileTrendLikes(item)} · 藏 ${item.favorites} · 评 ${item.comments} · 转 ${item.shares}`;
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
        <div className="flex items-center gap-2 bg-[#23854f] px-4 text-xs font-black text-white">
          <CheckCircle2 className="h-4 w-4" />
          右滑确认
        </div>
        <div className="flex items-center justify-end gap-2 bg-[#ef4444] px-4 text-xs font-black text-white">
          左滑删除
          <Trash2 className="h-4 w-4" />
        </div>
      </div>
      <div
        className={[
          "relative rounded-[24px] border bg-[rgba(255,253,247,0.88)] p-2.5 shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.90)]",
          dragging ? "" : "transition-transform duration-200 ease-out",
          selected ? "border-[#23854f] ring-2 ring-[#23854f]/[0.12]" : "border-white/[0.86]"
        ].join(" ")}
        style={{ transform: `translateX(${dragX}px)` }}
      >
        <div className="flex items-center gap-3">
          <button
            className="h-[74px] w-[74px] shrink-0 overflow-hidden rounded-[18px] border border-white/[0.88] bg-[#eef4ed] shadow-[0_8px_18px_rgba(31,58,49,0.08)] active:scale-[0.98]"
            onClick={() => {
              if (!suppressNextClick()) {
                onOpen();
              }
            }}
            type="button"
          >
            {coverUrl ? (
              <img alt="" className="h-full w-full object-cover" src={coverUrl} />
            ) : (
              <span
                aria-hidden="true"
                className="block h-full w-full bg-cover bg-center"
                style={{ backgroundImage: "url(/mobile-assets/collection-collage.png)" }}
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
                  item.platform === "douyin" ? "bg-[#101010]" : "bg-[#ff2442]"
                ].join(" ")}
              >
                {knownPlatform ? <PlatformIcon platform={knownPlatform} size="sm" /> : null}
                {platformLabel}
              </span>
              {reviewed ? (
                <span className="shrink-0 rounded-full bg-[#e7f2ea] px-2 py-0.5 text-[10px] font-black text-moss">
                  已确认
                </span>
              ) : null}
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-[14px] font-black leading-5 text-ink">{item.title}</h3>
            <div className="mt-1 truncate text-xs font-semibold leading-5 text-muted">
              {author} · {date}
            </div>
            <div className="mt-0.5 truncate text-xs font-black text-ink/[0.70]">{metrics}</div>
            <span className="sr-only">{mobileTrendExcerpt(item)}</span>
          </button>

          <div className="flex w-12 shrink-0 flex-col items-center gap-1">
            <button
              className={[
                "flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border text-[11px] font-black active:scale-[0.98]",
                selected
                  ? "border-[#23854f] bg-[#23854f] text-white"
                  : "border-transparent bg-[#ecebe2] text-[#9ca28f]"
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
              className="mt-1 flex h-7 w-7 touch-manipulation items-center justify-center rounded-full border border-[#d6e8df] bg-white/[0.72] text-muted active:scale-[0.98] disabled:opacity-40"
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

export function TrendSourceReviewSheet({
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
  const knownPlatform = item.platform === "xiaohongshu" || item.platform === "douyin" ? item.platform : null;
  const tags = item.tags?.filter((tag) => tag.trim()) ?? [];
  const coverUrl = mobileTrendCoverUrl(item);
  const publishedAt = item.publish_time ? formatMobileTrendDate(item.publish_time) : "未记录";
  const collectedAt = formatMobileTrendDate(item.created_at);

  return (
    <MobileOverlayPortal>
      <div
        aria-modal="true"
        className="fixed inset-0 z-[80] flex justify-center bg-white"
        data-testid="mobile-trend-source-detail"
        role="dialog"
      >
        <div className="flex h-[100dvh] w-full max-w-[430px] flex-col bg-[#f8f5ec] text-ink">
          <header className="shrink-0 border-b border-[#e6dece] bg-[rgba(255,253,247,0.96)] px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
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
                  reviewed ? "bg-[#e7f2ea] text-moss" : "bg-[#fff6e3] text-[#8a5d16]"
                ].join(" ")}
              >
                {reviewed ? "已确认" : selected ? "已选择" : "待确认"}
              </span>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
            <article className="rounded-[28px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-4 shadow-[0_12px_32px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.90)]">
              {coverUrl ? (
                <div className="mb-4 overflow-hidden rounded-[24px] border border-white/[0.88] bg-[#eef4ed]">
                  <img alt="" className="aspect-[4/3] w-full object-cover" src={coverUrl} />
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
                    className="min-w-0 rounded-[16px] bg-[#e7f2ea]/[0.68] px-2 py-2 text-center"
                    key={`${item.id}-${metric.label}`}
                  >
                    <div className="text-[10px] font-black text-moss/[0.72]">{metric.label}</div>
                    <div className="mt-0.5 truncate text-sm font-black text-moss">{metric.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 whitespace-pre-wrap break-words rounded-[22px] bg-white/[0.72] px-3.5 py-3 text-sm font-semibold leading-7 text-ink/[0.78]">
                {item.content}
              </div>
              {item.video_transcript ? (
                <div className="mt-3 whitespace-pre-wrap break-words rounded-[22px] bg-[#fff6e3]/[0.88] px-3.5 py-3 text-xs font-semibold leading-6 text-[#8a5d16]">
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
              <div className="mt-4 rounded-[20px] border border-[#e6dece] bg-white/[0.68] px-3 py-2 text-xs font-semibold leading-5 text-muted">
                <div className="font-black text-ink/[0.58]">来源</div>
                <div className="mt-1 break-all">{item.url || "未保存来源链接"}</div>
              </div>
            </article>
          </section>

          <footer className="shrink-0 border-t border-[#e6dece] bg-[rgba(255,253,247,0.96)] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full border border-[#d6e8df] bg-white text-sm font-black text-ink active:scale-[0.99] disabled:opacity-50"
                disabled={!item.url}
                onClick={onOpenUrl}
                type="button"
              >
                <ExternalLink className="h-4 w-4" />
                打开来源
              </button>
              <button
                className="flex h-12 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#23854f] text-sm font-black text-white shadow-[0_12px_26px_rgba(35,133,79,0.18)] active:scale-[0.99]"
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
}

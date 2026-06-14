"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink
} from "lucide-react";

import { PlatformIcon } from "@/components/platform-icon";

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

function mobileTrendMetrics(item: MobileTrendContent) {
  return `赞 ${item.likes} · 藏 ${item.favorites} · 评 ${item.comments} · 转 ${item.shares}`;
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
  item,
  onOpen,
  onOpenUrl,
  onToggle,
  reviewed,
  selected
}: {
  item: MobileTrendContent;
  onOpen: () => void;
  onOpenUrl: () => void;
  onToggle: () => void;
  reviewed: boolean;
  selected: boolean;
}) {
  const knownPlatform = item.platform === "xiaohongshu" || item.platform === "douyin" ? item.platform : null;
  const tags = item.tags?.filter((tag) => tag.trim()).slice(0, 3) ?? [];

  return (
    <article
      className={[
        "rounded-[22px] border bg-[rgba(255,253,247,0.88)] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]",
        selected ? "border-[#23854f] ring-2 ring-[#23854f]/[0.12]" : "border-white/[0.84]"
      ].join(" ")}
      data-testid={`mobile-trend-source-${item.id}`}
    >
      <button className="block w-full touch-manipulation text-left active:scale-[0.995]" onClick={onOpen} type="button">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {knownPlatform ? <PlatformIcon platform={knownPlatform} size="sm" /> : null}
              <span className="rounded-full bg-[#e7f2ea] px-2 py-0.5 text-[10px] font-black text-moss">
                {mobilePlatformText(item.platform)}
              </span>
              {reviewed ? (
                <span className="rounded-full bg-[#e7f2ea] px-2 py-0.5 text-[10px] font-black text-moss">
                  已确认
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-ink">{item.title}</h3>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
        </div>
        <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-muted">
          {mobileTrendExcerpt(item)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.length ? (
            tags.map((tag, index) => (
              <span
                className="rounded-full bg-white/[0.72] px-2 py-0.5 text-[10px] font-bold text-ink/[0.58]"
                key={`${item.id}-${index}-${tag}`}
              >
                #{tag.replace(/^#/, "")}
              </span>
            ))
          ) : (
            <span className="text-[10px] font-bold text-ink/[0.45]">暂无标签</span>
          )}
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#e6dece] pt-2">
        <div className="min-w-0 text-[11px] font-bold leading-5 text-muted">
          <div className="truncate">{item.author || "未知作者"} · {formatMobileTrendDate(item.created_at)}</div>
          <div className="truncate">{mobileTrendMetrics(item)}</div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            className={[
              "flex h-8 min-w-16 touch-manipulation items-center justify-center rounded-full px-2 text-[11px] font-black active:scale-[0.98]",
              selected ? "bg-[#23854f] text-white" : "border border-[#d6e8df] bg-white text-ink"
            ].join(" ")}
            onClick={onToggle}
            type="button"
          >
            {selected ? "已选" : "选择"}
          </button>
          <button
            className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border border-[#d6e8df] bg-white text-ink active:scale-[0.98] disabled:opacity-40"
            disabled={!item.url}
            onClick={onOpenUrl}
            type="button"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
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
              <h3 className="text-[20px] font-black leading-7">{item.title}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-muted">
                <div className="rounded-[18px] bg-white/[0.72] px-3 py-2">
                  作者<br />
                  <span className="text-sm text-ink">{item.author || "未知作者"}</span>
                </div>
                <div className="rounded-[18px] bg-white/[0.72] px-3 py-2">
                  采集时间<br />
                  <span className="text-sm text-ink">{formatMobileTrendDate(item.created_at)}</span>
                </div>
              </div>
              <div className="mt-3 rounded-[20px] bg-[#e7f2ea]/[0.68] px-3 py-2 text-xs font-black text-moss">
                {mobileTrendMetrics(item)}
              </div>
              <div className="mt-4 whitespace-pre-wrap rounded-[22px] bg-white/[0.72] px-3.5 py-3 text-sm font-semibold leading-7 text-ink/[0.78]">
                {item.content}
              </div>
              {item.video_transcript ? (
                <div className="mt-3 whitespace-pre-wrap rounded-[22px] bg-[#fff6e3]/[0.88] px-3.5 py-3 text-xs font-semibold leading-6 text-[#8a5d16]">
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
                来源：{item.url || "未保存来源链接"}
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

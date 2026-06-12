"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";

import { getApiBase } from "@/lib/api-base";
import { resolveAssetUrl } from "@/lib/asset-url";

type GeneratedContent = {
  body: string;
  id: number;
  platform: string;
  status: string;
  tags: string[] | null;
  title: string;
};

type GeneratedImageAsset = {
  content_id: number;
  id: number;
  image_url: string;
  status: string;
};

const xhsStickerPreviewByCode = new Map<string, { face: string; name: string }>(
  [
    ["[笑哭R]", { face: "😂", name: "笑哭" }],
    ["[哭惹R]", { face: "🥺", name: "哭惹" }],
    ["[哇R]", { face: "😮", name: "哇" }],
    ["[赞R]", { face: "👍", name: "赞" }],
    ["[doge]", { face: "😏", name: "doge" }],
    ["[蹲后续H]", { face: "🪑", name: "蹲后续" }],
    ["[蹲后续R]", { face: "🪑", name: "蹲后续" }]
  ] as const
);

function isGeneratedContent(value: unknown): value is GeneratedContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const content = value as Partial<GeneratedContent>;
  return (
    typeof content.body === "string" &&
    typeof content.id === "number" &&
    typeof content.platform === "string" &&
    typeof content.status === "string" &&
    typeof content.title === "string" &&
    (Array.isArray(content.tags) || content.tags === null || content.tags === undefined)
  );
}

function isGeneratedImageAsset(value: unknown): value is GeneratedImageAsset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const image = value as Partial<GeneratedImageAsset>;
  return (
    typeof image.content_id === "number" &&
    typeof image.id === "number" &&
    typeof image.image_url === "string" &&
    typeof image.status === "string"
  );
}

function formatTags(tags: string[] | null) {
  return (tags ?? [])
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`);
}

function xhsStickerFallback(code: string) {
  const match = code.match(/^\[([^\[\]]+?)(?:[RH])?\]$/);
  if (!match) {
    return null;
  }
  return {
    face: "💬",
    name: match[1]
  };
}

function renderXhsExpressionText(text: string) {
  return text.split(/(\[[^\[\]]+\])/g).map((part, index) => {
    const sticker = xhsStickerPreviewByCode.get(part) ?? xhsStickerFallback(part);
    if (!sticker) {
      return part;
    }
    return (
      <span
        aria-label={`${sticker.name}表情`}
        className="mx-0.5 inline-flex h-6 min-w-6 translate-y-[3px] items-center justify-center rounded-full border border-[#ffd4dc] bg-[#fff3f6] px-1.5 text-base leading-none shadow-sm"
        key={`${part}-${index}`}
        title={`${part}：${sticker.name}`}
      >
        {sticker.face}
      </span>
    );
  });
}

export function PublicPreviewClient({ contentId }: { contentId: string }) {
  const numericContentId = Number(contentId);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [cover, setCover] = useState<GeneratedImageAsset | null>(null);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [message, setMessage] = useState("正在加载图文预览");

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      if (!Number.isInteger(numericContentId) || numericContentId <= 0) {
        setStatus("error");
        setMessage("预览链接无效。");
        return;
      }

      try {
        const apiBase = getApiBase();
        const contentResponse = await fetch(`${apiBase}/content/${numericContentId}`);
        if (!contentResponse.ok) {
          throw new Error("这条草稿暂时无法打开。");
        }
        const contentData: unknown = await contentResponse.json();
        if (!isGeneratedContent(contentData)) {
          throw new Error("这条草稿数据不完整。");
        }

        const imageResponse = await fetch(`${apiBase}/image/list?content_id=${numericContentId}&limit=1`);
        const imageData: unknown = imageResponse.ok ? await imageResponse.json() : [];
        const latestCover = Array.isArray(imageData)
          ? imageData.find(
              (image): image is GeneratedImageAsset =>
                isGeneratedImageAsset(image) && image.content_id === numericContentId
            ) ?? null
          : null;

        if (!active) {
          return;
        }
        setContent(contentData);
        setCover(latestCover);
        setStatus("ready");
        setMessage("发布前预览 · 不会自动发布");
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "预览加载失败。");
      }
    }

    void loadPreview();
    return () => {
      active = false;
    };
  }, [numericContentId]);

  const coverUrl = cover ? resolveAssetUrl(cover.image_url) : null;
  const paragraphs = useMemo(
    () =>
      (content?.body ?? "")
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [content?.body]
  );
  const tags = formatTags(content?.tags ?? null);

  if (status !== "ready" || !content) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-white px-6 text-ink">
        <section className="w-full max-w-sm text-center">
          {status === "error" ? (
            <AlertCircle className="mx-auto h-8 w-8 text-[#ff2442]" />
          ) : (
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#ff2442] border-t-transparent" />
          )}
          <h1 className="mt-4 text-lg font-bold">{status === "error" ? "预览打不开" : "正在加载"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white text-ink" data-testid="public-preview-page">
      <article className="mx-auto min-h-[100dvh] max-w-[430px] bg-white">
        {coverUrl ? (
          <img
            alt="图文封面预览"
            className="aspect-[3/4] w-full bg-[#f7f7f7] object-contain"
            data-testid="public-preview-cover"
            decoding="async"
            src={coverUrl}
          />
        ) : (
          <div
            className="aspect-[3/4] w-full bg-[linear-gradient(160deg,#fff7df,#d9f1e5_48%,#f7cdbf)] px-6 pb-8 pt-6"
            data-testid="public-preview-fallback-cover"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-steel">封面预览</span>
              <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold text-ink/70">
                文字版
              </span>
            </div>
            <div className="mt-14 text-[34px] font-black leading-tight text-ink">
              {content.title.split(/[，,]/).slice(0, 3).map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </div>
          </div>
        )}

        <section className="px-4 pb-7 pt-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#f1f1f1] pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff2442] text-sm font-bold text-white">
                O
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">OPC 内容运营</div>
                <div className="text-[11px] text-muted">图文草稿预览</div>
              </div>
            </div>
            <span className="rounded-full bg-[#ff2442] px-4 py-2 text-xs font-semibold text-white">关注</span>
          </div>

          <h1 className="mt-4 text-xl font-bold leading-7">{content.title}</h1>
          <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink">
            {paragraphs.length ? (
              paragraphs.map((paragraph) => <p key={paragraph}>{renderXhsExpressionText(paragraph)}</p>)
            ) : (
              <p>{renderXhsExpressionText(content.body)}</p>
            )}
          </div>

          {tags.length ? (
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium text-[#346cb0]">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 text-xs text-muted">{message}</div>
        </section>

        <footer className="sticky bottom-0 flex items-center justify-between border-t border-[#eeeeee] bg-white/95 px-4 py-2 backdrop-blur">
          <span className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink">
            <Heart className="h-5 w-5" />
            赞
          </span>
          <span className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink">
            <MessageCircle className="h-5 w-5" />
            评论
          </span>
          <span className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink">
            <Bookmark className="h-5 w-5" />
            收藏
          </span>
          <span className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink">
            <Share2 className="h-5 w-5" />
            分享
          </span>
        </footer>
      </article>
    </main>
  );
}

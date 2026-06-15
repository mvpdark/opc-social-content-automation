"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  PenLine,
  ShieldCheck
} from "lucide-react";

import { getApiBase } from "@/lib/api-base";
import { resolveAssetUrl } from "@/lib/asset-url";
import { addMobileBackHandler } from "@/lib/mobile-back-navigation";
import {
  generationSourceContextStats,
  isGeneratedContent,
  isGeneratedImageAsset,
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import { readStoredDeletedDraftIds } from "@/lib/mobile-draft-storage";
import { sanitizeServiceErrorMessage } from "@/lib/service-error-copy";
import { formatTagLine } from "@/lib/tags";
import { renderXhsExpressionText } from "@/lib/xhs-stickers";

type MobileCredentialSettings = {
  draftApiKey: string;
  imageApiKey: string;
  rewriteApiKey: string;
  workspaceToken: string;
};

type MobileReviewDecision = "approved" | "changes_requested";
type MobileReviewQueueItem = {
  content: GeneratedContent;
  cover: GeneratedImageAsset | null;
};

const API_BASE = getApiBase();
const mobileReviewQueueStatuses = new Set(["draft", "rewritten", "review_pending"]);
const REVIEW_COVER_WIDTH = 2048;
const REVIEW_COVER_HEIGHT = 2736;
const REVIEW_COVER_BASE_WIDTH = 900;
const REVIEW_COVER_BASE_HEIGHT = 1200;
const localReviewCoverPalettes = [
  { accent: "#ff2442", backgroundEnd: "#ffd9df", backgroundMid: "#d9f1e5", backgroundStart: "#fff7df" },
  { accent: "#209b5a", backgroundEnd: "#dff7ee", backgroundMid: "#f4ead4", backgroundStart: "#ffffff" },
  { accent: "#111111", backgroundEnd: "#e9efe8", backgroundMid: "#f7e6cd", backgroundStart: "#fffdf7" },
  { accent: "#1f6feb", backgroundEnd: "#d9e8ff", backgroundMid: "#f5ead9", backgroundStart: "#fffaf0" }
];

function authHeaders(credentials: MobileCredentialSettings) {
  return {
    "Content-Type": "application/json",
    ...(credentials.workspaceToken.trim()
      ? { Authorization: `Bearer ${credentials.workspaceToken.trim()}` }
      : {})
  };
}

async function readApiError(response: Response, fallback: string) {
  const errorBody = (await response.json().catch(() => null)) as
    | { detail?: string; message?: string }
    | null;
  return sanitizeServiceErrorMessage(errorBody?.message ?? errorBody?.detail ?? fallback);
}

function isMobileReviewCandidate(content: GeneratedContent) {
  return content.platform === "xiaohongshu" && mobileReviewQueueStatuses.has(content.status);
}

function mobileReviewStatusLabel(status: string) {
  if (status === "review_pending") {
    return "待确认";
  }
  if (status === "rewritten") {
    return "已润色";
  }
  if (status === "approved") {
    return "已通过";
  }
  if (status === "changes_requested") {
    return "需修改";
  }
  if (status === "rejected") {
    return "已拒绝";
  }
  return "草稿";
}

function mobileReviewStatusClass(status: string) {
  if (status === "review_pending") {
    return "bg-[#fff4d7] text-[#8a6110]";
  }
  if (status === "rewritten") {
    return "bg-[#e7f2ea] text-moss";
  }
  if (status === "approved") {
    return "bg-[#e6f4ec] text-[#23854f]";
  }
  if (status === "changes_requested" || status === "rejected") {
    return "bg-[#fff1ec] text-coral";
  }
  return "bg-white text-muted";
}

function mobileReviewEvidenceCount(sourceContext?: GenerationSourceContext | null) {
  return generationSourceContextStats(sourceContext).totalCount;
}

function mobileReviewNeedsWebSourceReview(sourceContext?: GenerationSourceContext | null) {
  return generationSourceContextStats(sourceContext).missingRequiredWebResults;
}

function formatMobileReviewTime(value?: string) {
  if (!value) {
    return "刚刚";
  }
  return new Date(value).toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  });
}

function mobileContentExcerpt(content: GeneratedContent, maxLength = 82) {
  const normalized = content.body.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunkCoverText(value: string, size: number, maxLines: number) {
  const chars = Array.from(value.replace(/\s+/g, "") || "草稿");
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += size) {
    lines.push(chars.slice(index, index + size).join(""));
  }
  return lines.length ? lines : ["草稿"];
}

function buildLocalReviewCoverUrl(content: GeneratedContent) {
  const palette = localReviewCoverPalettes[Math.abs(content.id) % localReviewCoverPalettes.length];
  const titleLines = chunkCoverText(content.title, 7, 3);
  const excerpt = Array.from(content.body.replace(/\s+/g, " ").trim()).slice(0, 24).join("");
  const tag = content.tags?.find((value) => value.trim())?.trim() ?? "草稿";
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="86" y="${392 + index * 92}" class="title">${escapeSvgText(line)}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${REVIEW_COVER_WIDTH}" height="${REVIEW_COVER_HEIGHT}" viewBox="0 0 ${REVIEW_COVER_BASE_WIDTH} ${REVIEW_COVER_BASE_HEIGHT}">
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
<rect width="${REVIEW_COVER_BASE_WIDTH}" height="${REVIEW_COVER_BASE_HEIGHT}" fill="url(#cover-bg)"/>
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

async function fetchLatestContentCover(contentId: number) {
  try {
    const response = await fetch(`${API_BASE}/image/list?content_id=${contentId}&limit=1`);
    if (!response.ok) {
      return null;
    }

    const images: unknown = await response.json();
    if (!Array.isArray(images)) {
      return null;
    }

    return images.find(
      (image): image is GeneratedImageAsset =>
        isGeneratedImageAsset(image) && image.content_id === contentId
    ) ?? null;
  } catch (_error) {
    return null;
  }
}

export async function fetchMobileReviewContents(credentials: MobileCredentialSettings) {
  const response = await fetch(`${API_BASE}/content/list?platform=xiaohongshu`, {
    headers: authHeaders(credentials)
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, "待确认草稿读取失败。"));
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  const deletedDraftIds = readStoredDeletedDraftIds();
  return data
    .filter(isGeneratedContent)
    .filter(isMobileReviewCandidate)
    .filter((content) => !deletedDraftIds.has(content.id));
}

async function fetchMobileReviewQueue(credentials: MobileCredentialSettings) {
  const contents = await fetchMobileReviewContents(credentials);
  return Promise.all(
    contents.slice(0, 30).map(async (content): Promise<MobileReviewQueueItem> => ({
      content,
      cover: await fetchLatestContentCover(content.id)
    }))
  );
}

async function submitMobileHumanReview(
  credentials: MobileCredentialSettings,
  contentId: number,
  decision: MobileReviewDecision
) {
  const response = await fetch(`${API_BASE}/content/${contentId}/reviews`, {
    body: JSON.stringify({
      decision,
      notes: decision === "approved" ? "手机端人工确认通过。" : "手机端人工确认退回修改。",
      risk_flags: decision === "approved" ? [] : ["needs_revision"],
      score: decision === "approved" ? 95 : 60
    }),
    headers: authHeaders(credentials),
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, "人工确认提交失败。"));
  }
}

function MobilePanel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-[28px] border border-white/[0.88] bg-[rgba(255,253,247,0.88)] p-4 shadow-[0_12px_32px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ReviewScreen({
  active = true,
  credentials,
  onAction,
  onOpenCreate,
  onPendingCountChange
}: {
  active?: boolean;
  credentials: MobileCredentialSettings;
  onAction: (message: string) => void;
  onOpenCreate: () => void;
  onPendingCountChange: (count: number) => void;
}) {
  const [items, setItems] = useState<MobileReviewQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MobileReviewQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyContentId, setBusyContentId] = useState<number | null>(null);
  const [status, setStatus] = useState("正在读取待确认草稿...");

  useEffect(() => {
    return addMobileBackHandler(() => {
      if (!active || !selectedItem) {
        return false;
      }
      setSelectedItem(null);
      onAction("已关闭待确认详情。");
      return true;
    });
  }, [active, onAction, selectedItem]);

  async function loadReviewQueue(announce = false) {
    setLoading(true);
    setStatus("正在读取待确认草稿...");
    try {
      const nextItems = await fetchMobileReviewQueue(credentials);
      setItems(nextItems);
      onPendingCountChange(nextItems.length);
      const message = nextItems.length
        ? `已加载 ${nextItems.length} 篇待确认草稿。`
        : "暂时没有待确认草稿。";
      setStatus(message);
      if (announce) {
        onAction(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "待确认草稿读取失败。";
      setItems([]);
      onPendingCountChange(0);
      setStatus(message);
      if (announce) {
        onAction(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviewQueue();
  }, [credentials.workspaceToken]);

  async function reviewItem(item: MobileReviewQueueItem, decision: MobileReviewDecision) {
    setBusyContentId(item.content.id);
    try {
      await submitMobileHumanReview(credentials, item.content.id, decision);
      const nextItems = items.filter((currentItem) => currentItem.content.id !== item.content.id);
      setItems(nextItems);
      onPendingCountChange(nextItems.length);
      setSelectedItem(null);
      const message =
        decision === "approved"
          ? `已通过：${item.content.title}`
          : `已退回修改：${item.content.title}`;
      setStatus(message);
      onAction(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "人工确认提交失败。";
      setStatus(message);
      onAction(message);
    } finally {
      setBusyContentId(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#f7cdbf]/[0.26] blur-2xl" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(236,244,237,0.58))]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">发布前人工确认</div>
              <h2 className="mt-1 text-[29px] font-black leading-9">确认台</h2>
              <p className="mt-2 max-w-[270px] text-sm font-medium leading-6 text-muted">
                核对标题、正文、封面和检索依据；通过后才进入发布准备。
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/[0.84] bg-[#e7f2ea] text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-[#fff1ec]/[0.88] px-3 py-3 text-coral">
              <div className="text-[24px] font-black leading-7">{items.length}</div>
              <div className="mt-1 text-[11px] font-bold">待确认</div>
            </div>
            <button
              className="rounded-[22px] border border-white/[0.84] bg-white/[0.72] px-3 py-3 text-left text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.99] disabled:opacity-60"
              disabled={loading}
              onClick={() => void loadReviewQueue(true)}
              type="button"
            >
              <div className="text-[18px] font-black leading-7">{loading ? "读取中" : "刷新"}</div>
              <div className="mt-1 text-[11px] font-bold">同步草稿</div>
            </button>
          </div>
        </div>
      </section>

      <MobilePanel
        action={
          <span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            {loading ? "读取中" : `${items.length} 篇`}
          </span>
        }
        title="待确认草稿"
      >
        <p className="mb-3 text-xs font-semibold leading-5 text-muted" data-testid="mobile-review-status">
          {status}
        </p>
        {items.length ? (
          <div className="space-y-3" data-testid="mobile-review-list">
            {items.map((item) => (
              <ReviewQueueCard
                busy={busyContentId === item.content.id}
                item={item}
                key={item.content.id}
                onApprove={() => void reviewItem(item, "approved")}
                onOpen={() => setSelectedItem(item)}
                onRequestChanges={() => void reviewItem(item, "changes_requested")}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-5 text-sm font-semibold leading-6 text-muted">
            {loading ? "正在读取草稿和封面..." : "没有待确认草稿。生成图文后会出现在这里。"}
          </div>
        )}
      </MobilePanel>

      <MobilePanel title="退回处理">
        <button
          className="flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
          onClick={onOpenCreate}
          type="button"
        >
          <PenLine className="h-4 w-4" />
          去创作页修改草稿
        </button>
      </MobilePanel>

      {selectedItem ? (
        <ReviewDetailSheet
          busy={busyContentId === selectedItem.content.id}
          item={selectedItem}
          onApprove={() => void reviewItem(selectedItem, "approved")}
          onClose={() => setSelectedItem(null)}
          onRequestChanges={() => void reviewItem(selectedItem, "changes_requested")}
        />
      ) : null}
    </div>
  );
}

function ReviewQueueCard({
  busy,
  item,
  onApprove,
  onOpen,
  onRequestChanges
}: {
  busy: boolean;
  item: MobileReviewQueueItem;
  onApprove: () => void;
  onOpen: () => void;
  onRequestChanges: () => void;
}) {
  const coverUrl = item.cover ? resolveAssetUrl(item.cover.image_url) : buildLocalReviewCoverUrl(item.content);
  const evidenceCount = mobileReviewEvidenceCount(item.content.source_context);
  const needsWebSourceReview = mobileReviewNeedsWebSourceReview(item.content.source_context);

  return (
    <article
      className="overflow-hidden rounded-[26px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] p-3 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.86)]"
      data-testid="mobile-review-card"
    >
      <button className="flex w-full touch-manipulation gap-3 text-left active:scale-[0.995]" onClick={onOpen} type="button">
        <div className="relative h-[112px] w-[84px] shrink-0 overflow-hidden rounded-[20px] bg-[#edf5f0]">
          <img alt="" className="h-full w-full object-cover" src={coverUrl} />
          <span className="absolute left-2 top-2 rounded-full bg-white/[0.86] px-2 py-1 text-[10px] font-black text-coral">
            草稿
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${mobileReviewStatusClass(item.content.status)}`}>
              {mobileReviewStatusLabel(item.content.status)}
            </span>
            <span className="truncate text-[10px] font-bold text-muted">
              {formatMobileReviewTime(item.content.created_at)}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 break-words text-[15px] font-black leading-5">{item.content.title}</h3>
          <p className="mt-2 line-clamp-3 break-words text-[12px] font-semibold leading-5 text-muted">
            {mobileContentExcerpt(item.content)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/[0.74] px-2 py-1 text-[10px] font-black text-moss">
              来源 {evidenceCount} 条
            </span>
            {needsWebSourceReview ? (
              <span className="rounded-full bg-[#fff4d7] px-2 py-1 text-[10px] font-black text-[#8a6110]">
                待补联网来源
              </span>
            ) : null}
            <span className="rounded-full bg-white/[0.74] px-2 py-1 text-[10px] font-black text-muted">
              封面 {item.cover ? "已生成" : "待补"}
            </span>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#23854f] text-xs font-black text-white shadow-[0_12px_24px_rgba(35,133,79,0.18)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-review-approve"
          disabled={busy}
          onClick={onApprove}
          type="button"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          通过
        </button>
        <button
          className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.86] bg-white/[0.76] text-xs font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-review-request-changes"
          disabled={busy}
          onClick={onRequestChanges}
          type="button"
        >
          <PenLine className="h-3.5 w-3.5" />
          退回修改
        </button>
      </div>
    </article>
  );
}

function ReviewDetailSheet({
  busy,
  item,
  onApprove,
  onClose,
  onRequestChanges
}: {
  busy: boolean;
  item: MobileReviewQueueItem;
  onApprove: () => void;
  onClose: () => void;
  onRequestChanges: () => void;
}) {
  const coverUrl = item.cover ? resolveAssetUrl(item.cover.image_url) : buildLocalReviewCoverUrl(item.content);
  const tags = formatTagLine(item.content.tags);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-end bg-black/25 px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-16 backdrop-blur-sm"
      data-testid="mobile-review-detail"
      onClick={onClose}
      role="dialog"
    >
      <section
        className="max-h-[82vh] w-full overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.98)] shadow-[0_22px_52px_rgba(31,58,49,0.20),inset_0_1px_0_rgba(255,255,255,0.92)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-moss/10 px-4 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-black text-moss">人工确认详情</div>
            <h3 className="mt-1 line-clamp-2 break-words text-lg font-black leading-6 text-ink">{item.content.title}</h3>
          </div>
          <button
            aria-label="关闭确认详情"
            className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/[0.84] bg-white/[0.76] text-ink active:scale-[0.98]"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[54vh] overflow-y-auto px-4 py-4">
          <div className="overflow-hidden rounded-[24px] border border-white/[0.86] bg-[#edf5f0]">
            <img alt="" className="aspect-[3/4] w-full object-cover" src={coverUrl} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${mobileReviewStatusClass(item.content.status)}`}>
              {mobileReviewStatusLabel(item.content.status)}
            </span>
            <span className="rounded-full bg-white/[0.78] px-2.5 py-1 text-[11px] font-black text-muted">
              来源 {mobileReviewEvidenceCount(item.content.source_context)} 条
            </span>
            {mobileReviewNeedsWebSourceReview(item.content.source_context) ? (
              <span className="rounded-full bg-[#fff4d7] px-2.5 py-1 text-[11px] font-black text-[#8a6110]">
                需核对联网来源
              </span>
            ) : null}
          </div>
          <article className="mt-4 rounded-[24px] border border-white/[0.86] bg-white/[0.72] px-4 py-4">
            <h4 className="text-xs font-black text-muted">正文预览</h4>
            <div className="mt-2 space-y-3 text-[13px] font-semibold leading-6 text-ink">
              {item.content.body
                .split(/\n+/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={`review-body-${item.content.id}-${index}`}>{renderXhsExpressionText(paragraph)}</p>
                ))}
            </div>
            {tags ? (
              <p className="mt-3 break-words text-xs font-black leading-5 text-moss">{tags}</p>
            ) : null}
          </article>
          <ReviewEvidenceBlock sourceContext={item.content.source_context ?? null} />
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-moss/10 px-4 py-4">
          <button
            className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#23854f] text-sm font-black text-white shadow-[0_14px_28px_rgba(35,133,79,0.20)] active:scale-[0.99] disabled:opacity-60"
            disabled={busy}
            onClick={onApprove}
            type="button"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            通过
          </button>
          <button
            className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-white/[0.78] text-sm font-black text-ink active:scale-[0.99] disabled:opacity-60"
            disabled={busy}
            onClick={onRequestChanges}
            type="button"
          >
            <PenLine className="h-4 w-4" />
            退回修改
          </button>
        </div>
      </section>
    </div>
  );
}

function ReviewEvidenceBlock({ sourceContext }: { sourceContext: GenerationSourceContext | null }) {
  const knowledgeItems = sourceContext?.knowledge_items ?? [];
  const webSearch = sourceContext?.web_search;
  const webResults = webSearch?.results ?? [];
  const { hasEvidence, missingRequiredWebResults, totalCount } =
    generationSourceContextStats(sourceContext);

  return (
    <section className="mt-4 rounded-[24px] border border-white/[0.86] bg-white/[0.72] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-black text-ink">检索依据</h4>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-muted">
            发布前核对这些资料，避免凭空编学校、榜单或项目。
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#e7f2ea]/[0.92] px-2.5 py-1 text-[11px] font-black text-moss">
          {hasEvidence ? `${totalCount} 条` : "无依据"}
        </span>
      </div>
      {sourceContext?.knowledge_query ? (
        <p className="mt-3 rounded-[16px] bg-white/[0.74] px-3 py-2 text-[11px] font-semibold leading-5 text-muted">
          检索词：{sourceContext.knowledge_query}
        </p>
      ) : null}
      {knowledgeItems.length ? (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-black text-muted">知识库引用</div>
          {knowledgeItems.slice(0, 4).map((item, index) => (
            <article className="rounded-[18px] bg-white/[0.76] px-3 py-2" key={`review-knowledge-${item.id}-${index}`}>
              <h5 className="line-clamp-2 break-words text-xs font-black leading-5 text-ink">{item.title}</h5>
              <p className="mt-1 line-clamp-3 break-words text-[11px] font-semibold leading-5 text-muted">{item.content}</p>
            </article>
          ))}
        </div>
      ) : null}
      {webResults.length ? (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-black text-muted">联网来源</div>
          {webResults.slice(0, 4).map((item, index) => (
            <a
              className="block rounded-[18px] bg-white/[0.76] px-3 py-2"
              href={item.url}
              key={`review-web-${item.url}-${index}`}
              rel="noreferrer"
              target="_blank"
            >
              <div className="flex items-start justify-between gap-2">
                <h5 className="line-clamp-2 break-words text-xs font-black leading-5 text-ink">{item.title}</h5>
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted" />
              </div>
              <p className="mt-1 truncate text-[10px] font-semibold text-moss">{item.url}</p>
              <p className="mt-1 line-clamp-3 break-words text-[11px] font-semibold leading-5 text-muted">{item.content}</p>
            </a>
          ))}
        </div>
      ) : null}
      {missingRequiredWebResults ? (
        <div className="mt-3 rounded-[18px] border border-[#f3dca3] bg-[#fff8e6] px-3 py-2 text-[11px] font-semibold leading-5 text-[#8a6110]">
          <p>这个选题需要联网来源，但当前没有可见 Tavily 结果。</p>
          {webSearch?.query ? <p className="mt-1 break-words">联网检索词：{webSearch.query}</p> : null}
          <p className="mt-1">请退回补充来源，或改成核验框架后再发布。</p>
        </div>
      ) : null}
      {sourceContext?.review_note ? (
        <p className="mt-3 border-l-4 border-[#f0c76b] pl-3 text-[11px] font-semibold leading-5 text-muted">
          {sourceContext.review_note}
        </p>
      ) : null}
      {!hasEvidence ? (
        <p className="mt-3 rounded-[18px] border border-[#f3dca3] bg-[#fff8e6] px-3 py-2 text-[11px] font-semibold leading-5 text-muted">
          这篇草稿没有可见检索依据，建议退回修改或重新生成。
        </p>
      ) : null}
    </section>
  );
}

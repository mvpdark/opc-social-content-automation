"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  PenLine,
  ShieldCheck
} from "lucide-react";

import { resolveAssetUrl } from "@/lib/asset-url";
import { addMobileBackHandler } from "@/lib/mobile-back-navigation";
import { PromotionBriefSummary } from "@/components/promotion-brief-summary";
import {
  generationSourceContextStats,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import { formatTagLine } from "@/lib/tags";
import { renderXhsExpressionText } from "@/lib/xhs-stickers";
import { buildLocalCoverUrl } from "@/lib/mobile-cover-palette";
import { MobilePanel } from "@/components/mobile-ui";
import {
  fetchMobileReviewQueue,
  formatMobileReviewTime,
  mobileContentExcerpt,
  mobileReviewEvidenceCount,
  mobileReviewNeedsWebSourceReview,
  mobileReviewStatusClass,
  mobileReviewStatusLabel,
  submitMobileHumanReview,
  type MobileCredentialSettings,
  type MobileReviewDecision,
  type MobileReviewQueueItem
} from "@/lib/mobile-review-utils";

export { fetchMobileReviewContents } from "@/lib/mobile-review-utils";

export const ReviewScreen = memo(function ReviewScreen({
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
  const [queueError, setQueueError] = useState<string | null>(null);
  const [status, setStatus] = useState("正在读取待确认草稿...");
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);
  const queueAbortRef = useRef<AbortController | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);
  const reviewRequestIdRef = useRef(0);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const selectedItemRef = useRef(selectedItem);
  selectedItemRef.current = selectedItem;

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

  const loadReviewQueue = useCallback(async (announce = false) => {
    queueAbortRef.current?.abort();
    const controller = new AbortController();
    queueAbortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setQueueError(null);
    setStatus("正在读取待确认草稿...");
    try {
      const nextItems = await fetchMobileReviewQueue(credentials, controller.signal);
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      setItems(nextItems);
      setQueueError(null);
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
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      setItems([]);
      onPendingCountChange(0);
      setQueueError(message);
      setStatus(message);
      if (announce) {
        onAction(message);
      }
    } finally {
      if (activeRef.current && requestIdRef.current === requestId) setLoading(false);
    }
  }, [credentials, onAction, onPendingCountChange]);

  useEffect(() => {
    activeRef.current = true;
    void loadReviewQueue();
    return () => {
      activeRef.current = false;
      queueAbortRef.current?.abort();
      reviewAbortRef.current?.abort();
    };
  }, [loadReviewQueue]);

  const reviewItem = useCallback(async (item: MobileReviewQueueItem, decision: MobileReviewDecision) => {
    reviewAbortRef.current?.abort();
    const controller = new AbortController();
    reviewAbortRef.current = controller;
    const requestId = ++reviewRequestIdRef.current;
    setBusyContentId(item.content.id);
    try {
      const result = await submitMobileHumanReview(credentials, item.content.id, decision, controller.signal);
      if (!activeRef.current || reviewRequestIdRef.current !== requestId) return;
      if (!result.ok) {
        setStatus(result.message);
        onAction(result.message);
        return;
      }
      const nextItems = itemsRef.current.filter((currentItem) => currentItem.content.id !== item.content.id);
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
      if (!activeRef.current || reviewRequestIdRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "人工确认提交失败。";
      setStatus(message);
      onAction(message);
    } finally {
      if (activeRef.current && reviewRequestIdRef.current === requestId) setBusyContentId(null);
    }
  }, [credentials, onPendingCountChange, onAction]);

  const handleApproveReview = useCallback((cardItem: MobileReviewQueueItem) => void reviewItem(cardItem, "approved"), [reviewItem]);
  const handleOpenReviewCard = useCallback((cardItem: MobileReviewQueueItem) => setSelectedItem(cardItem), []);
  const handleRequestChangesReview = useCallback((cardItem: MobileReviewQueueItem) => void reviewItem(cardItem, "changes_requested"), [reviewItem]);
  const handleCloseReviewDetail = useCallback(() => setSelectedItem(null), []);
  const handleApproveReviewDetail = useCallback(() => {
    if (selectedItemRef.current) void reviewItem(selectedItemRef.current, "approved");
  }, [reviewItem]);
  const handleRequestChangesReviewDetail = useCallback(() => {
    if (selectedItemRef.current) void reviewItem(selectedItemRef.current, "changes_requested");
  }, [reviewItem]);

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-blush/[0.26] blur-2xl" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(236,244,237,0.58))]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">发布前人工确认</div>
              <h2 className="mt-1 text-[22px] font-black leading-7">确认台</h2>
              <p className="mt-2 max-w-[270px] text-sm font-medium leading-6 text-muted">
                核对标题、正文、封面和检索依据；通过后才进入发布准备。
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/[0.84] bg-sage text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-blush/[0.88] px-3 py-3 text-coral">
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
          <span className="rounded-full bg-sage/[0.90] px-2.5 py-1 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            {queueError ? "读取失败" : loading ? "读取中" : `${items.length} 篇`}
          </span>
        }
        title="待确认草稿"
      >
        <p className="mb-3 text-xs font-semibold leading-5 text-muted" data-testid="mobile-review-status">
          {status}
        </p>
        {queueError ? (
          <div
            className="mb-3 rounded-[22px] border border-coral/30 bg-blush px-3 py-3 text-xs font-bold leading-5 text-coral"
            data-testid="mobile-review-queue-error"
            role="alert"
          >
            <div>待确认队列读取失败</div>
            <p className="mt-1 text-muted">{queueError}</p>
            <p className="mt-1 text-muted">
              这只会重新读取待人工确认草稿；不会生成、改写、确认或发布。
            </p>
            <button
              className="mt-3 h-9 rounded-full bg-moss px-4 text-xs font-black text-white active:scale-[0.99] disabled:opacity-60"
              data-testid="mobile-review-queue-retry"
              disabled={loading}
              onClick={() => void loadReviewQueue(true)}
              type="button"
            >
              重新读取队列
            </button>
          </div>
        ) : null}
        {items.length ? (
          <div className="space-y-3" data-testid="mobile-review-list">
            {items.map((item) => (
              <ReviewQueueCard
                busy={busyContentId === item.content.id}
                item={item}
                key={item.content.id}
                onApprove={handleApproveReview}
                onOpen={handleOpenReviewCard}
                onRequestChanges={handleRequestChangesReview}
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
          onApprove={handleApproveReviewDetail}
          onClose={handleCloseReviewDetail}
          onRequestChanges={handleRequestChangesReviewDetail}
        />
      ) : null}
    </div>
  );
});

const ReviewQueueCard = memo(function ReviewQueueCard({
  busy,
  item,
  onApprove,
  onOpen,
  onRequestChanges
}: {
  busy: boolean;
  item: MobileReviewQueueItem;
  onApprove: (item: MobileReviewQueueItem) => void;
  onOpen: (item: MobileReviewQueueItem) => void;
  onRequestChanges: (item: MobileReviewQueueItem) => void;
}) {
  const coverUrl = useMemo(
    () => (item.cover ? resolveAssetUrl(item.cover.image_url) : buildLocalCoverUrl(item.content)),
    [item.cover, item.content]
  );
  const evidenceCount = useMemo(
    () => mobileReviewEvidenceCount(item.content.source_context),
    [item.content.source_context]
  );
  const needsWebSourceReview = useMemo(
    () => mobileReviewNeedsWebSourceReview(item.content.source_context),
    [item.content.source_context]
  );

  return (
    <article
      className="overflow-hidden rounded-[26px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] p-3 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.86)]"
      data-testid="mobile-review-card"
    >
      <button className="flex w-full touch-manipulation gap-3 text-left active:scale-[0.995]" onClick={() => onOpen(item)} type="button">
        <div className="relative h-[112px] w-[84px] shrink-0 overflow-hidden rounded-[20px] bg-sage">
          <img alt={`${item.content.title}封面`} className="h-full w-full object-cover" loading="lazy" decoding="async" src={coverUrl} />
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
              <span className="rounded-full bg-amber/15 px-2 py-1 text-[10px] font-black text-amber-ink">
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
          className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-xs font-black text-white shadow-[0_12px_24px_rgba(44,151,88,0.18)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-review-approve"
          disabled={busy}
          onClick={() => onApprove(item)}
          type="button"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          通过
        </button>
        <button
          className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.86] bg-white/[0.76] text-xs font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-review-request-changes"
          disabled={busy}
          onClick={() => onRequestChanges(item)}
          type="button"
        >
          <PenLine className="h-3.5 w-3.5" />
          退回修改
        </button>
      </div>
    </article>
  );
});

const ReviewDetailSheet = memo(function ReviewDetailSheet({
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
  const coverUrl = useMemo(
    () => (item.cover ? resolveAssetUrl(item.cover.image_url) : buildLocalCoverUrl(item.content)),
    [item.cover, item.content]
  );
  const tags = useMemo(() => formatTagLine(item.content.tags), [item.content.tags]);
  const bodyParagraphs = useMemo(
    () =>
      item.content.body
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [item.content.body]
  );
  const evidenceCount = useMemo(
    () => mobileReviewEvidenceCount(item.content.source_context),
    [item.content.source_context]
  );
  const needsWebSourceReview = useMemo(
    () => mobileReviewNeedsWebSourceReview(item.content.source_context),
    [item.content.source_context]
  );

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
          <div className="overflow-hidden rounded-[24px] border border-white/[0.86] bg-sage">
            <img alt={`${item.content.title}封面`} className="aspect-[3/4] w-full object-cover" loading="lazy" decoding="async" src={coverUrl} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${mobileReviewStatusClass(item.content.status)}`}>
              {mobileReviewStatusLabel(item.content.status)}
            </span>
            <span className="rounded-full bg-white/[0.78] px-2.5 py-1 text-[11px] font-black text-muted">
              来源 {evidenceCount} 条
            </span>
            {needsWebSourceReview ? (
              <span className="rounded-full bg-amber/15 px-2.5 py-1 text-[11px] font-black text-amber-ink">
                需核对联网来源
              </span>
            ) : null}
          </div>
          <article className="mt-4 rounded-[24px] border border-white/[0.86] bg-white/[0.72] px-4 py-4">
            <h4 className="text-xs font-black text-muted">正文预览</h4>
            <div className="mt-2 space-y-3 text-[13px] font-semibold leading-6 text-ink">
              {bodyParagraphs.map((paragraph, index) => (
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
            className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-sm font-black text-white shadow-[0_14px_28px_rgba(44,151,88,0.20)] active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-review-detail-approve"
            disabled={busy}
            onClick={onApprove}
            type="button"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            通过
          </button>
          <button
            className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-white/[0.78] text-sm font-black text-ink active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-review-detail-request-changes"
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
});

const ReviewEvidenceBlock = memo(function ReviewEvidenceBlock({ sourceContext }: { sourceContext: GenerationSourceContext | null }) {
  const knowledgeItems = useMemo(() => sourceContext?.knowledge_items ?? [], [sourceContext]);
  const webResults = useMemo(() => sourceContext?.web_search?.results ?? [], [sourceContext]);
  const visibleKnowledgeItems = useMemo(() => knowledgeItems.slice(0, 4), [knowledgeItems]);
  const visibleWebResults = useMemo(() => webResults.slice(0, 4), [webResults]);
  const { hasEvidence, missingRequiredWebResults, totalCount } = useMemo(
    () => generationSourceContextStats(sourceContext),
    [sourceContext]
  );

  return (
    <section
      className="mt-4 rounded-[24px] border border-white/[0.86] bg-white/[0.72] px-4 py-4"
      data-testid="mobile-review-source-evidence"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-black text-ink">检索依据</h4>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-muted">
            发布前核对这些资料，避免凭空编学校、榜单或项目。
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-sage/[0.92] px-2.5 py-1 text-[11px] font-black text-moss">
          {hasEvidence ? `${totalCount} 条` : "无依据"}
        </span>
      </div>
      {sourceContext?.knowledge_query ? (
        <p className="mt-3 rounded-[16px] bg-white/[0.74] px-3 py-2 text-[11px] font-semibold leading-5 text-muted">
          检索词：{sourceContext.knowledge_query}
        </p>
      ) : null}
      <PromotionBriefSummary
        sourceContext={sourceContext}
        testId="mobile-review-promotion-brief"
        variant="mobile"
      />
      {knowledgeItems.length ? (
        <div className="mt-3 space-y-2" data-testid="mobile-review-knowledge-list">
          <div className="text-[11px] font-black text-muted">知识库引用</div>
          {visibleKnowledgeItems.map((item, index) => (
            <article
              className="mobile-review-evidence-result-card rounded-[18px] bg-white/[0.76] px-3 py-2"
              key={`review-knowledge-${item.id}-${index}`}
            >
              <h5 className="line-clamp-2 break-words text-xs font-black leading-5 text-ink">{item.title}</h5>
              <p className="mt-1 line-clamp-3 break-words text-[11px] font-semibold leading-5 text-muted">{item.content}</p>
            </article>
          ))}
        </div>
      ) : null}
      {webResults.length ? (
        <div className="mt-3 space-y-2" data-testid="mobile-review-web-list">
          <div className="text-[11px] font-black text-muted">联网来源</div>
          {visibleWebResults.map((item, index) => (
            <a
              aria-label={`打开联网来源：${item.title}`}
              className="mobile-review-evidence-result-card block rounded-[18px] bg-white/[0.76] px-3 py-2"
              href={item.url}
              key={`review-web-${item.url}-${index}`}
              rel="noopener noreferrer"
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
        <div
          className="mt-3 rounded-[18px] border border-amber/40 bg-amber/10 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-ink"
          data-testid="mobile-review-required-web-warning"
        >
          <p>这个选题需要联网来源，但当前没有可见 Tavily 结果。</p>
          {sourceContext?.web_search?.query ? <p className="mt-1 break-words">联网检索词：{sourceContext.web_search.query}</p> : null}
          <p className="mt-1">请退回补充来源，或改成核验框架后再发布。</p>
        </div>
      ) : null}
      {sourceContext?.review_note ? (
        <p className="mt-3 border-l-4 border-amber/60 pl-3 text-[11px] font-semibold leading-5 text-muted">
          {sourceContext.review_note}
        </p>
      ) : null}
      {!hasEvidence ? (
        <p
          className="mt-3 rounded-[18px] border border-amber/40 bg-amber/10 px-3 py-2 text-[11px] font-semibold leading-5 text-muted"
          data-testid="mobile-review-no-evidence-warning"
        >
          这篇草稿没有可见检索依据，建议退回修改或重新生成。
        </p>
      ) : null}
    </section>
  );
});

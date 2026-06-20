"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  Clipboard,
  Heart,
  MessageCircle,
  Share2,
  X
} from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import { resolveAssetUrl } from "@/lib/asset-url";
import { copyText } from "@/lib/clipboard";
import {
  draftPreview,
  type InterfaceStyle
} from "@/lib/dashboard-data";
import {
  type GeneratedContent,
  type GeneratedImageAsset
} from "@/lib/generated-assets";
import { stripDuplicateStandaloneTagLines } from "@/lib/platform-copy";
import { generatedContentLifecycleWarning } from "@/lib/status-labels";
import { formatTagLine } from "@/lib/tags";
import {
  buildPlatformCopy,
  isTestDraft,
  renderXhsExpressionText,
  secondaryButtonClass
} from "./workspace-utils";
import {
  buildCoverLines,
  formatPreviewParagraphs,
  Panel,
  Pill,
  platformDisplayName,
  platformIdForPreview
} from "./workspace-ui";
import { DraftHistoryCard } from "./workspace-draft-history-card";

export function DraftPanel({
  content,
  coverImageAsset,
  draftActionError,
  draftHistoryError,
  history,
  imageAssetsByContentId,
  interfaceStyle,
  loading,
  onDeleteContent,
  onRetryDraftHistory,
  onSelectContent,
  onTogglePin,
  pinnedContentIds
}: {
  content: GeneratedContent | null;
  coverImageAsset: GeneratedImageAsset | null;
  draftActionError: string | null;
  draftHistoryError: string | null;
  history: GeneratedContent[];
  imageAssetsByContentId: Record<number, GeneratedImageAsset | null>;
  interfaceStyle: InterfaceStyle;
  loading: boolean;
  onDeleteContent: (contentId: number) => void;
  onRetryDraftHistory: () => void;
  onSelectContent: (content: GeneratedContent) => void;
  onTogglePin: (contentId: number) => void;
  pinnedContentIds: number[];
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const modalManualCopyRef = useRef<HTMLTextAreaElement | null>(null);
  const previewPlatformId = platformIdForPreview(content?.platform ?? "xiaohongshu");
  const previewPlatformLabel = previewPlatformId === "douyin" ? "抖音" : "小红书";
  const preview = {
    body: content?.body ?? draftPreview.body,
    id: content?.id ?? null,
    platform: content ? platformDisplayName(content.platform) : draftPreview.platform,
    status: content ? "最近草稿" : loading ? "读取中" : draftPreview.status,
    tags: content?.tags ?? draftPreview.tags,
    title: content?.title ?? draftPreview.title
  };
  const coverLines = buildCoverLines(preview.title);
  const paragraphs = formatPreviewParagraphs(stripDuplicateStandaloneTagLines(preview.body, preview.tags));
  const tagLine = formatTagLine(preview.tags);
  const previewLifecycleWarning = content ? generatedContentLifecycleWarning(content.status) : null;
  const canCopy = Boolean(content && !isTestDraft(content) && !previewLifecycleWarning);
  const previewTone = previewLifecycleWarning ? "red" : content ? "green" : loading ? "blue" : "amber";
  const coverImageUrl =
    content && coverImageAsset?.content_id === content.id
      ? resolveAssetUrl(coverImageAsset.image_url)
      : null;
  const hasHistory = history.length > 0;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setCopyState("idle");
    setManualCopyText(null);
  }, [content?.id]);

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }
    const targetRef = modalManualCopyRef;
    targetRef.current?.focus();
    targetRef.current?.select();
  }, [manualCopyText]);

  async function handleCopy() {
    if (!content || !canCopy) {
      setCopyState("failed");
      setManualCopyText(null);
      return;
    }
    const copyPayload = buildPlatformCopy(content);
    try {
      await copyText(copyPayload);
      setCopyState("copied");
      setManualCopyText(null);
    } catch (_error) {
      setCopyState("failed");
      setManualCopyText(copyPayload);
    }
  }

  function handleHistorySelect(selectedContent: GeneratedContent) {
    onSelectContent(selectedContent);
    setPreviewOpen(true);
  }

  return (
    <Panel
      action={<Pill tone={previewTone}>{preview.status}</Pill>}
      helper={`按${previewPlatformLabel}图文卡片和弹窗预览最终展示效果。`}
      title="创作台"
    >
      <section className="mb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">历史图文草稿</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              横向滑动查看之前生成的图文；点击打开预览，长按卡片可置顶或删除。
            </p>
          </div>
          <Pill tone={draftHistoryError ? "red" : hasHistory ? "green" : loading ? "blue" : "amber"}>
            {draftHistoryError ? "读取失败" : hasHistory ? `${history.length} 条` : loading ? "读取中" : "暂无草稿"}
          </Pill>
        </div>

        {draftActionError ? (
          <div className="mt-3 rounded-md border border-coral/35 bg-coral/10 px-3 py-2 text-xs leading-5 text-ink">
            {draftActionError}
          </div>
        ) : null}

        {draftHistoryError ? (
          <div
            className="mt-3 rounded-md border border-coral/35 bg-coral/10 px-3 py-3 text-xs leading-5 text-ink"
            data-testid="draft-history-error"
          >
            <div className="font-semibold text-coral">历史草稿读取失败</div>
            <p className="mt-1 text-muted">{draftHistoryError}</p>
            <p className="mt-1 text-muted">
              这不会触发生成、改写或发布；可以重新读取历史草稿，待人工确认队列会保持独立。
            </p>
            <button
              className={`${secondaryButtonClass} mt-3 h-9 px-3 text-xs`}
              data-testid="draft-history-retry"
              onClick={onRetryDraftHistory}
              type="button"
            >
              重新读取草稿
            </button>
          </div>
        ) : null}

        {hasHistory ? (
          <div
            aria-label="历史图文草稿列表"
            className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            data-testid="draft-history-strip"
            role="list"
          >
            {history.map((item) => (
              <DraftHistoryCard
                content={item}
                imageAsset={imageAssetsByContentId[item.id]}
                isPinned={pinnedContentIds.includes(item.id)}
                isSelected={content?.id === item.id}
                key={item.id}
                onDelete={onDeleteContent}
                onSelect={handleHistorySelect}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-[18px] border border-dashed border-line bg-mist/60 px-4 py-5 text-sm leading-6 text-muted">
            还没有历史草稿。生成第一篇后，这里会保留可滑动的图文卡片。
          </div>
        )}
      </section>

      {previewOpen && portalReady ? createPortal(
        <div
          aria-modal="true"
          className={`theme-${interfaceStyle} fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 p-4 text-ink backdrop-blur-md`}
          data-testid="xhs-preview-modal"
          role="dialog"
        >
          <div className="workspace-preview-modal-card grid max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[24px] border border-white/40 bg-paper shadow-2xl lg:grid-cols-[minmax(300px,420px)_1fr] lg:overflow-hidden">
            <div
              className={`relative min-h-[320px] overflow-hidden ${
                coverImageUrl
                  ? "bg-paper"
                  : "bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.95),transparent_32%),linear-gradient(145deg,#fff7e8_0%,#d9f3e6_48%,#f8cfc0_100%)] p-7"
              } sm:min-h-[420px]`}
            >
              <button
                aria-label={`关闭${previewPlatformLabel}预览`}
                className="workspace-preview-close-button absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink shadow-sm"
                data-testid="xhs-preview-close"
                onClick={() => setPreviewOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
              {coverImageUrl ? (
                <img
                  alt={`已生成的${previewPlatformLabel}封面预览`}
                  className="h-full min-h-[320px] w-full object-cover sm:min-h-[420px]"
                  data-testid="xhs-preview-real-cover"
                  src={coverImageUrl}
                />
              ) : (
                <>
                  <div className="rounded-md bg-white/75 px-2 py-1 text-[11px] font-semibold text-ink/70 shadow-sm">
                    {previewPlatformLabel}封面预览
                  </div>
                  <div className="absolute inset-x-7 bottom-8">
                    <div className="mb-4 h-1.5 w-14 rounded-full bg-coral" />
                    <div className="space-y-1 text-[2.55rem] font-black leading-[1.06] text-ink">
                      {coverLines.map((line, index) => (
                        <div key={`preview-cover-line-${index}-${line}`}>{line}</div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col lg:max-h-[90vh] lg:overflow-y-auto">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={previewPlatformId} size="lg" />
                  <div>
                    <div className="text-sm font-semibold">OPC 任务平台</div>
                    <div className="text-xs text-muted">发布前预览 - {preview.platform}</div>
                  </div>
                </div>
                <Pill tone={previewTone}>
                  {content ? "最新草稿" : loading ? "读取中" : "未生成"}
                </Pill>
              </div>

              <div className="px-5 py-5">
                <h3 className="text-xl font-semibold leading-8 text-ink">{preview.title}</h3>
                <div className="mt-4 text-xs font-semibold text-muted">正文全文</div>
                <div
                  className="mt-3 space-y-3 text-sm leading-7 text-ink/82"
                  data-testid="xhs-preview-full-body"
                >
                  {paragraphs.map((paragraph, index) => (
                    <p key={`${index}-${paragraph}`}>{renderXhsExpressionText(paragraph)}</p>
                  ))}
                </div>
                {tagLine ? <div className="mt-5 text-sm font-medium leading-6 text-steel">{tagLine}</div> : null}

                <div className="mt-6 flex items-center justify-between border-y border-line py-3 text-sm text-muted">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    未发布
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    评论预览
                  </span>
                  <span className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    收藏
                  </span>
                  <span className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    分享
                  </span>
                </div>

                <div className="mt-5 rounded-md border border-amber/40 bg-amber/10 p-3 text-xs leading-5 text-ink">
                  这是发布效果预览，不会自动发布；粘贴到{previewPlatformLabel}前仍需要人工确认标题、正文、标签和封面。
                </div>
                {previewLifecycleWarning ? (
                  <div
                    className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-xs leading-5 text-ink"
                    data-testid="pc-preview-modal-lifecycle-warning"
                  >
                    {previewLifecycleWarning}
                  </div>
                ) : null}
                {copyState === "failed" ? (
                  <div className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-xs leading-5 text-ink">
                    当前没有可复制的正式草稿，或复制被浏览器拦截；下方已展开正文，可直接全选复制。
                  </div>
                ) : null}
                {manualCopyText ? (
                  <textarea
                    aria-label={`${previewPlatformLabel}手动复制文案`}
                    className="mt-3 min-h-32 w-full resize-y rounded-md border border-coral/30 bg-paper px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
                    data-testid="pc-preview-modal-manual-copy-text"
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    ref={modalManualCopyRef}
                    value={manualCopyText}
                  />
                ) : null}
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  className={`${secondaryButtonClass} h-10 px-4`}
                  onClick={() => setPreviewOpen(false)}
                  type="button"
                >
                  关闭预览
                </button>
                <button
                  className="workspace-preview-copy-button flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
                  data-testid="pc-preview-modal-copy-button"
                  disabled={!canCopy}
                  onClick={handleCopy}
                  type="button"
                >
                  <Clipboard className="h-4 w-4" />
                  {previewLifecycleWarning
                    ? "需先核对状态"
                    : copyState === "copied"
                      ? "已复制"
                      : `复制${previewPlatformLabel}文案`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </Panel>
  );
}

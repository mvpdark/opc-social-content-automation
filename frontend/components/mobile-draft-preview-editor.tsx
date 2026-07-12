"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Bookmark,
  Clipboard,
  ExternalLink,
  Heart,
  ImageDown,
  Loader2,
  MessageCircle,
  Share2
} from "lucide-react";

import { CoverImagePreview } from "@/components/mobile-cover-image-preview";
import { PromotionReadinessSummary } from "@/components/promotion-readiness-summary";
import { isLocalOrPrivateHostname } from "@/lib/api-base";
import { tryCopyText } from "@/lib/clipboard";
import { type GeneratedContent } from "@/lib/generated-assets";
import {
  buildMobilePreviewChecklist,
  mobilePreviewChecklistStateClass,
  mobilePreviewChecklistStateLabel
} from "@/lib/mobile-preview-checklist";
import {
  buildEditableDraftCopy,
  type DraftPreviewState
} from "@/lib/mobile-draft-storage";
import { stripDuplicateStandaloneTagLines } from "@/lib/platform-copy";
import { generatedContentLifecycleWarning } from "@/lib/status-labels";
import {
  buildXhsCoverFile,
  downloadFile,
  getOmpcAndroidBridge,
  shareToNativeXiaohongshu
} from "@/lib/mobile-cover-share";
import { renderXhsExpressionText } from "@/lib/xhs-stickers";

const XHS_COPY_TEXT_ONLY_LABEL = "只复制文案";

export const DraftPreviewEditor = memo(function DraftPreviewEditor({
  coverImageUrl,
  draft,
  generatedContent,
  onChange,
  onClose,
  onCopy,
  onExportStatus,
  onRegenerateImage
}: {
  coverImageUrl: string | null;
  draft: DraftPreviewState;
  generatedContent: GeneratedContent | null;
  onChange: (nextDraft: DraftPreviewState) => void;
  onClose: () => void;
  onCopy: () => Promise<boolean>;
  onExportStatus: (message: string) => void;
  onRegenerateImage?: (() => void) | null;
}) {
  const [editing, setEditing] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const [xhsExporting, setXhsExporting] = useState(false);
  const [xhsExportMessage, setXhsExportMessage] = useState<string | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);
  const titleLines = useMemo(() => draft.title.split(/[，,]/).slice(0, 3), [draft.title]);
  const bodyParagraphs = useMemo(
    () => stripDuplicateStandaloneTagLines(draft.body, draft.tags)
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    [draft.body, draft.tags]
  );
  const tags = useMemo(
    () => draft.tags
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    [draft.tags]
  );
  const lifecycleWarning = useMemo(
    () => (generatedContent ? generatedContentLifecycleWarning(generatedContent.status) : null),
    [generatedContent]
  );
  const exportLocked = Boolean(lifecycleWarning);
  const prepublishChecklist = useMemo(
    () => buildMobilePreviewChecklist({
      coverImageUrl,
      draft,
      generatedContent
    }),
    [coverImageUrl, draft, generatedContent]
  );
  const promotionReadinessDraft = useMemo(
    () => ({ body: draft.body, tags: draft.tags, title: draft.title }),
    [draft.body, draft.tags, draft.title]
  );
  const editBodyRowCount = useMemo(
    () => Math.min(16, Math.max(8, draft.body.split("\n").length + 5)),
    [draft.body]
  );

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }
    manualCopyRef.current?.focus();
    manualCopyRef.current?.select();
  }, [manualCopyText]);

  useEffect(() => {
    setEditing(false);
    setManualCopyText(null);
    setXhsExportMessage(null);
  }, [generatedContent?.id]);

  const updatePoint = useCallback((index: number, value: string) => {
    onChange({
      ...draftRef.current,
      points: draftRef.current.points.map((point, pointIndex) => (pointIndex === index ? value : point))
    });
  }, [onChange]);

  const handleTitleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...draftRef.current, title: event.target.value });
  }, [onChange]);

  const handleBodyChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...draftRef.current, body: event.target.value });
  }, [onChange]);

  const handleTagsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...draftRef.current, tags: event.target.value });
  }, [onChange]);

  function publishExportStatus(message: string) {
    setXhsExportMessage(message);
    onExportStatus(message);
  }

  const toggleEditing = useCallback(() => {
    setManualCopyText(null);
    setXhsExportMessage(null);
    setEditing((current) => !current);
  }, []);

  const handleRegenerateImage = useCallback(async () => {
    if (regeneratingImage || !onRegenerateImage) return;
    setRegeneratingImage(true);
    try {
      await onRegenerateImage();
    } finally {
      if (activeRef.current) {
        setRegeneratingImage(false);
      }
    }
  }, [onRegenerateImage, regeneratingImage]);

  async function copyDraftTextOnly() {
    if (lifecycleWarning) {
      setEditing(false);
      setManualCopyText(null);
      publishExportStatus(lifecycleWarning);
      return;
    }
    setEditing(false);
    const draftText = buildEditableDraftCopy(draft);
    const copied = await onCopy();
    if (!activeRef.current) return;
    setManualCopyText(draftText);
    const message = copied
      ? "已尝试复制文案；下方也保留了正文，可长按全选再确认。"
      : "浏览器拦截了剪贴板，文案已展开，可长按全选复制。";
    publishExportStatus(message);
  }

  async function handleOpenXiaohongshu() {
    if (lifecycleWarning) {
      setEditing(false);
      setManualCopyText(null);
      publishExportStatus(lifecycleWarning);
      return;
    }
    const draftText = buildEditableDraftCopy(draft);
    setEditing(false);
    setManualCopyText(draftText);
    setXhsExporting(true);
    publishExportStatus("正在准备封面图、标题和正文；下方会保留文案兜底。");
    try {
      const textCopied = await tryCopyText(draftText);
      if (!activeRef.current) return;
      setManualCopyText(draftText);
      const coverFile = await buildXhsCoverFile(coverImageUrl, draft);
      if (!activeRef.current) return;

      const nativeBridge = getOmpcAndroidBridge();
      if (nativeBridge) {
        publishExportStatus("正在准备打开小红书发布入口；图文只会进入编辑流程，仍需人工确认后提交。");
        const nativeResult = await shareToNativeXiaohongshu(draft.title, draftText, coverFile);
        if (!activeRef.current) return;
        if (nativeResult.ok) {
          publishExportStatus(
            textCopied
              ? nativeResult.message
              : "已交给小红书编辑流程；仍需人工确认后提交。如果正文没有自动带入，下方文案可长按全选复制。"
          );
          return;
        }
        publishExportStatus(`${nativeResult.message} 已切换到系统分享兜底。`);
      }

      const shareData: ShareData = {
        files: [coverFile],
        text: draftText,
        title: draft.title
      };
      const canShareFiles =
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [coverFile] }));

      if (canShareFiles) {
        let systemShareFailed = false;
        publishExportStatus(
          textCopied
            ? "已尝试复制文案，正在打开系统分享；选择小红书后仍需人工确认提交。"
            : "文案已展开兜底，正在打开系统分享；选择小红书后仍需人工确认提交。"
        );
        try {
          await navigator.share(shareData);
        } catch (error) {
          const errorName = error instanceof DOMException ? error.name : "";
          if (errorName === "AbortError") {
            const restored = await tryCopyText(draftText);
            if (!activeRef.current) return;
            setManualCopyText(draftText);
            const abortMessage = restored
              ? "已取消系统分享；已重新尝试复制文案，下方也保留了正文，可长按全选确认。"
              : `已取消系统分享；文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。`;
            publishExportStatus(abortMessage);
            return;
          }
          systemShareFailed = true;
          publishExportStatus("系统分享没有打开，已切换到下载封面和手动发布兜底。");
        }
        if (!systemShareFailed) {
          const sharedCopyRestored = await tryCopyText(draftText);
          if (!activeRef.current) return;
          setManualCopyText(draftText);
          const sharedMessage = sharedCopyRestored
            ? "已交给系统分享；请选择小红书发布入口，并在小红书内人工确认后再提交。已重新尝试复制文案，下方也保留了正文，如果没有自动带入请直接粘贴。"
            : `已交给系统分享；请选择小红书发布入口，并在小红书内人工确认后再提交。如果正文没有自动带入，文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。`;
          publishExportStatus(sharedMessage);
          return;
        }
      }

      downloadFile(coverFile);
      const fallbackTextRestored = await tryCopyText(draftText);
      if (!activeRef.current) return;
      setManualCopyText(draftText);
      const fallbackMessage = fallbackTextRestored
        ? "封面图已下载，文案已尝试复制。当前浏览器不能把图文直接带入小红书发布器，请手动打开小红书发布入口，选择刚下载的封面图后粘贴正文，并人工确认后再提交。"
        : `封面图已下载；当前浏览器拦截了剪贴板，文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。请手动打开小红书发布入口并选择刚下载的封面图，人工确认后再提交。`;
      publishExportStatus(fallbackMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "打开小红书失败。";
      publishExportStatus(message);
    } finally {
      if (activeRef.current) {
        setXhsExporting(false);
      }
    }
  }

  async function copyPreviewLink() {
    if (lifecycleWarning) {
      setManualCopyText(null);
      publishExportStatus(lifecycleWarning);
      return;
    }
    if (!generatedContent) {
      const message = "先生成草稿，才会有可分享的预览链接。";
      publishExportStatus(message);
      return;
    }

    const previewUrl = `${window.location.origin}/preview/${generatedContent.id}`;
    const copied = await tryCopyText(previewUrl);
    if (!activeRef.current) return;
    setManualCopyText(copied ? null : previewUrl);
    const isLocalPreview = isLocalOrPrivateHostname(window.location.hostname);
    let message = "浏览器拦截了剪贴板，预览链接已展开，可长按全选复制。";
    if (copied) {
      message = isLocalPreview
        ? "已尝试复制预览链接；当前是这台设备或同一网络地址，外部用户需要部署到公网后才能打开。"
        : "已尝试复制预览链接，可以发给别人查看。";
    }
    publishExportStatus(message);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-center bg-white"
      data-testid="draft-preview-editor"
      role="dialog"
    >
      <div className="relative flex h-[100dvh] w-full max-w-[430px] flex-col bg-white text-ink">
        <header className="shrink-0 border-b border-line bg-white px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="关闭草稿预览"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink"
              data-testid="draft-preview-close"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-coral">
                {generatedContent ? "当前草稿" : "本地草稿"}
              </div>
              <h2 className="truncate text-lg font-semibold leading-6">图文预览</h2>
            </div>
            {onRegenerateImage ? (
              <button
                className="flex h-10 items-center gap-1 rounded-full bg-coral px-3 text-sm font-semibold text-white disabled:opacity-50"
                data-testid="draft-preview-regenerate-image"
                disabled={regeneratingImage}
                onClick={handleRegenerateImage}
                type="button"
              >
                {regeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
                <span className="hidden sm:inline">{regeneratingImage ? "生图中" : "重新生图"}</span>
              </button>
            ) : null}
            <button
              className="h-10 rounded-full bg-moss px-4 text-sm font-semibold text-white"
              data-testid={editing ? "draft-preview-save" : "draft-preview-edit-toggle"}
              onClick={toggleEditing}
              type="button"
            >
              {editing ? "完成" : "编辑"}
            </button>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto pb-[calc(196px+env(safe-area-inset-bottom))]">
          <article className="bg-white">
            {coverImageUrl ? (
              <CoverImagePreview
                alt="小红书图文封面预览"
                className="aspect-[3/4] w-full bg-mist object-contain"
                src={coverImageUrl}
                testId="draft-preview-cover-image"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-[linear-gradient(160deg,rgb(var(--cream)),rgb(var(--sage))_48%,rgb(var(--blush)))] px-6 pb-8 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-steel">封面预览</span>
                  <span className="rounded-full bg-white/[0.75] px-3 py-1 text-[11px] font-semibold text-ink/[0.70]">
                    文字版
                  </span>
                </div>
                <div className="mt-14 text-[34px] font-black leading-tight text-ink">
                  {titleLines.map((line, index) => (
                    <span className="block" key={`draft-title-line-${index}-${line}`}>
                      {line}
                    </span>
                  ))}
                </div>
                <div className="mt-8 space-y-2 text-xs font-semibold text-ink/[0.70]">
                  {draft.points.map((point, index) => (
                    <div className="rounded-md bg-white/[0.85] px-3 py-2" key={`${point}-${index}`}>
                      {index + 1}. {point}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 pb-5 pt-4">
              <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">
                    O
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">OPC 任务平台</div>
                    <div className="text-[11px] text-muted">刚刚 · 图文草稿</div>
                  </div>
                </div>
                <button
                  className="h-8 rounded-full bg-coral px-4 text-xs font-semibold text-white"
                  type="button"
                >
                  关注
                </button>
              </div>

              {editing ? (
                <textarea
                  aria-label="编辑标题"
                  className="mt-4 block min-h-[72px] w-full resize-none rounded-md border border-coral/30 bg-blush px-3 py-2 text-xl font-bold leading-7 text-ink outline-none focus:border-coral"
                  data-testid="draft-edit-title"
                  onChange={handleTitleChange}
                  value={draft.title}
                />
              ) : (
                <h1 className="mt-4 text-xl font-bold leading-7">{draft.title}</h1>
              )}

              {editing ? (
                <textarea
                  aria-label="编辑正文"
                  className="mt-3 block min-h-[260px] w-full resize-y rounded-md border border-line bg-mist px-3 py-3 text-[15px] leading-7 text-ink outline-none focus:border-coral"
                  data-testid="draft-edit-body"
                  onChange={handleBodyChange}
                  rows={editBodyRowCount}
                  value={draft.body}
                />
              ) : (
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink">
                  {bodyParagraphs.length ? (
                    bodyParagraphs.map((paragraph, index) => (
                      <p key={`${index}-${paragraph}`}>{renderXhsExpressionText(paragraph)}</p>
                    ))
                  ) : (
                    <p>{renderXhsExpressionText(draft.body)}</p>
                  )}
                </div>
              )}

              {editing ? (
                <div className="mt-4 space-y-2 rounded-md border border-line bg-mist p-3">
                  <div className="text-xs font-semibold text-muted">封面清单</div>
                  {draft.points.map((point, index) => (
                    <input
                      aria-label={`编辑封面清单 ${index + 1}`}
                      className="h-11 w-full rounded-md border border-sage bg-white px-3 text-sm font-medium text-ink outline-none focus:border-coral"
                      data-testid={`draft-edit-point-${index}`}
                      key={`draft-edit-point-${point}-${index}`}
                      onChange={(event) => updatePoint(index, event.target.value)}
                      value={point}
                    />
                  ))}
                </div>
              ) : null}

              {editing ? (
                <input
                  aria-label="编辑标签"
                  className="mt-4 h-11 w-full rounded-md border border-sage bg-white px-3 text-sm font-medium text-steel outline-none focus:border-coral"
                  data-testid="draft-edit-tags"
                  onChange={handleTagsChange}
                  value={draft.tags}
                />
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium text-steel">
                  {tags.map((tag, index) => (
                    <span key={`tag-${index}-${tag}`}>
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 text-xs text-muted">
                {editing ? "正在原地编辑 · 点右上角完成回到预览" : "发布前预览 · 不会自动发布"}
              </div>
              {!editing ? (
                <div
                  className="mt-3 rounded-[18px] border border-amber/40 bg-amber/10 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-ink"
                  data-testid="draft-preview-human-review-note"
                >
                  复制或分享只会准备标题、正文、标签和封面素材；发布前仍需人工确认，不会自动发布。
                </div>
              ) : null}
              {!editing && lifecycleWarning ? (
                <div
                  className="mt-3 rounded-[18px] border border-coral/40 bg-blush px-3 py-2 text-[11px] font-semibold leading-5 text-coral"
                  data-testid="draft-preview-lifecycle-warning"
                >
                  {lifecycleWarning}
                </div>
              ) : null}
              {!editing ? (
                <div
                  className="mt-3 grid gap-2 rounded-[18px] border border-line bg-mist p-3"
                  data-testid="draft-preview-prepublish-checklist"
                >
                  <PromotionReadinessSummary
                    coverAvailable={Boolean(coverImageUrl)}
                    draft={promotionReadinessDraft}
                    sourceContext={generatedContent?.source_context}
                    testId="draft-preview-promotion-readiness"
                    variant="mobile"
                  />
                  {prepublishChecklist.map((item) => (
                    <div
                      className="rounded-[14px] border bg-white px-3 py-2"
                      data-testid={`draft-preview-prepublish-check-${item.key}`}
                      key={`draft-preview-prepublish-check-${item.key}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">{item.label}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${mobilePreviewChecklistStateClass[item.state]}`}
                        >
                          {mobilePreviewChecklistStateLabel[item.state]}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        </section>

        <div className="absolute bottom-0 left-0 right-0 border-t border-line bg-white/[0.95] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
          <button
            className="mb-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-coral px-4 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
            data-testid="draft-open-xiaohongshu"
            disabled={xhsExporting || exportLocked}
            onClick={handleOpenXiaohongshu}
            type="button"
          >
            {xhsExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {exportLocked ? "需先核对状态" : xhsExporting ? "正在准备" : "复制文案+封面，人工去小红书发布"}
          </button>
          <button
            className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-50"
            data-testid="draft-preview-copy"
            disabled={xhsExporting || exportLocked}
            onClick={copyDraftTextOnly}
            type="button"
          >
            <Clipboard className="h-4 w-4" />
            {exportLocked ? "需先核对状态" : XHS_COPY_TEXT_ONLY_LABEL}
          </button>
          <button
            className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-50"
            data-testid="draft-copy-preview-link"
            disabled={!generatedContent || exportLocked}
            onClick={copyPreviewLink}
            type="button"
          >
            <ExternalLink className="h-4 w-4" />
            {exportLocked ? "需先核对状态" : "复制预览链接"}
          </button>
          {xhsExportMessage ? (
            <div
              aria-live="polite"
              className="mb-2 rounded-md bg-amber/10 px-3 py-2 text-[11px] font-medium leading-4 text-amber-ink"
              data-testid="draft-export-status"
              role="status"
            >
              {xhsExportMessage}
            </div>
          ) : null}
          {manualCopyText ? (
            <textarea
              aria-label="手动复制内容"
              className="mb-2 max-h-28 w-full resize-none rounded-[18px] border border-amber/40 bg-amber/10 px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/[0.15]"
              data-testid="draft-manual-copy-text"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              ref={manualCopyRef}
              value={manualCopyText}
            />
          ) : null}
          <div className="flex items-center justify-between">
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <Heart className="h-5 w-5" />
              赞
            </button>
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <MessageCircle className="h-5 w-5" />
              评论
            </button>
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <Bookmark className="h-5 w-5" />
              收藏
            </button>
            <button className="flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink" type="button">
              <Share2 className="h-5 w-5" />
              分享
            </button>
          </div>
        </div>

      </div>
    </div>
  );
});

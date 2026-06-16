"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Clipboard,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  Share2
} from "lucide-react";

import { CoverImagePreview } from "@/components/mobile-cover-image-preview";
import { isLocalOrPrivateHostname } from "@/lib/api-base";
import { tryCopyText } from "@/lib/clipboard";
import {
  generationSourceContextStats,
  type GeneratedContent
} from "@/lib/generated-assets";
import {
  buildEditableDraftCopy,
  type DraftPreviewState
} from "@/lib/mobile-draft-storage";
import { stripDuplicateStandaloneTagLines } from "@/lib/platform-copy";
import {
  buildXhsCoverFile,
  downloadFile,
  getOmpcAndroidBridge,
  shareToNativeXiaohongshu
} from "@/lib/mobile-cover-share";
import { renderXhsExpressionText } from "@/lib/xhs-stickers";

const XHS_COPY_TEXT_ONLY_LABEL = "只复制文案";

type MobilePreviewChecklistState = "ready" | "review" | "blocked";

type MobilePreviewChecklistItem = {
  detail: string;
  key: "content" | "sources" | "cover" | "risk" | "human";
  label: string;
  state: MobilePreviewChecklistState;
};

const mobilePreviewChecklistStateLabel = {
  blocked: "需补充",
  ready: "已就绪",
  review: "待核对"
} satisfies Record<MobilePreviewChecklistState, string>;

const mobilePreviewChecklistStateClass = {
  blocked: "border-[#ffb3b3] bg-[#fff1f1] text-[#a63636]",
  ready: "border-[#b9e8ce] bg-[#effaf4] text-[#167843]",
  review: "border-[#ffe0a6] bg-[#fff8e6] text-[#8a6110]"
} satisfies Record<MobilePreviewChecklistState, string>;

const mobileBlockedPublishTerms = [
  "保录",
  "包过",
  "百分百",
  "100%",
  "内部名额",
  "官方录取",
  "保证录取",
  "保证套磁成功",
  "必上岸"
];

function missingMobileDraftFields(draft: DraftPreviewState) {
  const missingFields: string[] = [];
  if (!draft.title.trim()) {
    missingFields.push("标题");
  }
  if (!draft.body.trim()) {
    missingFields.push("正文");
  }
  if (!draft.tags.trim()) {
    missingFields.push("标签");
  }
  return missingFields;
}

function buildMobilePreviewChecklist({
  coverImageUrl,
  draft,
  generatedContent
}: {
  coverImageUrl: string | null;
  draft: DraftPreviewState;
  generatedContent: GeneratedContent | null;
}): MobilePreviewChecklistItem[] {
  const sourceStats = generationSourceContextStats(generatedContent?.source_context);
  const draftText = `${draft.title}\n${draft.body}\n${draft.tags}`;
  const missingContentFields = missingMobileDraftFields(draft);
  const riskyTerms = mobileBlockedPublishTerms.filter((term) => draftText.includes(term));
  const sourceDetail = !generatedContent
    ? "本地草稿没有后端来源证据，发布前请先生成正式草稿。"
    : sourceStats.missingRequiredWebResults
      ? "当前选题需要实时来源，但没有可见 Tavily 结果，发布前先补来源。"
      : sourceStats.hasEvidence
        ? `已带 ${sourceStats.totalCount} 条来源证据，发布前核对学校、价格、logo、排名等事实。`
        : "未带来源证据，只能作为通用草稿，发布前请人工补充可信依据。";

  return [
    {
      detail: missingContentFields.length
        ? `缺少${missingContentFields.join("、")}；请回到表单补齐后重新生成，或在预览中人工补充后再复制。`
        : "标题、正文和标签会一起准备；发布前仍需逐项读一遍。",
      key: "content",
      label: "标题/正文/标签",
      state: missingContentFields.length ? "blocked" : "ready"
    },
    {
      detail: sourceDetail,
      key: "sources",
      label: "来源证据",
      state: sourceStats.missingRequiredWebResults ? "blocked" : sourceStats.hasEvidence ? "review" : "blocked"
    },
    {
      detail: coverImageUrl
        ? "封面素材已准备；仍需核对是否含假校徽、假录取或误导视觉。"
        : "封面尚未生成，将使用文字封面预览；发布前请确认是否补图。",
      key: "cover",
      label: "封面素材",
      state: coverImageUrl ? "review" : "blocked"
    },
    {
      detail: riskyTerms.length
        ? `发现高风险词：${riskyTerms.join("、")}。请修改后再复制。`
        : "未发现保录、包过、内部名额等高风险承诺词。",
      key: "risk",
      label: "安全用语",
      state: riskyTerms.length ? "blocked" : "ready"
    },
    {
      detail: generatedContent
        ? "当前仍是草稿素材；复制或分享只做准备，最终发布必须人工确认。"
        : "本地草稿不可直接发布，请先生成正式草稿并人工确认。",
      key: "human",
      label: "人工确认",
      state: generatedContent ? "review" : "blocked"
    }
  ];
}

export function DraftPreviewEditor({
  coverImageUrl,
  draft,
  generatedContent,
  onChange,
  onClose,
  onCopy,
  onExportStatus
}: {
  coverImageUrl: string | null;
  draft: DraftPreviewState;
  generatedContent: GeneratedContent | null;
  onChange: (nextDraft: DraftPreviewState) => void;
  onClose: () => void;
  onCopy: () => Promise<boolean>;
  onExportStatus: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const [xhsExporting, setXhsExporting] = useState(false);
  const [xhsExportMessage, setXhsExportMessage] = useState<string | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement | null>(null);
  const titleLines = draft.title.split(/[，,]/).slice(0, 3);
  const bodyParagraphs = stripDuplicateStandaloneTagLines(draft.body, draft.tags)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const tags = draft.tags
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const prepublishChecklist = buildMobilePreviewChecklist({
    coverImageUrl,
    draft,
    generatedContent
  });

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

  function updatePoint(index: number, value: string) {
    onChange({
      ...draft,
      points: draft.points.map((point, pointIndex) => (pointIndex === index ? value : point))
    });
  }

  function publishExportStatus(message: string) {
    setXhsExportMessage(message);
    onExportStatus(message);
  }

  function toggleEditing() {
    setManualCopyText(null);
    setXhsExportMessage(null);
    setEditing((current) => !current);
  }

  async function copyDraftTextOnly() {
    setEditing(false);
    const draftText = buildEditableDraftCopy(draft);
    const copied = await onCopy();
    setManualCopyText(draftText);
    const message = copied
      ? "已尝试复制文案；下方也保留了正文，可长按全选再确认。"
      : "浏览器拦截了剪贴板，文案已展开，可长按全选复制。";
    publishExportStatus(message);
  }

  async function handleOpenXiaohongshu() {
    const draftText = buildEditableDraftCopy(draft);
    setEditing(false);
    setManualCopyText(draftText);
    setXhsExporting(true);
    publishExportStatus("正在准备封面图、标题和正文；下方会保留文案兜底。");
    try {
      const textCopied = await tryCopyText(draftText);
      setManualCopyText(draftText);
      const coverFile = await buildXhsCoverFile(coverImageUrl, draft);

      const nativeBridge = getOmpcAndroidBridge();
      if (nativeBridge) {
        publishExportStatus("正在打开小红书发布入口；封面图、标题和正文会一起发送。");
        const nativeResult = await shareToNativeXiaohongshu(draft.title, draftText, coverFile);
        if (nativeResult.ok) {
          publishExportStatus(
            textCopied
              ? nativeResult.message
              : "已交给小红书；如果正文没有自动带入，下方文案可长按全选复制。"
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
            ? "已尝试复制文案，正在打开系统分享；选择小红书即可带入封面图。"
            : "文案已展开兜底，正在打开系统分享；选择小红书即可带入封面图。"
        );
        try {
          await navigator.share(shareData);
        } catch (error) {
          const errorName = error instanceof DOMException ? error.name : "";
          if (errorName === "AbortError") {
            const restored = await tryCopyText(draftText);
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
          setManualCopyText(draftText);
          const sharedMessage = sharedCopyRestored
            ? "已交给系统分享；请选择小红书发布入口。已重新尝试复制文案，下方也保留了正文，如果没有自动带入请直接粘贴。"
            : `已交给系统分享；请选择小红书发布入口。如果正文没有自动带入，文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。`;
          publishExportStatus(sharedMessage);
          return;
        }
      }

      downloadFile(coverFile);
      const fallbackTextRestored = await tryCopyText(draftText);
      setManualCopyText(draftText);
      const fallbackMessage = fallbackTextRestored
        ? "封面图已下载，文案已尝试复制。当前浏览器不能把图文直接带入小红书发布器，请手动打开小红书发布入口，选择刚下载的封面图后粘贴正文。"
        : `封面图已下载；当前浏览器拦截了剪贴板，文案已展开，可长按全选复制，也可以点“${XHS_COPY_TEXT_ONLY_LABEL}”重试。请手动打开小红书发布入口并选择刚下载的封面图。`;
      publishExportStatus(fallbackMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "打开小红书失败。";
      publishExportStatus(message);
    } finally {
      setXhsExporting(false);
    }
  }

  async function copyPreviewLink() {
    if (!generatedContent) {
      const message = "先生成草稿，才会有可分享的预览链接。";
      publishExportStatus(message);
      return;
    }

    const previewUrl = `${window.location.origin}/preview/${generatedContent.id}`;
    const copied = await tryCopyText(previewUrl);
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
        <header className="shrink-0 border-b border-[#eeeeee] bg-white px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="关闭草稿预览"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5] text-ink"
              data-testid="draft-preview-close"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#ff2442]">
                {generatedContent ? "当前草稿" : "本地草稿"}
              </div>
              <h2 className="truncate text-lg font-semibold leading-6">图文预览</h2>
            </div>
            <button
              className="h-10 rounded-full bg-[#111111] px-4 text-sm font-semibold text-white"
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
                className="aspect-[3/4] w-full bg-[#f7f7f7] object-contain"
                src={coverImageUrl}
                testId="draft-preview-cover-image"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-[linear-gradient(160deg,#fff7df,#d9f1e5_48%,#f7cdbf)] px-6 pb-8 pt-6">
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
              <div className="flex items-center justify-between gap-3 border-b border-[#f1f1f1] pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff2442] text-sm font-bold text-white">
                    O
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">OPC 任务平台</div>
                    <div className="text-[11px] text-muted">刚刚 · 图文草稿</div>
                  </div>
                </div>
                <button
                  className="h-8 rounded-full bg-[#ff2442] px-4 text-xs font-semibold text-white"
                  type="button"
                >
                  关注
                </button>
              </div>

              {editing ? (
                <textarea
                  aria-label="编辑标题"
                  className="mt-4 block min-h-[72px] w-full resize-none rounded-md border border-[#ffd4dc] bg-[#fff8fa] px-3 py-2 text-xl font-bold leading-7 text-ink outline-none focus:border-[#ff2442]"
                  data-testid="draft-edit-title"
                  onChange={(event) => onChange({ ...draft, title: event.target.value })}
                  value={draft.title}
                />
              ) : (
                <h1 className="mt-4 text-xl font-bold leading-7">{draft.title}</h1>
              )}

              {editing ? (
                <textarea
                  aria-label="编辑正文"
                  className="mt-3 block min-h-[260px] w-full resize-y rounded-md border border-[#eeeeee] bg-[#fbfbfb] px-3 py-3 text-[15px] leading-7 text-ink outline-none focus:border-[#ff2442]"
                  data-testid="draft-edit-body"
                  onChange={(event) => onChange({ ...draft, body: event.target.value })}
                  rows={Math.min(16, Math.max(8, draft.body.split("\n").length + 5))}
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
                <div className="mt-4 space-y-2 rounded-md border border-[#eeeeee] bg-[#fbfbfb] p-3">
                  <div className="text-xs font-semibold text-muted">封面清单</div>
                  {draft.points.map((point, index) => (
                    <input
                      aria-label={`编辑封面清单 ${index + 1}`}
                      className="h-11 w-full rounded-md border border-[#d6e8df] bg-white px-3 text-sm font-medium text-ink outline-none focus:border-[#ff2442]"
                      data-testid={`draft-edit-point-${index}`}
                      key={`draft-edit-point-${index}`}
                      onChange={(event) => updatePoint(index, event.target.value)}
                      value={point}
                    />
                  ))}
                </div>
              ) : null}

              {editing ? (
                <input
                  aria-label="编辑标签"
                  className="mt-4 h-11 w-full rounded-md border border-[#d6e8df] bg-white px-3 text-sm font-medium text-[#346cb0] outline-none focus:border-[#ff2442]"
                  data-testid="draft-edit-tags"
                  onChange={(event) => onChange({ ...draft, tags: event.target.value })}
                  value={draft.tags}
                />
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium text-[#346cb0]">
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
                  className="mt-3 rounded-[18px] border border-[#ffe0a6] bg-[#fff8e6] px-3 py-2 text-[11px] font-semibold leading-5 text-[#8a6110]"
                  data-testid="draft-preview-human-review-note"
                >
                  复制或分享只会准备标题、正文、标签和封面素材；发布前仍需人工确认，不会自动发布。
                </div>
              ) : null}
              {!editing ? (
                <div
                  className="mt-3 grid gap-2 rounded-[18px] border border-[#eeeeee] bg-[#fbfbfb] p-3"
                  data-testid="draft-preview-prepublish-checklist"
                >
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

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#eeeeee] bg-white/[0.95] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
          <button
            className="mb-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ff2442] px-4 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
            data-testid="draft-open-xiaohongshu"
            disabled={xhsExporting}
            onClick={handleOpenXiaohongshu}
            type="button"
          >
            {xhsExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {xhsExporting ? "正在准备" : "复制文案+封面，去小红书"}
          </button>
          <button
            className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#eeeeee] bg-white px-4 text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-50"
            data-testid="draft-preview-copy"
            disabled={xhsExporting}
            onClick={copyDraftTextOnly}
            type="button"
          >
            <Clipboard className="h-4 w-4" />
            {XHS_COPY_TEXT_ONLY_LABEL}
          </button>
          <button
            className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#eeeeee] bg-white px-4 text-sm font-semibold text-ink active:scale-[0.99] disabled:opacity-50"
            data-testid="draft-copy-preview-link"
            disabled={!generatedContent}
            onClick={copyPreviewLink}
            type="button"
          >
            <ExternalLink className="h-4 w-4" />
            复制预览链接
          </button>
          {xhsExportMessage ? (
            <div
              aria-live="polite"
              className="mb-2 rounded-md bg-[#fff6e3] px-3 py-2 text-[11px] font-medium leading-4 text-[#8a5d16]"
              data-testid="draft-export-status"
              role="status"
            >
              {xhsExportMessage}
            </div>
          ) : null}
          {manualCopyText ? (
            <textarea
              aria-label="手动复制内容"
              className="mb-2 max-h-28 w-full resize-none rounded-[18px] border border-[#ffd78f] bg-[#fffaf0] px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-[#ff2442] focus:ring-2 focus:ring-[#ff2442]/[0.15]"
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
}

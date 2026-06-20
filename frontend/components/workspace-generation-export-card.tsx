"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Image,
  Loader2,
  Settings
} from "lucide-react";
import { PromotionReadinessSummary } from "@/components/promotion-readiness-summary";
import { resolveAssetUrl } from "@/lib/asset-url";
import { copyText } from "@/lib/clipboard";
import {
  type GeneratedContent,
  type GeneratedImageAsset
} from "@/lib/generated-assets";
import { type ProviderStatusItem } from "@/lib/provider-settings";
import {
  generatedContentLifecycleWarning,
  generatedContentStatusLabel,
  generatedImageStatusLabel
} from "@/lib/status-labels";
import { formatTagLine } from "@/lib/tags";
import { buildTopicCoverStyleNotes } from "@/lib/topic-presets";
import {
  API_BASE,
  buildPlatformCopy,
  buildPrepublishChecklist,
  complianceWarnings,
  hasLiveImageProvider,
  isTestDraft,
  prepublishChecklistStateLabel,
  prepublishChecklistTone,
  readApiError,
  secondaryButtonClass,
  subtleCardClass,
  douyinHighAttractionCoverStyle,
  xhsHighAttractionCoverStyle
} from "./workspace-utils";
import { Pill } from "./workspace-ui";

export function GeneratedPostExportCard({
  content,
  generatedImageAsset,
  generationBusy,
  imageProviderReady,
  onImageGenerated,
  onOpenSettings,
  onRefreshProviderStatuses,
  workspaceToken
}: {
  content: GeneratedContent;
  generatedImageAsset: GeneratedImageAsset | null;
  generationBusy: boolean;
  imageProviderReady: boolean;
  onImageGenerated: (asset: GeneratedImageAsset) => void;
  onOpenSettings: () => void;
  onRefreshProviderStatuses: () => Promise<ProviderStatusItem[] | null>;
  workspaceToken: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<GeneratedImageAsset | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement | null>(null);
  const currentContentIdRef = useRef(content.id);
  const warnings = complianceWarnings(content);
  const testDraft = isTestDraft(content);
  const lifecycleWarning = generatedContentLifecycleWarning(content.status);
  const canCopy = !testDraft && !generationBusy && !lifecycleWarning;
  const canGenerateImage = canCopy && !imageBusy && !lifecycleWarning;
  const copyPayload = buildPlatformCopy(content);
  const tagLine = formatTagLine(content.tags);
  const imagePreviewUrl = imageAsset ? resolveAssetUrl(imageAsset.image_url) : null;
  const isDouyinPost = content.platform === "douyin";
  const platformLabel = isDouyinPost ? "抖音" : "小红书";
  const coverAspectRatio = isDouyinPost ? "9:16" : "3:4";
  const coverStyleNotes = buildTopicCoverStyleNotes(
    isDouyinPost ? douyinHighAttractionCoverStyle : xhsHighAttractionCoverStyle,
    content.title
  );
  const coverTemplate = isDouyinPost ? "douyin-cover" : "xiaohongshu-cover";
  const imageButtonLabel = imageBusy
    ? "正在生成封面"
    : generationBusy
      ? "一键生成中"
    : lifecycleWarning
      ? "需先核对状态"
    : imageAsset
      ? "重新生成封面"
      : imageProviderReady
        ? "生成封面图"
        : "检测并生成封面";
  const statusTone = lifecycleWarning ? "red" : content.status === "draft" ? "amber" : "green";
  const prepublishChecklist = buildPrepublishChecklist({
    content,
    imageReady: Boolean(imageAsset && imagePreviewUrl),
    lifecycleWarning,
    testDraft,
    warnings
  });

  useEffect(() => {
    currentContentIdRef.current = content.id;
    if (generatedImageAsset?.content_id === content.id) {
      setImageAsset(generatedImageAsset);
      setImageError(null);
    } else {
      setImageAsset(null);
      setImageError(null);
    }
    setImageBusy(false);
  }, [content.id, generatedImageAsset]);

  useEffect(() => {
    setCopyState("idle");
    setManualCopyText(null);
  }, [content.id]);

  useEffect(() => {
    if (!manualCopyText) {
      return;
    }
    manualCopyRef.current?.focus();
    manualCopyRef.current?.select();
  }, [manualCopyText]);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
    };
  }

  async function handleCopy() {
    if (!canCopy) {
      setCopyState("failed");
      setManualCopyText(null);
      return;
    }
    try {
      await copyText(copyPayload);
      setCopyState("copied");
      setManualCopyText(null);
    } catch (_error) {
      setCopyState("failed");
      setManualCopyText(copyPayload);
    }
  }

  async function handleGenerateImage() {
    const requestContentId = content.id;
    if (generationBusy) {
      setImageError("一键生成还没完成，请等文案和封面流程结束后再操作。");
      return;
    }
    if (!canCopy) {
      setImageError("本地检查草稿不可生成封面图，请先生成一篇正式草稿。");
      return;
    }
    if (lifecycleWarning) {
      setImageError(lifecycleWarning);
      return;
    }

    setImageBusy(true);
    setImageError(null);
    try {
      const refreshedStatuses = imageProviderReady
        ? null
        : await onRefreshProviderStatuses();
      const refreshedImageProviderReady = imageProviderReady ||
        hasLiveImageProvider(refreshedStatuses ?? []);
      if (!refreshedImageProviderReady) {
        throw new Error("图片服务还没有完成可用性检查，请先到设置页应用图片服务授权后再点生成封面图。");
      }
      const response = await fetch(`${API_BASE}/image/generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          aspect_ratio: coverAspectRatio,
          content_id: content.id,
          style_notes: coverStyleNotes,
          template: coverTemplate
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "封面图生成失败。"));
      }
      const data = (await response.json()) as GeneratedImageAsset;
      onImageGenerated(data);
      if (currentContentIdRef.current === data.content_id) {
        setImageAsset(data);
      }
    } catch (error) {
      if (currentContentIdRef.current === requestContentId) {
        setImageError(error instanceof Error ? error.message : "封面图生成失败。");
      }
    } finally {
      if (currentContentIdRef.current === requestContentId) {
        setImageBusy(false);
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4" data-testid="pc-generated-export-card">
      <div className={`${subtleCardClass} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="green">已生成</Pill>
              <Pill tone={statusTone}>
                {generatedContentStatusLabel(content.status)}
              </Pill>
            </div>
            <h3 className="mt-3 text-xl font-semibold leading-7">{content.title}</h3>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-steel px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
              data-testid="cover-generate-button"
              disabled={!canGenerateImage}
              onClick={handleGenerateImage}
              type="button"
            >
              {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              {imageButtonLabel}
            </button>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="pc-export-copy-button"
              disabled={!canCopy}
              onClick={handleCopy}
              type="button"
            >
              {copyState === "copied" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {testDraft
                ? "本地检查草稿不可复制"
                : lifecycleWarning
                  ? "需先核对状态"
                : copyState === "copied"
                  ? "已复制"
                  : `一键复制${platformLabel}文案`}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-line bg-mist/70 p-4">
          <div className="whitespace-pre-wrap text-sm leading-7 text-ink">{content.body}</div>
          {tagLine ? (
            <div className="mt-4 text-sm font-medium leading-6 text-steel">{tagLine}</div>
          ) : null}
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          {generationBusy
            ? "一键生成还在继续，完成前先不要复制或手动生成封面。"
            : `复制内容包含标题、正文和话题标签；不会自动发布，粘贴到${platformLabel}前仍需人工看一遍。`}
        </p>
      </div>

      <div className={`${subtleCardClass} p-4`} data-testid="pc-export-prepublish-check">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {warnings.length || testDraft || lifecycleWarning ? (
            <AlertTriangle className="h-4 w-4 text-amber" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-moss" />
          )}
          发布前检查
        </div>
        <div className="mt-3 space-y-2 text-xs leading-5 text-muted">
          <PromotionReadinessSummary
            coverAvailable={Boolean(imageAsset && imagePreviewUrl)}
            draft={{
              body: content.body,
              tags: content.tags,
              title: content.title
            }}
            sourceContext={content.source_context}
            testId="pc-export-promotion-readiness"
          />
          <div className="grid gap-2 sm:grid-cols-2" data-testid="pc-export-prepublish-checklist">
            {prepublishChecklist.map((item) => (
              <div
                className="rounded-md border border-line bg-paper p-3"
                data-testid={`pc-export-prepublish-check-${item.key}`}
                key={`pc-export-prepublish-check-${item.key}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{item.label}</span>
                  <Pill tone={prepublishChecklistTone[item.state]}>
                    {prepublishChecklistStateLabel[item.state]}
                  </Pill>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
          {testDraft ? (
            <div className="rounded-md border border-amber/40 bg-amber/10 p-3 text-ink">
              这是本地检查草稿，不可直接发布。
            </div>
          ) : null}
          {warnings.length ? (
            <div className="rounded-md border border-amber/40 bg-amber/10 p-3 text-ink">
              发现高风险词：{warnings.join("、")}。请改完再复制。
            </div>
          ) : (
            <div className="rounded-md border border-moss/40 bg-moss/10 p-3 text-ink">
              未发现保录、包过、内部名额等高风险承诺词。
            </div>
          )}
          {lifecycleWarning ? (
            <div
              className="rounded-md border border-coral/40 bg-coral/10 p-3 text-ink"
              data-testid="pc-export-lifecycle-warning"
            >
              {lifecycleWarning}
            </div>
          ) : null}
          <div
            className="rounded-md border border-line bg-paper p-3"
            data-testid="pc-export-cover-review-check"
          >
            封面图生成后仍需人工复核；不要使用假录取通知、校徽或保证录取视觉。
          </div>
          {copyState === "failed" && !testDraft ? (
            <div className="rounded-md border border-coral/40 bg-coral/10 p-3 text-ink">
              复制被浏览器拦截了；下方已展开正文，可直接全选复制。
            </div>
          ) : null}
          {manualCopyText ? (
            <textarea
              aria-label={`${platformLabel}手动复制文案`}
              className="min-h-32 w-full resize-y rounded-md border border-coral/30 bg-paper px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/15"
              data-testid="pc-export-manual-copy-text"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              ref={manualCopyRef}
              value={manualCopyText}
            />
          ) : null}
        </div>
      </div>

      <div className={`${subtleCardClass} p-4`} data-testid="pc-export-cover-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Image className="h-4 w-4 text-steel" />
              {platformLabel}封面图
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              使用高吸引封面公式生成 {coverAspectRatio} 竖版图；生成后只是待确认素材，不会自动发布。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!imageProviderReady ? (
              <button
                className={`${secondaryButtonClass} h-10 px-4`}
                onClick={onOpenSettings}
                type="button"
              >
                <Settings className="h-4 w-4" />
                配置图片服务
              </button>
            ) : null}
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-steel px-4 text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
              data-testid="cover-generate-button-secondary"
              disabled={!canGenerateImage}
              onClick={handleGenerateImage}
              type="button"
            >
              {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              {imageButtonLabel}
            </button>
          </div>
        </div>
        {!imageProviderReady ? (
          <div className="mt-3 rounded-md border border-amber/40 bg-amber/10 p-3 text-xs leading-5 text-ink">
            点击生成时会重新检测真实图片服务；检测未通过会停止生成，不会补替代封面。
          </div>
        ) : null}
        {imageError ? (
          <div className="mt-3 rounded-md border border-coral/40 bg-coral/10 p-3 text-xs leading-5 text-ink">
            {imageError}
          </div>
        ) : null}
        {imageAsset && imagePreviewUrl ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-[18px] border border-line bg-paper">
              <img
                alt="生成的封面图预览"
                className={`${isDouyinPost ? "aspect-[9/16]" : "aspect-[3/4]"} w-full object-cover`}
                src={imagePreviewUrl}
              />
            </div>
            <div className="rounded-md border border-line bg-mist/60 p-4 text-xs leading-6 text-muted">
              <div className="font-semibold text-ink">封面图：{generatedImageStatusLabel(imageAsset.status)}</div>
              <div className="mt-2">
                未确认内容生成的封面会保持待确认状态。粘贴到{platformLabel}前，请确认标题、图中文字、封面暗示和正文一致。
              </div>
              <a
                aria-label={`打开${platformLabel}封面原图`}
                className="mt-3 inline-flex items-center gap-2 font-semibold text-steel"
                href={imagePreviewUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                打开原图
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

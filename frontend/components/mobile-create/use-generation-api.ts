"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  buildGenerationInputSignature,
  type GeneratedContentInputSignature
} from "@/lib/generation-input-signature";
import {
  formatDraftGenerationErrorMessage,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import { generatedContentLifecycleWarning } from "@/lib/status-labels";
import { parseTagText } from "@/lib/tags";
import {
  buildEditableDraftCopy,
  clearStoredMobileCover,
  draftStateFromContent,
  saveStoredMobileContent,
  saveStoredMobileCover,
  type DraftPreviewState
} from "@/lib/mobile-draft-storage";
import {
  MOBILE_GENERATE_KNOWLEDGE_LIMIT,
  MOBILE_GENERATE_PROGRESS_STAGE_CEILING,
  MOBILE_GENERATE_PROGRESS_STAGE_FLOOR,
  buildMobileCoverImageRequestPayload,
  buildMobileCoverStyleNotes,
  shortPostDraftTone,
  xhsMobileDraftTone
} from "@/components/mobile-create-utils";
import {
  authHeaders,
  readApiError,
  type CredentialSettings,
  type MobilePlatform
} from "@/lib/mobile-runtime";
import { copyText } from "@/lib/clipboard";
import {
  isGeneratedContent,
  isGeneratedImageAsset,
  isGenerationSourceContextResponse,
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";

interface ProgressApi {
  startProgress: (label: string) => void;
  setProgressStage: (label: string, floor: number, ceiling: number) => void;
  finishProgress: (label: string) => void;
  stopProgressTimer: () => void;
  setProgressPercent: (value: number) => void;
  setProgressLabel: (value: string) => void;
  prepareCompletionFeedback: () => Promise<void>;
  notifyGenerationComplete: (content: GeneratedContent) => Promise<void>;
}

interface UseGenerationApiParams {
  topic: string;
  platform: MobilePlatform;
  contentMode: "short" | "xiaohongshu";
  targetAudience: string;
  tagsText: string;
  generationKnowledgeQuery: string;
  apiBase: string;
  credentials: CredentialSettings;
  sourceEvidenceBlocked: boolean;
  draftPreview: DraftPreviewState;
  generatedContent: GeneratedContent | null;
  setBusy: (value: boolean) => void;
  setGeneratedCover: (value: GeneratedImageAsset | null) => void;
  setGeneratedContent: (value: GeneratedContent | null) => void;
  setGeneratedContentInputSignature: (value: GeneratedContentInputSignature | null) => void;
  setSourceContext: (value: GenerationSourceContext | null) => void;
  setSourcePreviewError: (value: string | null) => void;
  setSourcePreviewBusy: (value: boolean) => void;
  setDraftPreview: (value: DraftPreviewState) => void;
  progress: ProgressApi;
  syncDraftIntoHistory: (content: GeneratedContent, cover: GeneratedImageAsset | null) => void;
  onAction: (message: string) => void;
}

export function useGenerationApi(params: UseGenerationApiParams) {
  const {
    topic,
    platform,
    contentMode,
    targetAudience,
    tagsText,
    generationKnowledgeQuery,
    apiBase,
    credentials,
    sourceEvidenceBlocked,
    draftPreview,
    generatedContent,
    setBusy,
    setGeneratedCover,
    setGeneratedContent,
    setGeneratedContentInputSignature,
    setSourceContext,
    setSourcePreviewError,
    setSourcePreviewBusy,
    setDraftPreview,
    progress,
    syncDraftIntoHistory,
    onAction
  } = params;

  const buildMobileGenerationRequestPayload = useCallback(() => {
    return {
      platform,
      topic: topic.trim(),
      knowledge_query: generationKnowledgeQuery.trim() || undefined,
      tone: contentMode === "xiaohongshu" ? xhsMobileDraftTone : shortPostDraftTone,
      target_audience: targetAudience.trim() || undefined,
      knowledge_limit: MOBILE_GENERATE_KNOWLEDGE_LIMIT,
      tags: parseTagText(tagsText)
    };
  }, [platform, topic, generationKnowledgeQuery, contentMode, targetAudience, tagsText]);

  const previewAbortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(true);
  const genControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      genControllerRef.current?.abort();
      previewAbortRef.current?.abort();
    };
  }, []);

  const previewMobileSourceContext = useCallback(async () => {
    if (!topic.trim()) {
      setSourcePreviewError("先填写选题，再查看检索依据。");
      return;
    }

    setSourcePreviewBusy(true);
    setSourcePreviewError(null);
    onAction("正在检索知识库和联网来源。");
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;
    try {
      const response = await fetch(`${apiBase}/content/source-preview`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify(buildMobileGenerationRequestPayload()),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "检索依据读取失败。"));
      }
      const raw: unknown = await response.json();
      if (!isGenerationSourceContextResponse(raw)) throw new Error("检索依据数据格式异常。");
      if (!activeRef.current || controller.signal.aborted) return;
      setSourceContext(raw.source_context ?? null);
      onAction("检索依据已加载，请先核对来源。");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "检索依据读取失败。"
      );
      setSourceContext(null);
      setSourcePreviewError(message);
      onAction(message);
    } finally {
      if (!controller.signal.aborted) {
        setSourcePreviewBusy(false);
      }
    }
  }, [topic, onAction, apiBase, credentials, buildMobileGenerationRequestPayload]);

  const generateDraftAndCover = useCallback(async () => {
    if (!topic.trim()) {
      onAction("先填写选题，再生成草稿。");
      return;
    }
    if (sourceEvidenceBlocked) {
      onAction("检索依据读取失败，请先重新查看依据后再生成。");
      return;
    }

    void progress.prepareCompletionFeedback();
    setBusy(true);
    setGeneratedCover(null);
    clearStoredMobileCover();
    progress.startProgress("撰稿服务生成中");
    genControllerRef.current?.abort();
    const genController = new AbortController();
    genControllerRef.current = genController;
    try {
      const requestPayload = buildMobileGenerationRequestPayload();
      const requestSignature = buildGenerationInputSignature({
        knowledgeQuery: requestPayload.knowledge_query,
        platform: requestPayload.platform,
        tagsText,
        targetAudience: requestPayload.target_audience,
        tone: requestPayload.tone,
        topic: requestPayload.topic
      });
      const response = await fetch(`${apiBase}/content/generate`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify(requestPayload),
        signal: genController.signal
      });
      if (!activeRef.current) return;
      if (!response.ok) {
        throw new Error(await readApiError(response, "图文草稿生成失败。"));
      }
      const rawContent: unknown = await response.json();
      if (!activeRef.current) return;
      if (!isGeneratedContent(rawContent)) {
        throw new Error("服务返回的图文草稿数据格式不正确。");
      }
      const data = rawContent;
      setGeneratedContent(data);
      setGeneratedContentInputSignature({ contentId: data.id, signature: requestSignature });
      setSourceContext(data.source_context ?? null);
      setSourcePreviewError(null);
      setDraftPreview(draftStateFromContent(data));
      saveStoredMobileContent(data);
      syncDraftIntoHistory(data, null);
      clearStoredMobileCover();
      const lifecycleWarning = generatedContentLifecycleWarning(data.status);
      if (lifecycleWarning) {
        progress.stopProgressTimer();
        progress.setProgressPercent(100);
        progress.setProgressLabel("需先核对状态");
        onAction(lifecycleWarning);
        return;
      }
      progress.setProgressStage(
        "封面图生成中",
        MOBILE_GENERATE_PROGRESS_STAGE_FLOOR,
        MOBILE_GENERATE_PROGRESS_STAGE_CEILING
      );

      const coverStyleNotes = buildMobileCoverStyleNotes(platform, requestPayload.topic);
      const imageResponse = await fetch(`${apiBase}/image/generate`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify(
          buildMobileCoverImageRequestPayload(platform, data.id, coverStyleNotes)
        ),
        signal: genController.signal
      });
      if (!activeRef.current) return;
      if (!imageResponse.ok) {
        throw new Error(
          `文案草稿已生成，但封面图失败：${await readApiError(imageResponse, "封面图生成失败。")}`
        );
      }
      const rawCover: unknown = await imageResponse.json();
      if (!activeRef.current) return;
      if (!isGeneratedImageAsset(rawCover)) {
        throw new Error("服务返回的封面图数据格式不正确。");
      }
      const cover = rawCover;
      setGeneratedCover(cover);
      saveStoredMobileCover(cover);
      syncDraftIntoHistory(data, cover);
      progress.finishProgress("已完成");
      void progress.notifyGenerationComplete(data).catch(() => undefined);
      onAction("文案和封面图已生成。");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      progress.stopProgressTimer();
      progress.setProgressLabel("生成失败");
      onAction(
        formatDraftGenerationErrorMessage(
          error instanceof Error ? error.message : "一键撰稿和封面生成失败。"
        )
      );
    } finally {
      if (activeRef.current && !genController.signal.aborted) {
        setBusy(false);
      }
    }
  }, [
    topic,
    tagsText,
    sourceEvidenceBlocked,
    apiBase,
    credentials,
    platform,
    syncDraftIntoHistory,
    onAction,
    buildMobileGenerationRequestPayload,
    progress.startProgress,
    progress.setProgressStage,
    progress.finishProgress,
    progress.stopProgressTimer,
    progress.setProgressPercent,
    progress.setProgressLabel,
    progress.prepareCompletionFeedback,
    progress.notifyGenerationComplete
  ]);

  const copyDraft = useCallback(async () => {
    try {
      await copyText(buildEditableDraftCopy(draftPreview));
      onAction(generatedContent ? "已尝试复制当前草稿。" : "已尝试复制当前预览文案。");
      return true;
    } catch (_error) {
      onAction("复制失败，请长按正文区域手动选择复制。");
      return false;
    }
  }, [draftPreview, generatedContent, onAction]);

  return { previewMobileSourceContext, generateDraftAndCover, copyDraft };
}

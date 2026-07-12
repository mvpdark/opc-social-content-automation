"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import {
  MobileCreationProjectGateway,
  findEnabledMobileCreationProject,
  type MobileCreationProjectId
} from "@/components/mobile-creation-project-gateway";
import { resolveAssetUrl } from "@/lib/asset-url";
import { addMobileBackHandler } from "@/lib/mobile-back-navigation";
import {
  isGeneratedImageAsset,
  sourceContextMatchesKnowledgeQuery,
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import {
  buildGenerationInputSignature,
  generatedContentInputSignatureMatches,
  type GeneratedContentInputSignature
} from "@/lib/generation-input-signature";
import { tagsMatchText } from "@/lib/tags";
import { saveStoredMobileCover, saveStoredMobileDraftPreview, loadStoredMobileDraftPreview, type DraftPreviewState } from "@/lib/mobile-draft-storage";
import {
  TOPIC_PRESET_REFRESH_MS,
  buildCustomTopicAudience,
  buildCustomTopicTags,
  findGenerationTopicPresetByTopic,
  generationTopicRequiresSourceEvidence,
  isKnownGenerationTopicAudience,
  isKnownGenerationTopicTags,
  pickGenerationTopicPresetBatch,
  type GenerationTopicPreset
} from "@/lib/topic-presets";
import {
  buildMobileHeroProgressState,
  buildStaleMobileDraftMessage,
  defaultMobileDraftPreview,
  defaultMobileTagsText,
  defaultMobileTargetAudience,
  shortPostDraftTone,
  xhsMobileDraftTone
} from "@/components/mobile-create-utils";
import {
  authHeaders,
  readApiError,
  type CredentialSettings,
  type MobilePlatform
} from "@/lib/mobile-runtime";
import {
  buildMobileCoverImageRequestPayload,
  buildMobileCoverStyleNotes
} from "@/components/mobile-create-utils";

import { useDraftHistory } from "./mobile-create/use-draft-history";
import { useCoverHydration } from "./mobile-create/use-cover-hydration";
import { useProgressCompletion } from "./mobile-create/use-progress-completion";
import { useGenerationApi } from "./mobile-create/use-generation-api";
import { HeroSection } from "./mobile-create/hero-section";
import { FormPanel } from "./mobile-create/form-panel";
import { DraftHistorySection } from "./mobile-create/draft-history-section";

export const CreateScreen = memo(function CreateScreen({
  active = true,
  apiBase,
  credentials,
  onAction
}: {
  active?: boolean;
  apiBase: string;
  credentials: CredentialSettings;
  onAction: (message: string) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<MobileCreationProjectId | null>(null);
  const [platform, setPlatform] = useState<MobilePlatform>("xiaohongshu");
  const [contentMode, setContentMode] = useState<"short" | "xiaohongshu">("xiaohongshu");
  const [topic, setTopic] = useState("硕升博申请第一步，不是先套磁");
  const [targetAudience, setTargetAudience] = useState(defaultMobileTargetAudience);
  const [tagsText, setTagsText] = useState(defaultMobileTagsText);
  const [visibleTopicPresets, setVisibleTopicPresets] = useState<GenerationTopicPreset[]>(() =>
    pickGenerationTopicPresetBatch()
  );
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedContentInputSignature, setGeneratedContentInputSignature] =
    useState<GeneratedContentInputSignature | null>(null);
  const [generatedCover, setGeneratedCover] = useState<GeneratedImageAsset | null>(null);
  const [sourceContext, setSourceContext] = useState<GenerationSourceContext | null>(null);
  const [sourcePreviewBusy, setSourcePreviewBusy] = useState(false);
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<DraftPreviewState>(() => loadStoredMobileDraftPreview() ?? defaultMobileDraftPreview);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const activeRef = useRef(true);

  const draftHistory = useDraftHistory({
    apiBase,
    credentials,
    onAction,
    generatedContent,
    setGeneratedContent,
    setGeneratedCover,
    setSourceContext,
    setDraftPreview,
    setPreviewOpen
  });

  const selectedDraftItemsRef = useRef(draftHistory.selectedDraftItems);
  selectedDraftItemsRef.current = draftHistory.selectedDraftItems;

  useCoverHydration({
    apiBase,
    platform,
    credentials,
    onAction,
    draftHistoryReloadKey: draftHistory.draftHistoryReloadKey,
    setDraftHistory: draftHistory.setDraftHistory,
    setDraftHistoryError: draftHistory.setDraftHistoryError,
    setGeneratedContent,
    setGeneratedCover,
    setSourceContext,
    setDraftPreview
  });

  const progress = useProgressCompletion(busy, onAction, platform);

  const coverImageUrl = useMemo(
    () => (generatedCover ? resolveAssetUrl(generatedCover.image_url) : null),
    [generatedCover]
  );
  const selectedProject = useMemo(
    () => findEnabledMobileCreationProject(selectedProjectId),
    [selectedProjectId]
  );
  const selectedTopicPreset = useMemo(
    () => findGenerationTopicPresetByTopic(topic),
    [topic]
  );
  const generationKnowledgeQuery = useMemo(
    () => selectedTopicPreset?.knowledgeQuery ?? topic,
    [selectedTopicPreset, topic]
  );
  const sourceEvidenceRequired = useMemo(
    () =>
      generationTopicRequiresSourceEvidence({
        knowledgeQuery: generationKnowledgeQuery,
        preset: selectedTopicPreset,
        tags: tagsText,
        topic
      }),
    [generationKnowledgeQuery, selectedTopicPreset, tagsText, topic]
  );
  const currentMobileGenerationInputSignature = useMemo(
    () =>
      buildGenerationInputSignature({
        knowledgeQuery: generationKnowledgeQuery,
        platform,
        tagsText,
        targetAudience,
        tone: contentMode === "xiaohongshu" ? xhsMobileDraftTone : shortPostDraftTone,
        topic
      }),
    [generationKnowledgeQuery, platform, tagsText, targetAudience, contentMode, topic]
  );
  const generatedContentMatchesCurrentInputs = useMemo(
    () =>
      Boolean(
        generatedContent &&
          generatedContent.title === topic.trim() &&
          generatedContent.platform === platform &&
          tagsMatchText(generatedContent.tags, tagsText) &&
          sourceContextMatchesKnowledgeQuery(generatedContent.source_context, generationKnowledgeQuery) &&
          generatedContentInputSignatureMatches(
            generatedContent.id,
            generatedContentInputSignature,
            currentMobileGenerationInputSignature
          )
      ),
    [
      generatedContent,
      topic,
      platform,
      tagsText,
      generationKnowledgeQuery,
      generatedContentInputSignature,
      currentMobileGenerationInputSignature
    ]
  );
  const staleMobileDraftMessage = useMemo(
    () => buildStaleMobileDraftMessage(generatedContent, generatedContentMatchesCurrentInputs, topic),
    [generatedContent, generatedContentMatchesCurrentInputs, topic]
  );
  const matchingMobileSourceContext = useMemo(
    () =>
      sourceContextMatchesKnowledgeQuery(sourceContext, generationKnowledgeQuery)
        ? sourceContext
        : null,
    [sourceContext, generationKnowledgeQuery]
  );
  const matchingMobileGeneratedSourceContext = useMemo(
    () =>
      generatedContentMatchesCurrentInputs &&
      sourceContextMatchesKnowledgeQuery(generatedContent?.source_context, generationKnowledgeQuery)
        ? generatedContent?.source_context ?? null
        : null,
    [generatedContentMatchesCurrentInputs, generatedContent, generationKnowledgeQuery]
  );
  const visibleMobileSourceContext = useMemo(
    () => matchingMobileSourceContext ?? matchingMobileGeneratedSourceContext,
    [matchingMobileSourceContext, matchingMobileGeneratedSourceContext]
  );
  const sourceEvidenceBlocked = useMemo(
    () => sourceEvidenceRequired && Boolean(sourcePreviewError) && !visibleMobileSourceContext,
    [sourceEvidenceRequired, sourcePreviewError, visibleMobileSourceContext]
  );
  const mobileGenerateDraftDisabled = busy || sourceEvidenceBlocked;

  const generationApi = useGenerationApi({
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
    syncDraftIntoHistory: draftHistory.syncDraftIntoHistory,
    onAction
  });

  
  // Persist draft preview edits to localStorage
  useEffect(() => {
    if (!draftPreview?.title && !draftPreview?.body) return;
    const timer = setTimeout(() => saveStoredMobileDraftPreview(draftPreview), 500);
    return () => clearTimeout(timer);
  }, [draftPreview]);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

const clearMobileSourceEvidence = useCallback(() => {
    setSourceContext(null);
    setSourcePreviewError(null);
  }, []);

  const updateMobileTopicAndAutoContext = useCallback((nextTopic: string) => {
    const previousTopic = topic.trim();
    const previousTopicPreset = findGenerationTopicPresetByTopic(previousTopic);
    const nextTopicText = nextTopic.trim();
    const nextTopicPreset = findGenerationTopicPresetByTopic(nextTopicText);
    setTopic(nextTopic);
    setTargetAudience((currentAudience) => {
      const normalizedAudience = currentAudience.trim();
      const shouldSyncAudience =
        !normalizedAudience ||
        normalizedAudience === defaultMobileTargetAudience ||
        normalizedAudience === buildCustomTopicAudience(previousTopic) ||
        isKnownGenerationTopicAudience(normalizedAudience);
      if (nextTopicPreset) {
        return nextTopicPreset.audience;
      }
      if (shouldSyncAudience) {
        return buildCustomTopicAudience(nextTopicText) || defaultMobileTargetAudience;
      }
      return currentAudience;
    });
    setTagsText((currentTags) => {
      const normalizedTags = currentTags.trim();
      const shouldSyncTags =
        !normalizedTags ||
        normalizedTags === previousTopic ||
        normalizedTags === defaultMobileTagsText ||
        isKnownGenerationTopicTags(normalizedTags);
      if (nextTopicPreset) {
        return nextTopicPreset.tags;
      }
      if (shouldSyncTags) {
        return buildCustomTopicTags(nextTopicText) || defaultMobileTagsText;
      }
      return currentTags;
    });
    clearMobileSourceEvidence();
    if (nextTopicPreset) {
      onAction(`已识别推荐选题：${nextTopicPreset.topic}`);
    } else if (previousTopicPreset && nextTopicText) {
      onAction(`已切换为自定义选题：${nextTopicText}`);
    }
  }, [topic, onAction, clearMobileSourceEvidence]);

  const applyMobileTopicPreset = useCallback((preset: GenerationTopicPreset) => {
    setTopic(preset.topic);
    setTargetAudience(preset.audience);
    setTagsText(preset.tags);
    clearMobileSourceEvidence();
    onAction(`已套用推荐选题：${preset.topic}`);
  }, [onAction, clearMobileSourceEvidence]);

  const refreshMobileTopicPresets = useCallback((manual = false) => {
    setVisibleTopicPresets((currentPresets) =>
      pickGenerationTopicPresetBatch({
        currentTopic: topic,
        previousKeys: currentPresets.map((preset) => preset.key)
      })
    );
    if (manual) {
      onAction("已刷新推荐选题。");
    }
  }, [topic, onAction]);

  const handlePlatformChange = useCallback((nextPlatform: MobilePlatform) => {
    setPlatform(nextPlatform);
    clearMobileSourceEvidence();
    onAction(nextPlatform === "xiaohongshu" ? "已切换到小红书生成。" : "已切换到抖音生成。");
  }, [onAction, clearMobileSourceEvidence]);

  const handleContentModeChange = useCallback((nextMode: "short" | "xiaohongshu") => {
    setContentMode(nextMode);
    onAction(nextMode === "xiaohongshu" ? "已切换到小红书图文版式。" : "已切换到短段正文版式。");
  }, [onAction]);

  const handleTagsChange = useCallback((value: string) => {
    setTagsText(value);
    clearMobileSourceEvidence();
  }, [clearMobileSourceEvidence]);

  const {
    percent: heroProgressPercent,
    label: heroProgressLabel,
    value: heroProgressValue
  } = useMemo(
    () => buildMobileHeroProgressState(busy, progress.progressPercent, progress.progressLabel, generatedContentMatchesCurrentInputs),
    [busy, progress.progressPercent, progress.progressLabel, generatedContentMatchesCurrentInputs]
  );

  const enterProject = useCallback((projectId: MobileCreationProjectId) => {
    const project = findEnabledMobileCreationProject(projectId);
    if (!project) {
      onAction("这个项目还在规划中，暂时不能进入。");
      return;
    }
    setSelectedProjectId(project.id);
    onAction(`已进入${project.title}，可以开始生成图文和封面。`);
  }, [onAction]);

  const returnToProjects = useCallback(() => {
    setSelectedProjectId(null);
    onAction("已返回创作项目卡片。");
  }, [onAction]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    draftHistory.deleteSelectedDraftHistoryItems(selectedDraftItemsRef.current);
  }, [draftHistory.deleteSelectedDraftHistoryItems]);

  const handlePinToggle = useCallback(() => {
    const items = selectedDraftItemsRef.current;
    const item = items[0] ?? null;
    if (items.length === 1 && item) {
      draftHistory.toggleDraftPin(item);
    }
  }, [draftHistory.toggleDraftPin]);

  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const regenerateImageAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      regenerateImageAbortRef.current?.abort();
    };
  }, []);
  const handleRegenerateImage = useCallback(async () => {
    const contentId = generatedContent?.id;
    if (!contentId || regeneratingImage) return;
    setRegeneratingImage(true);
    onAction("正在重新生成封面图……");
    regenerateImageAbortRef.current?.abort();
    const controller = new AbortController();
    regenerateImageAbortRef.current = controller;
    try {
      const coverStyleNotes = buildMobileCoverStyleNotes(platform, topic);
      const imageResponse = await fetch(`${apiBase}/image/generate`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify(
          buildMobileCoverImageRequestPayload(platform, contentId, coverStyleNotes)
        ),
        signal: controller.signal
      });
      if (!imageResponse.ok) {
        throw new Error(
          `封面图重新生成失败：${await readApiError(imageResponse, "封面图生成失败。")}`
        );
      }
      const rawCover: unknown = await imageResponse.json();
      if (!isGeneratedImageAsset(rawCover)) {
        throw new Error("服务返回的封面图数据格式不正确。");
      }
      if (!activeRef.current) return;
      setGeneratedCover(rawCover);
      saveStoredMobileCover(rawCover);
      if (generatedContent) {
        draftHistory.syncDraftIntoHistory(generatedContent, rawCover);
      }
      onAction("封面图已重新生成。");
    } catch (error) {
      if (controller.signal.aborted || !activeRef.current) return;
      onAction(error instanceof Error ? error.message : "封面图重新生成失败。");
    } finally {
      if (activeRef.current) {
        setRegeneratingImage(false);
      }
    }
  }, [generatedContent, regeneratingImage, platform, topic, apiBase, credentials, onAction, draftHistory.syncDraftIntoHistory]);

  const refreshPresetsRef = useRef(refreshMobileTopicPresets);
  refreshPresetsRef.current = refreshMobileTopicPresets;

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshPresetsRef.current();
    }, TOPIC_PRESET_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.isSecureContext || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/opc-mobile-sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    return addMobileBackHandler(() => {
      if (!active) {
        return false;
      }
      if (previewOpen) {
        setPreviewOpen(false);
        onAction("已关闭草稿预览。");
        return true;
      }
      if (draftHistory.selectedDraftIds.length > 0) {
        draftHistory.cancelDraftSelection();
        onAction("已退出草稿多选。");
        return true;
      }
      if (selectedProjectId) {
        setSelectedProjectId(null);
        onAction("已返回创作项目卡片。");
        return true;
      }
      return false;
    });
  }, [active, onAction, previewOpen, draftHistory.selectedDraftIds.length, selectedProjectId]);

  // Auto-load source preview when knowledge query changes (topic selection)
  const autoPreviewRef = useRef(generationApi.previewMobileSourceContext);
  autoPreviewRef.current = generationApi.previewMobileSourceContext;
  useEffect(() => {
    if (!generationKnowledgeQuery.trim()) return;
    const timer = window.setTimeout(() => {
      void autoPreviewRef.current();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [generationKnowledgeQuery]);

  if (!selectedProject) {
    return (
      <MobileCreationProjectGateway
        draftCount={draftHistory.draftHistory.length}
        onSelect={enterProject}
        todayDraftCount={draftHistory.todayDraftCount}
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="mobile-create-project-detail">
      <button
        className="flex h-12 w-full touch-manipulation items-center justify-between rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-black text-ink shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
        data-testid="mobile-return-projects"
        onClick={returnToProjects}
        type="button"
      >
        <span className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          返回项目
        </span>
        <span className="text-xs text-muted">{selectedProject.title}</span>
      </button>
      <HeroSection
        heroProgressPercent={heroProgressPercent}
        heroProgressLabel={heroProgressLabel}
        heroProgressValue={heroProgressValue}
      />
      <FormPanel
        topic={topic}
        onTopicChange={updateMobileTopicAndAutoContext}
        visibleTopicPresets={visibleTopicPresets}
        onRefreshPresets={refreshMobileTopicPresets}
        onApplyPreset={applyMobileTopicPreset}
        sourcePreviewError={sourcePreviewError}
        sourcePreviewBusy={sourcePreviewBusy}
        onPreviewSource={generationApi.previewMobileSourceContext}
        visibleMobileSourceContext={visibleMobileSourceContext}
        generationKnowledgeQuery={generationKnowledgeQuery}
        targetAudience={targetAudience}
        onTargetAudienceChange={setTargetAudience}
        platform={platform}
        onPlatformChange={handlePlatformChange}
        contentMode={contentMode}
        onContentModeChange={handleContentModeChange}
        tagsText={tagsText}
        onTagsChange={handleTagsChange}
        busy={busy}
        progressLabel={progress.progressLabel}
        progressPercent={progress.progressPercent}
        sourceEvidenceBlocked={sourceEvidenceBlocked}
        generatedContentMatchesCurrentInputs={generatedContentMatchesCurrentInputs}
        mobileGenerateDraftDisabled={mobileGenerateDraftDisabled}
        onGenerate={generationApi.generateDraftAndCover}
        staleMobileDraftMessage={staleMobileDraftMessage}
      />
      <DraftHistorySection
        activeContentId={generatedContentMatchesCurrentInputs ? generatedContent?.id ?? null : null}
        error={draftHistory.draftHistoryError}
        items={draftHistory.draftHistory}
        onLongPress={draftHistory.beginDraftSelection}
        onOpen={draftHistory.openOrToggleDraftHistoryItem}
        onRetry={draftHistory.retryMobileDraftHistory}
        onToggleSelection={draftHistory.toggleDraftSelection}
        selectedDraftIds={draftHistory.selectedDraftIds}
        selectionMode={draftHistory.selectionMode}
        onCancelSelection={draftHistory.cancelDraftSelection}
        onDeleteSelected={handleDeleteSelected}
        onPinToggle={handlePinToggle}
        selectedCount={draftHistory.selectedDraftItems.length}
        selectedItem={draftHistory.selectedDraftItems.length === 1 ? draftHistory.selectedDraftItems[0] : null}
        previewOpen={previewOpen}
        coverImageUrl={coverImageUrl}
        draft={draftPreview}
        generatedContent={generatedContent}
        onDraftChange={setDraftPreview}
        onPreviewClose={handleClosePreview}
        onCopy={generationApi.copyDraft}
        onExportStatus={onAction}
        onRegenerateImage={handleRegenerateImage}
      />
    </div>
  );
});
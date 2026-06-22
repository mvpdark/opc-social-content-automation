"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import {
  MobileCreationProjectGateway,
  findEnabledMobileCreationProject,
  type MobileCreationProjectId
} from "@/components/mobile-creation-project-gateway";
import { resolveAssetUrl } from "@/lib/asset-url";
import { addMobileBackHandler } from "@/lib/mobile-back-navigation";
import {
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
import { type DraftPreviewState } from "@/lib/mobile-draft-storage";
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
import { type CredentialSettings, type MobilePlatform } from "@/lib/mobile-runtime";

import { useDraftHistory } from "./mobile-create/use-draft-history";
import { useCoverHydration } from "./mobile-create/use-cover-hydration";
import { useProgressCompletion } from "./mobile-create/use-progress-completion";
import { useGenerationApi } from "./mobile-create/use-generation-api";
import { HeroSection } from "./mobile-create/hero-section";
import { FormPanel } from "./mobile-create/form-panel";
import { DraftHistorySection } from "./mobile-create/draft-history-section";

export function CreateScreen({
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
  const [draftPreview, setDraftPreview] = useState<DraftPreviewState>(defaultMobileDraftPreview);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  useCoverHydration({
    apiBase,
    platform,
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

  const coverImageUrl = generatedCover ? resolveAssetUrl(generatedCover.image_url) : null;
  const selectedProject = findEnabledMobileCreationProject(selectedProjectId);
  const selectedTopicPreset = findGenerationTopicPresetByTopic(topic);
  const generationKnowledgeQuery = selectedTopicPreset?.knowledgeQuery ?? topic;
  const sourceEvidenceRequired = generationTopicRequiresSourceEvidence({
    knowledgeQuery: generationKnowledgeQuery,
    preset: selectedTopicPreset,
    tags: tagsText,
    topic
  });
  const currentMobileGenerationInputSignature = buildGenerationInputSignature({
    knowledgeQuery: generationKnowledgeQuery,
    platform,
    tagsText,
    targetAudience,
    tone: contentMode === "xiaohongshu" ? xhsMobileDraftTone : shortPostDraftTone,
    topic
  });
  const generatedContentMatchesCurrentInputs = Boolean(
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
  );
  const staleMobileDraftMessage = buildStaleMobileDraftMessage(
    generatedContent,
    generatedContentMatchesCurrentInputs,
    topic
  );
  const matchingMobileSourceContext = sourceContextMatchesKnowledgeQuery(sourceContext, generationKnowledgeQuery)
    ? sourceContext
    : null;
  const matchingMobileGeneratedSourceContext =
    generatedContentMatchesCurrentInputs &&
    sourceContextMatchesKnowledgeQuery(generatedContent?.source_context, generationKnowledgeQuery)
      ? generatedContent?.source_context ?? null
      : null;
  const visibleMobileSourceContext =
    matchingMobileSourceContext ?? matchingMobileGeneratedSourceContext;
  const sourceEvidenceBlocked =
    sourceEvidenceRequired && Boolean(sourcePreviewError) && !visibleMobileSourceContext;
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

  function clearMobileSourceEvidence() {
    setSourceContext(null);
    setSourcePreviewError(null);
  }

  function updateMobileTopicAndAutoContext(nextTopic: string) {
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
  }

  function applyMobileTopicPreset(preset: GenerationTopicPreset) {
    setTopic(preset.topic);
    setTargetAudience(preset.audience);
    setTagsText(preset.tags);
    clearMobileSourceEvidence();
    onAction(`已套用推荐选题：${preset.topic}`);
  }

  function refreshMobileTopicPresets(manual = false) {
    setVisibleTopicPresets((currentPresets) =>
      pickGenerationTopicPresetBatch({
        currentTopic: topic,
        previousKeys: currentPresets.map((preset) => preset.key)
      })
    );
    if (manual) {
      onAction("已刷新推荐选题。");
    }
  }

  function handlePlatformChange(nextPlatform: MobilePlatform) {
    setPlatform(nextPlatform);
    clearMobileSourceEvidence();
    onAction(nextPlatform === "xiaohongshu" ? "已切换到小红书生成。" : "已切换到抖音生成。");
  }

  function handleContentModeChange(nextMode: "short" | "xiaohongshu") {
    setContentMode(nextMode);
    onAction(nextMode === "xiaohongshu" ? "已切换到小红书图文版式。" : "已切换到短段正文版式。");
  }

  function handleTagsChange(value: string) {
    setTagsText(value);
    clearMobileSourceEvidence();
  }

  const {
    percent: heroProgressPercent,
    label: heroProgressLabel,
    value: heroProgressValue
  } = buildMobileHeroProgressState(busy, progress.progressPercent, progress.progressLabel, generatedContentMatchesCurrentInputs);

  function enterProject(projectId: MobileCreationProjectId) {
    const project = findEnabledMobileCreationProject(projectId);
    if (!project) {
      onAction("这个项目还在规划中，暂时不能进入。");
      return;
    }
    setSelectedProjectId(project.id);
    onAction(`已进入${project.title}，可以开始生成图文和封面。`);
  }

  function returnToProjects() {
    setSelectedProjectId(null);
    onAction("已返回创作项目卡片。");
  }

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshMobileTopicPresets();
    }, TOPIC_PRESET_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [topic]);

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
        onDeleteSelected={() => draftHistory.deleteSelectedDraftHistoryItems(draftHistory.selectedDraftItems)}
        onPinToggle={() => {
          const item = draftHistory.selectedDraftItems[0] ?? null;
          if (draftHistory.selectedDraftItems.length === 1 && item) {
            draftHistory.toggleDraftPin(item);
          }
        }}
        selectedCount={draftHistory.selectedDraftItems.length}
        selectedItem={draftHistory.selectedDraftItems.length === 1 ? draftHistory.selectedDraftItems[0] : null}
        previewOpen={previewOpen}
        coverImageUrl={coverImageUrl}
        draft={draftPreview}
        generatedContent={generatedContent}
        onDraftChange={setDraftPreview}
        onPreviewClose={() => setPreviewOpen(false)}
        onCopy={generationApi.copyDraft}
        onExportStatus={onAction}
      />
    </div>
  );
}

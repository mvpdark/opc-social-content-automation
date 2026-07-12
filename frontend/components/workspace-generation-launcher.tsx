"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Image,
  PenLine,
  Search,
  ShieldCheck
} from "lucide-react";
import { type PlatformId } from "@/components/platform-icon";
import {
  isGeneratedContent,
  isGeneratedImageAsset,
  isGenerationSourceContextResponse,
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
import {
  formatDraftGenerationErrorMessage,
  isServiceCredentialError,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import { generatedContentLifecycleWarning } from "@/lib/status-labels";
import { parseTagText, tagsMatchText } from "@/lib/tags";
import {
  TOPIC_PRESET_REFRESH_MS,
  buildCustomTopicAudience,
  buildCustomTopicTags,
  buildTopicCoverStyleNotes,
  findGenerationTopicPresetByTopic,
  generationTopicRequiresSourceEvidence,
  isKnownGenerationTopicAudience,
  isKnownGenerationTopicKnowledgeQuery,
  isKnownGenerationTopicTags,
  pickGenerationTopicPresetBatch,
  type GenerationTopicPreset
} from "@/lib/topic-presets";
import {
  API_BASE,
  buildGenerationTone,
  buildWritingTone,
  defaultExpressionOptions,
  defaultGenerationKnowledgeQuery,
  defaultGenerationTagsText,
  defaultGenerationTargetAudience,
  douyinHighAttractionCoverStyle,
  hasLiveImageProvider,
  isTestDraft,
  normalizeRewriteServiceMessage,
  readApiError,
  xhsHighAttractionCoverStyle,
  type ExpressionOptionKey,
  type WritingStylePresetId
} from "./workspace-utils";
import { Panel, Pill } from "./workspace-ui";
import { GenerationFormFields } from "./workspace-generation-form";
import { LauncherHeroSection } from "./workspace-launcher-hero-section";
import { LauncherPreviewColumn } from "./workspace-launcher-preview-column";
import { LauncherStatusPanel } from "./workspace-launcher-status-panel";
import { buildAuthHeaders, useLauncherProviderStatus } from "@/lib/use-launcher-provider-status";

export const GenerationLauncher = memo(function GenerationLauncher({
  defaultWritingStyle,
  latestImageAsset,
  latestContent,
  onGeneratedContent,
  onImageGenerated,
  onOpenSettings,
  workspaceToken
}: {
  defaultWritingStyle: WritingStylePresetId;
  latestImageAsset: GeneratedImageAsset | null;
  latestContent: GeneratedContent | null;
  onGeneratedContent: (content: GeneratedContent) => void;
  onImageGenerated: (asset: GeneratedImageAsset) => void;
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [platform, setPlatform] = useState<"xiaohongshu" | "douyin">("xiaohongshu");
  const [topic, setTopic] = useState("硕升博申请第一步，不是先套磁");
  const [knowledgeQuery, setKnowledgeQuery] = useState(defaultGenerationKnowledgeQuery);
  const [targetAudience, setTargetAudience] = useState(defaultGenerationTargetAudience);
  const [visibleTopicPresets, setVisibleTopicPresets] = useState<GenerationTopicPreset[]>(() =>
    pickGenerationTopicPresetBatch()
  );
  const [stylePreset, setStylePreset] = useState<WritingStylePresetId>(defaultWritingStyle);
  const [styleOptions, setStyleOptions] =
    useState<Record<ExpressionOptionKey, boolean>>(defaultExpressionOptions);
  const [tone, setTone] = useState(() =>
    buildWritingTone(defaultWritingStyle, defaultExpressionOptions)
  );
  const [tagsText, setTagsText] = useState(defaultGenerationTagsText);
  const [busyAction, setBusyAction] = useState<"draft" | null>(null);
  const [statusText, setStatusText] = useState("当前选题已就绪，点击“一键生成图文+封面”。");
  const [lastContent, setLastContent] = useState<GeneratedContent | null>(null);
  const [lastContentInputSignature, setLastContentInputSignature] =
    useState<GeneratedContentInputSignature | null>(null);
  const {
    providerStatusError,
    draftCheckStatus,
    draftCheckBusy,
    needsProviderSettings,
    setNeedsProviderSettings,
    draftProviderMissing,
    draftProviderCheckFailed,
    draftProviderBlocked,
    providerDisplayItems,
    liveImageProviderReady,
    rewriteProviderReady,
    refreshProviderStatuses,
    checkDraftProvider
  } = useLauncherProviderStatus(workspaceToken, setStatusText);
  const [sourceContext, setSourceContext] = useState<GenerationSourceContext | null>(null);
  const [sourcePreviewBusy, setSourcePreviewBusy] = useState(false);
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(null);

  const selectedPlatform: PlatformId = platform === "douyin" ? "douyin" : "xiaohongshu";
  const selectedTopicPreset = useMemo(() => findGenerationTopicPresetByTopic(topic), [topic]);
  const hasTopic = topic.trim().length > 0;
  const generationTone = useMemo(() => buildGenerationTone(tone, platform, styleOptions), [tone, platform, styleOptions]);
  const currentGenerationInputSignature = useMemo(() => buildGenerationInputSignature({
    knowledgeQuery,
    platform: selectedPlatform,
    tagsText,
    targetAudience,
    tone: generationTone,
    topic
  }), [knowledgeQuery, selectedPlatform, tagsText, targetAudience, generationTone, topic]);
  const coverDirectionPreviewLabel = selectedTopicPreset?.desktopLabel ?? (hasTopic ? "自定义" : "待选择");
  const coverDirectionPreview = selectedTopicPreset?.coverDirection ?? (
    hasTopic
      ? "自定义选题会使用当前平台基础封面风格；生成前请在预览里确认标题、封面方向和标签是否一致。"
      : "选择推荐选题后，会在这里预览封面方向；自定义选题也会保留人工确认。"
  );
  const previewTags = useMemo(
    () => tagsText.split(/[，,\s]+/).filter(Boolean).slice(0, 4),
    [tagsText]
  );
  const sourceEvidenceRequired = useMemo(() => generationTopicRequiresSourceEvidence({
    knowledgeQuery,
    preset: selectedTopicPreset,
    tags: tagsText,
    topic
  }), [knowledgeQuery, selectedTopicPreset, tagsText, topic]);
  const exportContent = lastContent ?? latestContent;
  const currentExportContent = contentMatchesCurrentInputs(lastContent)
    ? lastContent
    : contentMatchesCurrentInputs(latestContent)
      ? latestContent
      : null;
  const exportContentMatchesCurrentInputs = Boolean(currentExportContent);
  const mismatchedExportContent = exportContent && !currentExportContent ? exportContent : null;
  const mismatchedExportContentMessage = mismatchedExportContent
    ? mismatchedExportContent.title === topic.trim()
      ? "当前已有草稿的标签或检索依据和表单不一致，复制前请重新生成或重新选择对应草稿。"
      : `当前已有草稿标题是“${mismatchedExportContent.title}”，不是当前选题“${topic.trim()}”，复制前请重新生成。`
    : null;
  const matchingSourceContext = sourceContextMatchesKnowledgeQuery(sourceContext, knowledgeQuery)
    ? sourceContext
    : null;
  const matchingExportSourceContext =
    currentExportContent &&
    sourceContextMatchesKnowledgeQuery(currentExportContent.source_context, knowledgeQuery)
      ? currentExportContent.source_context ?? null
      : null;
  const visibleSourceContext =
    matchingSourceContext ?? matchingExportSourceContext;
  const sourceEvidenceBlocked =
    sourceEvidenceRequired && Boolean(sourcePreviewError) && !visibleSourceContext;
  const canGenerate = hasTopic && busyAction === null && !draftProviderBlocked && !sourceEvidenceBlocked;
  const generateButtonLabel = !hasTopic
      ? "先填写选题"
      : draftProviderMissing
        ? "先配置撰稿服务"
      : draftProviderCheckFailed
        ? "先修复撰稿服务"
      : sourceEvidenceBlocked
        ? "先重新查看依据"
      : "一键生成图文+封面";
  const generateButtonTitle = !hasTopic
      ? "先填写选题，再一键生成图文和封面"
      : draftProviderMissing
        ? "去设置里填写并应用撰稿服务授权"
      : draftProviderCheckFailed
        ? "检测到撰稿服务不可用，请先去设置页更换或重新应用服务授权"
      : sourceEvidenceBlocked
        ? "检索依据读取失败，请先重新查看依据后再生成"
      : undefined;
  const launchStatusText = !hasTopic
      ? "先填写选题，再一键生成图文和封面。"
      : draftProviderMissing
        ? "撰稿服务缺少服务授权，先去设置页填写并应用。"
      : draftProviderCheckFailed
        ? draftCheckStatus?.message ?? "撰稿服务检测未通过，请先去设置页修复。"
      : sourceEvidenceBlocked
        ? "检索依据读取失败，请先重新查看依据后再生成。"
      : statusText;
  const primaryGenerateLabel =
    busyAction === "draft"
      ? "正在一键生成"
      : exportContentMatchesCurrentInputs
        ? "重新一键生成"
        : generateButtonLabel;
  const launcherChecklist = useMemo(() => [
    {
      detail: hasTopic ? "已填写" : "待填写",
      icon: Search,
      label: "选题",
      tone: hasTopic ? "green" : "amber"
    },
    {
      detail: draftProviderBlocked ? "需检查" : "可启动",
      icon: PenLine,
      label: "撰稿",
      tone: draftProviderBlocked ? "red" : "blue"
    },
    {
      detail: liveImageProviderReady ? "可生成" : "待检测",
      icon: Image,
      label: "封面",
      tone: liveImageProviderReady ? "green" : "amber"
    },
    {
      detail: "手动确认",
      icon: ShieldCheck,
      label: "发布",
      tone: "amber"
    }
  ] as const, [hasTopic, draftProviderBlocked, liveImageProviderReady]);
  const panelAction = useMemo(() => (
    <Pill
      tone={exportContentMatchesCurrentInputs ? "green" : exportContent ? "amber" : "blue"}
    >
      {exportContentMatchesCurrentInputs ? "当前草稿" : exportContent ? "历史草稿" : "主入口"}
    </Pill>
  ), [exportContentMatchesCurrentInputs, exportContent]);

  useEffect(() => {
    setStylePreset(defaultWritingStyle);
    setStyleOptions(defaultExpressionOptions);
    setTone(buildWritingTone(defaultWritingStyle, defaultExpressionOptions));
  }, [defaultWritingStyle]);

  useEffect(() => {
    if (
      latestContent?.source_context &&
      latestContent.title === topic.trim() &&
      latestContent.platform === selectedPlatform
    ) {
      setSourceContext(latestContent.source_context);
    }
  }, [
    latestContent?.id,
    latestContent?.platform,
    latestContent?.source_context,
    latestContent?.title,
    selectedPlatform,
    topic
  ]);

  const clearSourceEvidence = useCallback(() => {
    setSourceContext(null);
    setSourcePreviewError(null);
  }, []);

  const applyStylePreset = useCallback((nextPreset: WritingStylePresetId) => {
    setStylePreset(nextPreset);
    setTone(buildWritingTone(nextPreset, styleOptions));
  }, [styleOptions]);

  const toggleStyleOption = useCallback((optionKey: ExpressionOptionKey) => {
    const nextOptions = {
      ...styleOptions,
      [optionKey]: !styleOptions[optionKey]
    };
    setStyleOptions(nextOptions);
    setTone(buildWritingTone(stylePreset, nextOptions));
  }, [stylePreset, styleOptions]);

  const updateTopicAndAutoKnowledgeQuery = useCallback((nextTopic: string) => {
    const previousTopic = topic.trim();
    const previousTopicPreset = findGenerationTopicPresetByTopic(previousTopic);
    const nextTopicText = nextTopic.trim();
    const nextTopicPreset = findGenerationTopicPresetByTopic(nextTopicText);
    setTopic(nextTopic);
    setKnowledgeQuery((currentQuery) => {
      const normalizedQuery = currentQuery.trim();
      const shouldSyncQuery =
        !normalizedQuery ||
        normalizedQuery === previousTopic ||
        normalizedQuery === defaultGenerationKnowledgeQuery ||
        isKnownGenerationTopicKnowledgeQuery(normalizedQuery);
      return nextTopicPreset
        ? nextTopicPreset.knowledgeQuery
        : shouldSyncQuery
          ? nextTopicText
          : currentQuery;
    });
    setTargetAudience((currentAudience) => {
      const normalizedAudience = currentAudience.trim();
      const shouldSyncAudience =
        !normalizedAudience ||
        normalizedAudience === defaultGenerationTargetAudience ||
        normalizedAudience === buildCustomTopicAudience(previousTopic) ||
        isKnownGenerationTopicAudience(normalizedAudience);
      return nextTopicPreset
        ? nextTopicPreset.audience
        : shouldSyncAudience
          ? buildCustomTopicAudience(nextTopicText) || defaultGenerationTargetAudience
          : currentAudience;
    });
    setTagsText((currentTags) => {
      const normalizedTags = currentTags.trim();
      const shouldSyncTags =
        !normalizedTags ||
        normalizedTags === previousTopic ||
        normalizedTags === defaultGenerationTagsText ||
        isKnownGenerationTopicTags(normalizedTags);
      return nextTopicPreset
        ? nextTopicPreset.tags
        : shouldSyncTags
          ? buildCustomTopicTags(nextTopicText) || defaultGenerationTagsText
          : currentTags;
    });
    clearSourceEvidence();
    if (nextTopicPreset) {
      setStatusText(`已识别推荐选题：${nextTopicPreset.topic}`);
    } else if (previousTopicPreset && nextTopicText) {
      setStatusText(`已切换为自定义选题：${nextTopicText}`);
    }
  }, [topic, clearSourceEvidence]);

  const applyTopicPreset = useCallback((preset: GenerationTopicPreset) => {
    setTopic(preset.topic);
    setKnowledgeQuery(preset.knowledgeQuery);
    setTargetAudience(preset.audience);
    setTagsText(preset.tags);
    clearSourceEvidence();
    setStatusText(`已套用推荐选题：${preset.topic}`);
  }, [clearSourceEvidence]);

  const refreshTopicPresets = useCallback((manual = false) => {
    setVisibleTopicPresets((currentPresets) =>
      pickGenerationTopicPresetBatch({
        currentTopic: topic,
        previousKeys: currentPresets.map((preset) => preset.key)
      })
    );
    if (manual) {
      setStatusText("已刷新推荐选题。");
    }
  }, [topic]);

  const handlePlatformChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const v = event.target.value;
    setPlatform(v === "douyin" ? "douyin" : "xiaohongshu");
    clearSourceEvidence();
  }, [clearSourceEvidence]);

  const handleTopicChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    updateTopicAndAutoKnowledgeQuery(event.target.value);
  }, [updateTopicAndAutoKnowledgeQuery]);

  const handleRefreshTopicPresets = useCallback(() => {
    refreshTopicPresets(true);
  }, [refreshTopicPresets]);

  const handleKnowledgeQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setKnowledgeQuery(event.target.value);
    clearSourceEvidence();
  }, [clearSourceEvidence]);

  const handleTargetAudienceChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTargetAudience(event.target.value);
  }, []);

  const handleToneChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setTone(event.target.value);
  }, []);

  const handleTagsTextChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTagsText(event.target.value);
    clearSourceEvidence();
  }, [clearSourceEvidence]);

  const refreshTopicPresetsRef = useRef(refreshTopicPresets);
  refreshTopicPresetsRef.current = refreshTopicPresets;

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshTopicPresetsRef.current();
    }, TOPIC_PRESET_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, []);

  function contentMatchesCurrentInputs(
    content: GeneratedContent | null | undefined
  ): content is GeneratedContent {
    return Boolean(
      content &&
        content.title === topic.trim() &&
        content.platform === selectedPlatform &&
        tagsMatchText(content.tags, tagsText) &&
        sourceContextMatchesKnowledgeQuery(content.source_context, knowledgeQuery) &&
        generatedContentInputSignatureMatches(
          content.id,
          lastContentInputSignature,
          currentGenerationInputSignature
        )
    );
  }

  const buildGenerationRequestPayload = useCallback(() => {
    return {
      platform,
      topic: topic.trim(),
      knowledge_query: knowledgeQuery.trim() || undefined,
      tone: generationTone,
      target_audience: targetAudience.trim() || undefined,
      knowledge_limit: 5,
      tags: parseTagText(tagsText)
    };
  }, [platform, topic, knowledgeQuery, generationTone, targetAudience, tagsText]);

  const previewAbortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(true);

  const previewSourceContext = useCallback(async () => {
    if (!topic.trim()) {
      setSourcePreviewError("先填写选题，再查看检索依据。");
      return;
    }

    setSourcePreviewBusy(true);
    setSourcePreviewError(null);
    setStatusText("正在检索知识库和联网来源，稍等一下。");
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;
    try {
      const response = await fetch(`${API_BASE}/content/source-preview`, {
        method: "POST",
        headers: buildAuthHeaders(workspaceToken),
        body: JSON.stringify(buildGenerationRequestPayload()),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "检索依据读取失败。"));
      }
      const raw = await response.json();
      if (!isGenerationSourceContextResponse(raw)) throw new Error("检索依据数据格式异常。");
      if (!activeRef.current) return;
      setSourceContext(raw.source_context ?? null);
      setStatusText("检索依据已加载，请先人工核对来源，再决定是否一键生成。");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "检索依据读取失败。"
      );
      setSourceContext(null);
      setSourcePreviewError(message);
      setStatusText(message);
    } finally {
      if (!controller.signal.aborted) {
        setSourcePreviewBusy(false);
      }
    }
  }, [topic, workspaceToken, platform, knowledgeQuery, generationTone, targetAudience, tagsText, buildGenerationRequestPayload]);

  const genControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      genControllerRef.current?.abort();
      previewAbortRef.current?.abort();
    };
  }, []);

  async function generateDraft() {
    if (busyAction !== null) return;
    if (!topic.trim()) {
      setStatusText("先填写选题，再一键生成图文和封面。");
      return;
    }
    if (sourceEvidenceBlocked) {
      setStatusText("检索依据读取失败，请先重新查看依据后再生成。");
      return;
    }

    setBusyAction("draft");
    setNeedsProviderSettings(false);
    setStatusText("正在一键生成：先撰稿，再改写，最后生成封面图。");
    genControllerRef.current?.abort();
    const genController = new AbortController();
    genControllerRef.current = genController;
    try {
      const requestPayload = buildGenerationRequestPayload();
      const requestSignature = buildGenerationInputSignature({
        knowledgeQuery: requestPayload.knowledge_query,
        platform: requestPayload.platform,
        tagsText,
        targetAudience: requestPayload.target_audience,
        tone: requestPayload.tone,
        topic: requestPayload.topic
      });
      const response = await fetch(`${API_BASE}/content/generate`, {
        method: "POST",
        headers: buildAuthHeaders(workspaceToken),
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
      setSourceContext(data.source_context ?? null);
      setSourcePreviewError(null);
      setLastContent(data);
      setLastContentInputSignature({ contentId: data.id, signature: requestSignature });
      onGeneratedContent(data);
      setNeedsProviderSettings(false);
      const lifecycleWarning = generatedContentLifecycleWarning(data.status);
      if (lifecycleWarning) {
        setStatusText(lifecycleWarning);
        return;
      }
      let finalContent = data;
      let rewriteWarning: string | null = null;
      if (!rewriteProviderReady) {
        rewriteWarning = "改写服务未配置或尚未确认，本次未走改写服务。";
        setStatusText(
          "文案草稿已生成。改写服务未配置或尚未确认，本次未走改写服务，正在尝试生成封面图。"
        );
      } else {
        setStatusText("文案草稿已生成，正在调用改写服务做口吻润色。");
        try {
          const rewriteResponse = await fetch(`${API_BASE}/content/rewrite`, {
            method: "POST",
            headers: buildAuthHeaders(workspaceToken),
            body: JSON.stringify({
              content_id: data.id,
              instruction:
                "按当前选题和风格做口吻润色，保留事实边界、关键词、标签语境和合规限制，不制造录取承诺。"
            }),
            signal: genController.signal
          });
          if (!activeRef.current) return;
          if (!rewriteResponse.ok) {
            throw new Error(await readApiError(rewriteResponse, "改写服务处理失败。"));
          }
          const rawRewritten: unknown = await rewriteResponse.json();
          if (!activeRef.current) return;
          if (!isGeneratedContent(rawRewritten)) {
            throw new Error("改写服务返回的数据格式不正确。");
          }
          const rewrittenContent = rawRewritten;
          finalContent = rewrittenContent;
          setSourceContext(rewrittenContent.source_context ?? data.source_context ?? null);
          setLastContent(rewrittenContent);
          setLastContentInputSignature({
            contentId: rewrittenContent.id,
            signature: requestSignature
          });
          onGeneratedContent(rewrittenContent);
          setStatusText("文案已完成口吻润色，正在生成封面图。");
        } catch (rewriteError) {
          if (rewriteError instanceof Error && rewriteError.name === "AbortError") return;
          const rawRewriteMessage =
            rewriteError instanceof Error ? rewriteError.message : "改写服务处理失败。";
          const rewriteMessage = normalizeRewriteServiceMessage(rawRewriteMessage);
          setNeedsProviderSettings(
            rawRewriteMessage.includes("DeepSeek") ||
              rawRewriteMessage.includes("授权失败") ||
              isServiceCredentialError(rawRewriteMessage)
          );
          rewriteWarning = `改写服务未完成：${rewriteMessage}`;
          setStatusText(
            `文案草稿已生成，但改写服务未完成：${rewriteMessage} 正在尝试用当前草稿生成封面图。`
          );
        }
      }

      if (isTestDraft(finalContent)) {
        setStatusText(
          "这是本地检查草稿，不会生成封面图。请配置真实撰稿服务后再一键生成。"
        );
        return;
      }

      try {
        await generateCoverForContent(finalContent, requestPayload.topic, genController.signal);
        if (!activeRef.current) return;
        const completionMessage = rewriteWarning
          ? `文案和封面图已生成，但${rewriteWarning}预览确认后即可复制文案。`
          : "文案和封面图已一键生成。预览确认后即可复制文案。";
        setStatusText(completionMessage);
      } catch (coverError) {
        if (coverError instanceof Error && coverError.name === "AbortError") return;
        const coverMessage =
          coverError instanceof Error ? coverError.message : "封面图生成失败。";
        setNeedsProviderSettings(
          coverMessage.includes("图片服务") ||
            coverMessage.includes("授权失败") ||
            isServiceCredentialError(coverMessage) ||
            coverMessage.includes("image")
        );
        setStatusText(`文案已生成，但封面图未完成：${sanitizeServiceErrorMessage(coverMessage)}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const rawMessage = error instanceof Error ? error.message : "图文草稿生成失败。";
      const message = formatDraftGenerationErrorMessage(rawMessage);
      setNeedsProviderSettings(
        rawMessage.includes("授权失败") ||
          rawMessage.includes("模型") ||
          rawMessage.includes("接口") ||
          isServiceCredentialError(rawMessage)
      );
      setStatusText(message);
    } finally {
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }

  async function generateCoverForContent(content: GeneratedContent, coverTopic = content.title, signal?: AbortSignal) {
    const isDouyinPost = content.platform === "douyin";
    const refreshedStatuses = liveImageProviderReady ? null : await refreshProviderStatuses();
    if (!activeRef.current) return;
    const refreshedImageProviderReady =
      liveImageProviderReady || hasLiveImageProvider(refreshedStatuses ?? []);
    if (!refreshedImageProviderReady) {
      throw new Error("图片服务还没有完成可用性检查，请先到设置页应用图片服务授权。");
    }

    const coverStyleNotes = buildTopicCoverStyleNotes(
      isDouyinPost ? douyinHighAttractionCoverStyle : xhsHighAttractionCoverStyle,
      coverTopic
    );

    const response = await fetch(`${API_BASE}/image/generate`, {
      method: "POST",
      headers: buildAuthHeaders(workspaceToken),
      body: JSON.stringify({
        aspect_ratio: isDouyinPost ? "9:16" : "3:4",
        content_id: content.id,
        style_notes: coverStyleNotes,
        template: isDouyinPost ? "douyin-cover" : "xiaohongshu-cover"
      }),
      signal
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "封面图生成失败。"));
    }
    const rawCover: unknown = await response.json();
    if (!activeRef.current) return;
    if (!isGeneratedImageAsset(rawCover)) {
      throw new Error("服务返回的封面图数据格式不正确。");
    }
    const cover = rawCover;
    onImageGenerated(cover);
    return cover;
  }

  const generateDraftRef = useRef(generateDraft);
  generateDraftRef.current = generateDraft;
  const handleGenerate = useCallback(() => {
    void generateDraftRef.current();
  }, []);

  return (
    <div data-testid="generation-launcher">
      <Panel
        action={panelAction}
        helper="一键生成会生成文案并尝试生成封面，不会自动发布；发布前仍需人工确认。"
        title="一键生成图文+封面"
      >
        <LauncherHeroSection
          busyAction={busyAction}
          canGenerate={canGenerate}
          exportContentMatchesCurrentInputs={exportContentMatchesCurrentInputs}
          generateButtonTitle={generateButtonTitle}
          hasExportContent={Boolean(exportContent)}
          launcherChecklist={launcherChecklist}
          onGenerate={handleGenerate}
          primaryGenerateLabel={primaryGenerateLabel}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(360px,0.95fr)_320px_minmax(360px,1.05fr)]">
          <GenerationFormFields
            coverDirectionPreview={coverDirectionPreview}
            coverDirectionPreviewLabel={coverDirectionPreviewLabel}
            knowledgeQuery={knowledgeQuery}
            onApplyStylePreset={applyStylePreset}
            onApplyTopicPreset={applyTopicPreset}
            onKnowledgeQueryChange={handleKnowledgeQueryChange}
            onOpenSettings={onOpenSettings}
            onPlatformChange={handlePlatformChange}
            onRefreshTopicPresets={handleRefreshTopicPresets}
            onTargetAudienceChange={handleTargetAudienceChange}
            onToggleStyleOption={toggleStyleOption}
            onTopicChange={handleTopicChange}
            onToneChange={handleToneChange}
            platform={platform}
            selectedTopicPresetKey={selectedTopicPreset?.key}
            styleOptions={styleOptions}
            stylePreset={stylePreset}
            tagsText={tagsText}
            targetAudience={targetAudience}
            tone={tone}
            topic={topic}
            visibleTopicPresets={visibleTopicPresets}
            onTagsTextChange={handleTagsTextChange}
            workspaceToken={workspaceToken}
          />

          <LauncherStatusPanel
            busyAction={busyAction}
            draftCheckBusy={draftCheckBusy}
            draftCheckStatus={draftCheckStatus}
            launchStatusText={launchStatusText}
            mismatchedExportContentMessage={mismatchedExportContentMessage}
            needsProviderSettings={needsProviderSettings}
            onCheckDraftProvider={checkDraftProvider}
            onOpenSettings={onOpenSettings}
            providerDisplayItems={providerDisplayItems}
            providerStatusError={providerStatusError}
          />
          <LauncherPreviewColumn
            coverDirectionPreview={coverDirectionPreview}
            currentExportContent={currentExportContent}
            evidenceDisabled={!hasTopic || busyAction !== null}
            generationBusy={busyAction !== null}
            imageProviderReady={liveImageProviderReady}
            knowledgeQuery={knowledgeQuery}
            latestImageAsset={latestImageAsset}
            onImageGenerated={onImageGenerated}
            onOpenSettings={onOpenSettings}
            onPreview={previewSourceContext}
            onRefreshProviderStatuses={refreshProviderStatuses}
            previewTags={previewTags}
            sourcePreviewBusy={sourcePreviewBusy}
            sourcePreviewError={sourcePreviewError}
            topic={topic}
            visibleSourceContext={visibleSourceContext}
            workspaceToken={workspaceToken}
          />
        </div>
      </Panel>
    </div>
  );
});

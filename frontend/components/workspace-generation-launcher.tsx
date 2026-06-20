"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Image,
  Loader2,
  PenLine,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck
} from "lucide-react";
import { GenerationSourceEvidenceCard } from "@/components/generation-source-evidence-card";
import { PlatformLabel, type PlatformId } from "@/components/platform-icon";
import { type ProviderStatusItem } from "@/lib/provider-settings";
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
import {
  formatDraftGenerationErrorMessage,
  isServiceCredentialError,
  SERVICE_CONFIG_READ_ERROR,
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
  expressionOptions,
  fetchProviderStatuses,
  formControlClass,
  hasLiveImageProvider,
  isTestDraft,
  normalizeRewriteServiceMessage,
  readApiError,
  secondaryButtonClass,
  subtleCardClass,
  xhsHighAttractionCoverStyle,
  type ExpressionOptionKey,
  type ProviderCheckResult,
  type WritingStylePresetId,
  writingStylePresets
} from "./workspace-utils";
import { IconBox, Panel, Pill } from "./workspace-ui";
import { GeneratedPostExportCard } from "./workspace-generation-export-card";

export function GenerationLauncher({
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
  const [platform, setPlatform] = useState("xiaohongshu");
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
  const [needsProviderSettings, setNeedsProviderSettings] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [draftCheckStatus, setDraftCheckStatus] = useState<ProviderCheckResult | null>(null);
  const [draftCheckBusy, setDraftCheckBusy] = useState(false);
  const [sourceContext, setSourceContext] = useState<GenerationSourceContext | null>(null);
  const [sourcePreviewBusy, setSourcePreviewBusy] = useState(false);
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(null);

  const selectedPlatform: PlatformId = platform === "douyin" ? "douyin" : "xiaohongshu";
  const selectedTopicPreset = findGenerationTopicPresetByTopic(topic);
  const hasTopic = topic.trim().length > 0;
  const generationTone = buildGenerationTone(tone, platform, styleOptions);
  const currentGenerationInputSignature = buildGenerationInputSignature({
    knowledgeQuery,
    platform: selectedPlatform,
    tagsText,
    targetAudience,
    tone: generationTone,
    topic
  });
  const coverDirectionPreviewLabel = selectedTopicPreset?.desktopLabel ?? (hasTopic ? "自定义" : "待选择");
  const coverDirectionPreview = selectedTopicPreset?.coverDirection ?? (
    hasTopic
      ? "自定义选题会使用当前平台基础封面风格；生成前请在预览里确认标题、封面方向和标签是否一致。"
      : "选择推荐选题后，会在这里预览封面方向；自定义选题也会保留人工确认。"
  );
  const draftProviderStatus = providerStatuses.find((item) => item.name === "Draft generation");
  const draftProviderMissing = Boolean(providerStatuses.length && !draftProviderStatus?.configured);
  const draftProviderCheckFailed = Boolean(
    draftCheckStatus && draftCheckStatus.status !== "ok"
  );
  const draftProviderBlocked = draftProviderMissing || draftProviderCheckFailed;
  const sourceEvidenceRequired = generationTopicRequiresSourceEvidence({
    knowledgeQuery,
    preset: selectedTopicPreset,
    tags: tagsText,
    topic
  });
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
  const providerDisplayItems = [
    { label: "撰稿", name: "Draft generation" },
    { label: "改写", name: "Humanization rewrite" },
    { label: "图片", name: "Image generation" }
  ].map((item) => ({
    ...item,
    status: providerStatuses.find((statusItem) => statusItem.name === item.name)
  }));
  const rewriteProviderStatus = providerStatuses.find(
    (item) => item.name === "Humanization rewrite"
  );
  const liveImageProviderReady = hasLiveImageProvider(providerStatuses);
  const rewriteProviderReady = Boolean(rewriteProviderStatus?.configured);
  const launcherChecklist = [
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
  ] as const;

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
    };
  }

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

  async function refreshProviderStatuses() {
    try {
      const data = await fetchProviderStatuses();
      setProviderStatuses(data);
      setProviderStatusError(null);
      return data;
    } catch (error) {
      setProviderStatusError(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
      );
      return null;
    }
  }

  useEffect(() => {
    let active = true;

    async function loadProviderStatuses() {
      try {
        const data = await fetchProviderStatuses();
        if (active) {
          setProviderStatuses(data);
          setProviderStatusError(null);
        }
      } catch (error) {
        if (active) {
          setProviderStatusError(
            sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
          );
        }
      }
    }

    void loadProviderStatuses();
    return () => {
      active = false;
    };
  }, []);

  async function checkDraftProviderFromLauncher() {
    setDraftCheckBusy(true);
    setDraftCheckStatus(null);
    setStatusText("正在检测撰稿服务连接。");
    try {
      const response = await fetch(`${API_BASE}/workspace/provider-check`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ target: "draft" })
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("服务检测暂时不可用，请重新打开应用后再试。");
        }
        throw new Error(await readApiError(response, "撰稿服务检测失败。"));
      }
      const data = (await response.json()) as ProviderCheckResult;
      const displayData = { ...data, message: sanitizeServiceErrorMessage(data.message) };
      setDraftCheckStatus(displayData);
      setNeedsProviderSettings(displayData.status !== "ok");
      setStatusText(
        displayData.status === "ok"
          ? displayData.message
          : `检测未通过：${displayData.message}`
      );
    } catch (error) {
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "撰稿服务检测失败。"
      );
      setDraftCheckStatus({
        configured: false,
        message,
        status: "failed",
        target: "draft"
      });
      setNeedsProviderSettings(true);
      setStatusText(message);
    } finally {
      setDraftCheckBusy(false);
    }
  }

  function applyStylePreset(nextPreset: WritingStylePresetId) {
    setStylePreset(nextPreset);
    setTone(buildWritingTone(nextPreset, styleOptions));
  }

  function toggleStyleOption(optionKey: ExpressionOptionKey) {
    setStyleOptions((currentOptions) => {
      const nextOptions = {
        ...currentOptions,
        [optionKey]: !currentOptions[optionKey]
      };
      setTone(buildWritingTone(stylePreset, nextOptions));
      return nextOptions;
    });
  }

  function clearSourceEvidence() {
    setSourceContext(null);
    setSourcePreviewError(null);
  }

  function updateTopicAndAutoKnowledgeQuery(nextTopic: string) {
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
  }

  function applyTopicPreset(preset: GenerationTopicPreset) {
    setTopic(preset.topic);
    setKnowledgeQuery(preset.knowledgeQuery);
    setTargetAudience(preset.audience);
    setTagsText(preset.tags);
    clearSourceEvidence();
    setStatusText(`已套用推荐选题：${preset.topic}`);
  }

  function refreshTopicPresets(manual = false) {
    setVisibleTopicPresets((currentPresets) =>
      pickGenerationTopicPresetBatch({
        currentTopic: topic,
        previousKeys: currentPresets.map((preset) => preset.key)
      })
    );
    if (manual) {
      setStatusText("已刷新推荐选题。");
    }
  }

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshTopicPresets();
    }, TOPIC_PRESET_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [topic]);

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

  function buildGenerationRequestPayload() {
    return {
      platform,
      topic: topic.trim(),
      knowledge_query: knowledgeQuery.trim() || undefined,
      tone: generationTone,
      target_audience: targetAudience.trim() || undefined,
      knowledge_limit: 5,
      tags: parseTagText(tagsText)
    };
  }

  async function previewSourceContext() {
    if (!topic.trim()) {
      setSourcePreviewError("先填写选题，再查看检索依据。");
      return;
    }

    setSourcePreviewBusy(true);
    setSourcePreviewError(null);
    setStatusText("正在检索知识库和联网来源，稍等一下。");
    try {
      const response = await fetch(`${API_BASE}/content/source-preview`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildGenerationRequestPayload())
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "检索依据读取失败。"));
      }
      const data = (await response.json()) as { source_context?: GenerationSourceContext };
      setSourceContext(data.source_context ?? null);
      setStatusText("检索依据已加载，请先人工核对来源，再决定是否一键生成。");
    } catch (error) {
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "检索依据读取失败。"
      );
      setSourceContext(null);
      setSourcePreviewError(message);
      setStatusText(message);
    } finally {
      setSourcePreviewBusy(false);
    }
  }

  async function generateDraft() {
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
        headers: authHeaders(),
        body: JSON.stringify(requestPayload)
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "图文草稿生成失败。"));
      }
      const data = (await response.json()) as GeneratedContent;
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
            headers: authHeaders(),
            body: JSON.stringify({
              content_id: data.id,
              instruction:
                "按当前选题和风格做口吻润色，保留事实边界、关键词、标签语境和合规限制，不制造录取承诺。"
            })
          });
          if (!rewriteResponse.ok) {
            throw new Error(await readApiError(rewriteResponse, "改写服务处理失败。"));
          }
          const rewrittenContent = (await rewriteResponse.json()) as GeneratedContent;
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
        await generateCoverForContent(finalContent, requestPayload.topic);
        const completionMessage = rewriteWarning
          ? `文案和封面图已生成，但${rewriteWarning}预览确认后即可复制文案。`
          : "文案和封面图已一键生成。预览确认后即可复制文案。";
        setStatusText(completionMessage);
      } catch (coverError) {
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
      setBusyAction(null);
    }
  }

  async function generateCoverForContent(content: GeneratedContent, coverTopic = content.title) {
    const isDouyinPost = content.platform === "douyin";
    const refreshedStatuses = liveImageProviderReady ? null : await refreshProviderStatuses();
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
      headers: authHeaders(),
      body: JSON.stringify({
        aspect_ratio: isDouyinPost ? "9:16" : "3:4",
        content_id: content.id,
        style_notes: coverStyleNotes,
        template: isDouyinPost ? "douyin-cover" : "xiaohongshu-cover"
      })
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "封面图生成失败。"));
    }
    const cover = (await response.json()) as GeneratedImageAsset;
    onImageGenerated(cover);
    return cover;
  }

  return (
    <div data-testid="generation-launcher">
      <Panel
        action={
          <Pill
            tone={exportContentMatchesCurrentInputs ? "green" : exportContent ? "amber" : "blue"}
          >
            {exportContentMatchesCurrentInputs ? "当前草稿" : exportContent ? "历史草稿" : "主入口"}
          </Pill>
        }
        helper="一键生成会生成文案并尝试生成封面，不会自动发布；发布前仍需人工确认。"
        title="一键生成图文+封面"
      >
        <div className="mb-5 overflow-hidden rounded-md border border-line/80 bg-paper/60 p-4 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.52)] lg:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] xl:items-center">
            <div>
              <Pill
                tone={exportContentMatchesCurrentInputs ? "green" : exportContent ? "amber" : "blue"}
              >
                {exportContentMatchesCurrentInputs ? "当前草稿" : exportContent ? "历史草稿" : "生产入口"}
              </Pill>
              <h3 className="mt-3 text-xl font-black leading-7 text-ink">
                选题确认后，点这里一键生成
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                当前会生成一篇营销图文草稿，自动改写并尝试生成封面图；知识依据、标签和封面方向会跟随当前选题，不会自动发布。
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {launcherChecklist.map((item) => (
                  <div
                    className="rounded-[18px] border border-line/70 bg-paper/58 px-3 py-3"
                    key={`launcher-checklist-${item.label}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <IconBox tone={item.tone}>
                        <item.icon className="h-4 w-4" />
                      </IconBox>
                      <span className="text-[11px] font-semibold text-muted">{item.detail}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-ink">{item.label}</div>
                  </div>
                ))}
              </div>
              <button
                aria-label={primaryGenerateLabel}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-moss px-5 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                data-flow="one-click-generate"
                data-testid="start-production-button"
                disabled={!canGenerate}
                onClick={generateDraft}
                title={generateButtonTitle}
                type="button"
              >
                {busyAction === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PenLine className="h-4 w-4" />
                )}
                {primaryGenerateLabel}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(360px,0.95fr)_320px_minmax(360px,1.05fr)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
                <span>平台</span>
                <PlatformLabel
                  className="font-semibold text-ink"
                  iconSize="sm"
                  platform={selectedPlatform}
                  suffix="图文"
                />
              </span>
              <select
                className={`${formControlClass} h-10`}
                value={platform}
                onChange={(event) => {
                  setPlatform(event.target.value);
                  clearSourceEvidence();
                }}
              >
                <option value="xiaohongshu">小红书图文</option>
                <option value="douyin">抖音图文</option>
              </select>
            </label>
            <div className={`${subtleCardClass} px-3 py-2`}>
              <div className="text-xs font-medium text-muted">访问保护</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {workspaceToken ? "访问保护已开启" : "未开启"}
                </span>
                <button
                  aria-label="打开设置查看访问保护"
                  className="glass-control rounded-md border px-2 py-1 text-xs font-medium text-ink"
                  onClick={onOpenSettings}
                  type="button"
                >
                  打开设置
                </button>
              </div>
            </div>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-muted">选题</span>
              <input
                className={`${formControlClass} h-10`}
                data-testid="content-topic"
                onChange={(event) => {
                  updateTopicAndAutoKnowledgeQuery(event.target.value);
                }}
                placeholder="输入要生成的图文主题"
                value={topic}
              />
            </label>
            <div className="md:col-span-2" data-testid="topic-preset-list">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">推荐选题</span>
                <button
                  className="flex h-8 items-center gap-1 rounded-md border border-line bg-paper/70 px-2 text-[11px] font-semibold text-moss transition hover:border-moss/60 hover:bg-moss/10"
                  data-testid="topic-preset-refresh"
                  onClick={() => refreshTopicPresets(true)}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  换一批
                </button>
              </div>
              <div className="mt-1 text-[11px] text-muted">每 45 秒自动换一批，也可以直接修改为自定义选题</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {visibleTopicPresets.map((preset) => {
                  const selected = selectedTopicPreset?.key === preset.key;
                  return (
                    <button
                      aria-pressed={selected}
                      className={[
                        "min-h-[94px] rounded-[16px] border px-3 py-2.5 text-left transition hover:translate-y-[-1px]",
                        selected
                          ? "border-moss/70 bg-moss/10 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.44)]"
                          : "border-steel/35 bg-paper/70 hover:border-moss/60 hover:bg-moss/10"
                      ].join(" ")}
                      data-testid={`topic-preset-${preset.key}`}
                      key={preset.key}
                      onClick={() => applyTopicPreset(preset)}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-moss">
                          {preset.desktopLabel}
                        </span>
                        {selected ? (
                          <span className="rounded-full bg-moss/15 px-2 py-0.5 text-[10px] font-semibold text-moss">
                            当前
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-ink">
                        {preset.topic}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-muted">
                        {preset.desktopHelper}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted">知识检索词</span>
              <input
                aria-label="知识检索词"
                className={`${formControlClass} h-10`}
                data-testid="content-knowledge-query"
                onChange={(event) => {
                  setKnowledgeQuery(event.target.value);
                  clearSourceEvidence();
                }}
                value={knowledgeQuery}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">目标人群</span>
              <input
                aria-label="目标人群"
                className={`${formControlClass} h-10`}
                data-testid="content-target-audience"
                onChange={(event) => setTargetAudience(event.target.value)}
                value={targetAudience}
              />
            </label>
            <div
              className="md:col-span-2 rounded-md border border-moss/25 bg-moss/10 px-3 py-2.5"
              data-testid="content-cover-direction-preview"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted">封面方向</span>
                <span
                  className="shrink-0 rounded-full bg-paper/70 px-2 py-0.5 text-[10px] font-semibold text-moss"
                  data-testid="content-cover-direction-type"
                >
                  {coverDirectionPreviewLabel}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink">{coverDirectionPreview}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-medium text-muted">撰稿风格</span>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {writingStylePresets.map((preset) => {
                  const selected = stylePreset === preset.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-20 rounded-md border px-3 py-2 text-left transition ${
                        selected
                          ? "border-coral bg-coral/10 text-ink"
                          : "glass-control text-ink hover:border-coral/50"
                      }`}
                      key={preset.id}
                      onClick={() => applyStylePreset(preset.id)}
                      type="button"
                    >
                      <span className="block text-sm font-semibold">{preset.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {preset.helper}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs font-medium text-muted">表达增强</span>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-5">
                {expressionOptions.map((option) => {
                  const enabled = styleOptions[option.key];
                  return (
                    <button
                      aria-checked={enabled}
                      className={`flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 text-left text-xs font-medium transition ${
                        enabled
                          ? "border-moss bg-moss/10 text-ink"
                          : "glass-control text-muted"
                      }`}
                      key={option.key}
                      onClick={() => toggleStyleOption(option.key)}
                      role="switch"
                      type="button"
                    >
                      <span>{option.label}</span>
                      <span>{enabled ? "开" : "关"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block md:col-span-2">
              <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
                <span>风格要求</span>
                <span>{tone.length}/420</span>
              </span>
              <textarea
                aria-label="风格要求"
                className={`${formControlClass} min-h-24 resize-y py-2 leading-6`}
                data-testid="content-style-notes"
                maxLength={420}
                onChange={(event) => setTone(event.target.value)}
                value={tone}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-muted">标签</span>
              <input
                aria-label="标签"
                className={`${formControlClass} h-10`}
                data-testid="content-tags"
                onChange={(event) => {
                  setTagsText(event.target.value);
                  clearSourceEvidence();
                }}
                value={tagsText}
              />
            </label>
          </div>

          <div className={`${subtleCardClass} p-4`}>
            <div className="text-sm font-semibold">启动状态</div>
            <p className="mt-2 text-sm leading-6 text-muted">{launchStatusText}</p>
            {mismatchedExportContentMessage ? (
              <div
                className="mt-3 rounded-md border border-amber/40 bg-amber/10 p-3 text-xs leading-5 text-ink"
                data-testid="stale-draft-warning"
              >
                {mismatchedExportContentMessage}
              </div>
            ) : null}
            <div className="mt-4 rounded-md border border-line bg-mist/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-ink">服务配置检测</div>
                <span className="text-[11px] text-muted">填写后仍建议检测一次</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {providerStatusError ? (
                  <Pill tone="red">检测失败</Pill>
                ) : providerDisplayItems.some((item) => item.status) ? (
                  providerDisplayItems.map((item, index) => {
                    const isDraft = item.name === "Draft generation";
                    const configured = Boolean(item.status?.configured);
                    const tone = needsProviderSettings && isDraft ? "red" : configured ? "green" : "amber";
                    const label =
                      needsProviderSettings && isDraft
                        ? "授权需检查"
                        : configured
                          ? "已填写"
                          : "未填写";
                    return (
                      <Pill key={`provider-status-${index}-${item.name}`} tone={tone}>
                        {item.label} {label}
                      </Pill>
                    );
                  })
                ) : (
                  <Pill tone="neutral">读取中</Pill>
                )}
              </div>
              {providerStatusError ? (
                <p className="mt-2 text-xs leading-5 text-muted">{providerStatusError}</p>
              ) : null}
              {draftCheckStatus ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  {draftCheckStatus.status === "ok"
                    ? draftCheckStatus.message
                    : `检测未通过：${draftCheckStatus.message}`}
                </p>
              ) : null}
              <button
                aria-label="检测撰稿连接"
                className={`${secondaryButtonClass} mt-3 h-9 w-full disabled:cursor-not-allowed disabled:opacity-60`}
                data-testid="draft-provider-check-button"
                disabled={draftCheckBusy || busyAction !== null}
                onClick={checkDraftProviderFromLauncher}
                type="button"
              >
                {draftCheckBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {draftCheckBusy ? "正在检测" : "检测撰稿连接"}
              </button>
            </div>
            {needsProviderSettings ? (
              <button
                className={`${secondaryButtonClass} mt-4 h-10 w-full`}
                onClick={onOpenSettings}
                type="button"
              >
                <Settings className="h-4 w-4" />
                去设置检查撰稿服务授权
              </button>
            ) : null}
            <div className="mt-4 border-l-4 border-amber pl-3 text-xs leading-5 text-muted">
              一键生成会按顺序处理文案、改写和封面；最终发布仍保持人工确认，不会自动发布。
            </div>
          </div>
          <div className="space-y-4">
            <GenerationSourceEvidenceCard
              disabled={!hasTopic || busyAction !== null}
              error={sourcePreviewError}
              fallbackKnowledgeQuery={knowledgeQuery}
              onPreview={previewSourceContext}
              previewBusy={sourcePreviewBusy}
              sourceContext={visibleSourceContext}
            />
            {currentExportContent ? (
              <GeneratedPostExportCard
                key={currentExportContent.id}
                content={currentExportContent}
                generatedImageAsset={latestImageAsset}
                generationBusy={busyAction !== null}
                imageProviderReady={liveImageProviderReady}
                onImageGenerated={onImageGenerated}
                onOpenSettings={onOpenSettings}
                onRefreshProviderStatuses={refreshProviderStatuses}
                workspaceToken={workspaceToken}
              />
            ) : (
              <div className={`${subtleCardClass} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-ink">小红书内容预览</div>
                  <Pill tone="neutral">待生成</Pill>
                </div>
                <div className="mt-4 overflow-hidden rounded-md border border-line bg-paper/70">
                  <div className="relative aspect-[3/4] bg-[linear-gradient(145deg,rgb(var(--moss)/0.18),rgb(var(--paper))_45%,rgb(var(--amber)/0.16))] p-4">
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="mb-3 h-1.5 w-12 rounded-full bg-moss" />
                      <div className="line-clamp-4 text-2xl font-black leading-tight text-ink">
                        {topic || "选择主题后一键生成"}
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-semibold text-muted">封面方向</div>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-ink">
                      {coverDirectionPreview}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-steel">
                      {tagsText
                        .split(/[，,\s]+/)
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((tag) => (
                          <span key={`preview-tag-${tag}`}>#{tag.replace(/^#/, "")}</span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

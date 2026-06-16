"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { PlatformIcon, PlatformLabel } from "@/components/platform-icon";
import {
  MobileCreationProjectGateway,
  findEnabledMobileCreationProject,
  type MobileCreationProjectId
} from "@/components/mobile-creation-project-gateway";
import { MobileSourceEvidencePanel } from "@/components/mobile-source-evidence-panel";
import {
  DraftHistoryCarousel,
  DraftHistorySelectionBar,
  countMobileDraftsToday
} from "@/components/mobile-draft-history";
import { DraftPreviewEditor } from "@/components/mobile-draft-preview-editor";
import { MobilePanel, ModeChip } from "@/components/mobile-ui";
import { resolveAssetUrl } from "@/lib/asset-url";
import { addMobileBackHandler } from "@/lib/mobile-back-navigation";
import { copyText } from "@/lib/clipboard";
import {
  isGeneratedContent,
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
import {
  formatDraftGenerationErrorMessage,
  sanitizeServiceErrorMessage
} from "@/lib/service-error-copy";
import { formatTagLine, parseTagText, tagsMatchText } from "@/lib/tags";
import {
  buildEditableDraftCopy,
  clearStoredMobileContent,
  clearStoredMobileCover,
  filterDeletedMobileDraftHistory,
  normalizeMobileDraftHistory,
  readStoredDeletedDraftIds,
  readStoredMobileContent,
  readStoredMobileCover,
  readStoredMobileDraftHistory,
  rememberDeletedDraftId,
  saveStoredMobileContent,
  saveStoredMobileCover,
  saveStoredMobileDraftHistory,
  type DraftPreviewState,
  type MobileDraftHistoryItem
} from "@/lib/mobile-draft-storage";
import {
  TOPIC_PRESET_REFRESH_MS,
  buildCustomTopicAudience,
  buildCustomTopicTags,
  buildTopicCoverStyleNotes,
  findGenerationTopicPresetByTopic,
  generationTopicRequiresSourceEvidence,
  isKnownGenerationTopicAudience,
  isKnownGenerationTopicTags,
  pickGenerationTopicPresetBatch,
  type GenerationTopicPreset
} from "@/lib/topic-presets";
import { authHeaders, readApiError, type CredentialSettings, type MobilePlatform } from "@/lib/mobile-runtime";

const MOBILE_COVER_HYDRATION_RETRY_LIMIT = 10;
const MOBILE_COVER_HYDRATION_RETRY_MS = 3000;
const MOBILE_CREATE_CARD_BG = "/mobile-assets/create-card-bg.png";

const defaultMobileDraftPreview: DraftPreviewState = {
  body:
    "很多人一上来就急着群发邮件，但研究方向、读博动机和导师匹配没想清楚，反而容易浪费第一印象。",
  points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
  tags: "#硕升博 #博士申请 #研究方向",
  title: "不是先套磁，先想清楚这 3 件事"
};

const xhsMobileDraftTone = [
  "小红书女性向图文风格，像学姐认真提醒，温柔、轻松、真实、有陪伴感，不要像官方说明文",
  "开头必须有共鸣和反常识冲突，前三行要有停留感",
  "正文必须把 emoji 当成结构标识使用，不是随便撒表情：👉💧 用于开头钩子，👇 用于引出分类，📍 用于路线小节，🔥 用于优点/条件模块，✅ 用于卖点清单，🎓 用于专业池，😎 用于问答判断段，💓 用于申请条件或温柔引导",
  "路线/榜单/资料型图文必须出现 5-9 个结构 emoji，并保持每 2-4 段就有一个视觉锚点",
  "可以额外自然加入 1-3 个小红书表情字符码或轻量颜文字，优先 [笑哭R]、[哭惹R]、[哇R]、[赞R]、[doge]、[蹲后续H]，但不能只靠表情字符码代替结构 emoji",
  "允许使用 ～、！！、？、…… 和短括号吐槽制造口语节奏与表情包感，例如（先别急）（真的别反着来）（会很亏）",
  "自然提高口语语气词密度，在开头、转折和提醒处穿插哦、哟、呀、啊、嘛、呢、啦、哈等，但不要每句都堆",
  "可以少量使用姐妹、宝子、uu、学妹等女性向社媒称呼，但保持专业可信",
  "结尾用温柔提醒或轻引导，不制造焦虑，不承诺录取或导师回复结果"
].join("；");

const shortPostDraftTone =
  "短段正文风格，表达克制、清楚、有行动建议，不制造录取承诺。";

const defaultMobileTargetAudience = "准备硕升博申请的学生";
const defaultMobileTagsText = "硕升博,水博,博士申请,小红书获客";

function draftStateFromContent(content: GeneratedContent): DraftPreviewState {
  return {
    body: content.body,
    points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
    tags: formatTagLine(content.tags),
    title: content.title
  };
}

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
  const [draftHistory, setDraftHistory] = useState<MobileDraftHistoryItem[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<number[]>([]);
  const [draftPreview, setDraftPreview] = useState<DraftPreviewState>(defaultMobileDraftPreview);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("准备中");
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressCeilingRef = useRef(88);
  const progressLabelRef = useRef("准备中");
  const lastProgressActionRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const completionSoundReadyRef = useRef(false);
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
  const staleMobileDraftMessage =
    generatedContent && !generatedContentMatchesCurrentInputs
      ? generatedContent.title === topic.trim()
        ? "当前草稿的检索依据或标签已不是当前输入，复制前请重新生成。"
        : `当前已打开草稿是“${generatedContent.title}”，不是当前选题“${topic.trim()}”，复制前请重新生成。`
      : null;
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
  const todayDraftCount = countMobileDraftsToday(draftHistory);
  const selectedDraftIdSet = new Set(selectedDraftIds);
  const selectedDraftItems = draftHistory.filter((item) => selectedDraftIdSet.has(item.content.id));
  const selectionMode = selectedDraftIds.length > 0;

  function normalizeVisibleDraftHistory(nextItems: MobileDraftHistoryItem[]) {
    return filterDeletedMobileDraftHistory(normalizeMobileDraftHistory(nextItems));
  }

  function persistDraftHistory(nextItems: MobileDraftHistoryItem[]) {
    const normalized = normalizeVisibleDraftHistory(nextItems);
    setDraftHistory(normalized);
    saveStoredMobileDraftHistory(normalized);
    return normalized;
  }

  function syncDraftIntoHistory(content: GeneratedContent, cover: GeneratedImageAsset | null) {
    const savedAt = content.created_at ?? new Date().toISOString();
    let normalized: MobileDraftHistoryItem[] = [];
    setDraftHistory((currentItems) => {
      normalized = normalizeVisibleDraftHistory([
        {
          content,
          cover,
          pinned: false,
          saved_at: savedAt
        },
        ...currentItems
      ]);
      saveStoredMobileDraftHistory(normalized);
      return normalized;
    });
    return normalized;
  }

  function selectDraftHistoryItem(item: MobileDraftHistoryItem) {
    setGeneratedContent(item.content);
    setSourceContext(item.content.source_context ?? null);
    setDraftPreview(draftStateFromContent(item.content));
    saveStoredMobileContent(item.content);
    if (item.cover) {
      setGeneratedCover(item.cover);
      saveStoredMobileCover(item.cover);
    } else {
      setGeneratedCover(null);
      clearStoredMobileCover();
    }
    setPreviewOpen(true);
    onAction(`已打开草稿：${item.content.title}`);
  }

  function toggleDraftSelection(item: MobileDraftHistoryItem) {
    setSelectedDraftIds((currentIds) =>
      currentIds.includes(item.content.id)
        ? currentIds.filter((contentId) => contentId !== item.content.id)
        : [...currentIds, item.content.id]
    );
  }

  function beginDraftSelection(item: MobileDraftHistoryItem) {
    setSelectedDraftIds((currentIds) =>
      currentIds.includes(item.content.id) ? currentIds : [...currentIds, item.content.id]
    );
    onAction("已进入草稿多选模式。");
  }

  function openOrToggleDraftHistoryItem(item: MobileDraftHistoryItem) {
    if (selectionMode) {
      toggleDraftSelection(item);
      return;
    }
    selectDraftHistoryItem(item);
  }

  function cancelDraftSelection() {
    setSelectedDraftIds([]);
    onAction("已退出草稿多选模式。");
  }

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

  function toggleDraftPin(item: MobileDraftHistoryItem) {
    persistDraftHistory(
      draftHistory.map((draftItem) =>
        draftItem.content.id === item.content.id
          ? { ...draftItem, pinned: !draftItem.pinned, saved_at: new Date().toISOString() }
          : draftItem
      )
    );
    setSelectedDraftIds([]);
    onAction(item.pinned ? "已取消置顶草稿。" : "已置顶草稿。");
  }

  function applyDeletedDraftsToCurrentPreview(
    deletedIds: Set<number>,
    nextItems: MobileDraftHistoryItem[]
  ) {
    if (generatedContent && deletedIds.has(generatedContent.id)) {
      const nextItem = nextItems[0] ?? null;
      if (nextItem) {
        setGeneratedContent(nextItem.content);
        setSourceContext(nextItem.content.source_context ?? null);
        setDraftPreview(draftStateFromContent(nextItem.content));
        saveStoredMobileContent(nextItem.content);
        if (nextItem.cover) {
          setGeneratedCover(nextItem.cover);
          saveStoredMobileCover(nextItem.cover);
        } else {
          setGeneratedCover(null);
          clearStoredMobileCover();
        }
      } else {
        setGeneratedContent(null);
        setGeneratedCover(null);
        setSourceContext(null);
        setDraftPreview(defaultMobileDraftPreview);
        clearStoredMobileContent();
        clearStoredMobileCover();
        setPreviewOpen(false);
      }
    }
  }

  async function deleteSelectedDraftHistoryItems(items: MobileDraftHistoryItem[]) {
    if (!items.length) {
      return;
    }

    const deletedIds: number[] = [];
    const failedIds: number[] = [];
    let failureMessage = "草稿删除失败，请稍后再试。";

    for (const item of items) {
      try {
        const response = await fetch(`${apiBase}/content/${item.content.id}`, {
          headers: authHeaders(credentials),
          method: "DELETE"
        });
        if (!response.ok && response.status !== 404) {
          throw new Error(await readApiError(response, failureMessage));
        }
        rememberDeletedDraftId(item.content.id);
        deletedIds.push(item.content.id);
      } catch (error) {
        failedIds.push(item.content.id);
        failureMessage = error instanceof Error ? error.message : failureMessage;
      }
    }

    if (deletedIds.length) {
      const deletedIdSet = new Set(deletedIds);
      const nextItems = persistDraftHistory(
        draftHistory.filter((draftItem) => !deletedIdSet.has(draftItem.content.id))
      );
      applyDeletedDraftsToCurrentPreview(deletedIdSet, nextItems);
    }

    setSelectedDraftIds(failedIds);
    if (failedIds.length) {
      onAction(`已删除 ${deletedIds.length} 篇，${failedIds.length} 篇失败：${failureMessage}`);
      return;
    }
    onAction(`已删除 ${deletedIds.length} 篇草稿，刷新后也不会再出现。`);
  }

  useEffect(() => {
    const visibleDraftIds = new Set(draftHistory.map((item) => item.content.id));
    setSelectedDraftIds((currentIds) => {
      const nextIds = currentIds.filter((contentId) => visibleDraftIds.has(contentId));
      return nextIds.length === currentIds.length ? currentIds : nextIds;
    });
  }, [draftHistory]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshMobileTopicPresets();
    }, TOPIC_PRESET_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [topic]);

  useEffect(() => {
    let active = true;
    let coverHydrationRetryTimer: number | null = null;

    async function fetchLatestCover(contentId: number) {
      try {
        const response = await fetch(`${apiBase}/image/list?content_id=${contentId}&limit=1`);
        if (!response.ok) {
          return null;
        }

        const images: unknown = await response.json();
        if (!Array.isArray(images)) {
          return null;
        }

        return images.find(
          (image): image is GeneratedImageAsset =>
            isGeneratedImageAsset(image) && image.content_id === contentId
        ) ?? null;
      } catch (_error) {
        return null;
      }
    }

    function applyHistoryCover(latestCover: GeneratedImageAsset) {
      setDraftHistory((currentItems) => {
        const normalized = normalizeVisibleDraftHistory(
          currentItems.map((item) =>
            item.content.id === latestCover.content_id ? { ...item, cover: latestCover } : item
          )
        );
        saveStoredMobileDraftHistory(normalized);
        return normalized;
      });
    }

    async function loadLatestCover(contentId: number) {
      try {
        const latestCover = await fetchLatestCover(contentId);
        if (!active || !latestCover) {
          return;
        }
        const currentStoredContent = readStoredMobileContent();
        if (
          currentStoredContent?.id !== contentId ||
          readStoredDeletedDraftIds().has(contentId)
        ) {
          return;
        }
        setGeneratedCover(latestCover);
        saveStoredMobileCover(latestCover);
        applyHistoryCover(latestCover);
        onAction("已找回最近封面图。");
      } catch (_error) {
        // Keep the cached cover visible if the network check fails.
      }
    }

    function scheduleMissingCoverRetry(items: MobileDraftHistoryItem[], attempt: number) {
      if (!active || attempt >= MOBILE_COVER_HYDRATION_RETRY_LIMIT) {
        return;
      }

      if (coverHydrationRetryTimer !== null) {
        window.clearTimeout(coverHydrationRetryTimer);
      }

      coverHydrationRetryTimer = window.setTimeout(() => {
        coverHydrationRetryTimer = null;
        if (!active) {
          return;
        }

        const latestStoredHistory = readStoredMobileDraftHistory().filter(
          (item) => item.content.platform === platform
        );
        const retryItems = latestStoredHistory.length ? latestStoredHistory : items;
        void hydrateMissingHistoryCovers(retryItems, attempt + 1);
      }, MOBILE_COVER_HYDRATION_RETRY_MS);
    }

    async function hydrateMissingHistoryCovers(items: MobileDraftHistoryItem[], attempt = 0) {
      const missingCoverIds = items
        .filter((item) => !item.cover)
        .map((item) => item.content.id)
        .slice(0, 20);
      if (!missingCoverIds.length) {
        return;
      }

      const covers = (await Promise.all(missingCoverIds.map(fetchLatestCover))).filter(
        (cover): cover is GeneratedImageAsset => Boolean(cover)
      );
      if (!active) {
        return;
      }
      if (!covers.length) {
        scheduleMissingCoverRetry(items, attempt);
        return;
      }

      const coverByContentId = new Map(covers.map((cover) => [cover.content_id, cover]));
      const stillMissingCover = missingCoverIds.some((contentId) => !coverByContentId.has(contentId));
      setDraftHistory((currentItems) => {
        const normalized = normalizeVisibleDraftHistory(
          currentItems.map((item) => ({
            ...item,
            cover: item.cover ?? coverByContentId.get(item.content.id) ?? null
          }))
        );
        saveStoredMobileDraftHistory(normalized);
        return normalized;
      });

      setGeneratedCover((currentCover) => {
        if (currentCover) {
          return currentCover;
        }
        const storedContent = readStoredMobileContent();
        const visibleContentId = storedContent && !readStoredDeletedDraftIds().has(storedContent.id)
          ? storedContent.id
          : null;
        const recoveredCover = visibleContentId ? coverByContentId.get(visibleContentId) : null;
        if (recoveredCover) {
          saveStoredMobileCover(recoveredCover);
          return recoveredCover;
        }
        return currentCover;
      });

      if (stillMissingCover) {
        scheduleMissingCoverRetry(items, attempt);
      }
    }

    async function loadLatestContent() {
      try {
        const response = await fetch(`${apiBase}/content/list?platform=${platform}`);
        if (!response.ok) {
          return;
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          return;
        }

        const deletedDraftIds = readStoredDeletedDraftIds();
        const latestItems = data
          .filter(isGeneratedContent)
          .filter((content) => content.platform === platform)
          .filter((content) => !deletedDraftIds.has(content.id))
          .map((content) => ({
            content,
            cover: null,
            pinned: false,
            saved_at: content.created_at ?? new Date().toISOString()
          }));
        if (active && latestItems.length) {
          const storedCover = readStoredMobileCover();
          const currentHistory = readStoredMobileDraftHistory().filter(
            (item) => item.content.platform === platform
          );
          const normalized = normalizeVisibleDraftHistory([...currentHistory, ...latestItems]);
          const latestContent = normalized[0].content;
          const latestCover =
            normalized.find((item) => item.content.id === latestContent.id)?.cover ?? null;
          setGeneratedContent(latestContent);
          setSourceContext(latestContent.source_context ?? null);
          setDraftPreview(draftStateFromContent(latestContent));
          saveStoredMobileContent(latestContent);
          if (storedCover?.content_id === latestContent.id) {
            setGeneratedCover(storedCover);
            const nextHistory = normalizeVisibleDraftHistory(
              normalized.map((item) =>
                item.content.id === latestContent.id ? { ...item, cover: storedCover } : item
              )
            );
            setDraftHistory(nextHistory);
            saveStoredMobileDraftHistory(nextHistory);
          } else if (latestCover) {
            setGeneratedCover(latestCover);
            saveStoredMobileCover(latestCover);
            setDraftHistory(normalized);
            saveStoredMobileDraftHistory(normalized);
          } else {
            setGeneratedCover(null);
            setDraftHistory(normalized);
            saveStoredMobileDraftHistory(normalized);
          }
          void hydrateMissingHistoryCovers(normalized);
          void loadLatestCover(latestContent.id);
        }
      } catch (_error) {
        // The generate action below remains usable even if history cannot be loaded.
      }
    }

    const deletedDraftIds = readStoredDeletedDraftIds();
    const storedContent = readStoredMobileContent();
    const visibleStoredContent =
      storedContent && !deletedDraftIds.has(storedContent.id) ? storedContent : null;
    const storedCover = readStoredMobileCover();
    const storedHistory = readStoredMobileDraftHistory().filter(
      (item) => item.content.platform === platform
    );
    if (storedContent && !visibleStoredContent) {
      clearStoredMobileContent();
      clearStoredMobileCover();
    }
    if (visibleStoredContent?.platform === platform) {
      const normalized = normalizeVisibleDraftHistory([
        {
          content: visibleStoredContent,
          cover: storedCover?.content_id === visibleStoredContent.id ? storedCover : null,
          pinned: false,
          saved_at: visibleStoredContent.created_at ?? new Date().toISOString()
        },
        ...storedHistory
      ]);
      setDraftHistory(normalized);
      void hydrateMissingHistoryCovers(normalized);
    } else {
      setDraftHistory(storedHistory);
      void hydrateMissingHistoryCovers(storedHistory);
    }
    if (visibleStoredContent?.platform === platform) {
      setGeneratedContent(visibleStoredContent);
      setSourceContext(visibleStoredContent.source_context ?? null);
      setDraftPreview(draftStateFromContent(visibleStoredContent));
      setGeneratedCover(
        storedCover?.content_id === visibleStoredContent.id ? storedCover : null
      );
      void loadLatestCover(visibleStoredContent.id);
    } else {
      setGeneratedContent(null);
      setGeneratedCover(null);
      setSourceContext(null);
      setDraftPreview(defaultMobileDraftPreview);
    }

    void loadLatestContent();
    return () => {
      active = false;
      if (coverHydrationRetryTimer !== null) {
        window.clearTimeout(coverHydrationRetryTimer);
      }
    };
  }, [platform, onAction]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.isSecureContext || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/opc-mobile-sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!busy || progressPercent <= 0) {
      return;
    }

    const message = `${progressLabel}：${progressPercent}%，切换页面也会继续运行。`;
    if (lastProgressActionRef.current === message) {
      return;
    }

    lastProgressActionRef.current = message;
    onAction(message);
  }, [busy, onAction, progressLabel, progressPercent]);

  function stopProgressTimer() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function setProgressStage(label: string, floor: number, ceiling: number) {
    progressLabelRef.current = label;
    progressCeilingRef.current = ceiling;
    setProgressLabel(label);
    setProgressPercent((current) => Math.max(current, floor));
  }

  function startProgress(label: string) {
    stopProgressTimer();
    progressLabelRef.current = label;
    progressCeilingRef.current = 62;
    lastProgressActionRef.current = "";
    setProgressLabel(label);
    setProgressPercent(3);
    progressTimerRef.current = setInterval(() => {
      setProgressPercent((current) => {
        const ceiling = progressCeilingRef.current;
        if (current >= ceiling) {
          return current;
        }
        const step = current < 30 ? 4 : current < 65 ? 3 : 1;
        const next = Math.min(ceiling, current + step);
        return next;
      });
    }, 700);
  }

  function finishProgress(label: string) {
    stopProgressTimer();
    progressLabelRef.current = label;
    setProgressLabel(label);
    setProgressPercent(100);
  }

  function getCompletionAudioContext() {
    if (typeof window === "undefined") {
      return null;
    }

    if (audioContextRef.current?.state === "closed") {
      audioContextRef.current = null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    return audioContextRef.current;
  }

  function playAudioUnlockTick(context: AudioContext) {
    const now = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.0001, now);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.03);
  }

  function playCompletionChime(context: AudioContext) {
    const now = context.currentTime;
    const notes = [
      { delay: 0, duration: 0.14, frequency: 659.25, volume: 0.22 },
      { delay: 0.15, duration: 0.16, frequency: 783.99, volume: 0.24 },
      { delay: 0.32, duration: 0.28, frequency: 1046.5, volume: 0.2 }
    ];

    notes.forEach((note) => {
      const startAt = now + note.delay;
      const gain = context.createGain();
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(note.volume, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + note.duration + 0.03);
    });
  }

  async function prepareCompletionFeedback() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const context = getCompletionAudioContext();
      if (context?.state === "suspended") {
        await context.resume();
      }
      if (context?.state === "running") {
        playAudioUnlockTick(context);
        completionSoundReadyRef.current = true;
      }
    } catch (_error) {
      audioContextRef.current = null;
      completionSoundReadyRef.current = false;
    }

    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  }

  async function playCompletionSound() {
    const context = getCompletionAudioContext();
    if (!context) {
      return false;
    }

    try {
      if (context.state === "suspended") {
        await context.resume();
      }
      if (context.state !== "running") {
        return false;
      }
      playCompletionChime(context);
      completionSoundReadyRef.current = true;
      return true;
    } catch (_error) {
      // Audio feedback is best-effort; completion status and notification still work.
      completionSoundReadyRef.current = false;
      return false;
    }
  }

  async function showCompletionNotification(content: GeneratedContent) {
    if ("Notification" in window && Notification.permission === "granted") {
      const title = "一键生成完成";
      const options: NotificationOptions = {
        body: "文案和封面图已生成。",
        icon: platform === "douyin" ? "/platform-icons/douyin.ico" : "/platform-icons/xiaohongshu.ico",
        tag: `opc-mobile-generation-${content.id}`
      };

      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration?.showNotification) {
            await registration.showNotification(title, options);
            return;
          }
        }

        new Notification(title, options);
      } catch (_error) {
        // Some mobile browsers only allow ServiceWorkerRegistration.showNotification().
      }
    }
  }

  async function notifyGenerationComplete(content: GeneratedContent) {
    const soundPlayed = await playCompletionSound();
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
    await showCompletionNotification(content);
    if (!soundPlayed && !completionSoundReadyRef.current) {
      onAction("已完成；提示音被浏览器拦截了，下次请先点一次一键生成按钮解锁声音。");
    }
  }

  function buildMobileGenerationRequestPayload() {
    return {
      platform,
      topic: topic.trim(),
      knowledge_query: generationKnowledgeQuery.trim() || undefined,
      tone: contentMode === "xiaohongshu" ? xhsMobileDraftTone : shortPostDraftTone,
      target_audience: targetAudience.trim() || undefined,
      knowledge_limit: 5,
      tags: parseTagText(tagsText)
    };
  }

  async function previewMobileSourceContext() {
    if (!topic.trim()) {
      setSourcePreviewError("先填写选题，再查看检索依据。");
      return;
    }

    setSourcePreviewBusy(true);
    setSourcePreviewError(null);
    onAction("正在检索知识库和联网来源。");
    try {
      const response = await fetch(`${apiBase}/content/source-preview`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify(buildMobileGenerationRequestPayload())
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "检索依据读取失败。"));
      }
      const data = (await response.json()) as { source_context?: GenerationSourceContext };
      setSourceContext(data.source_context ?? null);
      onAction("检索依据已加载，请先核对来源。");
    } catch (error) {
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "检索依据读取失败。"
      );
      setSourceContext(null);
      setSourcePreviewError(message);
      onAction(message);
    } finally {
      setSourcePreviewBusy(false);
    }
  }

  async function generateDraftAndCover() {
    if (!topic.trim()) {
      onAction("先填写选题，再生成草稿。");
      return;
    }
    if (sourceEvidenceBlocked) {
      onAction("检索依据读取失败，请先重新查看依据后再生成。");
      return;
    }

    void prepareCompletionFeedback();
    setBusy(true);
    setGeneratedCover(null);
    clearStoredMobileCover();
    startProgress("撰稿服务生成中");
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
        body: JSON.stringify(requestPayload)
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "图文草稿生成失败。"));
      }
      const data = (await response.json()) as GeneratedContent;
      setGeneratedContent(data);
      setGeneratedContentInputSignature({ contentId: data.id, signature: requestSignature });
      setSourceContext(data.source_context ?? null);
      setSourcePreviewError(null);
      setDraftPreview(draftStateFromContent(data));
      saveStoredMobileContent(data);
      syncDraftIntoHistory(data, null);
      clearStoredMobileCover();
      setProgressStage("封面图生成中", 68, 94);

      const isDouyinPost = platform === "douyin";
      const baseCoverStyleNotes = isDouyinPost
        ? "抖音图文封面，强标题、高对比、真实学习/申请材料场景，避免录取承诺。"
        : "小红书高吸引封面，按选题轮换路线矩阵、决策地图、学术蓝图、杂志页、黑板批注或手机信息拼贴；水博/在职博士类可用榜单矩阵，但学校和项目细节必须来自已核实知识库，避免录取承诺。";
      const coverStyleNotes = buildTopicCoverStyleNotes(baseCoverStyleNotes, requestPayload.topic);
      const imageResponse = await fetch(`${apiBase}/image/generate`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          aspect_ratio: isDouyinPost ? "9:16" : "3:4",
          content_id: data.id,
          style_notes: coverStyleNotes,
          template: isDouyinPost ? "douyin-cover" : "xiaohongshu-cover"
        })
      });
      if (!imageResponse.ok) {
        throw new Error(
          `文案草稿已生成，但封面图失败：${await readApiError(imageResponse, "封面图生成失败。")}`
        );
      }
      const cover = (await imageResponse.json()) as GeneratedImageAsset;
      setGeneratedCover(cover);
      saveStoredMobileCover(cover);
      syncDraftIntoHistory(data, cover);
      finishProgress("已完成");
      void notifyGenerationComplete(data);
      onAction("文案和封面图已生成。");
    } catch (error) {
      stopProgressTimer();
      setProgressLabel("生成失败");
      onAction(
        formatDraftGenerationErrorMessage(
          error instanceof Error ? error.message : "一键撰稿和封面生成失败。"
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    try {
      await copyText(buildEditableDraftCopy(draftPreview));
      onAction(generatedContent ? "已尝试复制当前草稿。" : "已尝试复制当前预览文案。");
      return true;
    } catch (_error) {
      onAction("复制失败，请长按正文区域手动选择复制。");
      return false;
    }
  }

  const heroProgressPercent = busy
    ? progressPercent
    : generatedContentMatchesCurrentInputs
      ? 100
      : 0;
  const heroProgressLabel = busy
    ? progressLabel
    : generatedContentMatchesCurrentInputs
      ? "草稿和封面可继续编辑"
      : "点击下方按钮开始生成";
  const heroProgressValue = busy
    ? `${progressPercent}%`
    : generatedContentMatchesCurrentInputs
      ? "已就绪"
      : "未开始";

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
    return addMobileBackHandler(() => {
      if (!active) {
        return false;
      }
      if (previewOpen) {
        setPreviewOpen(false);
        onAction("已关闭草稿预览。");
        return true;
      }
      if (selectedDraftIds.length > 0) {
        setSelectedDraftIds([]);
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
  }, [active, onAction, previewOpen, selectedDraftIds.length, selectedProjectId]);

  if (!selectedProject) {
    return (
      <MobileCreationProjectGateway
        draftCount={draftHistory.length}
        onSelect={enterProject}
        todayDraftCount={todayDraftCount}
      />
    );
  }

  return (
    <div
      className="space-y-4"
      data-testid="mobile-create-project-detail"
    >
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
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.90)] p-4 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-85"
          style={{ backgroundImage: `url(${MOBILE_CREATE_CARD_BG})` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,244,0.94)_0%,rgba(255,252,244,0.76)_48%,rgba(255,252,244,0.36)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#ff2442]/[0.12] blur-2xl"
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">一键生成</div>
              <h2 className="mt-1 text-[25px] font-black leading-8">撰稿 + 封面图</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/[0.84] bg-[rgba(255,253,247,0.78)] text-[#ff2442] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-sm">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_74px] gap-2">
            <div className="rounded-[20px] border border-white/[0.84] bg-[rgba(255,253,247,0.76)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-sm">
              <div className="text-[11px] font-black text-ink/[0.45]">流程进度</div>
              <div className="mt-1 truncate text-xs font-black text-ink/[0.72]">{heroProgressLabel}</div>
            </div>
            <div className="flex items-center justify-center rounded-[20px] border border-[#ffdbe2] bg-[#fff5f7]/[0.86] text-center text-xs font-black text-[#a2152c] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-sm">
              {heroProgressValue}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-[#ff2442] transition-all duration-500"
              style={{ width: `${heroProgressPercent}%` }}
            />
          </div>
        </div>
      </section>
      <MobilePanel
        title="一键生成"
        action={<span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss">撰稿 + 封面</span>}
      >
        <label className="block">
          <span className="text-xs font-medium text-muted">选题</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none focus:border-moss focus:ring-2 focus:ring-moss/[0.15]"
            data-testid="mobile-topic"
            onChange={(event) => {
              updateMobileTopicAndAutoContext(event.target.value);
            }}
            value={topic}
          />
        </label>
        <div className="mt-3" data-testid="mobile-topic-preset-list">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted">推荐选题</span>
            <button
              className="flex h-7 items-center gap-1 rounded-full border border-white/[0.9] bg-[rgba(255,253,247,0.82)] px-2 text-[11px] font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
              data-testid="mobile-topic-preset-refresh"
              onClick={() => refreshMobileTopicPresets(true)}
              type="button"
            >
              <Sparkles className="h-3 w-3" />
              换一批
            </button>
          </div>
          <div className="mt-1 text-[11px] font-medium text-muted">
            每 45 秒自动换一批，可自定义
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" data-project-swipe-ignore="true">
            {visibleTopicPresets.map((preset) => (
              <button
                className="min-w-[128px] rounded-[18px] border border-white/[0.88] bg-[rgba(255,253,247,0.86)] px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] active:scale-[0.99]"
                data-testid={`mobile-topic-preset-${preset.key}`}
                key={preset.key}
                onClick={() => applyMobileTopicPreset(preset)}
                type="button"
              >
                <span className="block text-[11px] font-black text-moss">
                  {preset.mobileLabel}
                </span>
                <span className="mt-1 block text-xs font-black leading-4 text-ink">
                  {preset.topic}
                </span>
                <span className="mt-1 block text-[10px] font-medium text-muted">
                  {preset.mobileHelper}
                </span>
              </button>
            ))}
          </div>
        </div>
        <MobileSourceEvidencePanel
          error={sourcePreviewError}
          fallbackKnowledgeQuery={generationKnowledgeQuery}
          onPreview={previewMobileSourceContext}
          previewBusy={sourcePreviewBusy}
          sourceContext={visibleMobileSourceContext}
        />
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted">目标人群</span>
          <input
            className="mt-2 h-12 w-full rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none focus:border-moss focus:ring-2 focus:ring-moss/[0.15]"
            data-testid="mobile-audience"
            onChange={(event) => setTargetAudience(event.target.value)}
            value={targetAudience}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeChip
            active={platform === "xiaohongshu"}
            label={<PlatformLabel className="justify-center" iconSize="sm" platform="xiaohongshu" />}
            onClick={() => {
              setPlatform("xiaohongshu");
              clearMobileSourceEvidence();
              onAction("已切换到小红书生成。");
            }}
            testId="create-platform-xiaohongshu"
          />
          <ModeChip
            active={platform === "douyin"}
            label={
              <span className="flex items-center justify-center gap-2">
                <PlatformIcon platform="douyin" size="sm" />
                抖音
              </span>
            }
            onClick={() => {
              setPlatform("douyin");
              clearMobileSourceEvidence();
              onAction("已切换到抖音生成。");
            }}
            testId="create-platform-douyin"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeChip
            active={contentMode === "xiaohongshu"}
            label={
              <PlatformLabel
                className="justify-center"
                iconSize="sm"
                platform="xiaohongshu"
                suffix="图文"
              />
            }
            onClick={() => {
              setContentMode("xiaohongshu");
              onAction("已切换到小红书图文版式。");
            }}
            testId="mode-xiaohongshu"
          />
          <ModeChip
            active={contentMode === "short"}
            label="短段正文"
            onClick={() => {
              setContentMode("short");
              onAction("已切换到短段正文版式。");
            }}
            testId="mode-short"
          />
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted">标签</span>
          <input
            className="mt-2 h-11 w-full rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none focus:border-moss focus:ring-2 focus:ring-moss/[0.15]"
            data-testid="mobile-tags"
            onChange={(event) => {
              setTagsText(event.target.value);
              clearMobileSourceEvidence();
            }}
            value={tagsText}
          />
        </label>
        <button
          aria-label="一键完成撰稿和封面图"
          className="mt-4 flex h-[54px] w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#ff2442] text-sm font-black text-white shadow-[0_16px_34px_rgba(255,36,66,0.22)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-generate-draft"
          disabled={mobileGenerateDraftDisabled}
          onClick={generateDraftAndCover}
          title={sourceEvidenceBlocked ? "检索依据读取失败，请先重新查看依据后再生成" : undefined}
          type="button"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy
            ? `${progressLabel} ${progressPercent}%`
            : sourceEvidenceBlocked
              ? "先重新查看依据"
            : generatedContentMatchesCurrentInputs
              ? "重新一键生成"
              : "一键撰稿+封面图"}
        </button>
        {busy || progressPercent === 100 || progressLabel === "生成失败" ? (
          <div className="mt-3" data-testid="mobile-generation-progress">
            <div className="h-2 overflow-hidden rounded-full bg-[#eadfd6]">
              <div
                className={[
                  "h-full rounded-full transition-all duration-500",
                  progressLabel === "生成失败" ? "bg-coral" : "bg-[#ff2442]"
                ].join(" ")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted">
              <span>{progressLabel}</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        ) : null}
        {staleMobileDraftMessage ? (
          <div
            className="mt-3 rounded-[18px] border border-[#ffcfda] bg-[#fff4f6] px-3 py-2 text-xs font-bold leading-5 text-[#a2152c]"
            data-testid="mobile-stale-draft-warning"
          >
            {staleMobileDraftMessage}
          </div>
        ) : null}
        <p className="mt-2 text-[11px] leading-5 text-muted">
          会先生成文案，再自动生成封面图；不会自动发布。
        </p>
      </MobilePanel>

      <DraftHistoryCarousel
        activeContentId={generatedContentMatchesCurrentInputs ? generatedContent?.id ?? null : null}
        items={draftHistory}
        onLongPress={beginDraftSelection}
        onOpen={openOrToggleDraftHistoryItem}
        onToggleSelection={toggleDraftSelection}
        selectedDraftIds={selectedDraftIds}
        selectionMode={selectionMode}
      />

      {selectionMode ? (
        <DraftHistorySelectionBar
          onCancel={cancelDraftSelection}
          onDelete={() => deleteSelectedDraftHistoryItems(selectedDraftItems)}
          onPinToggle={() => {
            const item = selectedDraftItems[0] ?? null;
            if (selectedDraftItems.length === 1 && item) {
              toggleDraftPin(item);
            }
          }}
          selectedCount={selectedDraftItems.length}
          selectedItem={selectedDraftItems.length === 1 ? selectedDraftItems[0] : null}
        />
      ) : null}

      {previewOpen ? (
        <DraftPreviewEditor
          coverImageUrl={coverImageUrl}
          draft={draftPreview}
          generatedContent={generatedContent}
          onChange={setDraftPreview}
          onClose={() => setPreviewOpen(false)}
          onCopy={copyDraft}
          onExportStatus={onAction}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { countMobileDraftsToday } from "@/components/mobile-draft-history";
import { normalizeVisibleDraftHistory } from "@/components/mobile-create-helpers";
import {
  clearStoredMobileContent,
  clearStoredMobileCover,
  defaultMobileDraftPreview,
  draftStateFromContent,
  rememberDeletedDraftId,
  saveStoredMobileContent,
  saveStoredMobileCover,
  saveStoredMobileDraftHistory,
  type DraftPreviewState,
  type MobileDraftHistoryItem
} from "@/lib/mobile-draft-storage";
import {
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import {
  authHeaders,
  readApiError,
  type CredentialSettings
} from "@/lib/mobile-runtime";

interface UseDraftHistoryParams {
  apiBase: string;
  credentials: CredentialSettings;
  onAction: (message: string) => void;
  generatedContent: GeneratedContent | null;
  setGeneratedContent: Dispatch<SetStateAction<GeneratedContent | null>>;
  setGeneratedCover: Dispatch<SetStateAction<GeneratedImageAsset | null>>;
  setSourceContext: Dispatch<SetStateAction<GenerationSourceContext | null>>;
  setDraftPreview: Dispatch<SetStateAction<DraftPreviewState>>;
  setPreviewOpen: Dispatch<SetStateAction<boolean>>;
}

export function useDraftHistory(params: UseDraftHistoryParams) {
  const {
    apiBase,
    credentials,
    onAction,
    generatedContent,
    setGeneratedContent,
    setGeneratedCover,
    setSourceContext,
    setDraftPreview,
    setPreviewOpen
  } = params;

  const [draftHistory, setDraftHistory] = useState<MobileDraftHistoryItem[]>([]);
  const [draftHistoryError, setDraftHistoryError] = useState<string | null>(null);
  const [draftHistoryReloadKey, setDraftHistoryReloadKey] = useState(0);
  const [selectedDraftIds, setSelectedDraftIds] = useState<number[]>([]);

  const todayDraftCount = countMobileDraftsToday(draftHistory);
  const selectedDraftIdSet = new Set(selectedDraftIds);
  const selectedDraftItems = draftHistory.filter((item) => selectedDraftIdSet.has(item.content.id));
  const selectionMode = selectedDraftIds.length > 0;

  function persistDraftHistory(nextItems: MobileDraftHistoryItem[]) {
    const normalized = normalizeVisibleDraftHistory(nextItems);
    setDraftHistory(normalized);
    saveStoredMobileDraftHistory(normalized);
    return normalized;
  }

  function syncDraftIntoHistory(content: GeneratedContent, cover: GeneratedImageAsset | null) {
    setDraftHistoryError(null);
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

  function retryMobileDraftHistory() {
    setDraftHistoryError(null);
    setDraftHistoryReloadKey((current) => current + 1);
    onAction("正在重新读取草稿历史。");
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

  return {
    draftHistory,
    setDraftHistory,
    draftHistoryError,
    setDraftHistoryError,
    draftHistoryReloadKey,
    selectedDraftIds,
    todayDraftCount,
    selectedDraftItems,
    selectionMode,
    persistDraftHistory,
    syncDraftIntoHistory,
    selectDraftHistoryItem,
    toggleDraftSelection,
    beginDraftSelection,
    openOrToggleDraftHistoryItem,
    cancelDraftSelection,
    retryMobileDraftHistory,
    toggleDraftPin,
    deleteSelectedDraftHistoryItems
  };
}

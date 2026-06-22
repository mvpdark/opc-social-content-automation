"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import { normalizeVisibleDraftHistory } from "@/components/mobile-create-helpers";
import {
  MOBILE_COVER_HYDRATION_BATCH_SIZE,
  MOBILE_COVER_HYDRATION_RETRY_LIMIT,
  MOBILE_COVER_HYDRATION_RETRY_MS
} from "@/components/mobile-create-utils";
import {
  clearStoredMobileContent,
  clearStoredMobileCover,
  defaultMobileDraftPreview,
  draftStateFromContent,
  readStoredDeletedDraftIds,
  readStoredMobileContent,
  readStoredMobileCover,
  readStoredMobileDraftHistory,
  saveStoredMobileContent,
  saveStoredMobileCover,
  saveStoredMobileDraftHistory,
  type DraftPreviewState,
  type MobileDraftHistoryItem
} from "@/lib/mobile-draft-storage";
import {
  isGeneratedContent,
  isGeneratedImageAsset,
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import { readApiError, type MobilePlatform } from "@/lib/mobile-runtime";

interface UseCoverHydrationParams {
  apiBase: string;
  platform: MobilePlatform;
  onAction: (message: string) => void;
  draftHistoryReloadKey: number;
  setDraftHistory: Dispatch<SetStateAction<MobileDraftHistoryItem[]>>;
  setDraftHistoryError: Dispatch<SetStateAction<string | null>>;
  setGeneratedContent: Dispatch<SetStateAction<GeneratedContent | null>>;
  setGeneratedCover: Dispatch<SetStateAction<GeneratedImageAsset | null>>;
  setSourceContext: Dispatch<SetStateAction<GenerationSourceContext | null>>;
  setDraftPreview: Dispatch<SetStateAction<DraftPreviewState>>;
}

export function useCoverHydration(params: UseCoverHydrationParams) {
  const {
    apiBase,
    platform,
    onAction,
    draftHistoryReloadKey,
    setDraftHistory,
    setDraftHistoryError,
    setGeneratedContent,
    setGeneratedCover,
    setSourceContext,
    setDraftPreview
  } = params;

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
        .slice(0, MOBILE_COVER_HYDRATION_BATCH_SIZE);
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
          throw new Error(await readApiError(response, "草稿历史读取失败。"));
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("草稿历史格式异常，请稍后重试。");
        }
        if (active) {
          setDraftHistoryError(null);
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
      } catch (error) {
        if (active) {
          setDraftHistoryError(error instanceof Error ? error.message : "草稿历史读取失败。");
        }
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
  }, [platform, onAction, draftHistoryReloadKey]);
}

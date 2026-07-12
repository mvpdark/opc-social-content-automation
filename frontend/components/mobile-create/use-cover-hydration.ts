"use client";

import { useEffect, useRef } from "react";
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
import { authHeaders, readApiError, type CredentialSettings, type MobilePlatform } from "@/lib/mobile-runtime";

interface UseCoverHydrationParams {
  apiBase: string;
  platform: MobilePlatform;
  credentials: CredentialSettings;
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
    credentials,
    onAction,
    draftHistoryReloadKey,
    setDraftHistory,
    setDraftHistoryError,
    setGeneratedContent,
    setGeneratedCover,
    setSourceContext,
    setDraftPreview
  } = params;

  const onActionRef = useRef(onAction);
  const contentRequestIdRef = useRef(0);
  const draftHistoryRef = useRef<MobileDraftHistoryItem[]>([]);
  const credentialsRef = useRef(credentials);
  useEffect(() => {
    credentialsRef.current = credentials;
  }, [credentials]);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    let active = true;
    let coverHydrationRetryTimer: number | null = null;
    const ac = new AbortController();

    async function fetchLatestCover(contentId: number, signal?: AbortSignal) {
      try {
        const response = await fetch(`${apiBase}/image/list?content_id=${contentId}&limit=1`, {
          headers: authHeaders(credentialsRef.current),
          signal
        });
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
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return null;
        console.warn("[use-cover-hydration] Failed to fetch cover:", error);
        return null;
      }
    }

    function applyHistoryCover(latestCover: GeneratedImageAsset) {
      const computed = normalizeVisibleDraftHistory(
        draftHistoryRef.current.map((item) =>
          item.content.id === latestCover.content_id ? { ...item, cover: latestCover } : item
        )
      );
      draftHistoryRef.current = computed;
      setDraftHistory(computed);
      saveStoredMobileDraftHistory(computed);
    }

    async function loadLatestCover(contentId: number, signal?: AbortSignal) {
      try {
        const latestCover = await fetchLatestCover(contentId, signal);
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
        setGeneratedCover((current) => current ?? latestCover);
        saveStoredMobileCover(latestCover);
        applyHistoryCover(latestCover);
        onActionRef.current("已找回最近封面图。");
      } catch (error) {
        console.warn("[use-cover-hydration] loadLatestCover failed:", error);
      }
    }

    function scheduleMissingCoverRetry(items: MobileDraftHistoryItem[], attempt: number, signal?: AbortSignal) {
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
        void hydrateMissingHistoryCovers(retryItems, attempt + 1, signal);
      }, MOBILE_COVER_HYDRATION_RETRY_MS);
    }

    async function hydrateMissingHistoryCovers(items: MobileDraftHistoryItem[], attempt = 0, signal?: AbortSignal) {
      try {
        const missingCoverIds = items
          .filter((item) => !item.cover)
          .map((item) => item.content.id)
          .slice(0, MOBILE_COVER_HYDRATION_BATCH_SIZE);
        if (!missingCoverIds.length) {
          return;
        }

        const covers = (await Promise.all(missingCoverIds.map((id) => fetchLatestCover(id, signal)))).filter(
          (cover): cover is GeneratedImageAsset => Boolean(cover)
        );
        if (!active) {
          return;
        }
        if (!covers.length) {
          scheduleMissingCoverRetry(items, attempt, signal);
          return;
        }

        const coverByContentId = new Map(covers.map((cover) => [cover.content_id, cover]));
        const stillMissingCover = missingCoverIds.some((contentId) => !coverByContentId.has(contentId));
        const computedHistory = normalizeVisibleDraftHistory(
          draftHistoryRef.current.map((item) => ({
            ...item,
            cover: item.cover ?? coverByContentId.get(item.content.id) ?? null
          }))
        );
        draftHistoryRef.current = computedHistory;
        setDraftHistory(computedHistory);
        saveStoredMobileDraftHistory(computedHistory);

        const storedContent = readStoredMobileContent();
        const visibleContentId = storedContent && !readStoredDeletedDraftIds().has(storedContent.id)
          ? storedContent.id
          : null;
        const computedCover = visibleContentId ? coverByContentId.get(visibleContentId) ?? null : null;
        if (computedCover) {
          setGeneratedCover(computedCover);
          saveStoredMobileCover(computedCover);
        }

        if (stillMissingCover) {
          scheduleMissingCoverRetry(items, attempt, signal);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.warn("[use-cover-hydration] hydrateMissingHistoryCovers failed:", error);
      }
    }

    async function loadLatestContent(signal?: AbortSignal) {
      const requestId = ++contentRequestIdRef.current;
      try {
        const response = await fetch(`${apiBase}/content/list?platform=${platform}`, {
          cache: "no-cache",
          headers: authHeaders(credentialsRef.current),
          signal
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "草稿历史读取失败。"));
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("草稿历史格式异常，请稍后重试。");
        }
        if (requestId !== contentRequestIdRef.current) return;
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
          // MERGE: compute synchronously to avoid stale closure issues with functional updates
          const mergedHistory = normalizeVisibleDraftHistory([
            ...draftHistoryRef.current,
            ...currentHistory,
            ...latestItems
          ]);
          draftHistoryRef.current = mergedHistory;
          setDraftHistory(mergedHistory);
          saveStoredMobileDraftHistory(mergedHistory);
          const latestContent = latestItems[0].content;
          const latestCover =
            currentHistory.find((item) => item.content.id === latestContent.id)?.cover ?? null;
          // Guard: only set generated content if user hasn't generated/selected one
          setGeneratedContent((current) => current ?? latestContent);
          setSourceContext((current) => current ?? (latestContent.source_context ?? null));
          setDraftPreview((current) =>
            current === defaultMobileDraftPreview ? draftStateFromContent(latestContent) : current
          );
          saveStoredMobileContent(latestContent);
          if (storedCover?.content_id === latestContent.id) {
            setGeneratedCover((current) => current ?? storedCover);
          } else if (latestCover) {
            setGeneratedCover((current) => {
              if (current) return current;
              saveStoredMobileCover(latestCover);
              return latestCover;
            });
          } else {
            setGeneratedCover((current) => current ?? null);
          }
          void hydrateMissingHistoryCovers(latestItems, 0, signal);
          void loadLatestCover(latestContent.id, signal);
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
      draftHistoryRef.current = normalized;
      setDraftHistory(normalized);
      void hydrateMissingHistoryCovers(normalized, 0, ac.signal);
    } else {
      draftHistoryRef.current = storedHistory;
      setDraftHistory(storedHistory);
      void hydrateMissingHistoryCovers(storedHistory, 0, ac.signal);
    }
    if (visibleStoredContent?.platform === platform) {
      setGeneratedContent(visibleStoredContent);
      setSourceContext(visibleStoredContent.source_context ?? null);
      setDraftPreview(draftStateFromContent(visibleStoredContent));
      setGeneratedCover(
        storedCover?.content_id === visibleStoredContent.id ? storedCover : null
      );
      void loadLatestCover(visibleStoredContent.id, ac.signal);
    } else {
      setGeneratedContent(null);
      setGeneratedCover(null);
      setSourceContext(null);
      setDraftPreview(defaultMobileDraftPreview);
    }

    void loadLatestContent(ac.signal);
    return () => {
      active = false;
      ac.abort();
      if (coverHydrationRetryTimer !== null) {
        window.clearTimeout(coverHydrationRetryTimer);
      }
    };
  }, [apiBase, platform, credentials.workspaceToken, draftHistoryReloadKey]);
}

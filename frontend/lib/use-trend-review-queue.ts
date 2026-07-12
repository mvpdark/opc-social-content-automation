"use client";

import { useEffect, useRef, useState } from "react";
import { readMobileStorage, writeMobileStorage, type MobilePlatform } from "@/lib/mobile-runtime";
import {
  TREND_REVIEW_QUEUE_STORAGE_KEY,
  normalizeTrendReviewQueueStorage,
  type TrendReviewQueueStorage
} from "@/components/mobile-collect-utils";

/**
 * Manages the trend review queue: hydration from localStorage on
 * platform/query change and persistence whenever the reviewed or
 * dismissed id lists change. The skip-flag prevents a write on the
 * same render cycle that re-hydrates from storage.
 */
export function useTrendReviewQueue(platform: MobilePlatform, query: string) {
  const [reviewedTrendIds, setReviewedTrendIds] = useState<number[]>([]);
  const [dismissedTrendIds, setDismissedTrendIds] = useState<number[]>([]);
  const hydratedRef = useRef(false);
  const skipNextWriteRef = useRef(false);

  useEffect(() => {
    skipNextWriteRef.current = true;
    try {
      const stored = readMobileStorage(TREND_REVIEW_QUEUE_STORAGE_KEY);
      const contextQuery = query.trim();
      const parsed = stored
        ? normalizeTrendReviewQueueStorage(JSON.parse(stored), {
            platform,
            query: contextQuery
          })
        : null;
      setReviewedTrendIds(
        parsed && parsed.platform === platform && parsed.query === contextQuery
          ? parsed.reviewedTrendIds
          : []
      );
      setDismissedTrendIds(parsed?.dismissedTrendIds ?? []);
    } catch (_error) {
      setReviewedTrendIds([]);
      setDismissedTrendIds([]);
    } finally {
      hydratedRef.current = true;
    }
  }, [platform, query]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    const payload: TrendReviewQueueStorage = {
      dismissedTrendIds,
      platform,
      query: query.trim(),
      reviewedTrendIds
    };
    writeMobileStorage(TREND_REVIEW_QUEUE_STORAGE_KEY, JSON.stringify(payload));
  }, [dismissedTrendIds, platform, query, reviewedTrendIds]);

  return { reviewedTrendIds, setReviewedTrendIds, dismissedTrendIds, setDismissedTrendIds };
}
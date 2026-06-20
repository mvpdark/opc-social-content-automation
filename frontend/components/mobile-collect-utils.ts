import {
  type CollectionJobDiagnosticItem,
  type CollectionJobStatusSnapshot
} from "@/lib/collection-job-status";
import type { MobilePlatform } from "@/lib/mobile-runtime";

export type LinkImportTarget = {
  accepted_count: number;
  extracted_count: number;
  links: Array<{
    accepted: boolean;
    link_type: string;
    normalized_url: string;
    reason: string | null;
  }>;
};

export type MobileCollectionJob = CollectionJobStatusSnapshot & {
  created_at?: string;
  updated_at?: string;
};

export type CollectionScheduleStorage = {
  autoEnabled: boolean;
  intervalMinutes: number;
  keyword: string;
  lastJobId: number | null;
  lastRunAt: string | null;
  maxItems: number;
  nextRunAt: string | null;
  platform: MobilePlatform;
  scheduleMessage: string;
};

export type TrendReviewQueueStorage = {
  dismissedTrendIds: number[];
  platform: MobilePlatform;
  query: string;
  reviewedTrendIds: number[];
};

export const TREND_REVIEW_QUEUE_STORAGE_KEY = "opc_mobile_trend_review_queue_v1";

export function mobileDiagnosticToneClass(tone: CollectionJobDiagnosticItem["tone"]) {
  switch (tone) {
    case "good":
      return "border-[#2f9a55]/[0.26] bg-[#e7f2ea]/[0.72] text-[#1f7548]";
    case "warning":
      return "border-[#e1be64]/[0.40] bg-[#fff4cf]/[0.72] text-[#8a6418]";
    case "danger":
      return "border-[#ef6b6b]/[0.34] bg-[#ffe8e8]/[0.72] text-[#b23b3b]";
    default:
      return "border-[#ded8cc] bg-[rgba(255,253,247,0.72)] text-ink";
  }
}

export function normalizeTrendIdList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
    : [];
}

export function normalizeTrendReviewQueueStorage(
  value: unknown,
  fallbackContext: { platform: MobilePlatform; query: string }
): TrendReviewQueueStorage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const parsed = value as Partial<TrendReviewQueueStorage>;
  const platform =
    parsed.platform === "xiaohongshu" || parsed.platform === "douyin"
      ? parsed.platform
      : fallbackContext.platform;
  const query = typeof parsed.query === "string" ? parsed.query : fallbackContext.query;
  return {
    dismissedTrendIds: normalizeTrendIdList(parsed.dismissedTrendIds),
    platform,
    query,
    reviewedTrendIds: normalizeTrendIdList(parsed.reviewedTrendIds)
  };
}

import type { CSSProperties } from "react";

import {
  type CollectionJobDiagnosticItem,
  type CollectionJobStatusSnapshot
} from "@/lib/collection-job-status";
import type { MobilePlatform } from "@/lib/mobile-runtime";

export const COLLECTION_COLLAGE_BG: CSSProperties = {
  backgroundImage: "url(/mobile-assets/collection-collage.png)"
};

export function formatScheduleTime(value: string | null) {
  if (!value) {
    return "未安排";
  }
  return new Date(value).toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  });
}

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

export function isLinkImportTarget(value: unknown): value is LinkImportTarget {
  if (!value || typeof value !== "object") {
    return false;
  }
  const target = value as Partial<LinkImportTarget>;
  return (
    typeof target.accepted_count === "number" &&
    typeof target.extracted_count === "number" &&
    Array.isArray(target.links) &&
    target.links.every(
      (link) =>
        typeof link.accepted === "boolean" &&
        typeof link.link_type === "string" &&
        typeof link.normalized_url === "string" &&
        (link.reason === null || typeof link.reason === "string")
    )
  );
}

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

export function isCollectionScheduleStorage(value: unknown): value is CollectionScheduleStorage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const stored = value as Partial<CollectionScheduleStorage>;
  return (
    typeof stored.autoEnabled === "boolean" &&
    typeof stored.intervalMinutes === "number" &&
    typeof stored.keyword === "string" &&
    (stored.lastJobId === null || typeof stored.lastJobId === "number") &&
    (stored.lastRunAt === null || typeof stored.lastRunAt === "string") &&
    typeof stored.maxItems === "number" &&
    (stored.nextRunAt === null || typeof stored.nextRunAt === "string") &&
    (stored.platform === "xiaohongshu" || stored.platform === "douyin") &&
    typeof stored.scheduleMessage === "string"
  );
}

export function isPartialCollectionScheduleStorage(
  value: unknown
): value is Partial<CollectionScheduleStorage> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const stored = value as Record<string, unknown>;
  if ("autoEnabled" in stored && typeof stored.autoEnabled !== "boolean") return false;
  if ("intervalMinutes" in stored && typeof stored.intervalMinutes !== "number") return false;
  if ("keyword" in stored && typeof stored.keyword !== "string") return false;
  if ("lastJobId" in stored && stored.lastJobId !== null && typeof stored.lastJobId !== "number")
    return false;
  if ("lastRunAt" in stored && stored.lastRunAt !== null && typeof stored.lastRunAt !== "string")
    return false;
  if ("maxItems" in stored && typeof stored.maxItems !== "number") return false;
  if ("nextRunAt" in stored && stored.nextRunAt !== null && typeof stored.nextRunAt !== "string")
    return false;
  if (
    "platform" in stored &&
    stored.platform !== "xiaohongshu" &&
    stored.platform !== "douyin"
  )
    return false;
  if ("scheduleMessage" in stored && typeof stored.scheduleMessage !== "string") return false;
  return true;
}

export type KnowledgeDigestResponse = {
  item_count: number;
  knowledge_id: number;
};

export function isKnowledgeDigestResponse(value: unknown): value is KnowledgeDigestResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Partial<KnowledgeDigestResponse>;
  return (
    typeof data.item_count === "number" &&
    typeof data.knowledge_id === "number"
  );
}

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
      return "border-moss/[0.26] bg-sage/[0.72] text-moss";
    case "warning":
      return "border-amber/[0.40] bg-amber/[0.15] text-amber-ink";
    case "danger":
      return "border-coral/[0.34] bg-coral/[0.15] text-coral";
    default:
      return "border-sand bg-paper/[0.72] text-ink";
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

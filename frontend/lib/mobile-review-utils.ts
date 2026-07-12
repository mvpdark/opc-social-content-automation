import { getApiBase } from "@/lib/api-base";
import {
  generationSourceContextStats,
  isGeneratedContent,
  isGeneratedImageAsset,
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import { readStoredDeletedDraftIds } from "@/lib/mobile-draft-storage";
import {
  authHeaders,
  readApiError,
  type CredentialSettings as MobileCredentialSettings
} from "@/lib/mobile-runtime";

export type { MobileCredentialSettings };

export type MobileReviewDecision = "approved" | "changes_requested";
export type MobileReviewQueueItem = {
  content: GeneratedContent;
  cover: GeneratedImageAsset | null;
};

const API_BASE = getApiBase();
const mobileReviewQueueStatuses = new Set(["draft", "rewritten", "review_pending"]);

function isMobileReviewCandidate(content: GeneratedContent) {
  return content.platform === "xiaohongshu" && mobileReviewQueueStatuses.has(content.status);
}

export function mobileReviewStatusLabel(status: string) {
  if (status === "review_pending") {
    return "待确认";
  }
  if (status === "rewritten") {
    return "已润色";
  }
  if (status === "approved") {
    return "已通过";
  }
  if (status === "changes_requested") {
    return "需修改";
  }
  if (status === "rejected") {
    return "已拒绝";
  }
  return "草稿";
}

export function mobileReviewStatusClass(status: string) {
  if (status === "review_pending") {
    return "bg-amber/15 text-amber-ink";
  }
  if (status === "rewritten") {
    return "bg-sage text-moss";
  }
  if (status === "approved") {
    return "bg-sage text-moss";
  }
  if (status === "changes_requested" || status === "rejected") {
    return "bg-blush text-coral";
  }
  return "bg-white text-muted";
}

export function mobileReviewEvidenceCount(sourceContext?: GenerationSourceContext | null) {
  return generationSourceContextStats(sourceContext).totalCount;
}

export function mobileReviewNeedsWebSourceReview(sourceContext?: GenerationSourceContext | null) {
  return generationSourceContextStats(sourceContext).missingRequiredWebResults;
}

export function formatMobileReviewTime(value?: string) {
  if (!value) {
    return "刚刚";
  }
  return new Date(value).toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  });
}

export function mobileContentExcerpt(content: GeneratedContent, maxLength = 82) {
  const normalized = content.body.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

async function fetchLatestContentCover(contentId: number, credentials: MobileCredentialSettings, signal?: AbortSignal) {
  try {
    const response = await fetch(`${API_BASE}/image/list?content_id=${contentId}&limit=1`, {
      headers: authHeaders(credentials),
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
    if (error instanceof Error && error.name === "AbortError") throw error;
    return null;
  }
}

export async function fetchMobileReviewContents(credentials: MobileCredentialSettings, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/content/list?platform=xiaohongshu`, {
      headers: authHeaders(credentials),
      signal
    });
  } catch (error) {
    if (error instanceof TypeError) {
      if (process.env.NODE_ENV === "development") console.warn("[mobile-review-utils] Network error fetching review contents:", error);
      return [];
    }
    throw error;
  }
  if (!response.ok) {
    throw new Error(await readApiError(response, "待确认草稿读取失败。"));
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  const deletedDraftIds = readStoredDeletedDraftIds();
  return data
    .filter(isGeneratedContent)
    .filter(isMobileReviewCandidate)
    .filter((content) => !deletedDraftIds.has(content.id));
}

export async function fetchMobileReviewQueue(credentials: MobileCredentialSettings, signal?: AbortSignal) {
  const contents = await fetchMobileReviewContents(credentials, signal);
  const items = contents.slice(0, 30);
  const results: MobileReviewQueueItem[] = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (content): Promise<MobileReviewQueueItem> => ({
        content,
        cover: await fetchLatestContentCover(content.id, credentials, signal)
      }))
    );
    results.push(...batchResults);
  }
  return results;
}

export async function submitMobileHumanReview(
  credentials: MobileCredentialSettings,
  contentId: number,
  decision: MobileReviewDecision,
  signal?: AbortSignal
): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/content/${contentId}/reviews`, {
      body: JSON.stringify({
        decision,
        notes: decision === "approved" ? "手机端人工确认通过。" : "手机端人工确认退回修改。",
        risk_flags: decision === "approved" ? [] : ["needs_revision"],
        score: decision === "approved" ? 95 : 60
      }),
      headers: authHeaders(credentials),
      method: "POST",
      signal
    });
    if (!response.ok) {
      return {
        ok: false,
        message: await readApiError(response, "人工确认提交失败。")
      };
    }
    return {
      ok: true,
      message: decision === "approved" ? "人工确认已通过。" : "人工确认已退回修改。"
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return {
      ok: false,
      message: error instanceof Error ? error.message : "人工确认提交失败。"
    };
  }
}

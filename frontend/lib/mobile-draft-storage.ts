import {
  isGeneratedContent,
  isGeneratedImageAsset,
  type GeneratedContent,
  type GeneratedImageAsset
} from "@/lib/generated-assets";
import { buildPlatformCopyText } from "@/lib/platform-copy";
import { formatTagLine } from "@/lib/tags";

export type DraftPreviewState = {
  body: string;
  points: string[];
  tags: string;
  title: string;
};

export type MobileDraftHistoryItem = {
  content: GeneratedContent;
  cover: GeneratedImageAsset | null;
  pinned: boolean;
  saved_at: string;
};

const MOBILE_LAST_CONTENT_STORAGE_KEY = "opc_mobile_last_generated_content_v1";
const MOBILE_LAST_COVER_STORAGE_KEY = "opc_mobile_last_generated_cover_v1";
const MOBILE_DRAFT_HISTORY_STORAGE_KEY = "opc_mobile_draft_history_v1";
const MOBILE_DELETED_DRAFT_IDS_STORAGE_KEY = "opc_mobile_deleted_draft_ids_v1";

export const defaultMobileDraftPreview: DraftPreviewState = {
  body:
    "很多人一上来就急着群发邮件，但研究方向、读博动机和导师匹配没想清楚，反而容易浪费第一印象。",
  points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
  tags: "#硕升博 #博士申请 #研究方向",
  title: "不是先套磁，先想清楚这 3 件事"
};

function readMobileStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function writeMobileStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

function removeMobileStorage(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (_error) {
    return false;
  }
}

export function readStoredMobileContent() {
  const raw = readMobileStorage(MOBILE_LAST_CONTENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isGeneratedContent(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export function saveStoredMobileContent(content: GeneratedContent) {
  writeMobileStorage(MOBILE_LAST_CONTENT_STORAGE_KEY, JSON.stringify(content));
}

export function clearStoredMobileContent() {
  removeMobileStorage(MOBILE_LAST_CONTENT_STORAGE_KEY);
}

export function readStoredDeletedDraftIds() {
  const raw = readMobileStorage(MOBILE_DELETED_DRAFT_IDS_STORAGE_KEY);
  if (!raw) {
    return new Set<number>();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set<number>();
    }
    return new Set(parsed.filter((value): value is number => Number.isInteger(value)));
  } catch (_error) {
    return new Set<number>();
  }
}

function saveStoredDeletedDraftIds(ids: Set<number>) {
  writeMobileStorage(
    MOBILE_DELETED_DRAFT_IDS_STORAGE_KEY,
    JSON.stringify(Array.from(ids).slice(-80))
  );
}

export function rememberDeletedDraftId(contentId: number) {
  const deletedDraftIds = readStoredDeletedDraftIds();
  deletedDraftIds.add(contentId);
  saveStoredDeletedDraftIds(deletedDraftIds);
}

export function filterDeletedMobileDraftHistory(items: MobileDraftHistoryItem[]) {
  const deletedDraftIds = readStoredDeletedDraftIds();
  if (!deletedDraftIds.size) {
    return items;
  }
  return items.filter((item) => !deletedDraftIds.has(item.content.id));
}

function isMobileDraftHistoryItem(value: unknown): value is MobileDraftHistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<MobileDraftHistoryItem>;
  return (
    isGeneratedContent(item.content) &&
    (item.cover === null || item.cover === undefined || isGeneratedImageAsset(item.cover)) &&
    typeof item.pinned === "boolean" &&
    typeof item.saved_at === "string"
  );
}

export function normalizeMobileDraftHistory(items: MobileDraftHistoryItem[]) {
  const byId = new Map<number, MobileDraftHistoryItem>();
  items.forEach((item) => {
    const existing = byId.get(item.content.id);
    if (!existing) {
      byId.set(item.content.id, item);
      return;
    }

    byId.set(item.content.id, {
      content: item.content,
      cover: item.cover ?? existing.cover,
      pinned: existing.pinned || item.pinned,
      saved_at: item.saved_at > existing.saved_at ? item.saved_at : existing.saved_at
    });
  });

  return Array.from(byId.values())
    .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }
      return right.saved_at.localeCompare(left.saved_at);
    })
    .slice(0, 20);
}

export function readStoredMobileDraftHistory() {
  const raw = readMobileStorage(MOBILE_DRAFT_HISTORY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return filterDeletedMobileDraftHistory(
      normalizeMobileDraftHistory(parsed.filter(isMobileDraftHistoryItem))
    );
  } catch (_error) {
    return [];
  }
}

export function saveStoredMobileDraftHistory(items: MobileDraftHistoryItem[]) {
  const visibleItems = filterDeletedMobileDraftHistory(normalizeMobileDraftHistory(items));
  writeMobileStorage(
    MOBILE_DRAFT_HISTORY_STORAGE_KEY,
    JSON.stringify(visibleItems)
  );
}

export function readStoredMobileCover() {
  const raw = readMobileStorage(MOBILE_LAST_COVER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isGeneratedImageAsset(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export function saveStoredMobileCover(cover: GeneratedImageAsset) {
  writeMobileStorage(MOBILE_LAST_COVER_STORAGE_KEY, JSON.stringify(cover));
}

export function clearStoredMobileCover() {
  removeMobileStorage(MOBILE_LAST_COVER_STORAGE_KEY);
}

export function buildEditableDraftCopy(draft: DraftPreviewState) {
  const pointText = draft.points.map((point, index) => `${index + 1}. ${point.trim()}`).join("\n");
  return buildPlatformCopyText({
    body: [draft.body.trim(), pointText].filter(Boolean).join("\n\n"),
    tags: draft.tags,
    title: draft.title
  });
}

export function draftStateFromContent(content: GeneratedContent): DraftPreviewState {
  return {
    body: content.body,
    points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
    tags: formatTagLine(content.tags),
    title: content.title
  };
}

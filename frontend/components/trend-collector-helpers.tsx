"use client";

import { getApiBase, getZscjApiBase } from "@/lib/api-base";
import {
  type CollectionJobDiagnosticItem,
  type CollectionJobStatusSnapshot
} from "@/lib/collection-job-status";

export type Platform = "xiaohongshu" | "douyin";

export type SearchTarget = {
  platform: Platform;
  keyword: string;
  content_kind: "image_text" | "video" | "mixed";
  video_collection_enabled: boolean;
  search_url: string;
  requires_manual_login: boolean;
  automation_mode: string;
  safety_notes: string[];
};

type LinkCandidate = {
  original_url: string;
  normalized_url: string;
  link_type: string;
  accepted: boolean;
  requires_resolution: boolean;
  note_id: string | null;
  reason: string | null;
};

export type LinkImportTarget = {
  platform: "xiaohongshu";
  extracted_count: number;
  accepted_count: number;
  import_mode: string;
  download_media_enabled: boolean;
  cookie_persistence: boolean;
  links: LinkCandidate[];
  safety_notes: string[];
};

function isLinkCandidate(value: unknown): value is LinkCandidate {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.original_url === "string" &&
    typeof v.normalized_url === "string" &&
    typeof v.link_type === "string" &&
    typeof v.accepted === "boolean" &&
    typeof v.requires_resolution === "boolean" &&
    (v.note_id === null || typeof v.note_id === "string") &&
    (v.reason === null || typeof v.reason === "string")
  );
}

export function isLinkImportTarget(value: unknown): value is LinkImportTarget {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.platform === "xiaohongshu" &&
    typeof v.extracted_count === "number" &&
    typeof v.accepted_count === "number" &&
    typeof v.import_mode === "string" &&
    typeof v.download_media_enabled === "boolean" &&
    typeof v.cookie_persistence === "boolean" &&
    Array.isArray(v.links) &&
    v.links.every(isLinkCandidate) &&
    Array.isArray(v.safety_notes) &&
    v.safety_notes.every((s) => typeof s === "string")
  );
}

export function isSearchTarget(value: unknown): value is SearchTarget {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.platform === "xiaohongshu" || v.platform === "douyin") &&
    typeof v.keyword === "string" &&
    (v.content_kind === "image_text" || v.content_kind === "video" || v.content_kind === "mixed") &&
    typeof v.video_collection_enabled === "boolean" &&
    typeof v.search_url === "string" &&
    typeof v.requires_manual_login === "boolean" &&
    typeof v.automation_mode === "string" &&
    Array.isArray(v.safety_notes) &&
    v.safety_notes.every((s) => typeof s === "string")
  );
}

export function isKnowledgeDigestResponse(
  value: unknown
): value is { knowledge_id: number; item_count: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.knowledge_id === "number" &&
    typeof v.item_count === "number"
  );
}

export type TrendCollectionJob = CollectionJobStatusSnapshot & {
  platform: Platform;
  keyword: string;
};

export const API_BASE = getApiBase();
export const ZSCJ_API_BASE = getZscjApiBase();
const XHS_URL_PATTERN = /https?:\/\/[^\s<>'"，。；、)）】]+/gi;
const SUPPORTED_XHS_HOSTS = new Set([
  "xiaohongshu.com",
  "www.xiaohongshu.com",
  "xhslink.com",
  "www.xhslink.com"
]);
const TRAILING_URL_PUNCTUATION = ".,;:!?，。；：！？、)]）】\"'";

export const platformLabels: Record<Platform, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音"
};
export const fieldLabelClass = "text-xs font-medium text-muted";
export const inputClass =
  "glass-control mt-2 h-10 w-full rounded-md border px-3 text-sm text-ink outline-none";
export const inlineInputClass =
  "glass-control h-10 w-full rounded-md border px-3 text-sm text-ink outline-none";
export const secondaryButtonClass =
  "workspace-button workspace-button-secondary glass-control flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60";
export const primaryButtonClass =
  "workspace-button workspace-button-primary flex h-10 items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-60";

export function buildLocalSearchTarget(platform: Platform, keyword: string): SearchTarget {
  const encodedKeyword = encodeURIComponent(keyword.trim());
  return {
    platform,
    keyword: keyword.trim(),
    content_kind: "image_text",
    video_collection_enabled: false,
    search_url:
      platform === "xiaohongshu"
        ? `https://www.xiaohongshu.com/search_result?keyword=${encodedKeyword}`
        : `https://www.douyin.com/search/${encodedKeyword}`,
    requires_manual_login: false,
    automation_mode: "public_first_visible_browser",
    safety_notes: []
  };
}

function cleanImportUrl(url: string) {
  let cleaned = url.trim();
  while (cleaned && TRAILING_URL_PUNCTUATION.includes(cleaned[cleaned.length - 1] ?? "")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

function buildLocalXhsLinkCandidate(rawUrl: string): LinkCandidate {
  const originalUrl = cleanImportUrl(rawUrl);

  try {
    const parsed = new URL(originalUrl);
    const host = parsed.hostname.toLowerCase();
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (!SUPPORTED_XHS_HOSTS.has(host)) {
      return {
        original_url: originalUrl,
        normalized_url: originalUrl,
        link_type: "unsupported",
        accepted: false,
        requires_resolution: false,
        note_id: null,
        reason: "只接受 xiaohongshu.com 和 xhslink.com 链接。"
      };
    }

    if (host === "xhslink.com" || host === "www.xhslink.com") {
      if (!parts.length) {
        return {
          original_url: originalUrl,
          normalized_url: originalUrl,
          link_type: "short_link",
          accepted: false,
          requires_resolution: false,
          note_id: null,
          reason: "短链需要包含分享码。"
        };
      }
      return {
        original_url: originalUrl,
        normalized_url: originalUrl,
        link_type: "short_link",
        accepted: true,
        requires_resolution: true,
        note_id: null,
        reason: "短链需要后续由授权采集器解析详情。"
      };
    }

    if (parts.length >= 2 && parts[0] === "explore") {
      return {
        original_url: originalUrl,
        normalized_url: `https://www.xiaohongshu.com/explore/${parts[1]}`,
        link_type: "note_detail",
        accepted: true,
        requires_resolution: false,
        note_id: parts[1],
        reason: null
      };
    }

    if (parts.length >= 3 && parts[0] === "discovery" && parts[1] === "item") {
      return {
        original_url: originalUrl,
        normalized_url: `https://www.xiaohongshu.com/discovery/item/${parts[2]}`,
        link_type: "note_detail",
        accepted: true,
        requires_resolution: false,
        note_id: parts[2],
        reason: null
      };
    }

    if (parts.length >= 2 && parts[0] === "user" && parts[1] === "profile") {
      const userId = parts[2];
      const noteId = parts[3] ?? null;
      if (!userId) {
        return {
          original_url: originalUrl,
          normalized_url: originalUrl,
          link_type: "profile",
          accepted: false,
          requires_resolution: false,
          note_id: null,
          reason: "主页链接需要包含用户 ID。"
        };
      }
      const normalizedPath = noteId ? `user/profile/${userId}/${noteId}` : `user/profile/${userId}`;
      return {
        original_url: originalUrl,
        normalized_url: `https://www.xiaohongshu.com/${normalizedPath}`,
        link_type: noteId ? "profile_note" : "profile",
        accepted: true,
        requires_resolution: false,
        note_id: noteId,
        reason: noteId ? null : "主页链接需要后续进入笔记列表采集。"
      };
    }

    if (parts[0] === "search_result") {
      return {
        original_url: originalUrl,
        normalized_url: "https://www.xiaohongshu.com/search_result",
        link_type: "search_result",
        accepted: true,
        requires_resolution: false,
        note_id: null,
        reason: "搜索结果页可作为上下文，但不是单篇笔记。"
      };
    }

    return {
      original_url: originalUrl,
      normalized_url: originalUrl,
      link_type: "xiaohongshu_other",
      accepted: false,
      requires_resolution: false,
      note_id: null,
      reason: "暂不支持这种小红书链接形态。"
    };
  } catch {
    return {
      original_url: originalUrl,
      normalized_url: originalUrl,
      link_type: "invalid",
      accepted: false,
      requires_resolution: false,
      note_id: null,
      reason: "链接格式无法识别。"
    };
  }
}

export function buildLocalXhsLinkImportTarget(rawText: string): LinkImportTarget {
  const rawUrls = Array.from(rawText.matchAll(XHS_URL_PATTERN), (match) => cleanImportUrl(match[0]));
  const dedupedUrls = Array.from(new Set(rawUrls)).slice(0, 10);
  const links = dedupedUrls.map(buildLocalXhsLinkCandidate);

  return {
    platform: "xiaohongshu",
    extracted_count: links.length,
    accepted_count: links.filter((link) => link.accepted).length,
    import_mode: "frontend_preparse_only",
    download_media_enabled: false,
    cookie_persistence: false,
    links,
    safety_notes: [
      "本地预解析只识别链接形态，不抓取小红书页面内容。",
      "默认不保存 Cookie，也不会绕过平台访问限制。",
      "后续入库前仍需人工确认来源和内容。"
    ]
  };
}

export function restartCollectionJobLabel(status: string | null) {
  if (status === "queued") {
    return "继续上次采集";
  }
  if (status === "needs_operator_review") {
    return "重试采集";
  }
  if (status === "failed") {
    return "重新采集";
  }
  return "继续采集";
}

export function diagnosticToneClass(tone: CollectionJobDiagnosticItem["tone"]) {
  if (tone === "good") {
    return "border-moss/35 bg-moss/10";
  }
  if (tone === "warning") {
    return "border-amber/35 bg-amber/10";
  }
  if (tone === "danger") {
    return "border-coral/35 bg-coral/10";
  }
  return "border-line bg-paper/75";
}

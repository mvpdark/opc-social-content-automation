import { resolveAssetUrl } from "@/lib/asset-url";

const COMPACT_XHS_METADATA_RE =
  /(.{2,60}?)\s+(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|\d+\s*天前|昨天|前天|刚刚)\s*(\d+(?:\.\d+)?\s*(?:万|w|W|k|K|千)?)$/;
const COMPACT_XHS_METADATA_ONLY_RE =
  /(.{2,60}?)\s+(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|\d+\s*天前|昨天|前天|刚刚)\s*(\d+(?:\.\d+)?\s*(?:万|w|W|k|K|千)?)\s*(赞|点赞|藏|收藏|评|评论|转发|分享)?$/;

export type MobileTrendContent = {
  id: number;
  platform: string;
  title: string;
  content: string;
  author: string | null;
  publish_time: string | null;
  url: string | null;
  tags: string[] | null;
  likes: number;
  favorites: number;
  comments: number;
  shares: number;
  cover_url: string | null;
  video_transcript: string | null;
  screenshot_url: string | null;
  created_at: string;
};

function isMobileTrendContent(value: unknown): value is MobileTrendContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Partial<MobileTrendContent>;
  return (
    typeof item.id === "number" &&
    typeof item.platform === "string" &&
    typeof item.title === "string" &&
    typeof item.content === "string"
  );
}

export function sanitizeMobileTrendItems(value: unknown) {
  return Array.isArray(value) ? value.filter(isMobileTrendContent) : [];
}

export function mobilePlatformText(platform: string) {
  if (platform === "xiaohongshu") {
    return "小红书";
  }
  if (platform === "douyin") {
    return "抖音";
  }
  return platform || "未知平台";
}

export function mobileTrendExcerpt(item: MobileTrendContent, maxLength = 96) {
  const text = mobileTrendBodyText(item);
  if (text.length <= maxLength) {
    return text || "正文未采到，打开来源人工确认。";
  }
  return `${text.slice(0, maxLength)}...`;
}

export function mobileTrendBodyText(item: MobileTrendContent) {
  let text = item.content.replace(/\s+/g, " ").trim();
  const title = item.title.replace(/\s+/g, " ").trim();
  for (let index = 0; index < 2; index += 1) {
    if (title && text.startsWith(title)) {
      text = text.slice(title.length).trim();
    }
  }
  if (!text || text === title || COMPACT_XHS_METADATA_ONLY_RE.test(text)) {
    return "";
  }
  return text;
}

export function formatMobileTrendDate(value: string | null) {
  if (!value) {
    return "时间未知";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function mobileTrendCoverUrl(item: MobileTrendContent) {
  const url = item.cover_url || item.screenshot_url;
  return url ? resolveAssetUrl(url) : null;
}

export function mobileTrendMetricItems(item: MobileTrendContent) {
  return [
    { label: "点赞", value: mobileTrendLikes(item) },
    { label: "收藏", value: item.favorites },
    { label: "评论", value: item.comments },
    { label: "转发", value: item.shares }
  ];
}

function parseCompactMetric(value: string | undefined) {
  if (!value) {
    return 0;
  }
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(万|w|W|k|K|千)?/);
  if (!match) {
    return 0;
  }
  let count = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === "万" || unit === "w") {
    count *= 10000;
  } else if (unit === "千" || unit === "k") {
    count *= 1000;
  }
  return Math.max(0, Math.floor(count));
}

function compactXhsMetadata(item: MobileTrendContent) {
  let text = item.content.replace(/\s+/g, " ").trim();
  const title = item.title.replace(/\s+/g, " ").trim();
  for (let index = 0; index < 2; index += 1) {
    if (title && text.startsWith(title)) {
      text = text.slice(title.length).trim();
    }
  }
  const match = text.match(COMPACT_XHS_METADATA_RE);
  if (!match) {
    return { author: null as string | null, likes: 0 };
  }
  const author = match[1]?.trim();
  const noisyAuthor = /赞|收藏|评论|分享|转发|关注|登录|小红书/.test(author);
  return {
    author: author && !noisyAuthor ? author : null,
    likes: parseCompactMetric(match[3])
  };
}

export function mobileTrendAuthor(item: MobileTrendContent) {
  return item.author || compactXhsMetadata(item).author || "未知作者";
}

export function mobileTrendLikes(item: MobileTrendContent) {
  return item.likes || compactXhsMetadata(item).likes;
}

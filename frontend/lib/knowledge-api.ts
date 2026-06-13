export type KnowledgeItem = {
  category: string | null;
  content: string;
  id: number;
  match_type?: string;
  score?: number | null;
  title: string;
};

type FetchKnowledgeItemsOptions = {
  category?: string;
  limit?: number;
  query?: string;
};

export function isKnowledgeItem(value: unknown): value is KnowledgeItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Partial<KnowledgeItem>;
  return (
    typeof item.id === "number" &&
    typeof item.title === "string" &&
    typeof item.content === "string" &&
    (typeof item.category === "string" || item.category === null || item.category === undefined)
  );
}

const knowledgeCategoryLabels: Record<string, string> = {
  "trend-insight": "趋势摘要",
  "xiaohongshu-case": "小红书案例",
  xiaohongshu_reference: "高赞参考"
};

export function knowledgeCategoryLabel(category: KnowledgeItem["category"]) {
  const normalized = category?.trim();
  if (!normalized) {
    return "未分类";
  }
  return knowledgeCategoryLabels[normalized] ?? normalized;
}

function cleanKnowledgeDisplayText(value: string) {
  return value
    .replace(/^Source:\s*https?:\/\/\S+\s*/gim, "")
    .replace(/^来源链接[:：]\s*https?:\/\/\S+\s*/gim, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/（\s*xiaohongshu\s*）/gi, "（小红书）")
    .replace(/\(\s*xiaohongshu\s*\)/gi, "（小红书）")
    .replace(/\bxiaohongshu\b/gi, "小红书")
    .replace(/\bdouyin\b/gi, "抖音")
    .replace(/\bXHS\b/gi, "小红书")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function knowledgeItemTitle(item: KnowledgeItem) {
  const normalized = cleanKnowledgeDisplayText(item.title)
    .replace(/^趋势摘要[:：]\s*/, "")
    .trim();
  return normalized || "未命名知识";
}

export function knowledgeItemContent(item: KnowledgeItem) {
  return cleanKnowledgeDisplayText(item.content) || "暂无正文摘要";
}

export function knowledgeItemExcerpt(item: KnowledgeItem, maxLength = 96) {
  const normalized = knowledgeItemContent(item);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trim()}...`;
}

export async function fetchKnowledgeItems(
  apiBase: string,
  options: FetchKnowledgeItemsOptions = {}
) {
  const query = options.query?.trim() ?? "";
  const params = new URLSearchParams({
    limit: String(options.limit ?? 20)
  });
  if (options.category?.trim()) {
    params.set("category", options.category.trim());
  }
  if (query) {
    params.set("q", query);
    params.set("mode", "hybrid");
  }

  const path = query ? "search" : "list";
  const response = await fetch(`${apiBase}/knowledge/${path}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(query ? "知识库搜索失败，请稍后再试。" : "知识库读取失败，请稍后再试。");
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.filter(isKnowledgeItem);
}

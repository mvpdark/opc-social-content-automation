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

export function knowledgeItemExcerpt(item: KnowledgeItem, maxLength = 96) {
  const normalized = item.content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized || "暂无正文摘要";
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

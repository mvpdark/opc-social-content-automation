export type {
  KnowledgeItem,
} from "./knowledge-types";
export {
  isKnowledgeItem,
  knowledgeCategoryLabel,
  knowledgeItemTitle,
  knowledgeItemContent,
  knowledgeItemExcerpt,
} from "./knowledge-types";
import { isKnowledgeItem } from "./knowledge-types";

type FetchKnowledgeItemsOptions = {
  category?: string;
  limit?: number;
  query?: string;
  signal?: AbortSignal;
};

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
  try {
    const response = await fetch(`${apiBase}/knowledge/${path}?${params.toString()}`, { signal: options.signal });
    if (!response.ok) {
      throw new Error(query ? "知识库搜索失败，请稍后再试。" : "知识库读取失败，请稍后再试。");
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      return [];
    }
    return payload.filter(isKnowledgeItem);
  } catch (error) {
    // ZSCJ 服务（知识库/趋势采集）可能未启动，网络错误时返回空数组而非抛出异常
    if (error instanceof TypeError) {
      if (process.env.NODE_ENV === "development") console.warn("[knowledge-api] Network error fetching knowledge items:", error);
      return [];
    }
    throw error;
  }
}

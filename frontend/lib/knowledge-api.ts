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

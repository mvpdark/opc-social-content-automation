export type GenerationKnowledgeSource = {
  category?: string | null;
  content: string;
  id: number;
  match_type?: string | null;
  score?: number | null;
  title: string;
};

export type GenerationWebSearchSource = {
  content: string;
  score?: number | null;
  title: string;
  url: string;
};

export type GenerationSourceContext = {
  knowledge_items?: GenerationKnowledgeSource[];
  knowledge_query?: string | null;
  promotion_brief?: Record<string, unknown>;
  review_note?: string;
  web_search?: {
    answer?: string | null;
    provider?: string | null;
    query?: string | null;
    required?: boolean;
    results?: GenerationWebSearchSource[];
  };
};

export type GeneratedContent = {
  body: string;
  created_at?: string;
  id: number;
  platform: string;
  source_context?: GenerationSourceContext | null;
  status: string;
  tags: string[] | null;
  title: string;
};

export function sourceContextMatchesKnowledgeQuery(
  sourceContext: GenerationSourceContext | null | undefined,
  knowledgeQuery: string
) {
  const sourceQuery = sourceContext?.knowledge_query?.trim();
  return Boolean(sourceQuery && sourceQuery === knowledgeQuery.trim());
}

export function generationSourceContextStats(
  sourceContext: GenerationSourceContext | null | undefined
) {
  const knowledgeCount = sourceContext?.knowledge_items?.length ?? 0;
  const webRequired = Boolean(sourceContext?.web_search?.required);
  const webCount = sourceContext?.web_search?.results?.length ?? 0;
  const totalCount = knowledgeCount + webCount;

  return {
    hasEvidence: totalCount > 0,
    knowledgeCount,
    missingRequiredWebResults: webRequired && webCount === 0,
    totalCount,
    webCount,
    webEvidenceCountLabel: webCount ? `${webCount} 条` : webRequired ? "未返回" : "未启用",
    webRequired
  };
}

export type GeneratedImageAsset = {
  content_id: number;
  created_at?: string;
  created_by?: number | null;
  error?: string | null;
  id: number;
  image_url: string;
  prompt?: string | null;
  status: string;
  template?: string | null;
};

export function isGeneratedContent(value: unknown): value is GeneratedContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const content = value as Partial<GeneratedContent>;
  return (
    typeof content.body === "string" &&
    typeof content.id === "number" &&
    typeof content.platform === "string" &&
    typeof content.status === "string" &&
    typeof content.title === "string" &&
    (Array.isArray(content.tags) || content.tags === null || content.tags === undefined)
  );
}

export function isGeneratedImageAsset(value: unknown): value is GeneratedImageAsset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const image = value as Partial<GeneratedImageAsset>;
  return (
    typeof image.content_id === "number" &&
    typeof image.id === "number" &&
    typeof image.image_url === "string" &&
    typeof image.status === "string"
  );
}

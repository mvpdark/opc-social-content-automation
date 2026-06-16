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

export type GenerationPromotionBrief = {
  cover_angle?: string;
  cta?: string;
  forbidden_claims?: string[];
  intent?: {
    guidance?: string;
    key?: string;
    label?: string;
  };
  manual_review_required?: boolean;
  pain_point?: string;
  quality_checks?: string[];
  source_requirements?: string[];
  success_metric?: string;
  target_persona?: string;
  trust_proof?: string;
};

export type GenerationSourceContext = {
  knowledge_items?: GenerationKnowledgeSource[];
  knowledge_query?: string | null;
  promotion_brief?: GenerationPromotionBrief | null;
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

function firstDisplayString(values: string[] | undefined) {
  return values?.find((item) => item.trim().length > 0)?.trim() ?? "";
}

export function promotionBriefDisplayItems(
  sourceContext: GenerationSourceContext | null | undefined
) {
  const brief = sourceContext?.promotion_brief;
  if (!brief) {
    return [];
  }

  return [
    {
      key: "intent",
      label: "选题意图",
      value: brief.intent?.label ?? brief.intent?.key ?? ""
    },
    {
      key: "persona",
      label: "目标人群",
      value: brief.target_persona ?? ""
    },
    {
      key: "cta",
      label: "行动引导",
      value: brief.cta ?? ""
    },
    {
      key: "source",
      label: "来源边界",
      value: firstDisplayString(brief.source_requirements)
    },
    {
      key: "cover",
      label: "封面角度",
      value: brief.cover_angle ?? ""
    },
    {
      key: "review",
      label: "人工复核",
      value: brief.manual_review_required ? "复制或发布准备前仍需人工确认" : ""
    }
  ].filter((item) => item.value.trim().length > 0);
}

export type PromotionReadinessState = "ready" | "review" | "blocked";

export type PromotionReadinessItem = {
  detail: string;
  key: "intent" | "persona" | "cta" | "sources" | "cover" | "human";
  label: string;
  state: PromotionReadinessState;
};

export type PromotionReadinessSummary = {
  items: PromotionReadinessItem[];
  score: number;
  state: PromotionReadinessState;
  stateLabel: string;
};

export type PromotionReadinessDraft = {
  body: string;
  tags: string[] | string | null | undefined;
  title: string;
};

const conversionCueTerms = [
  "私信",
  "留言",
  "评论",
  "咨询",
  "回复",
  "预约",
  "领取",
  "联系",
  "background",
  "manual review"
];

function normalizeForPromotionMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[#\s，。、“”‘’：:；;,.!?！？（）()[\]{}<>《》]/g, "");
}

function draftTextIncludes(draftText: string, value: string | null | undefined) {
  const normalizedNeedle = normalizeForPromotionMatch(value ?? "");
  return Boolean(normalizedNeedle && normalizeForPromotionMatch(draftText).includes(normalizedNeedle));
}

function tagsToText(tags: PromotionReadinessDraft["tags"]) {
  return Array.isArray(tags) ? tags.join(" ") : tags ?? "";
}

export function buildPromotionReadinessSummary({
  coverAvailable,
  draft,
  sourceContext
}: {
  coverAvailable: boolean;
  draft: PromotionReadinessDraft;
  sourceContext: GenerationSourceContext | null | undefined;
}): PromotionReadinessSummary | null {
  const brief = sourceContext?.promotion_brief;
  if (!brief) {
    return null;
  }

  const sourceStats = generationSourceContextStats(sourceContext);
  const draftText = `${draft.title}\n${draft.body}\n${tagsToText(draft.tags)}`;
  const intentLabel = brief.intent?.label ?? brief.intent?.key ?? "";
  const persona = brief.target_persona ?? "";
  const cta = brief.cta ?? "";
  const sourceRequirement = firstDisplayString(brief.source_requirements);
  const coverAngle = brief.cover_angle ?? "";
  const hasIntent = draftTextIncludes(draftText, intentLabel);
  const hasPersona = draftTextIncludes(draftText, persona);
  const hasConversionCue = conversionCueTerms.some((term) => draftTextIncludes(draftText, term));

  const items: PromotionReadinessItem[] = [
    {
      detail: hasIntent
        ? `草稿已保留「${intentLabel || "当前"}」选题意图。`
        : `请核对草稿是否偏离「${intentLabel || "当前"}」选题意图。`,
      key: "intent",
      label: "选题意图",
      state: hasIntent ? "ready" : "review"
    },
    {
      detail: hasPersona
        ? `正文已触达目标人群：${persona}。`
        : `目标人群需要更明显：${persona || "简报未填写"}。`,
      key: "persona",
      label: "人群匹配",
      state: hasPersona ? "ready" : "review"
    },
    {
      detail: hasConversionCue
        ? "正文已有评论、私信或咨询类行动引导；发布前仍需确认语气自然。"
        : `CTA 待加强：${cta || "需要补充清晰但不过度销售的行动引导"}。`,
      key: "cta",
      label: "CTA 转化",
      state: hasConversionCue ? "ready" : "review"
    },
    {
      detail: sourceStats.missingRequiredWebResults
        ? "当前选题需要联网来源，但没有可见 Tavily 结果；不要复制成事实结论。"
        : sourceStats.hasEvidence
          ? `已带 ${sourceStats.totalCount} 条来源证据；使用边界：${sourceRequirement || "发布前人工核对事实"}。`
          : `来源待补：${sourceRequirement || "没有可见知识库或联网依据"}。`,
      key: "sources",
      label: "来源安全",
      state: sourceStats.missingRequiredWebResults ? "blocked" : sourceStats.hasEvidence ? "ready" : "blocked"
    },
    {
      detail: coverAvailable
        ? `封面素材已存在；请核对是否贴合「${coverAngle || "简报封面角度"}」。`
        : `封面待核对：${coverAngle || "简报封面角度未填写"}。`,
      key: "cover",
      label: "封面方向",
      state: coverAvailable ? "ready" : "review"
    },
    {
      detail: brief.manual_review_required
        ? "复制或发布准备前仍需人工确认；系统不会自动发布。"
        : "建议仍按人工确认流程复核后再发布。",
      key: "human",
      label: "人工复核",
      state: "review"
    }
  ];

  const points = items.reduce((total, item) => {
    if (item.state === "ready") {
      return total + 2;
    }
    if (item.state === "review") {
      return total + 1;
    }
    return total;
  }, 0);
  const score = Math.round((points / (items.length * 2)) * 100);
  const state: PromotionReadinessState = items.some((item) => item.state === "blocked")
    ? "blocked"
    : score >= 80
      ? "ready"
      : "review";

  return {
    items,
    score,
    state,
    stateLabel:
      state === "blocked" ? "需补来源" : state === "ready" ? "可进入人工复核" : "待人工优化"
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

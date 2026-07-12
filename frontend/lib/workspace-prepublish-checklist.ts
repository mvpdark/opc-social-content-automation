import {
  generationSourceContextStats,
  type GeneratedContent
} from "@/lib/generated-assets";
import { buildPlatformCopyText } from "@/lib/platform-copy";
import { formatTagLine } from "@/lib/tags";

export const blockedPublishTerms = [
  "保录",
  "包过",
  "百分百",
  "100%",
  "内部名额",
  "官方录取",
  "保证录取",
  "保证套磁成功",
  "必上岸"
];

export const localDraftMarkers = [
  "codex_test",
  "\u3010\u6d4b\u8bd5\u8349\u7a3f\u3011",
  "\u3010\u6f14\u793a\u8349\u7a3f\u3011",
  "\u3010\u672c\u5730\u68c0\u67e5\u8349\u7a3f\u3011"
];

export const pcReviewQueueStatuses = new Set(["draft", "rewritten", "review_pending"]);

export function buildPlatformCopy(content: GeneratedContent) {
  return buildPlatformCopyText({
    body: content.body,
    tags: content.tags,
    title: content.title
  });
}

export function complianceWarnings(content: GeneratedContent) {
  const text = `${content.title}\n${content.body}\n${formatTagLine(content.tags)}`;
  return blockedPublishTerms.filter((term) => text.includes(term));
}

export function isTestDraft(content: GeneratedContent) {
  return localDraftMarkers.some((marker) => content.body.includes(marker));
}

export function isPcReviewQueueCandidate(content: GeneratedContent) {
  return content.platform === "xiaohongshu" && pcReviewQueueStatuses.has(content.status) && !isTestDraft(content);
}

export type PrepublishChecklistState = "ready" | "review" | "blocked";

export type PrepublishChecklistItem = {
  detail: string;
  key: "content" | "sources" | "cover" | "risk" | "human";
  label: string;
  state: PrepublishChecklistState;
};

export const prepublishChecklistTone = {
  blocked: "red",
  ready: "green",
  review: "amber"
} as const satisfies Record<PrepublishChecklistState, "red" | "green" | "amber">;

export const prepublishChecklistStateLabel = {
  blocked: "需补充",
  ready: "已就绪",
  review: "待核对"
} satisfies Record<PrepublishChecklistState, string>;

export function missingGeneratedContentFields(content: GeneratedContent) {
  const missingFields: string[] = [];
  if (!content.title.trim()) {
    missingFields.push("标题");
  }
  if (!content.body.trim()) {
    missingFields.push("正文");
  }
  if (!formatTagLine(content.tags)) {
    missingFields.push("标签");
  }
  return missingFields;
}

export function buildPrepublishChecklist({
  content,
  imageReady,
  lifecycleWarning,
  testDraft,
  warnings
}: {
  content: GeneratedContent;
  imageReady: boolean;
  lifecycleWarning: string | null;
  testDraft: boolean;
  warnings: string[];
}): PrepublishChecklistItem[] {
  const sourceStats = generationSourceContextStats(content.source_context);
  const missingContentFields = missingGeneratedContentFields(content);
  const sourceDetail = sourceStats.missingRequiredWebResults
    ? "当前选题需要实时来源，但没有可见 Tavily 结果，复制前先补来源。"
    : sourceStats.hasEvidence
      ? `已带 ${sourceStats.totalCount} 条来源证据，复制前核对学校、价格、logo、排名等事实。`
      : "未带来源证据，只能作为通用草稿，复制前请人工补充可信依据。";

  return [
    {
      detail: missingContentFields.length
        ? `缺少${missingContentFields.join("、")}；请回到表单补齐后重新生成，或人工补充后再复制。`
        : "标题、正文、标签会一起复制；发布前仍需逐项读一遍。",
      key: "content",
      label: "标题/正文/标签",
      state: missingContentFields.length ? "blocked" : "ready"
    },
    {
      detail: sourceDetail,
      key: "sources",
      label: "来源证据",
      state: sourceStats.missingRequiredWebResults ? "blocked" : sourceStats.hasEvidence ? "review" : "blocked"
    },
    {
      detail: imageReady
        ? "封面素材已生成；仍需核对是否含假校徽、假录取或误导视觉。"
        : "封面尚未生成或不可用；复制正文前先决定是否补封面。",
      key: "cover",
      label: "封面素材",
      state: imageReady ? "review" : "blocked"
    },
    {
      detail: warnings.length
        ? `发现高风险词：${warnings.join("、")}。请修改后再复制。`
        : "未发现保录、包过、内部名额等高风险承诺词。",
      key: "risk",
      label: "安全用语",
      state: warnings.length ? "blocked" : "ready"
    },
    {
      detail: testDraft
        ? "这是本地检查草稿，不可直接发布。"
        : lifecycleWarning
          ? lifecycleWarning
          : "当前仍是草稿状态；复制只准备素材，最终发布必须人工确认。",
      key: "human",
      label: "人工确认",
      state: testDraft || lifecycleWarning ? "blocked" : "review"
    }
  ];
}

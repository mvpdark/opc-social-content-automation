import {
  generationSourceContextStats,
  type GeneratedContent
} from "@/lib/generated-assets";
import { type DraftPreviewState } from "@/lib/mobile-draft-storage";
import { generatedContentLifecycleWarning } from "@/lib/status-labels";

export type MobilePreviewChecklistState = "ready" | "review" | "blocked";

export type MobilePreviewChecklistItem = {
  detail: string;
  key: "content" | "sources" | "cover" | "risk" | "human";
  label: string;
  state: MobilePreviewChecklistState;
};

export const mobilePreviewChecklistStateLabel = {
  blocked: "需补充",
  ready: "已就绪",
  review: "待核对"
} satisfies Record<MobilePreviewChecklistState, string>;

export const mobilePreviewChecklistStateClass = {
  blocked: "border-coral/40 bg-blush text-coral",
  ready: "border-sage bg-sage text-moss",
  review: "border-amber/40 bg-amber/10 text-amber-ink"
} satisfies Record<MobilePreviewChecklistState, string>;

const mobileBlockedPublishTerms = [
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

export function missingMobileDraftFields(draft: DraftPreviewState) {
  const missingFields: string[] = [];
  if (!draft.title.trim()) {
    missingFields.push("标题");
  }
  if (!draft.body.trim()) {
    missingFields.push("正文");
  }
  if (!draft.tags.trim()) {
    missingFields.push("标签");
  }
  return missingFields;
}

export function buildMobilePreviewChecklist({
  coverImageUrl,
  draft,
  generatedContent
}: {
  coverImageUrl: string | null;
  draft: DraftPreviewState;
  generatedContent: GeneratedContent | null;
}): MobilePreviewChecklistItem[] {
  const sourceStats = generationSourceContextStats(generatedContent?.source_context);
  const lifecycleWarning = generatedContent ? generatedContentLifecycleWarning(generatedContent.status) : null;
  const draftText = `${draft.title}\n${draft.body}\n${draft.tags}`;
  const missingContentFields = missingMobileDraftFields(draft);
  const riskyTerms = mobileBlockedPublishTerms.filter((term) => draftText.includes(term));
  const sourceDetail = !generatedContent
    ? "本地草稿没有后端来源证据，发布前请先生成正式草稿。"
    : sourceStats.missingRequiredWebResults
      ? "当前选题需要实时来源，但没有可见 Tavily 结果，发布前先补来源。"
      : sourceStats.hasEvidence
        ? `已带 ${sourceStats.totalCount} 条来源证据，发布前核对学校、价格、logo、排名等事实。`
        : "未带来源证据，只能作为通用草稿，发布前请人工补充可信依据。";

  return [
    {
      detail: missingContentFields.length
        ? `缺少${missingContentFields.join("、")}；请回到表单补齐后重新生成，或在预览中人工补充后再复制。`
        : "标题、正文和标签会一起准备；发布前仍需逐项读一遍。",
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
      detail: coverImageUrl
        ? "封面素材已准备；仍需核对是否含假校徽、假录取或误导视觉。"
        : "封面尚未生成，将使用文字封面预览；发布前请确认是否补图。",
      key: "cover",
      label: "封面素材",
      state: coverImageUrl ? "review" : "blocked"
    },
    {
      detail: riskyTerms.length
        ? `发现高风险词：${riskyTerms.join("、")}。请修改后再复制。`
        : "未发现保录、包过、内部名额等高风险承诺词。",
      key: "risk",
      label: "安全用语",
      state: riskyTerms.length ? "blocked" : "ready"
    },
    {
      detail: lifecycleWarning
        ? lifecycleWarning
        : generatedContent
          ? "当前仍是草稿素材；复制或分享只做准备，最终发布必须人工确认。"
          : "本地草稿不可直接发布，请先生成正式草稿并人工确认。",
      key: "human",
      label: "人工确认",
      state: lifecycleWarning ? "blocked" : generatedContent ? "review" : "blocked"
    }
  ];
}

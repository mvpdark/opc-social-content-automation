import { memo } from "react";
import {
  buildPromotionReadinessSummary,
  type GenerationSourceContext,
  type PromotionReadinessDraft,
  type PromotionReadinessState
} from "@/lib/generated-assets";

const stateClass = {
  blocked: "border-coral/40 bg-coral/10 text-ink",
  ready: "border-moss/40 bg-moss/10 text-ink",
  review: "border-amber/40 bg-amber/10 text-ink"
} satisfies Record<PromotionReadinessState, string>;

const stateLabel = {
  blocked: "需补充",
  ready: "已就绪",
  review: "待核对"
} satisfies Record<PromotionReadinessState, string>;

export const PromotionReadinessSummary = memo(function PromotionReadinessSummary({
  coverAvailable,
  draft,
  sourceContext,
  testId,
  variant = "desktop"
}: {
  coverAvailable: boolean;
  draft: PromotionReadinessDraft;
  sourceContext: GenerationSourceContext | null | undefined;
  testId: string;
  variant?: "desktop" | "mobile";
}) {
  const summary = buildPromotionReadinessSummary({
    coverAvailable,
    draft,
    sourceContext
  });
  if (!summary) {
    return null;
  }

  const mobile = variant === "mobile";

  return (
    <section
      className={[
        "rounded-md border border-line bg-paper p-3",
        mobile ? "text-[11px] leading-5" : "text-xs leading-5"
      ].join(" ")}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className={mobile ? "font-black text-ink" : "font-semibold text-ink"}>
            推广对齐检查
          </div>
          <p className="mt-1 text-muted">
            对照推广简报检查草稿；这里只提示复核重点，不会自动发布。
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stateClass[summary.state]}`}
          data-testid={`${testId}-score`}
        >
          {summary.score}% · {summary.stateLabel}
        </span>
      </div>
      <div className={mobile ? "mt-3 grid gap-2" : "mt-3 grid gap-2 sm:grid-cols-2"}>
        {summary.items.map((item) => (
          <div
            className={`rounded-md border px-3 py-2 ${stateClass[item.state]}`}
            data-testid={`${testId}-${item.key}`}
            key={`${testId}-${item.key}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{item.label}</span>
              <span className="text-[10px] font-semibold">{stateLabel[item.state]}</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

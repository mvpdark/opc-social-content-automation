import {
  promotionBriefDisplayItems,
  type GenerationSourceContext
} from "@/lib/generated-assets";

export function PromotionBriefSummary({
  sourceContext,
  testId,
  variant = "desktop"
}: {
  sourceContext: GenerationSourceContext | null;
  testId: string;
  variant?: "desktop" | "mobile";
}) {
  const items = promotionBriefDisplayItems(sourceContext);
  if (!items.length) {
    return null;
  }

  const mobile = variant === "mobile";

  return (
    <section
      className={[
        "mt-3 border-l-4 border-moss",
        mobile ? "pl-3 text-[11px] font-semibold leading-5" : "pl-3 text-[11px] leading-5"
      ].join(" ")}
      data-testid={testId}
    >
      <div className={mobile ? "font-black text-ink" : "font-semibold text-ink"}>
        推广简报
      </div>
      <p className="mt-1 text-muted">
        约束撰稿策略、来源边界和行动引导；发布前仍需人工复核。
      </p>
      <dl className={mobile ? "mt-2 space-y-1.5" : "mt-2 grid gap-1.5 sm:grid-cols-2"}>
        {items.map((item) => (
          <div key={item.key} className="min-w-0">
            <dt className="text-[10px] font-semibold text-moss">{item.label}</dt>
            <dd className="mt-0.5 break-words text-muted">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

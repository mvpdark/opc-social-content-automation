import type { GenerationSourceCard } from "@/lib/generated-assets";

const confidenceLabel: Record<string, string> = {
  missing_required_source: "???",
  review_required: "???",
  source_visible: "????"
};

function cardConfidenceLabel(confidence: string | null | undefined) {
  return confidence ? confidenceLabel[confidence] ?? confidence : "???";
}

export function SourceCardSummary({
  cards,
  testId,
  variant = "desktop"
}: {
  cards: GenerationSourceCard[];
  testId: string;
  variant?: "desktop" | "mobile";
}) {
  if (!cards.length) {
    return null;
  }

  const mobile = variant === "mobile";

  return (
    <section
      className={[
        mobile
          ? "mt-3 rounded-[20px] border border-white/[0.86] bg-white/70 px-3 py-2"
          : "mt-3 rounded-md border border-line bg-paper px-3 py-2",
        mobile ? "text-[11px] font-medium leading-5" : "text-[11px] leading-5"
      ].join(" ")}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={mobile ? "text-xs font-black text-ink" : "text-xs font-semibold text-ink"}>
          ????
        </div>
        <span className={mobile ? "rounded-full bg-[#e7f2ea] px-2 py-0.5 text-[10px] font-black text-moss" : "rounded-md border border-moss/40 bg-moss/10 px-2 py-0.5 text-[10px] font-semibold text-ink"}>
          {cards.length} ?
        </span>
      </div>
      <div className="mt-2 space-y-2">
        {cards.slice(0, mobile ? 3 : 4).map((card) => (
          <article
            className={mobile ? "rounded-[16px] border border-white/[0.86] bg-white/76 px-3 py-2" : "rounded-md border border-line bg-mist/45 px-3 py-2"}
            data-testid={`${testId}-item`}
            key={card.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className={mobile ? "text-xs font-black text-ink" : "text-xs font-semibold text-ink"}>
                {card.title}
              </h4>
              <span className="text-[10px] font-semibold text-moss">
                {cardConfidenceLabel(card.confidence)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-muted">
              ?????{card.supported_claim}
            </p>
            {card.unsupported_boundary ? (
              <p className="mt-1 whitespace-pre-wrap break-words text-[#8a6110]">
                ?????{card.unsupported_boundary}
              </p>
            ) : null}
            {card.safe_for?.length ? (
              <p className="mt-1 text-moss">????{card.safe_for.join(" / ")}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}



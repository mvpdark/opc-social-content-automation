# OPC Promotion Precision Loop Guide

This guide turns the postgraduate-to-PhD Xiaohongshu promotion strategy into small,
verifiable Loop Engineering work. The goal is not to make the system louder; it is
to make each generated draft more aligned, evidence-aware, and useful for lead
generation while preserving human review.

## North Star

OPC should evolve from:

```text
knowledge/search -> GPT draft -> DeepSeek rewrite
```

into:

```text
topic intent -> fact ledger -> promotion brief -> draft variants -> safety/quality scoring -> human confirmation
```

Every promotion loop must improve at least one of these capabilities without
inventing facts, faking search/model/image/publishing output, or bypassing manual
confirmation.
Do not accept a model-provider change as a complete loop unless it also adds a
measurable promotion-quality or source-safety gate.

## Promotion Loop Priorities

### 1. Topic Intent Routing

Classify the selected or custom topic before drafting. The intent should decide
prompt template, required evidence, cover direction, tags, and validation gates.

Core intents:

- Ranking/list topics: compare programs, schools, routes, or options.
- Route/decision topics: help users choose domestic/overseas, full-time/in-service,
  application path, or background-building path.
- Mentor-matching topics: research direction, supervisor fit, paper/project match.
- Timing/schedule topics: preparation timeline, material deadlines, DDL planning.
- Sales/marketing topics: consultation value, lead capture, objection handling.
- Source-check topics: school lists, rankings, fees, logos, policies, market data,
  exchange rates, or other current facts.

Acceptance:

- The UI and backend agree on the detected intent.
- Generated title, body, tags, cover direction, and checklist stay on that intent.
- Ranking/list topics must not drift into mentor matching or generic time planning.
- Source-check topics require collected knowledge or Tavily/web evidence, or produce
  only a verification framework.

### 2. Fact Ledger

Before drafting, condense knowledge/search results into source cards that say what
is supported and what is not supported.

Each fact card should carry:

- source title and URL or knowledge item id;
- freshness or collection time if available;
- supported claim;
- unsupported or risky claim boundaries;
- confidence/review status;
- whether the fact is safe for title, body, cover, or only checklist notes.

Acceptance:

- Drafting payload references fact cards, not raw unchecked claims alone.
- Current facts such as rankings, fees, school lists, logos, prices, and exchange
  rates are blocked or downgraded when no source card supports them.
- The preview/checklist shows missing-source risk in user-visible language.

### 3. Promotion Brief

Generate or assemble a short brief before writing the post. The brief turns the
topic into a marketing plan.

Brief fields:

- target persona;
- pain point;
- trust proof;
- offer or consultation angle;
- CTA;
- forbidden claims;
- source requirements;
- cover angle;
- success metric, such as saves, comments, private messages, or consultation intent.

Acceptance:

- Drafts cite or derive from the brief.
- CTA is aligned with the topic and does not imply guaranteed admission, ranking, or
  official endorsement.
- Thin business material produces a warning or a conservative brief, not fabricated
  selling points.

### 4. Variants and Scoring

Do not treat the first model output as the final recommendation. Prefer small,
bounded variants when the user flow can support it.

Variant targets:

- 3 title options;
- 2 opening hooks;
- 2 cover directions;
- 1 recommended full draft.

Scoring dimensions:

- topic-intent alignment;
- source safety;
- Xiaohongshu stop-power;
- persona fit;
- conversion clarity;
- cover/title/body consistency;
- manual-review readiness.

Acceptance:

- The recommended variant explains why it was selected.
- Low-scoring drafts remain editable but should not be marked ready for publishing.
- Scoring must not replace human review.

### 5. Cover and Title Coupling

Cover direction should be generated from topic intent and fact support, not as a
generic image prompt.

Useful cover patterns:

- route map;
- decision matrix;
- checklist;
- timeline;
- mentor-fit matrix;
- source verification table;
- contrast card;
- consultation question card.

Acceptance:

- Cover text and title support the same promise.
- Covers do not show fake certificates, fake school logos, fake rankings, or
  guaranteed-admission signals.
- Mobile preview remains readable at 360, 390, and 414 px widths.

### 6. Publish-Readiness Review

Before copy/export, show a clear review state for promotion quality and safety.

Checklist items:

- facts have sources;
- topic intent is preserved;
- CTA is clear and compliant;
- title/body/tags match;
- cover direction matches;
- risky terms are flagged;
- human confirmation is still required.

Acceptance:

- Missing critical items create visible warnings.
- Copy/preview remains available only as manual publishing preparation.
- No automated publishing is introduced.

### 7. Feedback Loop

Human review feedback should become future generation guidance.

Feedback labels:

- title weak;
- hook weak;
- fact risk;
- too much like an ad;
- CTA unclear;
- topic drift;
- cover mismatch;
- ready to publish.

Acceptance:

- Feedback is stored without secrets or platform cookies.
- Future prompts can reference safe aggregate preferences.
- Feedback never creates automatic publishing behavior.

## Suggested Loop Order

1. Add topic-intent routing and regression checks for selected/custom topics.
2. Add fact-ledger source cards for source-check topics.
3. Add promotion brief payload and UI summary.
4. Add draft scoring checklist before copy/export.
5. Add variant generation for title/opening/cover direction.
6. Add feedback labels and reuse them in future brief generation.

## Scoring Note

When scoring a loop in `EVAL_MATRIX.md`, give extra product value only when the
change measurably improves lead-generation precision, topic alignment, evidence
safety, or manual-review readiness. Pure model-provider swaps should score low
unless they add a verifiable quality gate.

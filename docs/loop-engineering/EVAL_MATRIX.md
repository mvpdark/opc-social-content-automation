# OPC Evaluation Matrix

Score every loop out of 100.

## Product value — 30 points

- 0–10: minor internal cleanup with no clear user impact
- 11–20: improves one visible workflow or reduces confusion
- 21–30: fixes a main-flow blocker or protects core business value

Questions:

- Does this help users log in, create tasks, generate drafts, preview covers, or confirm publishing?
- Does this reduce user confusion or operational risk?
- For 硕升博 promotion, does it improve topic-intent alignment, persona fit,
  evidence-backed claims, CTA clarity, or lead-generation usefulness?

## Correctness — 20 points

- 0–7: behavior is speculative or unverified
- 8–14: behavior works in one path but lacks edge coverage
- 15–20: behavior is verified across expected success/failure paths

Questions:

- Are loading, success, empty, and error states handled?
- Are auth/session states explicit?
- Does a ranking/list topic stay a ranking/list topic, and do source-check topics
  avoid unsupported school, price, logo, ranking, or policy conclusions?

## Test coverage — 20 points

- 0–5: no tests and no manual verification
- 6–12: manual verification or minimal unit coverage
- 13–17: smoke/E2E coverage for the changed path
- 18–20: regression test plus clear failure mode coverage

Questions:

- Will a future regression be caught?
- Can another engineer run the test?
- Do tests cover at least one promotion-quality failure mode such as topic drift,
  missing source facts, weak draft structure, cover/title mismatch, or unsafe CTA?

## Safety and security — 15 points

- 0–5: introduces risky behavior or leaks sensitive data
- 6–10: neutral, no obvious issue
- 11–15: improves auth, validation, or safe confirmation

Questions:

- Are credentials passed through environment variables only?
- Is manual confirmation preserved?
- Are API failures handled without exposing secrets?
- Are current facts sourced before drafting, and are guaranteed admission, fake
  rankings, fake logos, or fake official endorsements blocked?

## Maintainability — 10 points

- 0–3: large unexplained rewrite
- 4–7: understandable but not well isolated
- 8–10: small, cohesive, idiomatic change

Questions:

- Is the patch easy to review?
- Does it fit existing architecture?

## UX polish — 5 points

- 0–1: worsens UX
- 2–3: basic improvement
- 4–5: clear, accessible, responsive behavior

Questions:

- Does mobile work?
- Are labels, focus states, and error messages clear?
- Does the UI help the user understand why a draft is persuasive, source-safe, and
  still only manual publishing preparation?

## Promotion Precision Bonus Guidance

For loops focused on 硕升博 Xiaohongshu lead generation:

- 25-30 product value requires a measurable improvement to lead-generation precision,
  such as intent routing, fact-ledger enforcement, promotion brief quality,
  variant scoring, or review feedback reuse.
- 18-24 product value is appropriate for UI copy or validation that makes an
  existing generation path clearer or safer.
- 0-12 product value is appropriate for pure provider/model swaps, prompt wording
  tweaks without regression coverage, or unverified style preferences.

## Keep/revert guidance

- 85–100: keep and consider expanding coverage.
- 70–84: keep if checks pass and risk is documented.
- 50–69: keep only if it fixes a blocker; otherwise revise.
- below 50: revert or redesign.

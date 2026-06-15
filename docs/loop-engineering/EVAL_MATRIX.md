# OPC Evaluation Matrix

Score every loop out of 100.

## Product value — 30 points

- 0–10: minor internal cleanup with no clear user impact
- 11–20: improves one visible workflow or reduces confusion
- 21–30: fixes a main-flow blocker or protects core business value

Questions:

- Does this help users log in, create tasks, generate drafts, preview covers, or confirm publishing?
- Does this reduce user confusion or operational risk?

## Correctness — 20 points

- 0–7: behavior is speculative or unverified
- 8–14: behavior works in one path but lacks edge coverage
- 15–20: behavior is verified across expected success/failure paths

Questions:

- Are loading, success, empty, and error states handled?
- Are auth/session states explicit?

## Test coverage — 20 points

- 0–5: no tests and no manual verification
- 6–12: manual verification or minimal unit coverage
- 13–17: smoke/E2E coverage for the changed path
- 18–20: regression test plus clear failure mode coverage

Questions:

- Will a future regression be caught?
- Can another engineer run the test?

## Safety and security — 15 points

- 0–5: introduces risky behavior or leaks sensitive data
- 6–10: neutral, no obvious issue
- 11–15: improves auth, validation, or safe confirmation

Questions:

- Are credentials passed through environment variables only?
- Is manual confirmation preserved?
- Are API failures handled without exposing secrets?

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

## Keep/revert guidance

- 85–100: keep and consider expanding coverage.
- 70–84: keep if checks pass and risk is documented.
- 50–69: keep only if it fixes a blocker; otherwise revise.
- below 50: revert or redesign.

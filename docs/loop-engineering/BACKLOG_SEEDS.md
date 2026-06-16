# OPC Backlog Seeds for Codex Loops

Use this as the initial improvement queue. Re-prioritize after inspecting the real code.

## P0 — Main-flow blockers

### 1. Mobile auth-state hang fallback

Problem: mobile route may remain on “checking login status.”

Hypothesis: Adding explicit auth-state timeout/error fallback will prevent mobile users from getting stuck.

Acceptance:

- Unauthenticated mobile route resolves to login/recovery UI.
- Authenticated mobile route resolves to selected tab.
- E2E test fails before fix and passes after fix.

### 2. Login failure feedback

Problem: bad credentials or network failure may be unclear.

Hypothesis: Clear error states reduce repeated failed attempts and support burden.

Acceptance:

- Bad credentials show visible message.
- Network/API failure shows retry guidance.
- Password is not echoed or logged.

### 3. Preserve redirect after login

Problem: mobile URL includes `from` and `tab`; login may lose destination.

Hypothesis: Preserving redirect params improves cross-device continuity.

Acceptance:

- After login from mobile URL, user lands on intended tab/home.
- Unsafe redirect values are sanitized.

## P1 — Test harness

### 4. PC and mobile smoke tests

Problem: core routes are not protected.

Hypothesis: Playwright smoke tests catch login/loading regressions quickly.

Acceptance:

- Test covers PC route load.
- Test covers mobile route auth resolution.
- Test credentials are environment-based.

### 5. Build/lint/typecheck baseline

Problem: Codex cannot improve reliably without a known baseline.

Hypothesis: A single check script helps every loop verify itself.

Acceptance:

- `scripts/opc-loop-check.sh` runs relevant package scripts.
- Missing scripts are reported, not treated as success.

## P2 — Product workflow

### 6. Draft output schema guard

Problem: AI draft output can be incomplete or inconsistent.

Hypothesis: A schema guard for title/body/tags/checklist/cover suggestion improves quality and UI reliability.

Acceptance:

- Draft renderer handles missing fields gracefully.
- Generated output is normalized before display.
- Empty/incomplete AI response shows recoverable error.

### 7. Publishing checklist state

Problem: Users may not know what to review before publishing.

Hypothesis: A checklist state makes manual confirmation safer.

Acceptance:

- Checklist shows required review items.
- Confirmation button is disabled or warned when critical items are missing.
- Manual override, if allowed, is explicit.

### 8. Cover preview mobile layout

Problem: cover preview may not fit narrow screens.

Hypothesis: Responsive preview improves confidence before publishing.

Acceptance:

- No horizontal overflow at 360/390/414 px widths.
- Empty/loading/error states exist.

### 9. Promotion topic intent router

Problem: 硕升博推广选题容易混用同一套撰稿逻辑，导致榜单、路线、导师匹配、时间规划和销售转化互相漂移。

Hypothesis: A topic-intent router will keep prompt, evidence requirements, tags, cover direction, and validation gates aligned with the selected or custom topic.

Acceptance:

- Ranking/list, route/decision, mentor-matching, timing/schedule, sales/marketing, and source-check topics have distinct intent labels.
- PC and mobile custom topics can be routed without hard-coded exact titles.
- Generated title/body/tags/cover direction do not drift across intents.
- Source-check topics require knowledge/Tavily evidence or produce only a verification framework.

### 10. Fact ledger source cards

Problem: Knowledge/search snippets can be passed to the model without a structured record of which claims are supported.

Hypothesis: A fact ledger will make drafts safer and more persuasive by separating supported claims from unsupported current facts.

Acceptance:

- Draft payload includes source cards with source id or URL, supported claim, freshness, confidence/review status, and usage boundary.
- Rankings, fees, school lists, logos, policies, prices, and exchange rates are blocked or downgraded without supporting cards.
- Preview/checklist shows missing-source risk in user language.

### 11. Promotion brief before drafting

Problem: The draft pipeline can summarize information but may lack a clear lead-generation strategy.

Hypothesis: A promotion brief will make drafts more targeted by defining persona, pain point, trust proof, CTA, forbidden claims, source requirements, and cover angle before writing.

Acceptance:

- The brief is visible or inspectable in logs/payloads.
- Drafts use the brief for hook, body, CTA, tags, and cover direction.
- Thin business material creates a warning or conservative brief, not fabricated selling points.

### 12. Variants and draft scoring

Problem: The first model output may not be the best title, hook, or cover promise.

Hypothesis: Bounded variants plus scoring will improve Xiaohongshu stop-power and conversion clarity while keeping manual review.

Acceptance:

- Generate or preview multiple title/opening/cover options within a bounded budget.
- Score topic-intent alignment, source safety, stop-power, persona fit, CTA clarity, and cover/title/body consistency.
- Recommend one option with a reason while keeping human review required.

### 13. Feedback labels for future generation

Problem: Human review feedback does not yet become structured guidance for future drafts.

Hypothesis: Simple review labels can improve future briefs and prompts without storing secrets or platform cookies.

Acceptance:

- Human can label title weak, hook weak, fact risk, too much like an ad, CTA unclear, topic drift, cover mismatch, or ready to publish.
- Labels are stored safely and can be summarized into future generation preferences.
- Feedback never triggers automatic publishing.

## P3 — Operational hardening

### 14. Task lifecycle model

Problem: task state may be implicit.

Hypothesis: Explicit task states reduce UI bugs and publishing mistakes.

Suggested states:

- `new`
- `material_ready`
- `generating`
- `draft_ready`
- `reviewing`
- `ready_to_publish`
- `published`
- `failed`

Acceptance:

- UI renders valid state transitions only.
- Invalid transitions show safe error.

### 15. Client error boundary

Problem: one runtime error can blank the app.

Hypothesis: Error boundary plus recovery action improves reliability.

Acceptance:

- Main app has fallback UI.
- Error fallback does not leak secrets.
- User can return to login/home.

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

## P3 — Operational hardening

### 9. Task lifecycle model

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

### 10. Client error boundary

Problem: one runtime error can blank the app.

Hypothesis: Error boundary plus recovery action improves reliability.

Acceptance:

- Main app has fallback UI.
- Error fallback does not leak secrets.
- User can return to login/home.

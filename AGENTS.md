# AGENTS.md — OPC Project Rules for Codex

You are working on OPC, an AI task execution platform focused on assisted Xiaohongshu lead-generation workflows. Your job is to improve the product through small, verifiable engineering loops.

## Product contract

OPC must remain an assisted workflow system, not an uncontrolled auto-publishing bot.

Core user journey:

1. User logs in.
2. User prepares business material and trend references.
3. System generates Xiaohongshu draft content: title, body, tags.
4. System previews the cover / first-screen publishing effect.
5. System produces a publishing checklist.
6. Human reviews and confirms before any final publish/submission action.

Non-negotiables:

- Keep human confirmation before publishing/submitting.
- Never hard-code credentials, tokens, cookies, API keys, or passwords.
- Never log secrets or test credentials.
- Treat `admin/admin` only as local or staging test credentials passed through environment variables.
- Do not weaken auth, remove validation, or fake successful operations just to make tests pass.
- Preserve mobile and desktop access paths.
- Prefer small, reversible changes over large rewrites.

## Loop engineering objective

Run bounded improvement loops:

1. Observe: inspect code, routes, current behavior, console errors, failing tests, UX gaps.
2. Hypothesize: state one concrete improvement hypothesis.
3. Patch: make the smallest useful code change.
4. Verify: run lint/typecheck/tests/build and at least one relevant smoke test.
5. Score: rate result against `docs/loop-engineering/EVAL_MATRIX.md`.
6. Record: update `LOOP_LOG.md` with evidence.
7. Continue: pick the next highest-value issue only after the current loop is verified.

Default loop budget: 3 loops per Codex run unless the user explicitly asks for more.

## Required repository discovery

Before changing code, create or update `PROJECT_MAP.md` with:

- framework and runtime
- package manager
- main app routes
- auth/session implementation
- data storage layer
- AI generation layer, if present
- test setup
- deployment/build setup
- known risks or missing pieces

Do not assume React/Next/Vite/etc. Detect it from files.

## Quality gates

Always run the commands that exist in the repository. Prefer this order:

1. install only if needed and lockfile-compatible
2. lint
3. typecheck
4. unit tests
5. e2e/smoke tests
6. build

If a command does not exist, record that honestly and add a recommendation. Do not invent successful results.

Long-form loop engineering references live in `docs/loop-engineering/`:

- `CODEX_MASTER_PROMPT.md`
- `LOOP_ENGINEERING_RUNBOOK.md`
- `EVAL_MATRIX.md`
- `PRODUCT_ACCEPTANCE.md`
- `BACKLOG_SEEDS.md`
- `PLAYWRIGHT_E2E_SPEC.md`
- `LOOP_LOG_TEMPLATE.md`

## Mobile web priority

The mobile route `/android?from=%2F%3Ftheme%3Dmint&tab=home` must not remain indefinitely stuck on a login-state checking screen. It should resolve into one of:

- logged-in home
- login screen
- clear recoverable auth/session error state

Add or update an E2E test to protect this behavior.

## PC web priority

The PC/root route `/?theme=mint` must clearly show:

- product identity
- login form
- account/password fields
- user-safe login status handling
- clear error state for bad credentials

Add or update smoke tests for this behavior.

## AI generation quality

Any draft-generation feature must produce structured output:

- title
- body
- tags
- cover suggestion or cover prompt, if supported
- publishing checklist
- warning/risk notes when input is incomplete

The UI must not imply that AI output is already safe to publish without human review.

## Promotion precision objective

For postgraduate-to-PhD Xiaohongshu lead generation, do not treat "knowledge/search
+ GPT draft + DeepSeek rewrite" as the final product quality bar. Future loops
should improve measurable promotion precision:

- classify topic intent before drafting;
- keep ranking/list, route/decision, mentor-matching, timing/schedule,
  sales/marketing, and source-check topics from drifting into each other;
- build or reference a fact ledger/source cards before making current-fact claims;
- create a promotion brief with persona, pain point, trust proof, CTA, forbidden
  claims, source requirements, and cover angle;
- align title, body, tags, cover direction, preview, and checklist;
- score or flag drafts for source safety, conversion clarity, and manual-review
  readiness;
- preserve human confirmation and never automate publishing.

Detailed promotion-loop guidance lives in
`docs/loop-engineering/PROMOTION_PRECISION.md`.

## Commit discipline

For each loop, produce a concise summary:

- changed files
- user-visible effect
- tests run
- test result
- remaining risk

If committing is available, use branch names like:

- `codex/loop-mobile-auth`
- `codex/loop-login-smoke`
- `codex/loop-draft-quality`

Commit messages should be small and factual:

- `fix: resolve mobile auth loading fallback`
- `test: add opc login smoke coverage`
- `feat: add draft quality checklist state`

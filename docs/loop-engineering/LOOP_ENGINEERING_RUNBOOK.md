# OPC Loop Engineering Runbook

## Why this exists

The project should improve through measurable loops. Codex should not randomly refactor the app. Every change must connect to a product problem, pass basic checks, and leave a better test harness behind.

## Loop structure

### 0. Baseline

Before edits:

```bash
git status --short
find . -maxdepth 2 -type f | sed 's#^./##' | sort | head -200
```

Detect package manager:

- `pnpm-lock.yaml` → `pnpm`
- `yarn.lock` → `yarn`
- `package-lock.json` → `npm`
- `bun.lockb` or `bun.lock` → `bun`

Read:

- package scripts
- route files
- auth/session files
- API files
- test config
- deployment config

Write `PROJECT_MAP.md`.

### 1. Observe

Collect one concrete defect or gap. Good observations look like:

- Mobile route stays on “checking login status” without fallback.
- Login errors are silent or unclear.
- Draft-generation output has title/body/tags but no checklist.
- Cover preview breaks on narrow screen.
- No E2E smoke coverage protects the main flows.

Bad observations are vague:

- “Improve UI.”
- “Make it better.”
- “Refactor everything.”

### 2. Hypothesize

Format:

```md
Hypothesis: If we add a timeout fallback for mobile auth-state checking, users who are not logged in will reach the login screen instead of being stuck.
Expected user impact: mobile users can recover from stale session state.
Risk: session detection logic may have app-specific assumptions.
```

### 3. Patch

Patch rules:

- One loop, one product behavior.
- Prefer local components/hooks/tests over broad rewrites.
- Keep names consistent with the existing codebase.
- Preserve public routes.
- Do not remove safety confirmations.
- Do not hard-code secrets.

### 4. Verify

Run available scripts. Typical examples:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If Playwright exists:

```bash
npx playwright test
```

If no tests exist, add the smallest relevant smoke test and document how to run it.

### 5. Score

Use `docs/loop-engineering/EVAL_MATRIX.md`. A change should normally score at least 70/100 to keep. If lower, either improve it or document why it is still worth keeping.

### 6. Record

Append to `LOOP_LOG.md` using `docs/loop-engineering/LOOP_LOG_TEMPLATE.md`.

### 7. Continue or stop

Continue only when the previous loop is recorded. Stop after the loop budget or when blocked by an external dependency.

## Anti-patterns

- Making multiple unrelated changes in one loop.
- Removing features to make build pass.
- Faking APIs/tests.
- Hard-coding `admin/admin`.
- Marking login successful without real auth/session logic.
- Disabling manual publish confirmation.
- Declaring success without command output.

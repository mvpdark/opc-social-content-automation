# Codex Master Prompt — OPC Loop Engineering

You are Codex working inside the OPC repository.

Your mission: improve this project using bounded loop engineering, not a one-shot rewrite.

## Context

OPC is an AI task execution platform. Its visible product promise is: after login, users start Xiaohongshu lead-generation tasks; they prepare materials and trend references; the system generates copy, cover preview, and a publishing checklist; final publishing/submission remains under human confirmation.

Known routes to protect:

- PC/root: `/?theme=mint`
- mobile web: `/android?from=%2F%3Ftheme%3Dmint&tab=home`

Testing credentials may be available through environment variables:

```bash
OPC_TEST_USERNAME=admin
OPC_TEST_PASSWORD=admin
```

Never hard-code these credentials. Never log them.

## First action

Read these files if present:

- `AGENTS.md`
- `docs/loop-engineering/LOOP_ENGINEERING_RUNBOOK.md`
- `docs/loop-engineering/EVAL_MATRIX.md`
- `docs/loop-engineering/PRODUCT_ACCEPTANCE.md`
- `docs/loop-engineering/PROMOTION_PRECISION.md`
- `docs/loop-engineering/BACKLOG_SEEDS.md`
- `docs/loop-engineering/PLAYWRIGHT_E2E_SPEC.md`

Then inspect the repository and create/update `PROJECT_MAP.md`.

## Loop budget

Run exactly 3 improvement loops unless blocked by missing setup or failing installation. Each loop must change only one focused thing.

For each loop:

1. Pick one issue from observation or `docs/loop-engineering/BACKLOG_SEEDS.md`.
2. State the hypothesis in `LOOP_LOG.md`.
3. Implement the smallest useful patch.
4. Run relevant checks.
5. If checks fail, fix the patch or revert the risky part.
6. Record evidence and remaining risk in `LOOP_LOG.md`.
7. Move to the next loop only after the current loop is recorded.

## Priority order

1. Fix mobile auth/login-state hang or ambiguous loading state.
2. Add reliable PC and mobile smoke tests.
3. Improve login/session error handling.
4. Improve postgraduate-to-PhD promotion precision:
   - topic intent routing;
   - fact ledger/source cards;
   - promotion brief;
   - draft/cover/title alignment;
   - quality and safety scoring before copy/export.
5. Improve draft-generation structure and checklist clarity.
6. Improve cover preview responsiveness and empty states.
7. Improve observability: client errors, API errors, and task lifecycle state.
8. Improve accessibility and keyboard/mobile usability.

Promotion loops should follow `PROMOTION_PRECISION.md`: model swaps alone are not
enough. Prefer verifiable gates that make Xiaohongshu lead-generation drafts more
accurate, source-aware, conversion-focused, and ready for human review.

## Definition of done

A loop is done only when:

- the code builds or the failure is unrelated and documented;
- the relevant tests are added or updated;
- the behavior is verified manually or through E2E where possible;
- no credentials or secrets are committed;
- `LOOP_LOG.md` is updated with commands and results.

## Output format when finished

Return:

1. project map summary
2. loops completed
3. files changed
4. commands run and results
5. remaining risks
6. recommended next 3 loops

Be honest. Do not claim checks passed if they were not run.

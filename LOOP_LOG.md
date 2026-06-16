# OPC Loop Log

## Loop 1 - Add loop engineering guardrails

Date: 2026-06-15

### Observation

The repository did not yet include the provided loop engineering rules, acceptance matrix, or smoke-test contract. The project also had no `PROJECT_MAP.md`, so future loop work would have to rediscover the same structure repeatedly.

### Hypothesis

If the task pack is integrated as repository documentation, project map, and runnable-check scaffolding, future Codex loops will be more bounded, safer, and easier to verify.

### Patch

Files changed:

- `AGENTS.md`
- `PROJECT_MAP.md`
- `LOOP_LOG.md`
- `docs/loop-engineering/*`
- `scripts/opc-loop-check.sh`
- `frontend/tests/e2e/opc.smoke.spec.ts`

Summary:

- Added repository-level OPC product guardrails for Codex.
- Stored the loop engineering pack under `docs/loop-engineering/` without replacing the existing project README.
- Added a project map covering runtime, routes, auth/session, storage, AI routing, testing, and build paths.
- Adapted the loop check script to the current `frontend/` and `backend/` layout.
- Adapted the Playwright smoke spec to the current PC/mobile login selectors while keeping test credentials environment-only.

### Verification

Commands run:

```bash
python scripts/verify_project.py --keep-cache
# passed

python scripts/verify_release.py
# project contract checks passed; stopped because the system Python did not have pytest installed

npm run typecheck
# passed from frontend/

.\.venv\Scripts\python.exe -m pytest backend\tests
# 211 passed, 1 warning

npm run build
# passed from frontend/
```

Manual checks:

- Confirmed the zip file was present at `D:/download/opc_loop_engineering_pack.zip` equivalent path.
- Confirmed the existing root `README.md` was preserved.
- Confirmed added task-pack files contain no replacement characters.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 21/30
- Correctness: 16/20
- Test coverage: 13/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 77/100

### Result

Kept.

### Remaining risk

- Resolved in Loop 2: JS Playwright dependency/config was added and the E2E spec moved into `frontend/tests/e2e/`.
- The local Windows environment does not expose Bash, so the shell check script needs Unix/Git Bash/CI to run directly.
- The default system Python lacks pytest; use the repository `.venv` for backend tests on this machine.

### Next candidate loop

- Add a configured JS Playwright runner or convert the smoke checks into the repository's preferred test harness.

## Loop 2 - Make E2E smoke tests CI-runnable

Date: 2026-06-15

### Observation

`tests/e2e/opc.smoke.spec.ts` existed as a smoke-test contract, but the repository did not declare `@playwright/test`, had no Playwright config, and CI did not run browser tests.

### Hypothesis

If the frontend package owns the Playwright runner and CI installs Chromium before running it, the PC/mobile login-shell smoke tests will become repeatable on every push and pull request.

### Patch

Files changed:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/playwright.config.ts`
- `.github/workflows/ci.yml`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `PROJECT_MAP.md`
- `README.md`
- `scripts/verify_project.py`

Summary:

- Added `@playwright/test` as a frontend dev dependency.
- Added `npm run e2e`.
- Added a Chromium Playwright config that auto-starts `next dev` unless `OPC_BASE_URL` points to an existing target.
- Added a GitHub Actions E2E job that installs the browser and runs the smoke suite.
- Added the Playwright config to project contract checks.

### Verification

Commands run:

```bash
npx playwright install chromium
# passed

npm run e2e
# 2 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run typecheck
# passed from frontend/

npm run build
# passed from frontend/

.\.venv\Scripts\python.exe -m pytest backend\tests
# 211 passed, 1 warning

npm ci
# passed in a temporary clean package directory using frontend/package-lock.json
```

Manual checks:

- Confirmed the first direct workspace `npm ci` attempt was blocked by a Windows file lock on Next's native SWC binary, then restored local dependencies with `npm install`.
- Confirmed the clean temporary `npm ci` path succeeds, matching the CI install model.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 18/20
- Test coverage: 18/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 87/100

### Result

Kept.

### Remaining risk

- Credentialed login remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are set in the environment.
- The smoke suite only verifies login-shell rendering and mobile auth-state resolution; it does not yet cover the full generation workflow.

### Next candidate loop

- Add a post-login workflow E2E path with test credentials in a staging-safe environment.

## Loop 3 - Cover mobile auth smoke widths

Date: 2026-06-15

### Observation

`PRODUCT_ACCEPTANCE.md` requires the mobile route to work at 360, 390, and 414 px widths, but the current E2E smoke test only verifies the auth-resolution path at 390 px.

### Hypothesis

If the mobile auth smoke test runs at 360, 390, and 414 px, layout or loading-state regressions on common phone widths will be caught earlier in CI.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Parameterized the mobile auth smoke test across 360, 390, and 414 px viewport widths.
- Kept the credentialed login smoke path environment-gated and skipped when credentials are absent.

### Verification

Commands run:

```bash
npm run e2e
# 4 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run typecheck
# passed from frontend/

npm run build
# passed from frontend/
```

Manual checks:

- Confirmed the three mobile width cases all resolve away from the login-checking state.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 18/20
- Test coverage: 18/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 87/100

### Result

Kept.

### Remaining risk

- The tests still do not verify authenticated redirects because no staging-safe credentials are configured in this thread.
- This loop checks the auth shell and visible recovery state, not deeper mobile tab interactions after login.

### Next candidate loop

- Add staging-safe credentialed E2E coverage for redirect preservation and a basic post-login workflow.

## Loop 4 - Cover bad-credential login feedback

Date: 2026-06-15

### Observation

`BACKLOG_SEEDS.md` lists login failure feedback as a P0 issue. The UI already has explicit PC and mobile error states, but the CI E2E suite only checks login-shell rendering and skips credentialed login when environment credentials are absent.

### Hypothesis

If CI simulates a rejected login response without real credentials, future regressions that hide bad-credential feedback or persist passwords in local storage will be caught without weakening auth or requiring secrets.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added PC bad-credential smoke coverage with a mocked rejected login response.
- Added mobile bad-credential smoke coverage at 390 px with the same mocked response.
- Generated rejected login inputs at runtime so no test credentials or passwords are committed.
- Asserted the rejected password is not persisted in local storage after the failed attempt.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 6 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Manual checks:

- Confirmed the E2E route mock avoids real backend credentials and does not fake a successful login.
- Confirmed PC and mobile failure messages remain visible through dedicated error elements.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 90/100

### Result

Kept.

### Remaining risk

- Network/API unavailable feedback is still only indirectly covered through the credentialed smoke fallback text.
- Redirect preservation after successful login still needs staging-safe credentials or a controlled authenticated fixture.

### Next candidate loop

- Add redirect-preservation coverage with a mocked successful login that does not bypass production auth behavior.

## Loop 5 - Cover mobile login target preservation

Date: 2026-06-15

### Observation

`BACKLOG_SEEDS.md` calls out redirect preservation after login as a P0 issue. The mobile login handler sets the active tab to home before the URL-driven tab restoration effect runs, so this path needs regression coverage.

### Hypothesis

If CI simulates a successful mobile login and verifies the requested tab plus PC return target, regressions that lose `tab` or `from` parameters after login will be caught without storing credentials or bypassing production auth.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a mocked successful mobile login smoke path that uses runtime-generated test input.
- Verified `/android?...&tab=create` opens the requested Create tab after login.
- Verified the mobile "return to PC workspace" action preserves the safe `from` target.
- Reused the password persistence assertion to confirm the successful mocked path does not store plaintext passwords.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 7 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Manual checks:

- Confirmed the successful login path is mocked only in the browser test and does not alter app authentication code.
- Confirmed the route remains on `tab=create` after login before returning to `/?theme=mint&tab=content`.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 25/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 91/100

### Result

Kept.

### Remaining risk

- Unsafe `from` sanitization is covered by product code but not yet directly asserted in E2E.
- The credentialed real-backend login smoke remains skipped unless staging-safe environment credentials are provided.

### Next candidate loop

- Add a tiny E2E assertion for unsafe mobile `from` values falling back to `/`.

## Loop 6 - Cover unsafe mobile return target fallback

Date: 2026-06-15

### Observation

The mobile return helper already accepts only same-site paths that start with `/` but not `//`. `BACKLOG_SEEDS.md` explicitly requires unsafe redirect values to be sanitized, and the previous loop left direct E2E coverage for this gap.

### Hypothesis

If CI logs in through a mocked mobile success path with an external `from` value and then taps "return to PC workspace", regressions that allow external redirects will be caught without using real credentials or changing auth behavior.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added an E2E smoke path for a mocked successful mobile login with an external `from` value.
- Verified the user remains on the requested mobile Create tab after login.
- Verified the "return to PC workspace" action falls back to the same-site root URL instead of navigating to the external target.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 8 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Manual checks:

- Confirmed `npx` is available for Playwright tooling.
- Confirmed the test uses a mocked login response and runtime-generated input; no credentials or secrets are committed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 19/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 91/100

### Result

Kept.

### Remaining risk

- Protocol-relative `//host` fallback is covered by the same helper logic but not separately parameterized in E2E.
- The credentialed real-backend login smoke remains skipped unless staging-safe environment credentials are provided.

### Next candidate loop

- Add a focused post-login smoke for one creation-page control that does not call real AI/model services.

## Loop 7 - Cover mobile create project controls without generation calls

Date: 2026-06-15

### Observation

`PRODUCT_ACCEPTANCE.md` requires the Xiaohongshu workflow to let users enter material/topic context and keep publishing behind human confirmation. The E2E suite now covers mobile login, target tab restoration, and return safety, but it does not yet verify that the post-login Create tab exposes the project and topic controls without invoking real generation services.

### Hypothesis

If CI logs in through a mocked mobile success path, enters the enabled creation project, and asserts the topic controls plus manual-publish warning while blocking generation endpoints, regressions in the first post-login creation step will be caught without fake model/image outputs or automated publishing.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a post-login mobile Create tab smoke path with mocked successful login.
- Entered the enabled "1.硕升博推广" project and verified topic, recommended topic, audience, tags, and generation button controls.
- Verified the visible "不会自动发布" publishing-safety copy.
- Added an E2E guard around source preview, content generation, and image generation endpoints and asserted none were called.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 9 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Manual checks:

- Confirmed `npx` is available for Playwright tooling.
- Confirmed the test only enters and inspects the Create workflow; it does not call real AI/model/image services or fake outputs.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 25/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 91/100

### Result

Kept.

### Remaining risk

- The test does not yet verify selecting a recommended topic changes audience/tags as intended.
- Draft generation success and recoverable generation failure still need controlled API fixtures before they can be covered safely.

### Next candidate loop

- Add a focused topic-selection smoke that clicks a recommended topic and verifies topic/audience/tags stay aligned without calling generation services.

## Loop 8 - Cover mobile recommended-topic alignment

Date: 2026-06-15

### Observation

The mobile Create smoke verifies that topic controls render, but it does not yet click a recommended topic. The workflow depends on recommended topics keeping the topic, target audience, and tags aligned before generation, especially to avoid generic drift between ranking, route, mentor, timing, and sales topics.

### Hypothesis

If CI clicks one visible mobile recommended topic, reads the selected preset from the shared preset table, and verifies topic/audience/tags all update without calling generation services, regressions in topic-selection alignment will be caught before draft generation.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a focused mobile recommended-topic E2E smoke.
- Clicked a visible recommended topic and verified the topic, target audience, and tags match the shared preset contract.
- Tightened the existing recommended-topic selector so it targets actual preset buttons instead of the list container.
- Kept a generation-service request guard and asserted no source-preview, content-generation, or image-generation calls happened.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 10 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Manual checks:

- Confirmed `npx` is available for Playwright tooling.
- Confirmed the test reads expected preset data from `frontend/lib/topic-presets.ts`, avoiding hard-coded random topic assumptions.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 26/30
- Correctness: 19/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 93/100

### Result

Kept.

### Remaining risk

- This verifies one visible recommended topic per run; it does not exhaustively click every preset category.
- Draft generation success and recoverable generation failure still need controlled API fixtures before they can be covered safely.

### Next candidate loop

- Add a deterministic unit/contract test for all topic preset categories mapping to topic/audience/tags/knowledge query without generic drift.

## Loop 9 - Harden topic preset drift contract

Date: 2026-06-16

### Observation

The mobile recommended-topic E2E now verifies one visible preset, but the full preset pool still needs a deterministic contract that prevents category drift across ranking, route, mentor, timing, source, and sales/marketing topics.

### Hypothesis

If the project self-check validates every recommended topic against category-specific intent anchors and forbidden cross-category terms, accidental drift such as a ranking topic becoming mentor matching or a timing topic becoming sales conversion will fail before CI or manual QA.

### Patch

Files changed:

- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added category-specific intent anchors for all six topic preset categories.
- Added drift-guard terms that are checked against visible topic/helper/tag fields.
- Kept fact-sensitive boundaries for ranking and source topics intact.

### Verification

Commands run:

```bash
python scripts/verify_project.py --keep-cache
# passed, topic_presets_contract_checked=396

npm run typecheck
# passed from frontend/

npm run e2e
# 10 passed, 1 skipped from frontend/

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 19/20
- Test coverage: 18/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 3/5
- Total: 89/100

### Result

Kept.

### Remaining risk

- The drift contract is deterministic and conservative; it does not replace generated-draft fixture tests.
- Generation success and recoverable failure still need controlled API fixtures before they can be safely covered end to end.

### Next candidate loop

- Add controlled generation API fixtures that verify title/body/cover/tags align with a selected ranking or route topic without calling real model, image, scraping, or publishing services.

## Loop 10 - Cover mobile one-click generation fixture alignment

Date: 2026-06-16

### Observation

The mobile Create flow had smoke coverage for entering the project and selecting a recommended topic, but it did not yet exercise a successful one-click generation path with controlled source, draft, and cover responses.

### Hypothesis

If E2E uses explicit fixtures for source preview, content generation, and cover generation, CI can verify that the generated title, body, tags, cover request, source evidence, preview, and copy-safe human-review messaging remain aligned with the selected topic without calling real model, image, scraping, or publishing services.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a mobile generation fixture helper for source-preview, content-generate, and image-generate responses.
- Added a ranking-topic one-click generation E2E path using the `ranking-low-budget` preset.
- Verified request payloads include the selected topic, audience, tags, knowledge query, and cover direction.
- Verified knowledge and web evidence expand, the draft history opens the generated preview, and the preview preserves the manual-review/no-auto-publish warning.
- Added a publishing-like endpoint guard and asserted no publish/submit request was made.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 11 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Notes:

- The first E2E run failed because the publishing guard also matched normal `platform=xiaohongshu` query parameters. The guard was narrowed to API paths containing `publish` or `submit`, then the full suite passed.
- Attempts to run a single Playwright test with Windows path arguments returned "No tests found"; the full E2E command is the verified runner for this repository.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 28/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 95/100

### Result

Kept.

### Remaining risk

- This covers one ranking/list topic; route, mentor, timing, source, and sales topics still rely on preset contracts plus selection smoke.
- Recoverable generation failure after a successful draft but failed cover should get a dedicated fixture test.

### Next candidate loop

- Add a controlled failure fixture for mobile one-click generation where content succeeds but cover generation fails, preserving the draft and showing a recoverable error without losing manual review safety.

## Loop 11 - Cover recoverable mobile cover failure

Date: 2026-06-16

### Observation

The one-click mobile generation success path was covered, but a partial failure path remained unprotected: content generation can succeed and cover generation can fail. Product acceptance says cover preview failures must not break the workflow, and drafts should remain reviewable.

### Hypothesis

If E2E simulates a successful draft response followed by a failed cover response, then CI can verify the app preserves the generated draft, shows a recoverable cover failure message, keeps the manual-review preview available, and does not call publish/submit endpoints.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Generalized the mobile generation fixture so it can return either a generated cover or a cover-service failure.
- Added a route-topic failure test using the `route-main` preset.
- Verified the visible status explains that the draft exists but the cover failed.
- Verified the generation progress enters the failure state while the draft card remains available.
- Opened the preserved draft preview and confirmed title/body/tags plus the manual no-auto-publish warning are still visible with a text-cover fallback.
- Asserted no publish/submit request was made and passwords were not persisted.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 12 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 27/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 94/100

### Result

Kept.

### Remaining risk

- Recoverable failures are now covered for cover generation, but content-generation failures before any draft exists still need a focused fixture.
- PC one-click generation still has weaker E2E coverage than mobile.

### Next candidate loop

- Add a controlled content-generation failure fixture that verifies the mobile UI shows a recoverable error, does not create a false draft, and leaves source evidence/topic inputs intact.

## Loop 12 - Cover mobile content failure without false drafts

Date: 2026-06-16

### Observation

The mobile one-click generation flow now has success coverage and cover-failure coverage, but content-generation failure before any draft exists was still unprotected. This is the highest-risk failure point because the UI should preserve the user's selected topic and evidence while avoiding any fake draft or publishing implication.

### Hypothesis

If E2E simulates source preview success followed by content-generation failure, then CI can verify the app keeps topic inputs and evidence intact, shows a recoverable writing-service error, does not call image generation, and does not create a false draft.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Extended the mobile generation fixture with a content-service failure option.
- Added a mentor-topic failure test using the `mentor-direction-check` preset.
- Verified source evidence remains visible after the failure.
- Verified topic, audience, and tags stay aligned with the selected preset.
- Verified no draft card or local-storage record is created for the failed content id.
- Verified image generation and publish/submit endpoints are not called.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e
# 13 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Notes:

- The first E2E attempt used an overly strict "history is empty" assertion. Local or backend draft history may legitimately contain existing records, so the test was narrowed to the actual contract: the failed content id must not appear in history or local storage.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 27/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 94/100

### Result

Kept.

### Remaining risk

- Mobile generation now has success, cover-failure, and content-failure fixtures; PC generation still needs comparable E2E coverage.
- Copy/preview actions after successful PC generation remain lighter than the mobile checks.

### Next candidate loop

- Add a controlled PC one-click generation E2E fixture that verifies selected topic, source evidence, draft card, preview/copy flow, and no automated publishing.

## Loop 13 - Cover PC one-click generation preview copy

Date: 2026-06-16

### Observation

Mobile generation now has success, cover-failure, and content-failure E2E fixtures, but PC generation still had weaker coverage. The PC creation page is where the user expects the desktop web experience to catch up with mobile, especially around selected topic intent, evidence expansion, cover generation, preview, copy, and the human-review/no-auto-publish safety boundary.

### Hypothesis

If E2E simulates a PC login into the `postgraduate-phd` creation project and runs a controlled sales/marketing topic through source preview, draft generation, image generation, draft history, preview modal, and copy flow, then CI can catch generic topic drift, missing evidence expansion, fake rewrite/publishing calls, and password persistence regressions before release.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a PC generation fixture with controlled provider statuses, empty existing history, source-preview evidence, content generation, cover generation, and guarded publish/submit endpoints.
- Reused a shared E2E source-context builder so mobile and PC tests assert the same knowledge/web-search contract.
- Added a PC one-click generation test using the `sales-main` preset to cover a sales/marketing topic type.
- Verified the PC page syncs topic, knowledge query, audience, and tags from the selected preset.
- Verified knowledge-base and Tavily/web evidence expand from the compact evidence card.
- Verified the generated draft appears in history, opens the Xiaohongshu preview modal, shows the generated cover, and allows copy/manual-copy fallback.
- Verified rewrite is not called when the rewrite provider is disabled, no publish/submit request is made, and the login password is not persisted.
- Expanded E2E local-storage cleanup to remove PC and mobile draft caches between tests.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "PC one-click generation keeps selected sales topic aligned through preview copy"
# 1 passed from frontend/

npm run e2e
# 14 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 27/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 94/100

### Result

Kept.

### Remaining risk

- PC now has a success-path fixture, but PC cover-failure/content-failure recovery still has less coverage than mobile.
- The env-backed live login smoke remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.

### Next candidate loop

- Add a controlled PC failure-recovery fixture that verifies content or cover failures preserve selected topic inputs and source evidence without creating false drafts or suggesting publishing.

## Loop 14 - Cover PC content failure without false drafts

Date: 2026-06-16

### Observation

PC one-click generation now has success-path E2E coverage, but content-generation failure on PC was still less protected than mobile. A failed writing request must not create a fake draft, must not proceed to image generation, and must keep the selected topic plus source evidence available for retry.

### Hypothesis

If the PC generation fixture can simulate a content-service failure after source preview succeeds, then CI can verify the desktop creation workflow shows a recoverable error, preserves the timing/schedule topic inputs and evidence, skips image generation and rewrite, avoids publish/submit calls, and does not create local or visual draft artifacts.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Parameterized the PC generation fixture with `contentId`, `failContent`, and `failCover` options.
- Added a PC content-failure test using the `timeline-main` preset to cover a timing/schedule topic type.
- Verified topic, knowledge query, audience, and tags stay aligned after the failure.
- Verified the compact evidence card still reports both sources and can reopen knowledge-base and Tavily/web evidence after the error.
- Verified no draft history card is created, no image generation is called, no rewrite is called, no publish/submit endpoint is touched, and the login password is not persisted.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "PC content failure keeps timing topic evidence without false draft"
# 1 passed from frontend/

npm run e2e
# 15 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

Notes:

- The first focused E2E attempt asserted the knowledge list stayed open after the failed generation request. The UI correctly kept the evidence card and source count, but the knowledge list was collapsed while web evidence remained open. The test was adjusted to verify the real recovery path: users can click the compact knowledge/web toggles again after the failure.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 27/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 94/100

### Result

Kept.

### Remaining risk

- PC cover-generation failure is now easy to fixture but still lacks its own desktop recovery test.
- The env-backed live login smoke remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.

### Next candidate loop

- Add a controlled PC cover-failure E2E fixture that verifies a generated draft remains available for preview/copy while cover status clearly reports the failure and no publishing call is made.

## Loop 15 - Cover PC cover failure with draft preview copy

Date: 2026-06-16

### Observation

PC success-path and content-failure E2E coverage are now in place, but cover-generation failure still lacked a desktop-specific recovery test. This is a core workflow risk because content can succeed while cover generation fails; the UI should keep the human-review draft available without implying the cover is ready or that anything was published.

### Hypothesis

If E2E simulates successful PC draft generation followed by cover-generation failure for a source/fact-sensitive topic, then CI can verify the app keeps the draft in history, opens the preview/copy flow with a text-cover fallback, preserves knowledge/Tavily evidence, reports the cover failure clearly, and avoids rewrite or publish/submit calls.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a PC cover-failure fixture id and a new desktop E2E test.
- Used the `source-official-fee-check` preset to cover source/fee/current-fact-sensitive topics.
- Verified source preview includes knowledge-base and Tavily/web evidence before generation.
- Verified the UI shows `文案已生成，但封面图未完成：PC 封面服务暂时不可用，请稍后重试。`.
- Verified the generated draft remains in history and opens the Xiaohongshu preview modal.
- Verified the modal falls back to a text cover preview when the real cover image is unavailable.
- Verified preview copy/manual-copy remains available, rewrite is not called, no publish/submit endpoint is touched, and the login password is not persisted.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "PC cover failure keeps source topic draft available for preview copy"
# 1 passed from frontend/

npm run e2e
# 16 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 27/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 94/100

### Result

Kept.

### Remaining risk

- PC generation now has success, content-failure, and cover-failure fixtures; future loops can shift back toward generation output schema/checklist quality or live env credential smoke once test credentials are available.
- The env-backed live login smoke remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.

### Next candidate loop

- Add or tighten coverage for the publishing checklist / manual-review state after generated drafts so the UI keeps the distinction between draft copy and final human submission explicit.

## Loop 16 - Keep PC export checklist visible after generation

Date: 2026-06-16

### Observation

Loop 15 left the PC publishing checklist/manual-review state as the next candidate. While adding E2E assertions for the generated export card, the new check exposed a real regression: after a successful PC one-click generation, the draft was saved to history, but the active export card stayed in the placeholder state because the generated-content input signature did not match the current form.

### Hypothesis

The request payload used the platform-enhanced generation tone, while the current-form signature used the visible raw tone. If both paths share the same generation tone, the newly generated draft should remain matched to the current inputs and the PC export card should show copy, cover, and publishing checklist controls immediately after generation.

### Patch

Files changed:

- `frontend/components/workspace-client.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`

Summary:

- Reused one `generationTone` value for both the generation request payload and the current input signature.
- Added stable test IDs around the PC generated export card, copy action, publishing checklist, cover review reminder, and cover card.
- Extended the PC success E2E to verify the export card appears immediately after generation, the copy action is enabled, the content is still manual-copy only, the publishing checklist is visible, high-risk promise wording is checked, cover review remains required, and cover output is not treated as automatic publishing.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "PC one-click generation keeps selected sales topic aligned through preview copy"
# 1 passed from frontend/

npm run e2e
# 16 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 28/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 96/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The PC export card is now covered after successful generation; future loops can add the same manual-review checklist assertions to mobile success paths or expand checklist schema validation.

### Next candidate loop

- Add a mobile success-path assertion for the same manual-review/export distinction so both PC and phone flows prove that copying remains separate from final human publishing.

## Loop 17 - Mirror manual-review export guard on mobile preview

Date: 2026-06-16

### Observation

Loop 16 protected the PC generated export card, but the mobile success-path E2E only verified that the preview modal said it would not auto-publish and that a cover existed. It did not explicitly protect the mobile copy/export controls, fallback manual-copy text, or the extra human-review reminder in the generated preview.

### Hypothesis

If the mobile preview displays an explicit human-review note and E2E clicks the text-only copy action, then CI can verify that mobile copy/export remains a draft-preparation flow, not an automated publishing flow.

### Patch

Files changed:

- `frontend/components/mobile-draft-preview-editor.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a visible mobile preview reminder: copying or sharing only prepares title, body, tags, and cover material; human confirmation is still required before publishing.
- Added a stable test id for the mobile export status message.
- Extended the mobile ranking-topic success E2E to verify the human-review note, enabled mobile copy/export controls, manual-copy fallback text containing the generated topic and tag, and no publish/submit calls.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "mobile one-click generation keeps selected ranking topic aligned"
# 1 passed from frontend/

npm run e2e
# 16 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 27/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 5/5
- Total: 95/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- Mobile copy/export is now protected in the success path; future loops can cover the mobile review queue approval/reject flow with mocked review endpoints to keep final human confirmation explicit.

### Next candidate loop

- Add mobile review-queue E2E coverage for approve/request-changes controls using mocked `/content/list`, `/image/list`, and `/content/:id/reviews` endpoints, ensuring no direct platform publishing is implied.

## Loop 18 - Cover mobile human-review decisions in E2E

Date: 2026-06-16

### Observation

Loop 17 protected mobile preview copy/export, but the mobile human-review queue still lacked an E2E guard for the final approve/request-changes controls. This is a safety-critical boundary because review decisions should call only the human-review endpoint and must not imply direct platform publishing.

### Hypothesis

If E2E provides a controlled mobile review queue and records the review endpoints, then CI can verify that approving from the detail sheet and requesting changes from the list submit explicit human decisions, remove the reviewed item from the queue, keep source evidence visible, preserve credentials safely, and never touch publishing-like endpoints.

### Patch

Files changed:

- `frontend/components/mobile-review-screen.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added stable test IDs for the mobile review detail approve and request-changes buttons.
- Added a mobile review-queue fixture that mocks `/content/list`, `/image/list`, and `/content/:id/reviews`.
- Added E2E coverage for a two-item review queue: one draft is approved from the detail sheet, the other is returned for changes from the list.
- Verified review payloads use `decision: "approved"` and `decision: "changes_requested"` with the expected risk flags/scores.
- Verified source evidence is visible and no publish/submit endpoint is called.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "mobile review queue submits human decisions without platform publishing"
# 1 passed from frontend/

npm run e2e
# 17 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 29/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 97/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- Mobile human-review success decisions are now covered; future loops can add review endpoint failure handling so approve/request-changes errors keep the item in queue and show a recoverable message.

### Next candidate loop

- Add mobile review decision failure E2E coverage for `/content/:id/reviews` returning an error, verifying the item stays in the queue and no publishing-like endpoint is touched.

## Loop 19 - Cover mobile review decision failure recovery

Date: 2026-06-16

### Observation

Loop 18 covered successful mobile human-review decisions, but there was no regression guard for a failed `/content/:id/reviews` call. This is a safety and reliability risk: if the review API is temporarily unavailable, the draft must remain in the queue and the UI must show a retryable error instead of removing the item or implying publish progress.

### Hypothesis

If the mobile review queue fixture can force a review endpoint failure, then E2E can prove that an attempted approval keeps the detail sheet and queue item visible, surfaces the backend error, records only the human-review payload, and never touches publishing-like endpoints.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Extended the mobile review E2E fixture with `failReviewForContentIds`.
- Added a mobile review failure test that opens a queued draft, attempts approval, receives a controlled 503 response, and verifies the draft remains queued.
- Verified the failed request still carries the expected human-review payload and no publish/submit endpoint is called.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "mobile review decision failure keeps draft queued without publishing"
# 1 passed from frontend/

npm run e2e
# 18 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 27/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 95/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- Mobile review success and failure are now covered; future loops can add PC-side review/publish checklist failure coverage or continue into broader task lifecycle state modeling.

### Next candidate loop

- Add PC-side human-review/checklist failure coverage or a small task-lifecycle state guard so generated drafts cannot be represented as published/submitted without an explicit human-review transition.

## Loop 20 - Guard PC generation lifecycle terminal statuses

Date: 2026-06-16

### Observation

The PC generated export card rendered every non-draft content status with a green pill and the one-click generation chain would continue into rewrite/cover generation even if the draft endpoint unexpectedly returned a terminal status such as `published`. That could make a generated item look safer or more complete than the human-review workflow allows.

### Hypothesis

If the PC generation flow treats `published`/`submitted` content statuses as unsafe lifecycle states, then the UI can stop follow-up automation, show a visible manual-review warning, disable cover generation, and preserve preview/copy evidence without making any publishing-like request.

### Patch

Files changed:

- `frontend/components/workspace-client.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a shared unsafe generated-content lifecycle guard for `published` and `submitted`.
- Stopped the PC one-click chain before rewrite or cover generation when a generated response returns an unsafe terminal status.
- Marked the PC export status red, disabled cover generation, and added a `pc-export-lifecycle-warning` message that reminds users to verify human confirmation records and that OPC will not auto-publish.
- Extended the PC generation fixture so E2E can simulate returned content statuses.
- Added an E2E regression covering source preview, generated card, preview modal, no rewrite, no image generation, no publishing-like calls, and no password persistence for a returned `published` status.
- Updated the project verifier to require the new lifecycle guard contract.

### Verification

Commands run:

```bash
npm run typecheck
# passed from frontend/

npm run e2e -- --grep "PC published generation status stops at manual lifecycle review"
# 1 passed from frontend/

npm run e2e
# 19 passed, 1 skipped from frontend/

python scripts/verify_project.py --keep-cache
# passed

npm run build
# passed from frontend/
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 28/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 96/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- PC terminal lifecycle status is now guarded in the generation path; a future loop can add a backend/API contract test proving `/content/generate` itself never emits terminal statuses without review.

### Next candidate loop

- Add backend or API-level lifecycle contract coverage so generated content cannot transition to `published` without an explicit human-review and publish-record path.

## Loop 21 - Require human review record before publish records

Date: 2026-06-16

### Observation

Loop 20 added a PC-side guard for terminal generation statuses, but the backend publish-record endpoint only checked `content.status == "approved"`. A direct or accidental status mutation to `approved` could still be recorded as published without evidence of an explicit human-review decision.

### Hypothesis

If `/api/workspace/publish-record` requires both `content.status == "approved"` and an existing human `ContentReview` with `status == "approved"`, then generated content cannot be marked as published unless it has passed the intended human-review transition.

### Patch

Files changed:

- `backend/app/api/v1/endpoints/workspace.py`
- `backend/tests/test_workspace_service.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a human-review existence check to the publish-record endpoint.
- Kept non-approved lifecycle states blocked from publish-record creation.
- Added API regression coverage for draft, review-pending, rewritten, and already-published statuses.
- Added API regression coverage for `approved` content without a human review, which now stays blocked.
- Added API success coverage for content with both approved status and a human approved review, which creates one publish record and then marks content published.
- Updated the project safety verifier to require the human-review publish-record gate.

### Verification

Commands run:

```bash
python -m pytest backend/tests/test_workspace_service.py
# attempted with system Python; blocked because pytest is not installed there

backend/.venv/Scripts/python.exe -m pytest backend/tests/test_workspace_service.py
# 9 passed, 1 warning

backend/.venv/Scripts/python.exe -m pytest backend/tests/test_api_contract.py backend/tests/test_image_service.py
# 10 passed

backend/.venv/Scripts/python.exe -m pytest backend/tests
# 217 passed, 1 warning

python scripts/verify_project.py --keep-cache
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 29/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 96/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- Export still accepts approved/published statuses through the existing export package path; a future loop can require the same human-review evidence for export if the product should treat export as a publish-adjacent action.

### Next candidate loop

- Add backend export-package lifecycle coverage so `/api/workspace/export` only exports content that has explicit human-review approval evidence, not merely an `approved` status field.

## Loop 22 - Require human review evidence before export

Date: 2026-06-16

### Observation

Loop 21 required an explicit human approved review before creating publish records, but `/api/workspace/export` still allowed content through when its status was `approved` or `published`. Because export packages are publish-adjacent, an accidental status mutation could still bypass the intended human-review evidence requirement.

### Hypothesis

If export and publish-record creation share a single human-review evidence helper, then both publish-adjacent backend actions will consistently require an actual human approved review rather than trusting the content status field alone.

### Patch

Files changed:

- `backend/app/services/workspace_service.py`
- `backend/app/api/v1/endpoints/workspace.py`
- `backend/tests/test_workspace_service.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added `has_human_approved_review` in the workspace service.
- Reused that helper in the publish-record endpoint.
- Added the same human-review evidence gate to export package loading.
- Added API regression coverage blocking export for draft content, status-only approved content, changes-requested human review, model-only approval, and published content without human approval evidence.
- Added API success coverage for approved and published content when a human approved review exists.
- Updated the project safety verifier so the shared helper and export gate remain protected.

### Verification

Commands run:

```bash
backend/.venv/Scripts/python.exe -m pytest backend/tests/test_workspace_service.py
# 16 passed, 1 warning

python scripts/verify_project.py --keep-cache
# passed

backend/.venv/Scripts/python.exe -m pytest backend/tests
# 224 passed, 1 warning
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 28/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 95/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The approved-content listing still returns status-based approved/published items; a future loop can decide whether that read-only listing should also filter by human-review evidence or simply show items with a warning.

### Next candidate loop

- Tighten `/api/workspace/approved-content` so read-only export candidates either require human-review evidence or clearly surface missing review evidence to the PC UI.

## Loop 23 - Filter approved-content candidates by human review evidence

Date: 2026-06-16

### Observation

After Loop 22, export and publish-record creation both required human approved review evidence, but `/api/workspace/approved-content` still returned candidates by status alone. That could show status-only approved or published content as export-ready in read-only candidate lists even though export itself would now reject it.

### Hypothesis

If the approved-content candidate query filters by both exportable status and an existing human approved review, then the read-only workspace candidate list will stay consistent with the export and publish-record safety gates.

### Patch

Files changed:

- `backend/app/services/workspace_service.py`
- `backend/tests/test_workspace_service.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a SQL `exists` filter to `approved_content_items` so only content with human approved review evidence is listed.
- Added API coverage proving `/api/workspace/approved-content` returns approved/published candidates only when they have human approval evidence.
- Verified status-only approved, model-only approved, draft, and published-without-review content are excluded from the candidate list.
- Updated the project safety verifier to require the approved-content human-review filter.

### Verification

Commands run:

```bash
backend/.venv/Scripts/python.exe -m pytest backend/tests/test_workspace_service.py
# 17 passed, 1 warning

python scripts/verify_project.py --keep-cache
# passed

backend/.venv/Scripts/python.exe -m pytest backend/tests
# 225 passed, 1 warning
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 26/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 93/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- Backend publish/export/list lifecycle gates are now aligned; future loops can return to frontend workflow QA, especially topic alignment and copy/preview behavior.

### Next candidate loop

- Add or refine frontend E2E coverage for topic-aligned copy/preview behavior across another one-click generation topic type, such as route/decision or mentor-matching topics.

## Loop 24 - Cover PC route-topic preview copy alignment

Date: 2026-06-16

### Observation

PC E2E coverage already protected sales, source, and timing topic behavior, but the Loop 23 next candidate still left the route/decision topic family under-covered on desktop. Route topics are a known drift risk because they can be accidentally generated as mentor matching or schedule planning.

### Hypothesis

If the PC one-click E2E flow runs with the `route-main` preset and asserts the selected topic across source preview, generation payloads, cover style notes, draft history, preview, and copy state, then future generic topic drift in the desktop workflow will be caught before shipping.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added an isolated PC route-topic generated content id.
- Added a PC one-click route-topic E2E case using the existing `route-main` preset.
- Verified the route topic keeps its audience, tags, knowledge query, cover direction, source evidence, generated requests, preview modal content, copy action, and no-publishing guard aligned.
- Kept the copy assertion focused on the actual modal success state to avoid waiting on the absent manual-copy fallback when clipboard copy succeeds.

### Verification

Commands run:

```bash
npm run typecheck
# passed

python scripts/verify_project.py --keep-cache
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps selected route topic aligned through preview copy" --project=chromium
# 1 passed

npm run e2e
# 20 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 14/15
- Maintainability: 8/10
- UX polish: 3/5
- Total: 89/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- Mentor-matching desktop generation is still not covered by an explicit PC preview/copy E2E path.

### Next candidate loop

- Add or refine PC E2E coverage for mentor-matching topic alignment, or factor the repeated PC one-click assertions into a focused helper once another topic family is added.

## Loop 25 - Cover PC mentor-topic preview copy alignment

Date: 2026-06-16

### Observation

Loop 24 added desktop route/decision topic coverage, but mentor-matching topics still had no explicit PC one-click generation path. Mobile E2E covered mentor failure/review cases, yet desktop success coverage could still drift from mentor matching into route planning, timing, or ranking language without a direct regression guard.

### Hypothesis

If the PC one-click E2E flow runs with the `mentor-direction-check` preset and asserts the selected mentor topic through source preview, generation payloads, cover style notes, draft history, preview, and copy state, then desktop mentor-topic drift will be caught while preserving the no-automated-publishing boundary.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added an isolated PC mentor-topic generated content id.
- Added a PC one-click mentor-topic E2E case using the existing `mentor-direction-check` preset.
- Verified the mentor topic keeps its audience, tags, knowledge query, cover direction, source evidence, generated requests, preview modal content, copy action, and no-publishing guard aligned.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps selected mentor topic aligned through preview copy" --project=chromium
# 1 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 21 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 23/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 14/15
- Maintainability: 7/10
- UX polish: 3/5
- Total: 87/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- PC topic-alignment E2E now has repeated success-flow assertions; a future loop can factor those into a helper before adding more desktop topic families.

### Next candidate loop

- Refactor repeated PC one-click topic-alignment E2E steps into a helper, then keep sales, route, and mentor coverage as concise scenario calls.

## Loop 26 - Refactor PC topic-alignment E2E helper

Date: 2026-06-16

### Observation

After adding sales, route, and mentor desktop topic-alignment coverage, the PC one-click E2E success path repeated the same login, source-preview, generation, draft-preview, copy, and no-publishing assertions three times. That made future topic-family coverage more error-prone and already caused slight differences in copy-state assertions between scenarios.

### Hypothesis

If the shared PC topic-alignment flow is factored into one helper while each scenario keeps only its preset key and content id, then the tests will preserve the same regression coverage with less duplication and more consistent safety assertions.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added `runPcTopicAlignmentScenario` for the shared desktop one-click generation flow.
- Kept sales, route, and mentor tests as short scenario calls with their original content ids and preset keys.
- Preserved sales-specific export safety copy checks through an option.
- Standardized the shared assertions for source evidence, cover direction, generated payloads, preview copy state, local password safety, and no publish/submit calls.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps selected (sales|route|mentor) topic aligned through preview copy" --project=chromium
# 3 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# first full run had one unrelated mobile cover-failure wait timeout

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile preserves draft when cover generation fails" --project=chromium
# 1 passed

npm run e2e
# 21 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 14/15
- Maintainability: 10/10
- UX polish: 2/5
- Total: 84/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The first full E2E run exposed an intermittent wait in the mobile cover-failure scenario; it passed when run alone and in the final full rerun, but a future loop can make that wait condition more deterministic.

### Next candidate loop

- Stabilize the mobile cover-failure E2E wait so it waits on the finished failure state rather than a short status-text timeout during progress animation.

## Loop 27 - Stabilize mobile cover-failure E2E wait

Date: 2026-06-16

### Observation

Loop 26's first full E2E run exposed an intermittent failure in `mobile preserves draft when cover generation fails`: the test asserted the top-level failure status while the UI was still showing cover-generation progress. The flow itself passed when run alone and in a later full rerun, so the issue was the test waiting on a short-lived status surface rather than the finished failure state.

### Hypothesis

If the test first waits for `mobile-generation-progress` to reach the explicit `生成失败` terminal state with a longer timeout, then the later status, retry button, and preserved-draft assertions will run after the UI has actually finished the cover-failure transition.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Reordered the mobile cover-failure test to wait for the generation progress terminal failure state before asserting the top-level status text.
- Increased only that terminal-state wait to 20 seconds to tolerate parallel E2E scheduling without hiding real hangs.
- Left product code and mocked service behavior unchanged.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile preserves draft when cover generation fails" --project=chromium --repeat-each=3
# 3 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 21 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 16/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 12/15
- Maintainability: 9/10
- UX polish: 2/5
- Total: 79/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- This stabilizes the test wait only; if future UI progress states change labels, the E2E will need a matching terminal-state selector or data attribute.

### Next candidate loop

- Add a small reusable E2E helper for mobile terminal generation states, or add an explicit data-state attribute to progress components if more progress-related flake appears.

## Loop 28 - Share mobile generation terminal-state wait helper

Date: 2026-06-16

### Observation

Loop 27 stabilized the mobile cover-failure wait by waiting for `mobile-generation-progress` to show `生成失败` before checking the status banner. The mobile content-failure test still had its own direct terminal-state assertion, so future progress-state tuning could drift between the two failure recovery scenarios.

### Hypothesis

If both mobile failure recovery tests use a shared terminal-state wait helper with the same timeout, then progress animation timing will be handled consistently and future changes to generation progress waits will be localized.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added `waitForMobileGenerationState` in the E2E spec.
- Reused it for both mobile cover-failure and content-failure tests.
- Kept the helper scoped to the test file and left product UI code unchanged.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile (preserves draft when cover generation fails|content failure keeps topic inputs and source evidence without false draft)" --project=chromium --repeat-each=2
# 4 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 21 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 14/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 12/15
- Maintainability: 10/10
- UX polish: 2/5
- Total: 78/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The helper still depends on localized visible text; if progress labels become more dynamic, adding a `data-state` attribute to the progress component would be more robust.

### Next candidate loop

- Add a `data-state` style test hook to generation progress components only if another progress-label flake appears; otherwise return to workflow coverage such as PC timing/source topic success paths.

## Loop 29 - Cover PC timing-topic preview copy alignment

Date: 2026-06-16

### Observation

PC one-click success coverage now protects sales, route, and mentor topic families, but timing/schedule topics were only represented by a desktop content-failure test. That left the successful PC preview/copy path for time-planning topics uncovered and could allow generic drift into route planning or mentor matching.

### Hypothesis

If the shared PC topic-alignment scenario runs with the `timeline-main` preset and a dedicated content id, then the desktop timing-topic success path will verify topic, audience, tags, knowledge query, cover direction, source evidence, preview copy, and no-publishing behavior just like the other major topic families.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added an isolated PC timing-topic generated content id.
- Added a PC one-click timing-topic E2E case using the existing `timeline-main` preset and shared topic-alignment helper.
- Verified the existing timing content-failure coverage remains separate from the new success path.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps selected timing topic aligned through preview copy" --project=chromium
# 1 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 22 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 14/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 88/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- PC source-style success coverage is still mostly represented by published-status and cover-failure paths; a future loop can add a direct source-topic success scenario.

### Next candidate loop

- Add PC source-topic success coverage through the shared topic-alignment helper, or return to production workflow hardening if source coverage is sufficient.

## Loop 30 - Cover PC source-topic preview copy alignment

Date: 2026-06-16

### Observation

PC one-click success coverage now protects sales, route, mentor, and timing topic families. Source-style topics were still represented mostly by published-status and cover-failure paths, even though they are the topic family most likely to require official pages, fee data, logo permissions, or other current facts.

### Hypothesis

If the shared PC topic-alignment scenario runs with the `source-official-fee-check` preset and a dedicated content id, then the desktop source-topic success path will verify topic, audience, tags, knowledge query, cover direction, source evidence, preview copy, and no-publishing behavior without adding duplicate fixture logic.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added an isolated PC source-topic generated content id.
- Added a PC one-click source-topic E2E case using the existing `source-official-fee-check` preset and shared topic-alignment helper.
- Kept the source evidence assertions on the mocked knowledge/web-search path so CI can verify the workflow contract without inventing real market or school facts.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps selected source topic aligned through preview copy" --project=chromium
# 1 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 23 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 14/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 88/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The new source-topic success path uses deterministic mocked knowledge/web-search evidence for CI. It protects routing, request payloads, preview/copy alignment, and no-publishing behavior, but does not validate live Tavily/provider availability.

### Next candidate loop

- Add a negative guard for source/current-fact topics if the UI ever allows generation without source evidence, or return to production workflow hardening around auth/session and review lifecycle.

## Loop 31 - Block PC source-topic generation after source preview failure

Date: 2026-06-16

### Observation

PC source-topic success coverage now verifies that official-fee/source topics keep source evidence aligned when the preview endpoint succeeds. The desktop creation UI still allowed the generation path to start after a source-preview failure, which could let current-fact topics produce a draft after the evidence step failed.

### Hypothesis

If PC source-type recommended topics clear stale source evidence on preview failure and disable one-click generation until the user retries source preview, then the workflow will not create a false draft when official/current-fact evidence is unavailable. A focused E2E test can protect that the content and image generation endpoints are not called in this state.

### Patch

Files changed:

- `frontend/components/workspace-client.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a PC source-topic guard that blocks one-click generation after a source-preview error for `source-*` topic presets.
- Cleared stale source evidence when source preview fails, so old evidence is not shown as if it still applies.
- Added a PC E2E failure scenario that verifies the source preview can be retried, the generate button is disabled, no draft card appears, and content/image/rewrite/publish-like calls are not made.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC source preview failure blocks source topic generation without false draft" --project=chromium
# 1 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 24 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 91/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- This loop protects PC source-type recommended topics. Mobile creation has similar source-preview state and can receive the same failure guard in a follow-up loop.

### Next candidate loop

- Mirror the source-preview failure guard on mobile creation, or continue hardening auth/session recovery if mobile source blocking is already acceptable.

## Loop 32 - Block mobile source-topic generation after source preview failure

Date: 2026-06-16

### Observation

Loop 31 protected the PC creation page from generating a source/current-fact topic after source preview failed. Mobile creation had the same source-preview state but still only disabled generation while the request was busy, so a failed source lookup could leave the one-click generation button available.

### Hypothesis

If mobile source-type recommended topics clear stale evidence on source-preview failure and disable one-click generation until the user retries source preview, then mobile users will not create false drafts when official/current-fact evidence is unavailable. A focused mobile E2E test can verify that content, image, and publishing-like calls are not made after source preview fails.

### Patch

Files changed:

- `frontend/components/mobile-create-screen.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a mobile source-topic guard that blocks one-click generation after a source-preview error for `source-*` topic presets.
- Cleared stale mobile source evidence when source preview fails.
- Added a mobile E2E failure scenario that verifies the retry affordance remains available, the generate button is disabled, no draft appears, and generation/publishing-like calls are not made.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile source preview failure blocks source topic generation without false draft" --project=chromium
# 1 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 25 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 91/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The source-preview failure guard applies to recommended `source-*` topics. Custom topics can still generate after source preview failure unless they are later classified as source/current-fact topics.

### Next candidate loop

- Consider adding a lightweight source/current-fact classifier for custom topics, or return to auth/session recovery and draft review lifecycle hardening.

## Loop 33 - Classify custom fact topics as source-evidence gated

Date: 2026-06-16

### Observation

PC and mobile source-preview failure guards now protect recommended `source-*` topics. Custom topics could still include official pages, prices, fees, logos, rankings, school lists, project lists, or accreditation terms without being treated as source/current-fact topics, so a source-preview failure could leave generation available for a custom fact-heavy topic.

### Hypothesis

If the source-evidence requirement is computed by a shared lightweight keyword classifier as well as the `source-*` preset key, then both PC and mobile custom topics with obvious current-fact terms will block generation after source preview fails. Focused E2E tests on PC and mobile can verify no content, image, rewrite, or publishing-like calls happen.

### Patch

Files changed:

- `frontend/lib/topic-presets.ts`
- `frontend/components/workspace-client.tsx`
- `frontend/components/mobile-create-screen.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added `generationTopicRequiresSourceEvidence`, a shared keyword-based source-evidence classifier.
- Switched PC and mobile generation guards to use the shared classifier instead of only checking `source-*` preset keys.
- Added PC and mobile E2E cases for a custom fact-heavy topic that mentions official tuition fees and logo verification.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "(mobile|PC) custom fact topic source preview failure blocks generation without false draft" --project=chromium
# 2 passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# 27 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 25/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 92/100

### Result

Kept.

### Remaining risk

- The env-backed live login smoke still skips unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The classifier is intentionally lightweight and keyword-based. It catches obvious fact/source terms but does not understand every possible phrasing of a current-fact request.

### Next candidate loop

- Add focused tests for custom ranking/list topics or return to auth/session recovery and draft review lifecycle hardening.

## Loop 34 - Contract-check custom source-evidence classifier keywords

Date: 2026-06-16

### Observation

Loop 33 added a shared lightweight classifier so custom fact-heavy topics are source-evidence gated on PC and mobile. The behavior is covered by E2E, but the keyword pool and `source-*` preset fallback were not protected by a fast project contract check, so a future edit could remove ranking/list/logo/fee triggers and only be caught by slower browser coverage.

### Hypothesis

If `scripts/verify_project.py` validates the custom source-evidence classifier keywords and representative keyword-match samples, then every Loop Engineering run will quickly catch regressions to ranking/list/current-fact gating before E2E starts.

### Patch

Files changed:

- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a helper to extract non-exported TypeScript string arrays.
- Added project-contract checks for `SOURCE_EVIDENCE_REQUIRED_KEYWORDS`.
- Added representative keyword samples for custom ranking/list, Chinese ranking/list, official fee/logo, and a non-source route topic.

### Verification

Commands run:

```bash
python scripts/verify_project.py --keep-cache
# passed
# topic_presets_contract_checked=422

npm run typecheck
# passed

npm run e2e
# passed: 27 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 20/20
- Test coverage: 18/20
- Safety/security: 14/15
- Maintainability: 10/10
- UX polish: 2/5
- Total: 82/100

### Result

Kept. This loop is small, but it turns the Loop 33 source-evidence classifier into a fast recurring contract so custom fact-heavy topics are less likely to silently drift back into unsourced generation.

### Remaining risk

- The contract is keyword-level and does not execute the TypeScript helper directly; E2E still covers runtime PC/mobile behavior.
- The env-backed live login smoke remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.

### Next candidate loop

- Continue auth/session recovery hardening, then add deeper semantic topic-intent checks for custom topics that do not contain obvious source keywords.

## Loop 35 - Protect login service-unavailable feedback

Date: 2026-06-16

### Observation

PC and mobile login already show distinct copy when the login request cannot reach the service, but E2E only protected the bad-credential path. A future change could collapse network/service failures back into generic credential errors, disable retry, or persist sensitive input without a fast regression signal.

### Hypothesis

If E2E explicitly simulates an unavailable login service on both PC and mobile, then CI will protect recoverable login feedback and password non-persistence for network/API failures, not just rejected credentials.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Added a shared E2E helper that aborts `/api/auth/mobile-login` to simulate a service-level fetch failure.
- Added PC login service-unavailable coverage.
- Added mobile login service-unavailable coverage at a 390 px viewport.
- Asserted the retry button becomes enabled again and the submitted password is not persisted.
- Tightened the mobile generation fixture so background content/cover list hydration cannot leak local or default backend data into source/cover E2E assertions.

### Verification

Commands run:

```bash
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "service-unavailable feedback" --project=chromium
# passed: 2 passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps selected ranking topic aligned|mobile preserves draft when cover generation fails" --project=chromium
# passed after fixture isolation: 2 passed

npm run typecheck
# passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# passed after fixture isolation: 29 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 91/100

### Result

Kept. This protects a P0 login failure mode and also removes an observed mobile E2E instability where background draft/cover hydration could overwrite controlled source evidence or status assertions.

### Remaining risk

- The service-unavailable coverage simulates a fetch-level failure; separate HTTP 5xx copy can be covered later if product copy changes.
- The env-backed live login smoke remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- Mobile generation fixtures are deterministic CI guards; they do not validate live Tavily/provider availability.

### Next candidate loop

- Continue auth/session recovery hardening, then add HTTP 5xx login feedback coverage or deeper semantic topic-intent checks for custom topics.

## Loop 36 - Treat login 5xx as service failure

Date: 2026-06-16

### Observation

Loop 35 protected fetch-level login outages, but PC and mobile login still treated HTTP 5xx responses from `/api/auth/mobile-login` as generic bad credentials. That can mislead users when the backend is down or overloaded and also weakens the P0 requirement that network/API failures show retry guidance.

### Hypothesis

If both login clients classify `response.status >= 500` with `readApiError` and E2E simulates a 503 response, then server-side login failures will show service-recovery copy without storing passwords or weakening bad-credential handling.

### Patch

Files changed:

- `frontend/components/workspace-client.tsx`
- `frontend/app/android/page.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `LOOP_LOG.md`

Summary:

- Updated PC login to surface 5xx service failure copy from `readApiError`.
- Updated mobile login to surface 5xx service failure copy from `readApiError`.
- Added PC and mobile E2E coverage for a 503 login response.
- Asserted the 503 path does not show the bad-credential message, leaves retry enabled, and does not persist passwords.

### Verification

Commands run:

```bash
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "server-error feedback" --project=chromium
# passed: 2 passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "bad-credential feedback|service-unavailable feedback" --project=chromium
# passed: 4 passed

npm run typecheck
# passed

python scripts/verify_project.py --keep-cache
# passed

npm run e2e
# passed: 31 passed, 1 skipped

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 26/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 94/100

### Result

Kept. PC and mobile login now distinguish bad credentials, fetch-level outages, and HTTP 5xx backend failures, while preserving retry and password non-persistence checks.

### Remaining risk

- HTTP 4xx responses other than 401/403 still intentionally use bad-credential copy except 404/405 service-version guidance.
- The env-backed live login smoke remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.

### Next candidate loop

- Continue auth/session recovery hardening, or add a small contract check that prevents login 5xx paths from regressing into bad-credential copy.

## Loop 37 - Fast-contract login failure classification

Date: 2026-06-16

### Observation

Loop 36 fixed and E2E-covered login 5xx behavior, but the fast project verifier did not yet protect the new failure classification. A future edit could remove the `response.status >= 500` branch in PC or mobile login and only be caught by the slower browser suite.

### Hypothesis

If `scripts/verify_project.py` checks PC, mobile, and E2E login failure contracts, then every Loop Engineering run will quickly catch regressions that collapse bad credentials, fetch outages, and HTTP 5xx server failures into the same user-facing error.

### Patch

Files changed:

- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added `validate_login_failure_contract`.
- Checked that PC and mobile login both keep the auth endpoint, 404/405 service-version handling, 5xx service failure handling, bad-credential fallback, fetch-level outage copy, and password-safe failure branches.
- Checked that E2E keeps mocked bad credentials, fetch outage, 503 server error, retry assertions, and password non-persistence coverage.
- Added `login_failure_contract_checked` to the project verifier output.

### Verification

Commands run:

```bash
python scripts/verify_project.py --keep-cache
# passed
# login_failure_contract_checked=32

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "bad-credential feedback|service-unavailable feedback|server-error feedback" --project=chromium
# passed: 6 passed

npm run typecheck
# passed

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 20/30
- Correctness: 20/20
- Test coverage: 18/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 2/5
- Total: 85/100

### Result

Kept. The fast verifier now fails if PC/mobile login loses the 5xx service-failure branch or if the E2E suite drops coverage for bad credentials, fetch outages, 503 server errors, retry, or password non-persistence.

### Remaining risk

- The contract is static and snippet-based; the E2E suite still provides the runtime proof for the login UI behavior.
- The env-backed live login smoke remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.

### Next candidate loop

- Continue auth/session recovery hardening, or move to draft output schema/preview checklist resilience.

## Loop 38 - Reject blank generated drafts

Date: 2026-06-16

### Observation

The draft generation service saved the model result as a draft after provider and topic-relevance checks. If a draft provider returned whitespace for a generic/custom topic, the relevance guard could pass and the app could persist a draft with no usable body.

### Hypothesis

If the backend rejects blank or non-string draft output before topic relevance and database persistence, then users will receive a recoverable generation error instead of a misleading empty draft, and future loops will catch regressions through backend tests plus the fast project verifier.

### Patch

Files changed:

- `backend/app/services/content_service.py`
- `backend/tests/test_content_source_context.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added `_draft_output_schema_issue` to classify blank/non-string draft output.
- Recorded invalid draft output as a `schema_invalid` generation log entry.
- Returned HTTP 502 with clear Chinese recovery copy instead of saving empty content.
- Added a regression test proving blank model output does not create `Content` and does create a `GenerationLog`.
- Added static contract checks so `scripts/verify_project.py` protects the guard and its test.

### Verification

Commands run:

```bash
backend\.venv\Scripts\python.exe -m pytest backend\tests\test_content_source_context.py -q
# passed: 5 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=971

backend\.venv\Scripts\python.exe -m pytest backend\tests -q
# passed: 226 passed, 1 warning

npm run typecheck
# passed

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 20/20
- Test coverage: 19/20
- Safety/security: 14/15
- Maintainability: 10/10
- UX polish: 3/5
- Total: 90/100

### Result

Kept. Blank generated drafts are now rejected before persistence, with a recoverable error and an auditable `schema_invalid` log.

### Remaining risk

- This loop only guards empty/non-string output; richer structured completeness for title/tags/checklist/cover suggestion still needs a later schema-normalization pass.
- The browser E2E generation path remains mostly mocked, so this backend guard is covered by backend tests and the project verifier rather than Playwright.

### Next candidate loop

- Add a small draft completeness normalizer/checklist guard, or continue one-click topic alignment coverage for custom topics.

## Loop 39 - PC custom topic alignment E2E

Date: 2026-06-16

### Observation

The PC E2E suite covered recommended topic alignment across sales, route, mentor, timing, and source presets. It also covered a custom fact-sensitive topic when source preview fails, but it did not cover the successful custom topic path through source evidence, generation, cover creation, draft history, preview, copy, and no automated publishing.

### Hypothesis

If the E2E suite includes a successful custom fact-sensitive topic scenario, then future changes to automatic topic syncing, knowledge query defaults, generated-content matching, preview copy, or cover routing will be caught before a custom user topic drifts back to a recommended preset or stale draft.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a PC E2E scenario for a custom fact-sensitive topic: `official tuition fees and logo verification for overseas doctoral programs`.
- Verified the custom topic auto-syncs to knowledge query, target audience, and tags using shared custom-topic helpers.
- Verified source preview, draft generation, cover generation, draft history, preview modal, and copy all preserve the custom topic.
- Asserted generated API payloads use the custom topic/query/audience/tags and no publishing/submission endpoint is called.
- Added a fast static contract so `scripts/verify_project.py` fails if this custom-topic success path is removed.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "custom fact topic aligned" --project=chromium
# passed: 1 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=980

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 90/100

### Result

Kept. PC one-click generation now has runtime E2E protection for successful custom fact-sensitive topics, including preview/copy alignment and the no-automated-publishing boundary.

### Remaining risk

- This loop covers PC custom-topic success; mobile custom-topic success still relies on existing mobile generation flow coverage and should get a dedicated custom-topic E2E later.
- The generated content fixture is controlled, so live model wording quality remains protected by backend prompt/intention tests rather than this browser test.

### Next candidate loop

- Add mobile custom-topic success coverage, or continue draft completeness/checklist normalization.

## Loop 40 - Mobile custom topic alignment E2E

Date: 2026-06-16

### Observation

Loop 39 protected the PC custom-topic success path, while mobile only had custom fact-sensitive coverage for the source-preview failure path. The mobile success path still needed runtime protection for custom topic syncing, source evidence, draft generation, cover generation, preview, copy, and no automated publishing.

### Hypothesis

If mobile E2E covers a successful custom fact-sensitive topic through preview copy, then regressions in mobile custom-topic auto-sync, source-evidence gating, generated draft matching, cover routing, or publishing safety will be caught before users see stale or recommendation-derived output for hand-entered topics.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a mobile E2E scenario for `official tuition fees and logo verification for overseas doctoral programs`.
- Verified mobile custom topic auto-syncs target audience and tags via shared custom-topic helpers.
- Verified source preview, draft generation, cover generation, draft history, preview, manual copy fallback, and preview-link copy controls keep the custom topic aligned.
- Asserted content/source/image payloads use the custom topic/query/audience/tags and that no publishing/submission route is called.
- Extended `scripts/verify_project.py` so the fast verifier protects both PC and mobile custom-topic success coverage.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps custom fact topic aligned" --project=chromium
# passed: 1 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=984

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 90/100

### Result

Kept. Mobile one-click generation now has runtime E2E protection for successful custom fact-sensitive topics, including source evidence, preview/copy, cover generation, and the no-automated-publishing boundary.

### Remaining risk

- The test uses a controlled fixture, so live model wording quality still relies on backend prompt/intention tests and future schema normalization.
- A broader full E2E sweep is still useful before release, but this loop verified the changed path directly.

### Next candidate loop

- Continue draft completeness/checklist normalization, or add coverage for mobile custom-topic stale-draft invalidation after topic edits.

## Loop 41 - Mobile stale draft warning

Date: 2026-06-16

### Observation

Mobile generation already computed whether the current generated content still matched the active topic, tags, platform, source query, and generation signature. However, when a user edited the topic after generating a draft, the UI did not clearly tell them that the opened draft was now stale, and the draft history card could still look like the active current draft.

### Hypothesis

If the mobile create screen surfaces a stale-draft warning and only marks a draft history card active when it matches current inputs, then users are less likely to copy or trust an old draft after changing topics.

### Patch

Files changed:

- `frontend/components/mobile-create-screen.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added `staleMobileDraftMessage` for mobile drafts that no longer match the active topic/query/tags/signature.
- Displayed a mobile warning telling the user to regenerate before copying stale content.
- Stopped marking a draft history item as active unless it still matches the current inputs.
- Extended the mobile custom-topic E2E to generate, copy, change the topic, and assert the stale warning mentions both the old draft and new topic.
- Added fast contract checks for the mobile stale-draft warning and E2E coverage.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps custom fact topic aligned" --project=chromium
# passed: 1 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=992

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 92/100

### Result

Kept. Mobile now explicitly warns when the current draft is stale after topic/input edits, while preserving draft history access and the no-automated-publishing boundary.

### Remaining risk

- This warns users but does not block manual opening/copying of older draft history items; draft history intentionally remains available.
- Broader draft completeness/checklist normalization is still pending.

### Next candidate loop

- Continue draft completeness/checklist normalization, especially structured warning/checklist handling for model output.

## Loop 42 - Draft metadata section guard

Date: 2026-06-16

### Observation

The backend already rejected blank or non-string draft model output before saving content. However, a model could still return a body wrapped in metadata sections such as `Title:`, `Body:`, or `Tags:` even though the prompt tells the model to return only the post body. That output would be stored as the draft body and could pollute preview/copy flows while duplicating title and tag fields that the app stores separately.

### Hypothesis

If the backend rejects draft bodies that begin lines with known metadata section labels, then malformed model responses will fail safely as `schema_invalid` instead of becoming user-visible draft content.

### Patch

Files changed:

- `backend/app/services/content_service.py`
- `backend/tests/test_content_source_context.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a narrow metadata-section label guard for draft model output.
- Reused the existing `schema_invalid` generation log and 502 failure path.
- Added a backend regression test for `Title:` / `Body:` / `Tags:` style malformed output.
- Extended the fast project verifier so this guard and test remain part of the content-production contract.

### Verification

Commands run:

```bash
backend\.venv\Scripts\python.exe -m pytest backend\tests\test_content_source_context.py -q
# passed: 6 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=999

backend\.venv\Scripts\python.exe -m pytest backend\tests -q
# passed: 227 passed, 1 warning
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 88/100

### Result

Kept. Draft generation now fails safely when a model returns app-level metadata sections as body text, preserving cleaner preview/copy output and the existing human-review workflow.

### Remaining risk

- The guard intentionally targets section labels at line starts only; it does not attempt to parse every possible malformed model response.
- Broader structured checklist and cover-suggestion normalization remains pending.

### Next candidate loop

- Continue draft completeness/checklist normalization, especially user-visible checklist state and incomplete-output recovery.

## Loop 43 - PC prepublish checklist state

Date: 2026-06-16

### Observation

The PC export card already warned that generated drafts require human review and showed risk/lifecycle notices. However, the "发布前检查" area did not expose a clear itemized checklist for title/body/tags, source evidence, cover material, safety wording, and human confirmation. Users could copy a draft without an explicit view of which items were ready, pending review, or blocked.

### Hypothesis

If the PC export card shows a stable prepublish checklist with per-item states, then users can see exactly what needs human confirmation before copying, while OPC still avoids any automated publishing behavior.

### Patch

Files changed:

- `frontend/components/workspace-client.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a data-driven PC prepublish checklist for content fields, source evidence, cover material, safety wording, and human confirmation.
- Derived source-evidence state from the existing generation source context stats.
- Kept copy behavior unchanged and preserved the no-automated-publishing boundary.
- Extended the PC custom fact-topic E2E to assert checklist visibility and expected states.
- Added fast verifier contracts for the checklist component and E2E protection.

### Verification

Commands run:

```bash
npm run typecheck
# passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1006

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps custom fact topic aligned" --project=chromium
# passed: 1 passed

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 23/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 88/100

### Result

Kept. PC users now see a concrete prepublish checklist before copying generated content, including source and cover review reminders, without introducing any publish automation.

### Remaining risk

- This loop covers PC export; mobile has a human-review note but not the same itemized checklist.
- The checklist is advisory and does not block copying; hard blocking should be considered carefully so manual review workflows do not get stuck.

### Next candidate loop

- Add a compact mobile preview checklist, or continue incomplete-output recovery for draft generation.

## Loop 44 - Mobile preview prepublish checklist

Date: 2026-06-16

### Observation

Loop 43 added a concrete PC prepublish checklist, but the mobile Xiaohongshu preview still only showed a single human-review note. Mobile users could copy text, copy a preview link, or prepare a cover handoff without seeing a compact itemized view of content fields, source evidence, cover material, safety wording, and human confirmation.

### Hypothesis

If the mobile draft preview shows the same core prepublish checklist states as PC, then mobile users get clearer review guidance before copying or sharing, while the app still avoids automated publishing.

### Patch

Files changed:

- `frontend/components/mobile-draft-preview-editor.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a compact mobile preview checklist for content fields, source evidence, cover material, safety wording, and human confirmation.
- Reused generation source-context stats to classify source evidence as ready for review or blocked.
- Added local safety-wording checks for high-risk promise terms before mobile copy/share.
- Extended the mobile custom fact-topic E2E to assert checklist visibility and expected states.
- Added fast verifier contracts for the mobile checklist and E2E protection.

### Verification

Commands run:

```bash
npm run typecheck
# passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1012

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps custom fact topic aligned" --project=chromium
# passed: 1 passed

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 23/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 8/10
- UX polish: 4/5
- Total: 87/100

### Result

Kept. Mobile preview now surfaces a compact prepublish checklist before copy/share actions, preserving the existing manual review and no-automated-publishing boundary.

### Remaining risk

- The checklist is advisory and does not block mobile copy/share; a blocking workflow would need separate product decisions.
- Existing mobile preview text still contains historical encoding artifacts in several older strings; this loop did not rewrite those unrelated labels.

### Next candidate loop

- Continue incomplete-output recovery for draft generation, or isolate and repair one visible mobile mojibake cluster at a time with E2E coverage.

## Loop 45 - Chinese draft metadata guard coverage

Date: 2026-06-16

### Observation

Loop 42 added a schema guard for model output that includes app-level metadata sections such as `Title:`, `Body:`, and `Tags:`. The guard also supports Chinese labels such as `标题：`, `正文：`, and `风险说明：`, but only the English-label case had a direct backend regression test.

### Hypothesis

If the backend test suite covers Chinese metadata-section labels, then regressions in common Chinese model output formatting will be caught before malformed drafts are saved as post bodies.

### Patch

Files changed:

- `backend/tests/test_content_source_context.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a backend test for draft model output containing `标题：`, `正文：`, and `风险说明：`.
- Verified the response fails safely with `schema_invalid`, creates no `Content`, and logs the rejected draft.
- Extended the fast verifier contract so this Chinese metadata guard coverage remains protected.

### Verification

Commands run:

```bash
backend\.venv\Scripts\python.exe -m pytest backend\tests\test_content_source_context.py -q
# passed: 7 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1014

backend\.venv\Scripts\python.exe -m pytest backend\tests -q
# passed: 228 passed, 1 warning
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 2/5
- Total: 83/100

### Result

Kept. Chinese metadata-section draft failures now have explicit backend coverage, reducing the risk of malformed Chinese model output reaching preview/copy flows.

### Remaining risk

- This is test coverage for an existing guard rather than a new recovery UI.
- Broader incomplete-output normalization, such as missing checklist or cover suggestion handling, remains pending.

### Next candidate loop

- Continue incomplete-output recovery for draft generation, or add a focused guard for another observed malformed-output pattern.

## Loop 46 - Draft hashtag line guard

Date: 2026-06-16

### Observation

The draft-generation schema guard rejects empty draft output and metadata-section leakage such as title/body/tags headings. A related malformed-output pattern remains possible: the model can place standalone Xiaohongshu hashtag lines directly in the body, while the app already stores and appends tags separately in preview/copy flows.

### Hypothesis

If the backend rejects standalone hashtag/tag lines in AI draft bodies before saving content, then preview/copy output is less likely to duplicate tags or treat metadata as body content.

### Patch

Files changed:

- `backend/app/services/content_service.py`
- `backend/tests/test_content_source_context.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a backend draft schema guard for standalone hashtag lines such as `#海外博士 #官方来源`.
- Kept inline body text untouched while rejecting tag-only lines before content is saved.
- Added regression coverage that verifies the response fails safely, no `Content` row is created, and `GenerationLog` records `schema_invalid`.
- Extended the fast project verifier so the hashtag-line guard and test remain part of the content-production contract.

### Verification

Commands run:

```bash
backend\.venv\Scripts\python.exe -m pytest backend\tests\test_content_source_context.py -q
# passed: 8 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1020

backend\.venv\Scripts\python.exe -m pytest backend\tests -q
# passed: 229 passed, 1 warning
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 19/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 2/5
- Total: 84/100

### Result

Kept. AI draft bodies with standalone hashtag lines now fail safely before preview/copy persistence, reducing duplicated tag output while preserving the separate tags field and manual review flow.

### Remaining risk

- This guard rejects standalone tag lines rather than attempting automatic cleanup; a future recovery path could strip the line and ask the user to review.
- Inline hashtags inside normal prose are not blocked by this loop.

### Next candidate loop

- Continue incomplete-output recovery for missing cover/checklist fields, or add focused E2E coverage that confirms preview/copy appends tags only once.

## Loop 47 - Shared copy tag dedupe

Date: 2026-06-16

### Observation

PC copy uses a local `buildPlatformCopy` helper, while mobile draft preview builds editable copy from a separate storage helper. Loop 46 prevents new backend AI drafts from saving standalone hashtag lines, but legacy or edited drafts can still carry a duplicate tag-only line in the body while the tags field is appended separately.

### Hypothesis

If PC and mobile copy/preview use one shared helper that removes standalone tag lines already represented by the tags field, then users get one clean tag block in preview/copy without weakening the separate manual review and no-auto-publish flow.

### Patch

Files changed:

- `frontend/lib/platform-copy.ts`
- `frontend/lib/mobile-draft-storage.ts`
- `frontend/components/mobile-draft-preview-editor.tsx`
- `frontend/components/workspace-client.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added shared platform-copy helpers for PC and mobile copy payloads.
- Removed duplicate standalone tag lines from preview/copy when those tags already exist in the structured tags field.
- Kept the final tag block intact and left unique or inline body text untouched.
- Updated mobile E2E fixtures to include a duplicate tag line and assert copied text contains the selected tag only once.
- Added project verifier contracts for the shared helper, PC/mobile integration, and E2E assertion.

### Verification

Commands run:

```bash
npm run typecheck
# passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1029

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps selected ranking topic aligned|mobile one-click generation keeps custom fact topic aligned" --project=chromium
# passed: 2 passed

npm run build
# passed

git diff --check
# passed, with CRLF normalization warnings for existing frontend files
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 21/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 86/100

### Result

Kept. PC and mobile copy/preview now share tag-line dedupe behavior, reducing duplicate Xiaohongshu tags while preserving the separate tags field and manual review flow.

### Remaining risk

- The helper removes only tag-only lines whose tags are already represented by the structured tag field; unique tag-only lines remain visible for human review.
- PC modal copy success does not expose clipboard contents in E2E, so mobile manual-copy coverage is the direct assertion path.

### Next candidate loop

- Add incomplete-output recovery for missing cover/checklist fields, or add a small frontend utility test harness for platform-copy behavior if the project grows unit-test support.

## Loop 48 - Mobile missing-cover checklist coverage

Date: 2026-06-16

### Observation

The mobile one-click flow already preserves the generated draft when cover generation fails and opens a text-only preview. The preview checklist also marks the cover item as blocked when `coverImageUrl` is missing, but the cover-failure E2E only asserted the text-only preview and did not protect the checklist recovery signal.

### Hypothesis

If the mobile cover-failure smoke test asserts that the publishing checklist stays visible and marks the cover item as needing补充, then future UI changes are less likely to hide missing-cover recovery guidance from users before copy/share.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Strengthened the mobile cover-failure E2E path to require the preview checklist after a failed cover generation.
- Asserted that the cover checklist item shows `需补充` and the missing-cover explanation.
- Added verifier contracts so this failure-path checklist coverage remains protected.

### Verification

Commands run:

```bash
python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1032

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile preserves draft when cover generation fails" --project=chromium
# passed: 1 passed

npm run typecheck
# passed

npm run build
# passed

git diff --check
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 3/5
- Total: 83/100

### Result

Kept. The mobile missing-cover recovery path now has E2E protection for the visible prepublish checklist and cover补充 guidance.

### Remaining risk

- This loop adds regression coverage for existing UI behavior rather than changing the UI copy itself.
- PC cover-failure checklist coverage can be tightened similarly in a later small loop.

### Next candidate loop

- Add PC cover-failure checklist assertions, or start a small recovery prompt for incomplete draft fields before preview/copy.

## Loop 49 - PC missing-cover checklist coverage

Date: 2026-06-16

### Observation

Loop 48 protected the mobile missing-cover path by asserting that the prepublish checklist remains visible and marks the cover item as needing补充. The PC cover-failure E2E already verifies that the draft remains available for preview/copy, but it does not assert the export checklist's cover recovery state.

### Hypothesis

If the PC cover-failure smoke test asserts the export checklist and missing-cover cover item, then both desktop and mobile workflows will protect the same human-review guidance when cover generation fails.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Strengthened the PC cover-failure E2E path to require the export prepublish checklist after failed cover generation.
- Asserted that the PC cover checklist item shows `需补充` and the missing-cover explanation.
- Added verifier contracts for the PC missing-cover checklist coverage.

### Verification

Commands run:

```bash
python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1035

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC cover failure keeps source topic draft available for preview copy" --project=chromium
# passed: 1 passed

npm run build
# passed

npm run typecheck
# passed after build regenerated .next-build/types

git diff --check
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 3/5
- Total: 83/100

### Result

Kept. The PC missing-cover path now has E2E protection for visible prepublish checklist guidance, matching the mobile coverage from Loop 48.

### Remaining risk

- This loop adds regression coverage for existing UI behavior rather than changing recovery copy.
- The first typecheck attempt was run in parallel with build and hit transient `.next-build/types` deletion; sequential typecheck after build passed.

### Next candidate loop

- Start a small recovery prompt for incomplete draft fields before preview/copy, or add a lightweight unit-style check around platform copy helpers if the frontend test harness expands.

## Loop 50 - PC missing-tag recovery prompt

Date: 2026-06-16

### Observation

The PC export checklist can mark the content item as blocked when title/body/tags are missing, but the checklist detail is generic and does not tell the user which field needs recovery. Since tags are copied separately from the body, a generated draft with an empty tags array should surface an explicit recovery prompt before copy/review.

### Hypothesis

If the PC prepublish content checklist names the missing field, then incomplete generated drafts are easier to repair without changing the no-auto-publish boundary or silently inventing tags.

### Patch

Files changed:

- `frontend/components/workspace-client.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added PC checklist recovery copy that names missing generated fields: title, body, or tags.
- Kept copy available as a manual preparation action, while the prepublish checklist marks the content item as `需补充`.
- Added a PC E2E that clears the tags field before generation and verifies the export checklist says `缺少标签` and asks the user to regenerate or manually补充.
- Extended the project verifier contract for the missing-field helper and the new E2E coverage.

### Verification

Commands run:

```bash
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC generated draft missing tags shows recovery checklist" --project=chromium
# passed: 1 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1044

npm run typecheck
# passed

npm run build
# passed

git diff --check
# passed, with CRLF normalization warning for an existing frontend file
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 20/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 85/100

### Result

Kept. PC users now get a specific recovery prompt when a generated draft is missing tags, instead of a generic checklist message.

### Remaining risk

- This loop covers PC missing-tag recovery. Mobile missing title/body/tag recovery copy can be made similarly explicit in a later loop.
- The first E2E draft simulated backend tag loss while the form still had tags; the UI correctly treated that as stale draft mismatch, so the test was adjusted to the intended user-missing-tags scenario.

### Next candidate loop

- Add equivalent mobile missing-field recovery copy, or add a focused backend guard for a too-thin draft body if a safe threshold is agreed.

## Loop 51 - Mobile missing-tag recovery prompt

Date: 2026-06-16

### Observation

The mobile draft preview has a prepublish checklist and can block the content item when title/body/tags are missing, but the content checklist detail is generic. After Loop 50, PC tells users exactly which field is missing; mobile should give the same recovery path.

### Hypothesis

If the mobile draft preview checklist names missing draft fields, then mobile users can repair incomplete generated drafts without assuming the draft is publish-ready or needing to guess whether title, body, or tags failed.

### Patch

Files changed:

- `frontend/components/mobile-draft-preview-editor.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added mobile draft-preview recovery copy that names missing title, body, or tags.
- Kept copy/export actions as manual preparation only; the checklist marks incomplete content as `需补充`.
- Added a mobile E2E that clears the tags field before generation and verifies the preview checklist says `缺少标签` and asks the user to regenerate or manually补充.
- Extended the project verifier contract for the mobile missing-field helper and E2E coverage.

### Verification

Commands run:

```bash
npm run typecheck
# passed

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile generated draft missing tags shows recovery checklist" --project=chromium
# passed: 1 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1053

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 20/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 85/100

### Result

Kept. Mobile users now get the same explicit missing-tag recovery prompt as PC users before preview copy/export.

### Remaining risk

- This loop covers mobile missing tags through the generated draft preview. Separate tests for missing title/body can be added if the backend starts returning those cases often.
- Existing historical documentation still contains some mojibake display artifacts and should be cleaned in a separate focused loop.

### Next candidate loop

- Clean historical mojibake in Loop Engineering docs and visible frontend copy, or add a focused backend guard for too-thin generated draft bodies.

## Loop 52 - Text hygiene marker enforcement

Date: 2026-06-16

### Observation

The Loop Engineering docs render correctly when read as UTF-8. The project text hygiene guard already resolves Python Unicode escapes at runtime, but its marker table is easy to misread as checking escaped text rather than actual replacement/mojibake characters.

### Hypothesis

If `FORBIDDEN_TEXT_MARKERS` is written with explicit `chr(...)` markers and a self-check rejects escaped `\\uXXXX` literals, then future edits are less likely to weaken the text hygiene guard while preserving current verification behavior.

### Patch

Files changed:

- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Rewrote text hygiene forbidden markers with explicit runtime `chr(...)` Unicode characters.
- Added a self-check that fails if a future edit uses escaped `\\uXXXX` string literals that would check the wrong text.
- Confirmed the current Loop Engineering docs and source hygiene set still pass with the clearer marker definition.

### Verification

Commands run:

```bash
python scripts\verify_project.py --keep-cache
# passed
# text_hygiene_files_checked=129

python - <<'PY'
import scripts.verify_project as verify_project
markers = verify_project.FORBIDDEN_TEXT_MARKERS
assert chr(0xFFFD) in markers
assert chr(0x951F) in markers
assert not any(marker.startswith("\\u") for marker in markers)
print("text_hygiene_marker_contract=ok")
PY
# passed
# text_hygiene_marker_contract=ok
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 12/30
- Correctness: 19/20
- Test coverage: 15/20
- Safety/security: 12/15
- Maintainability: 10/10
- UX polish: 2/5
- Total: 70/100

### Result

Kept as a small maintainability hardening. CI/project verification remains behaviorally consistent, and the marker table is now harder to weaken accidentally.

### Remaining risk

- This loop improves project hygiene enforcement, not user-visible UI copy.
- The current bad-looking PowerShell output is still a terminal rendering issue, not repository mojibake.

### Next candidate loop

- Continue with core workflow coverage, especially backend guards for too-thin generated drafts or broader one-click topic drift checks.

## Loop 53 - Reject too-thin generated drafts

Date: 2026-06-16

### Observation

Backend draft generation rejects blank model output, metadata sections, standalone hashtag lines, and known topic drift, but a model response with only one very short sentence can still become a saved draft for generic topics.

### Hypothesis

If the backend rejects model drafts with too few meaningful characters through the existing `schema_invalid` path, then users will see a recoverable generation failure instead of reviewing a nearly empty Xiaohongshu draft.

### Patch

Files changed:

- `backend/app/services/content_service.py`
- `backend/tests/test_content_source_context.py`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a conservative backend thin-draft guard that rejects generated drafts with fewer than 20 meaningful characters.
- Reused the existing `schema_invalid` path so no draft is saved and no downstream cover/publish workflow starts.
- Added a regression test confirming a one-sentence thin draft is rejected, logged, and not persisted.
- Extended the project verifier contract for the thin-draft guard and test coverage.

### Verification

Commands run:

```bash
backend\.venv\Scripts\python.exe -m pytest backend\tests\test_content_source_context.py -k "too_thin or blank_ai_draft or metadata_section_ai_draft or hashtag_line_ai_draft"
# passed: 5 passed, 4 deselected

backend\.venv\Scripts\python.exe -m pytest backend\tests\test_content_source_context.py backend\tests\test_content_relevance.py
# passed: 66 passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1059

backend\.venv\Scripts\python.exe -m pytest backend\tests
# passed: 230 passed, 1 warning
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 14/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 87/100

### Result

Kept. The backend now rejects obviously too-thin generated drafts before they can become reviewable content.

### Remaining risk

- The guard is intentionally conservative to avoid rejecting concise but valid ranking/list drafts; richer semantic quality scoring can be added later if needed.
- Frontend still presents the backend error through the existing generation failure path rather than a custom thin-draft UI message.

### Next candidate loop

- Add broader one-click topic drift coverage for additional preset categories, or improve frontend wording for backend `schema_invalid` generation failures.

## Loop 54 - Mobile multi-topic alignment E2E

Date: 2026-06-16

### Observation

PC E2E covers one-click generation alignment across sales, route, mentor, timing, and source topics. Mobile E2E covers ranking and custom source topics, but it does not yet protect route/decision, mentor-matching, timing/schedule, or sales/marketing topic types through preview copy.

### Hypothesis

If mobile one-click generation has the same multi-topic E2E coverage as PC for sales, route, mentor, and timing topics, then future regressions that drift mobile output intent or request payloads will be caught before users see mismatched drafts.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added a reusable mobile topic-alignment E2E helper covering login, project entry, topic inputs, source preview, draft generation, preview, copy, and no-publish guards.
- Added mobile one-click E2E coverage for sales/marketing, route/decision, mentor-matching, and timing/schedule topics.
- Extended the project verifier contract so these mobile multi-topic tests and request checks remain in CI.

### Verification

Commands run:

```bash
npm run typecheck
# passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1077

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps selected (sales|route|mentor|timing) topic aligned through preview copy" --project=chromium
# passed: 4 passed

npm run build
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 91/100

### Result

Kept. Mobile one-click generation now has regression coverage for the same core non-ranking topic families as PC: sales, route, mentor, and timing.

### Remaining risk

- This loop adds E2E protection, not new production behavior.
- Source-heavy/current-fact mobile custom topics are already covered separately; future loops can add more source-required preset variants if needed.

### Next candidate loop

- Improve frontend wording for backend `schema_invalid` generation failures, or add narrower checks for source-required custom topics.

## Loop 55 - Draft generation recovery copy

Date: 2026-06-16

### Observation

Backend draft generation now rejects blank, metadata-only, hashtag-only, drifted, and too-thin model outputs through `schema_invalid`, but PC and mobile surfaced those details as plain generation failures. Users could see a valid reason, but not a clear recovery instruction or reassurance that the bad draft was not saved.

### Hypothesis

If PC and mobile wrap draft-quality failures with shared recovery copy, users will know to add material, re-check the topic/tags/source evidence, and regenerate without mistaking the rejected model output for a saved draft.

### Patch

Files changed:

- `frontend/lib/service-error-copy.ts`
- `frontend/components/workspace-client.tsx`
- `frontend/components/mobile-create-screen.tsx`
- `frontend/tests/e2e/opc.smoke.spec.ts`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added shared draft-generation recovery copy for backend `schema_invalid` style failures such as blank output, too-thin body, metadata sections, standalone hashtag lines, and topic drift.
- Wired the copy into PC and mobile one-click draft failure handling without changing auth, generation requests, cover generation, copy flow, or human review gates.
- Updated PC and mobile E2E content-failure flows to simulate a too-thin draft rejection and assert that no false draft is saved or published.
- Extended the project verifier contract so the recovery helper and E2E coverage remain protected.

### Verification

Commands run:

```bash
npm run typecheck
# passed

python scripts\verify_project.py --keep-cache
# passed
# content_production_contract_checked=1095

npx --version
# passed: 11.12.1

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "schema-invalid draft failure" --project=chromium
# passed: 2 passed

npm run build
# passed

git diff --check
# passed

npm run lint
# passed
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 21/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 4/5
- Total: 86/100

### Result

Kept. PC and mobile now explain draft-quality generation failures as recoverable issues and preserve the no-false-draft/no-automatic-publishing behavior in E2E.

### Remaining risk

- This loop improves the visible failure copy for known draft-quality backend details; future backend validators should add their marker if they need the same recovery framing.
- Generic provider outages still use the existing service-unavailable copy, which is intentional.

### Next candidate loop

- Add source-required preset coverage for more current-fact topics, or add a small unit-level contract for the recovery-copy helper if E2E runtime becomes too heavy.

## Loop 56 - Source logo-price preset E2E coverage

Date: 2026-06-16

### Observation

Source-heavy E2E coverage protects the official-fee preset and custom fact topics, but the separate `source-logo-price` preset directly mentions校徽/logo、价格、学费 and is not individually covered through PC and mobile one-click generation.

### Hypothesis

If PC and mobile E2E cover the `source-logo-price` preset through source preview, generation, preview/copy, and no-publish assertions, then regressions that skip collected evidence or drift this current-fact topic will be caught before users see invented school, price, or logo conclusions.

### Patch

Files changed:

- `frontend/tests/e2e/opc.smoke.spec.ts`
- `frontend/package.json`
- `scripts/verify_project.py`
- `LOOP_LOG.md`

Summary:

- Added PC and mobile E2E coverage for the `source-logo-price` preset using the existing topic-alignment helpers.
- The new tests verify source preview, generation request payloads, cover-direction alignment, preview/copy flow, and no publishing-like calls.
- Hardened the frontend typecheck script with `--incremental false` after verification exposed stale `.next-build/types` entries in the local TypeScript cache when running lint after build.
- Extended the project verifier contract for the new source-logo-price coverage and cache-stable typecheck command.

### Verification

Commands run:

```bash
npm run typecheck
# passed

python scripts\verify_project.py --keep-cache
# passed
# safety_gates_checked=149
# content_production_contract_checked=1105

npx --version
# passed: 11.12.1

npx playwright test tests/e2e/opc.smoke.spec.ts --grep "source logo-price topic" --project=chromium
# passed: 2 passed

npm run build
# passed

git diff --check
# passed

npm run lint
# initially failed after build due stale tsconfig.tsbuildinfo entries for .next-build/types
# passed after disabling incremental typecheck cache
```

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 18/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 3/5
- Total: 87/100

### Result

Kept. PC and mobile now have direct CI E2E protection for the source/logo/price preset, and the frontend quality gate is stable even when lint/typecheck runs after a production build.

### Remaining risk

- This loop adds regression coverage, not new production behavior for source retrieval.
- The source-logo-price tests use controlled fixture evidence; live Tavily/provider behavior remains covered by service-level paths and needs environment-backed checks when credentials are available.

### Next candidate loop

- Add a small source-required ranking/project-list preset guard, or inspect the live mobile/PC source evidence UI for any copy overflow at 390 px and 1280 px.

## Loop 57 - Ranking project-list preset E2E coverage

Date: 2026-06-16

### Observation

The source-evidence classifier already treats rankings, schools, universities, and project lists as source-required topics, but the `ranking-water-programs` preset did not have direct PC/mobile E2E coverage. This preset asks for water resources PhD program lists, so regressions could skip evidence and still appear superficially aligned.

### Hypothesis

If PC and mobile E2E cover `ranking-water-programs` through source preview, generation payloads, preview/copy, cover direction, and no-publish assertions, then project-list/ranking topics that need current school or program facts will stay tied to collected evidence.

### Patch

- Added PC and mobile smoke tests for the shared `ranking-water-programs` preset.
- Extended `scripts/verify_project.py` so the project-list/ranking preset, source preview, cover direction, and E2E contracts are protected by repository self-checks.
- Removed build-only `.next-build/types/**/*.ts` from the frontend TypeScript include list.
- Updated `frontend/scripts/next-with-dist.mjs` to restore the development `next-env.d.ts` and `tsconfig.json` after production builds, because Next rewrites `tsconfig.json` while building with the custom `.next-build` dist dir.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "ranking project-list topic" --project=chromium
npm run build
npm run lint
git diff --check
```

All final checks passed.

Important regression evidence:

- The new Playwright grep ran 2 tests: mobile and PC ranking project-list topic alignment.
- `npm run build` still lets Next add `.next-build/types/**/*.ts` during build, but the wrapper now restores `tsconfig.json` afterward.
- The final post-build `npm run lint` passed, proving the previous `.next-build/types` missing-file failure is fixed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 23/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 3/5
- Total: 90/100

### Result

Kept. Ranking/project-list topics now have direct PC and mobile CI E2E coverage, and the frontend quality gate stays stable after a production build.

### Remaining risk

- The E2E uses controlled fixture evidence, not live Tavily results.
- The test verifies source-preview/generation/copy alignment, but it does not visually inspect every theme at multiple breakpoints.

### Next candidate loop

- Inspect the live mobile/PC source evidence UI for copy overflow at 390 px and 1280 px, or add a source-required guard for another current-facts preset family.

## Loop 58 - Source evidence viewport guard

Date: 2026-06-16

### Observation

The source evidence card uses wrapping and internal scroll areas, and the ranking/project-list E2E now confirms evidence content exists. However, the smoke suite did not assert that source evidence panels stay within the viewport on the most important mobile and desktop widths.

### Hypothesis

If the ranking project-list PC/mobile smoke path checks the source evidence card and expanded source lists against viewport bounds, then future changes that make evidence URLs, summaries, or long queries overflow horizontally will be caught before CI passes.

### Patch

- Added an optional `expectSourceEvidenceViewportFit` flag to the PC and mobile topic alignment E2E helpers.
- Added `expectNoHorizontalViewportOverflow`, which checks visible source evidence panels against the active viewport width without failing on unrelated horizontal draft carousels.
- Enabled the viewport guard for the PC and mobile `ranking-water-programs` smoke paths.
- Extended `scripts/verify_project.py` so the source evidence viewport guard cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "ranking project-list topic" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 2 tests, covering the mobile 390 px path and desktop 1280 px path for the ranking project-list preset.
- The viewport guard checked both the source evidence card and the expanded knowledge/web source lists.
- `npm run build` passed, and `frontend/tsconfig.json` stayed restored after build.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 21/30
- Correctness: 18/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 88/100

### Result

Kept. The current-facts ranking/project-list path now protects not only content alignment and source usage, but also source evidence layout at the key PC/mobile viewport widths.

### Remaining risk

- This is a geometry regression guard, not a screenshot-level visual diff.
- It checks the fixture-backed ranking project-list flow; live Tavily/source result shape still depends on configured provider behavior.

### Next candidate loop

- Add a source-required guard for another current-facts preset family, or inspect whether long custom source topics need the same viewport guard.

## Loop 59 - Custom source topic viewport guard

Date: 2026-06-16

### Observation

The custom fact-topic E2E paths use a long English source topic and verify source preview, generation payloads, cover direction, copy flow, and stale draft warnings. They did not reuse the new source evidence viewport guard, even though custom topics are more likely to contain long queries or URLs than curated presets.

### Hypothesis

If the PC and mobile custom fact-topic smoke tests check the source evidence card and expanded knowledge/web lists against the viewport, then custom source workflows will stay readable on the key 390 px mobile and 1280 px desktop paths.

### Patch

- Reused `expectNoHorizontalViewportOverflow` in the mobile custom fact-topic smoke path after expanding knowledge and web source lists.
- Reused the same viewport guard in the PC custom fact-topic smoke path.
- Extended `scripts/verify_project.py` with a custom source viewport E2E contract so this protection is not removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "custom fact topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 2 tests, covering the long custom source topic on mobile 390 px and desktop 1280 px.
- The custom source evidence card, expanded knowledge list, and expanded web source list stayed within viewport bounds.
- `npm run build` passed, and `frontend/tsconfig.json` stayed restored after build.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 20/30
- Correctness: 18/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 87/100

### Result

Kept. Long custom source topics now have the same PC/mobile source evidence viewport protection as the curated ranking project-list preset.

### Remaining risk

- This remains a fixture-backed geometry check, not a visual screenshot diff.
- Live provider results with unusually long URLs or snippets should still be sampled when Tavily credentials are available.

### Next candidate loop

- Add a source-required guard for another current-facts preset family, or broaden the viewport guard to source preview failure/recovery states.

## Loop 60 - Source preview failure viewport guard

Date: 2026-06-16

### Observation

The source preview failure tests already verify that generation is blocked and no false draft is created when source evidence cannot be loaded. They did not yet check that the visible recovery/error state stays within the PC and mobile viewport.

### Hypothesis

If PC and mobile source-preview failure tests assert the source evidence error card and retry control stay inside the viewport, then long source failure copy will not regress into horizontal overflow while still preserving the no-fake-draft safety gate.

### Patch

- Added `expectNoHorizontalViewportOverflow` checks to the mobile source-preview failure state.
- Added the same viewport guard to the mobile custom fact-topic source-preview failure state.
- Added matching PC viewport checks for normal source-preview failure and custom fact-topic source-preview failure.
- Extended `scripts/verify_project.py` with source-preview failure viewport contracts.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "source preview failure" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 4 tests covering mobile/PC source-preview failure and mobile/PC custom source-preview failure.
- Each failure state still blocks generation, creates no false draft, and now keeps the source error card plus retry control inside the viewport.
- `npm run build` passed, and `frontend/tsconfig.json` stayed restored after build.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 21/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 89/100

### Result

Kept. Source preview failure and recovery states now have PC/mobile viewport protection while preserving the no-generation/no-fake-draft safety behavior.

### Remaining risk

- This is still a fixture-backed geometry guard, not a screenshot visual diff.
- Live provider error messages may vary and should be sampled when real Tavily/provider credentials are available.

### Next candidate loop

- Add a source-required guard for another current-facts preset family, or add screenshot-level source evidence visual QA for one focused viewport.

## Loop 61 - Market data source detection guard

Date: 2026-06-16

### Observation

The source-evidence classifier already covers official pages, tuition, prices, logos, rankings, schools, and program lists. It does not explicitly cover market-data and market-rate wording, even though those topics also require current sources and should not be answered from model memory alone.

### Hypothesis

If market-data and market-rate phrases are included in the shared source-evidence classifier, while generic marketing wording remains excluded, then custom market-data topics will be forced through the evidence path without breaking sales/marketing topic selection.

### Patch

- Added market-data, market-rate, pricing-benchmark, live-price, and Chinese market-rate phrases to the shared source-evidence keyword classifier.
- Added verifier contract cases that require market-data topics to match, while keeping generic marketing copy excluded.
- Retargeted the PC and mobile custom fact-topic success E2E smoke tests to a market-data/pricing-benchmark topic so the browser flow now covers this source-required family.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "custom fact topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 2 tests, covering the market-data custom topic on mobile 390 px and desktop 1280 px.
- The source preview request, generated title/body/tags, cover direction, pre-publish checklist, draft history, preview, and copy actions stayed aligned with the market-data custom topic.
- The verifier now fails if market-data/pricing-benchmark source detection is removed or if generic marketing wording becomes source-required by accident.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 19/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 89/100

### Result

Kept. Custom market-data and pricing-benchmark topics now require source evidence and are covered by PC/mobile one-click generation smoke tests without widening the classifier to generic marketing topics.

### Remaining risk

- The source data remains fixture-backed in E2E; live Tavily/provider result quality still needs sampling when credentials are configured.
- Other fact-sensitive phrases such as exchange rates or platform fee schedules may need their own explicit keywords if they appear in future topic presets.

### Next candidate loop

- Add a source-required guard for exchange-rate or platform-fee wording, or add screenshot-level source evidence visual QA for one focused viewport.

## Loop 62 - Exchange-rate source detection guard

Date: 2026-06-16

### Observation

The source-evidence classifier now covers market data and pricing benchmarks, and generic platform-fee wording is already caught by existing fee keywords. Exchange-rate and currency-conversion topics are also current-facts inputs, but they were not explicitly covered by the classifier or the focused failure-state E2E topic.

### Hypothesis

If exchange-rate and currency-conversion phrases are included in the shared source-evidence classifier, and the PC/mobile custom source-preview failure tests use an exchange-rate topic, then currency-sensitive custom topics will be blocked from generating when source evidence fails.

### Patch

- Added exchange-rate, currency-rate, currency-conversion, foreign-exchange, FX-rate, and Chinese currency phrases to the shared source-evidence keyword classifier.
- Retargeted the PC and mobile custom source-preview failure E2E topics to an exchange-rate/currency-conversion custom topic.
- Extended the verifier contract with exchange-rate keyword samples and an E2E contract string for the focused failure topic.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "source preview failure" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 4 tests covering PC/mobile source-preview failure and PC/mobile custom source-preview failure.
- The custom failure path now uses an exchange-rate/currency-conversion topic and still blocks draft generation, creates no false draft, and keeps recovery UI inside the viewport.
- The verifier now fails if exchange-rate or currency-conversion source detection is removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 21/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 89/100

### Result

Kept. Exchange-rate and currency-conversion custom topics now require source evidence, and source-preview failure blocks generation on both PC and mobile.

### Remaining risk

- E2E still uses fixture-backed source-preview responses; live exchange-rate source quality should be sampled when real provider credentials are configured.
- Future fee-schedule phrases that avoid the existing fee keywords may need additional explicit coverage.

### Next candidate loop

- Add screenshot-level source evidence visual QA for one focused viewport, or inspect copy/preview flow for topic drift on another non-source preset family.

## Loop 63 - PC multi-topic alignment contract guard

Date: 2026-06-16

### Observation

Mobile multi-topic E2E coverage is explicitly guarded by the project verifier for sales, route, mentor, timing, and source presets. PC has matching one-click generation E2E tests for the same non-source topic families, but the verifier does not yet lock those PC contracts in place.

### Hypothesis

If the verifier explicitly requires the PC sales, route, mentor, and timing alignment tests plus their export, preview, copy, and no-publishing assertions, then future edits are less likely to remove PC topic-intent coverage or let one-click generation drift silently on desktop.

### Patch

- Added a PC multi-topic E2E contract block to `scripts/verify_project.py`.
- Required the existing PC sales, route, mentor, and timing alignment tests to remain present.
- Required desktop export card, pre-publish checklist, preview modal, preview-copy button, no rewrite, and no publishing/submission assertions to stay protected.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps selected (sales|route|mentor|timing) topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 4 tests covering PC sales, route, mentor, and timing one-click generation.
- Each covered path still keeps selected topic, audience, tags, cover direction, export card, preview modal, and copy action aligned.
- The verifier now fails if the PC multi-topic desktop coverage or no-publishing guard is removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 18/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 85/100

### Result

Kept. Desktop sales, route, mentor, and timing one-click generation coverage is now protected by the project verifier, matching the existing mobile multi-topic guard.

### Remaining risk

- This loop protects existing PC E2E coverage rather than adding a new rendered UI assertion.
- Screenshot-level visual QA for source evidence remains a separate future improvement.

### Next candidate loop

- Add screenshot-level source evidence visual QA for one focused viewport, or inspect another desktop preview/copy edge state.

## Loop 64 - PC preview copy payload guard

Date: 2026-06-16

### Observation

The PC multi-topic helper verifies that the preview modal opens and that the preview copy button reports a copied state. It does not currently inspect the actual copied payload, so a future copy-text regression could drift away from the selected topic or reintroduce duplicate tag lines while the button still says copied.

### Hypothesis

If the PC preview-copy helper intercepts clipboard writes and asserts the copied text contains the selected topic and exactly one instance of the first tag, then desktop preview/copy regressions will be caught across the existing sales, route, mentor, and timing topic smoke tests.

### Patch

- Added a clipboard-write interceptor inside the PC topic alignment E2E helper.
- Asserted the copied preview payload includes the selected topic.
- Asserted the copied preview payload includes the first topic tag exactly once.
- Extended the project verifier so this payload-level PC copy guard cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC one-click generation keeps selected (sales|route|mentor|timing) topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 4 tests covering PC sales, route, mentor, and timing preview-copy flows.
- The copied payload now has to contain the selected topic and a deduplicated tag line, not just a copied-state button label.
- The verifier now fails if the clipboard payload interception or topic/tag copy assertions are removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 19/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 87/100

### Result

Kept. PC preview-copy smoke coverage now verifies the actual copied text stays aligned with the selected topic and avoids duplicate first-tag output.

### Remaining risk

- This covers the PC multi-topic helper paths; custom fact-topic PC preview copy still has separate visible alignment checks but not this exact clipboard payload interception.
- Clipboard behavior in real browsers may still vary, so manual spot checks remain useful around browser permission changes.

### Next candidate loop

- Add the same payload-level copy guard to the PC custom fact-topic preview path, or inspect mobile copy fallback behavior for custom fact topics.

## Loop 65 - PC custom preview copy payload guard

Date: 2026-06-16

### Observation

Loop 64 added payload-level clipboard assertions to the shared PC multi-topic preview-copy helper. The PC custom fact-topic flow still only checked visible preview alignment and the copied button state, leaving actual copied text unchecked for market-data custom topics.

### Hypothesis

If the PC custom fact-topic preview path shares the same clipboard capture helper and asserts the copied payload contains the custom topic and a deduplicated first tag, then custom source-required desktop topics will get the same copy-flow regression guard as preset topics.

### Patch

- Extracted the PC preview clipboard capture into shared E2E helpers.
- Reused the helpers in the PC multi-topic preview path.
- Added payload-level copy assertions to the PC custom fact-topic preview path.
- Extended the verifier contract so the custom fact-topic copy payload guard cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "custom fact topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 2 tests covering mobile and PC custom fact-topic generation.
- The PC custom fact-topic preview copy now has to contain the custom market-data topic and a deduplicated first tag.
- The verifier now fails if the shared clipboard capture helper or custom copied-payload assertions are removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 19/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 87/100

### Result

Kept. PC custom fact-topic preview-copy smoke coverage now verifies the actual copied text stays aligned with the custom source-required topic and avoids duplicate first-tag output.

### Remaining risk

- Mobile custom fact-topic copy already checks the manual copy text after copy, but it does not use the same clipboard interception helper.
- Real browser clipboard permission changes may still need occasional manual spot checks.

### Next candidate loop

- Inspect mobile custom fact-topic copy fallback behavior, or add a screenshot-level source evidence visual QA for one focused viewport.

## Loop 66 - Mobile custom copy payload guard

Date: 2026-06-16

### Observation

The mobile custom fact-topic test checks the manual copy text shown after tapping copy, but it does not inspect the actual clipboard write when the browser copy path succeeds. PC custom fact-topic copy now has payload-level clipboard assertions.

### Hypothesis

If the mobile custom fact-topic copy flow captures the clipboard payload and still checks the manual fallback text, then mobile custom source-required topics will be protected against both copied-text drift and fallback-text drift.

### Patch

- Reused the shared clipboard capture helpers in the mobile custom fact-topic preview-copy path.
- Added payload-level assertions that the mobile copied text contains the custom source-required topic and a deduplicated first tag.
- Kept the manual fallback copy-text assertions so browser clipboard and fallback UI drift are both covered.
- Extended the project verifier contract to require the mobile copied-payload and manual fallback tag-deduplication checks.

### Verification

```text
npm run lint
npm run typecheck
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "custom fact topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed 2 tests covering mobile and PC custom fact-topic generation.
- The mobile custom fact-topic copy flow now has to write copied text containing the custom market-data topic and only one first-tag occurrence.
- The manual copy fallback still has to expose the same custom topic and deduplicated first tag.
- The verifier now fails if the mobile copied-payload assertions or manual fallback tag-deduplication assertion are removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 19/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 4/5
- Total: 87/100

### Result

Kept. Mobile custom fact-topic preview-copy smoke coverage now verifies the actual copied text and the manual fallback text stay aligned with the custom source-required topic.

### Remaining risk

- This protects text payload and fallback copy behavior, but it does not add screenshot-level visual evidence for the mobile preview layout.
- Real browser clipboard permission changes may still need occasional manual spot checks.

### Next candidate loop

- Add focused visual QA for one mobile custom fact-topic preview viewport, or continue hardening source-evidence display for fact-sensitive topics.

## Loop 67 - Mobile custom preview viewport guard

Date: 2026-06-16

### Observation

Loop 66 protects the mobile custom fact-topic copied payload and manual fallback text. The same path still lacks a focused mobile viewport-fit assertion after the draft preview opens, so a long custom market-data topic could regress into horizontal overflow without being caught.

### Hypothesis

If the mobile custom fact-topic E2E checks the opened draft preview editor, cover image, checklist, and bottom copy actions against the 390px viewport, then the custom source-required preview flow will catch layout regressions before users see clipped preview or copy controls.

### Patch

- Added a viewport-fit assertion to the mobile custom fact-topic draft preview after the preview opens.
- Covered the preview editor, cover image, prepublish checklist, copy button, and preview-link action in the 390px viewport.
- Extended the verifier contract so the mobile custom preview viewport guard cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps custom fact topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed the mobile custom fact-topic preview-copy test with the new viewport-fit guard.
- The custom market-data topic preview now has to keep the editor, generated cover, checklist, copy action, and preview-link action within the 390px viewport.
- The verifier now fails if the custom preview viewport guard or its key targets are removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 5/5
- Total: 85/100

### Result

Kept. Mobile custom source-required draft preview coverage now protects basic viewport fit for the preview surface and bottom copy actions.

### Remaining risk

- This checks layout bounds but does not create a screenshot baseline for typography or visual theme details.
- The guard uses a 390px viewport; 360px and 414px still rely on broader mobile shell and source-evidence checks.

### Next candidate loop

- Add a 360px viewport guard for one source-required mobile preview path, or continue hardening review-page source evidence visibility.

## Loop 68 - Mobile source preview 360px guard

Date: 2026-06-16

### Observation

Loop 67 added a 390px viewport-fit guard for the mobile custom fact-topic preview. Backlog acceptance still calls out 360px mobile widths, and the selected ranking/project-list path has source evidence checks but does not assert the opened draft preview stays within the narrowest common viewport.

### Hypothesis

If the mobile multi-topic E2E helper can run one source-required ranking/project-list scenario at 360px and check the opened draft preview surface, cover, checklist, and bottom actions, then narrow-phone preview regressions will be caught without adding a separate broad test.

### Patch

- Parameterized the mobile topic-alignment helper with an optional viewport and preview viewport-fit guard.
- Ran the selected ranking/project-list source-required scenario at 360px wide.
- Added preview-fit assertions for the opened draft preview editor, cover image, checklist, copy action, and preview-link action.
- Extended the verifier contract so the 360px source-required preview guard cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile one-click generation keeps selected ranking project-list topic aligned" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed the 360px mobile ranking/project-list source-required preview-copy test.
- The scenario still verifies source preview evidence and now also verifies the opened draft preview surface and bottom actions stay within the narrow viewport.
- The verifier now fails if the 360px viewport override, selected preview viewport guard, or preview-link target assertion is removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 18/30
- Correctness: 18/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 5/5
- Total: 85/100

### Result

Kept. A source-required mobile ranking/project-list draft preview now has 360px viewport coverage for the evidence-to-preview-to-copy path.

### Remaining risk

- This is a bounds check, not a screenshot baseline for visual spacing or typography.
- 414px source-required preview behavior is still covered indirectly by responsive layout rather than a dedicated focused E2E viewport.

### Next candidate loop

- Add a 414px viewport guard for one mobile preview path, or shift to review-page source-evidence visibility and manual confirmation states.

## Loop 69 - Mobile review evidence viewport guard

Date: 2026-06-16

### Observation

The mobile review queue E2E opens a review detail sheet and checks that source evidence includes the topic before approving. It does not explicitly guard the knowledge source list, web source list, or the approve/request-changes controls against mobile viewport overflow in the human-review step.

### Hypothesis

If the mobile review E2E asserts the detail source evidence lists and both human-decision buttons stay inside the mobile viewport, then review-page regressions that hide source evidence or manual confirmation controls will be caught without changing publishing behavior.

### Patch

- Added mobile review detail assertions for the knowledge source list and web source list.
- Added a viewport-fit guard for the review detail sheet, source evidence panel, knowledge/web evidence lists, approve action, and request-changes action.
- Extended the verifier contract so the review source-evidence and manual-decision viewport guard cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile review queue submits human decisions" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed the mobile review queue test while checking source evidence lists and manual decision controls.
- The review detail now has to keep the evidence panel, knowledge/web lists, approve button, and request-changes button inside the mobile viewport.
- The verifier now fails if the source-list checks, review detail viewport guard, or publishing-block assertion are removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 19/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 5/5
- Total: 90/100

### Result

Kept. Mobile human-review coverage now protects the evidence-to-decision step without adding any automated publishing behavior.

### Remaining risk

- This guards visibility and viewport bounds, but not a screenshot baseline for source-card typography.
- The failure-path review test still checks queued retention, but does not reuse this viewport guard.

### Next candidate loop

- Add the same evidence/detail viewport guard to the mobile review failure path, or add a PC review/manual-confirmation source-evidence guard if the product surface exposes one.

## Loop 70 - Mobile review failure evidence retention guard

Date: 2026-06-16

### Observation

Loop 69 protects the successful mobile review detail evidence and decision controls. The review failure path verifies the draft stays queued after a failed approve request, but it does not re-check that evidence lists and manual decision controls remain visible and within the mobile viewport after the service error.

### Hypothesis

If the mobile review failure E2E asserts the retained detail sheet still shows knowledge/web evidence and keeps approve/request-changes controls inside the viewport after a failed review request, then users will not lose the source-review context or manual recovery controls when review submission fails.

### Patch

- Added post-error assertions to the mobile review failure E2E for source evidence, knowledge list, and web list visibility.
- Added a viewport-fit guard after the failed approve request for the retained review detail, evidence panel, evidence lists, approve action, and request-changes action.
- Extended the verifier contract so failure-path evidence retention and viewport guards cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile review decision failure keeps draft queued" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed the mobile review decision failure test while checking retained source evidence and manual recovery controls.
- After a failed approve request, the detail sheet still has to show knowledge/web evidence and keep approve/request-changes controls inside the mobile viewport.
- The verifier now fails if the failure-path review test, evidence-list checks, or failure viewport guard are removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 19/20
- Test coverage: 19/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 5/5
- Total: 90/100

### Result

Kept. Mobile review failure handling now protects source-evidence context and manual decision controls after a failed human-review submission.

### Remaining risk

- This still checks layout bounds, not screenshot-level visual polish.
- It covers the approve-failure path; a request-changes service failure would benefit from a matching focused guard later.

### Next candidate loop

- Add request-changes failure coverage for mobile review, or inspect PC/manual-review source-evidence safeguards if that surface is available.

## Loop 71 - Mobile review request-changes failure guard

Date: 2026-06-16

### Observation

Loop 70 protects source-evidence retention after a failed approve request in mobile review. The same failure test does not exercise a failed request-changes decision, so the second manual recovery action could regress without losing the current approve-failure coverage.

### Hypothesis

If the mobile review failure E2E also submits a request-changes decision after the approve failure and verifies the detail stays open with source evidence and manual controls, then both human-review decision failures will be protected without introducing automated publishing behavior.

### Patch

- Extended the mobile review decision-failure E2E to click request changes after the failed approve attempt.
- Asserted the second failed review request sends `changes_requested` with the expected revision risk flag and keeps the detail sheet open.
- Added a viewport-fit guard after the failed request-changes action for the retained detail, source evidence, approve action, and request-changes action.
- Extended the verifier contract so request-changes failure coverage cannot be removed silently.

### Verification

```text
npm run lint
python scripts\verify_project.py --keep-cache
npx --version
npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile review decision failure keeps draft queued" --project=chromium
npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed the mobile review decision-failure test after exercising both failed approve and failed request-changes submissions.
- The test now verifies the retained detail remains visible, source evidence stays present, and manual controls remain inside the mobile viewport after the second failure.
- The verifier now fails if the request-changes failure click, `changes_requested` payload assertion, or viewport guard are removed.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 22/30
- Correctness: 19/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 5/5
- Total: 91/100

### Result

Kept. Mobile review failure coverage now protects both approve and request-changes service failures while preserving human review context.

### Remaining risk

- This is still a regression guard around existing behavior, not a screenshot baseline for visual detail quality.
- PC-side manual review, if present, still needs separate source-evidence and decision-failure coverage.

### Next candidate loop

- Inspect PC/manual-review source-evidence safeguards, or add a compact screenshot artifact for one mobile review detail if visual QA becomes higher priority.

## Loop 72 - PC published copy lifecycle guard

Date: 2026-06-16

### Observation

PC generation cards already warn when the backend returns unsafe lifecycle states such as `published` or `submitted`, and cover generation is disabled in that state. The same card still leaves the one-click copy action available, so unsafe lifecycle content can be copied even though it requires manual confirmation evidence before any publishing workflow continues.

### Hypothesis

If the PC export card disables one-click copy when an unsafe lifecycle warning is present, and the published-status E2E asserts that lock, then backend-published content cannot regress into an exportable state without human review.

### Patch

- Disabled PC one-click copy when generated content has an unsafe lifecycle warning such as backend `published` or `submitted`.
- Reused the existing "需先核对状态" label on the copy button so the blocked state is visible and consistent with cover generation.
- Extended the PC published-status Playwright test to assert the copy button is disabled and labeled as requiring state review.
- Added verifier contracts for the lifecycle copy lock and the focused E2E assertions.

### Verification

```text
npm run lint
cd frontend && npm run lint
python scripts\verify_project.py --keep-cache
cd frontend && npx --version
cd frontend && npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC published generation status stops at manual lifecycle review" --project=chromium
cd frontend && npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

Results:

- Root `npm run lint` is not applicable because the repository root has no `package.json`; frontend lint/typecheck passed from `frontend/`.
- The focused PC lifecycle Playwright test passed.
- Production build passed.
- Project verifier passed after the contract updates.
- `git diff --check` passed with only the existing CRLF-to-LF normalization warning for the touched TSX file.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 23/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 5/5
- Total: 92/100

### Result

Kept. PC generation cards now lock both cover generation and one-click copy when the backend returns an unsafe already-published lifecycle state, keeping export actions behind manual review.

### Remaining risk

- This protects the PC generated-content card; a separate PC manual-review queue, if added later, will need its own source-evidence and decision-failure coverage.
- Screenshot-level visual regression coverage remains outside this loop.

### Next candidate loop

- Inspect PC preview/manual-copy fallback behavior for unsafe lifecycle states, or add a compact screenshot artifact for one high-risk review surface.

## Loop 73 - PC preview lifecycle copy guard

Date: 2026-06-16

### Observation

Loop 72 blocked one-click copy on the PC generated-content card when the backend returns an unsafe lifecycle status such as `published`. The same content can still be opened from the draft history preview modal, and that modal has its own copy action that only checks for local test drafts. This creates a second copy/export path that does not honor the unsafe lifecycle warning.

### Hypothesis

If the PC preview modal uses the same lifecycle warning as the generated-content card, shows that warning in the modal, and disables modal copy for unsafe statuses, then already-published backend content cannot bypass manual review through preview copy.

### Patch

- Reused `generatedContentLifecycleWarning` inside the PC draft preview modal.
- Disabled the modal copy button when previewed content is in an unsafe lifecycle state such as backend `published` or `submitted`.
- Added an inline modal lifecycle warning with `pc-preview-modal-lifecycle-warning`.
- Extended the PC published-status E2E to assert the modal warning, disabled modal copy button, and "需先核对状态" label.
- Extended verifier contracts so the modal lifecycle lock and E2E checks cannot be removed silently.

### Verification

```text
cd frontend && npm run lint
python scripts\verify_project.py --keep-cache
cd frontend && npx playwright test tests/e2e/opc.smoke.spec.ts --grep "PC published generation status stops at manual lifecycle review" --project=chromium
cd frontend && npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused Playwright run passed after opening the published-status draft from history and verifying the preview modal lifecycle warning plus disabled copy action.
- Frontend typecheck and production build passed.
- The project verifier now counts the added modal lifecycle contract.
- `git diff --check` passed with only the existing CRLF-to-LF normalization warning for the touched TSX file.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 24/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 9/10
- UX polish: 5/5
- Total: 93/100

### Result

Kept. PC already-published content can no longer be copied through either the generated export card or the history preview modal before manual lifecycle review.

### Remaining risk

- This still protects the PC history preview path only for unsafe content statuses returned by the backend.
- Future dedicated PC review workflows will need separate decision-failure and source-evidence coverage.

### Next candidate loop

- Inspect mobile draft preview copy for matching unsafe lifecycle protection, or add a compact screenshot artifact for one high-risk review surface.

## Loop 74 - Mobile preview lifecycle export guard

Date: 2026-06-16

### Observation

PC export and preview copy paths now honor unsafe generated-content lifecycle states such as backend `published` and `submitted`. The mobile draft preview editor receives `GeneratedContent.status`, but its "复制文案+封面，去小红书", "只复制文案", and "复制预览链接" actions only check whether export is busy or content exists. A mobile user could therefore export or share already-published backend content from the preview surface without first seeing the lifecycle review warning.

### Hypothesis

If lifecycle warnings are shared through `status-labels`, and the mobile draft preview editor displays that warning while disabling all export/share actions for unsafe content statuses, then mobile preview cannot bypass the same human-review boundary already enforced on PC.

### Patch

- Moved generated-content unsafe lifecycle detection and warning copy into shared `frontend/lib/status-labels.ts`.
- Updated the PC workspace to reuse the shared lifecycle warning helper instead of keeping local duplicate logic.
- Added lifecycle warning handling to the mobile draft preview editor.
- Disabled mobile "复制文案+封面，去小红书", "只复制文案", and "复制预览链接" when the generated content status is unsafe.
- Marked the mobile preview human-review checklist item as blocked when a lifecycle warning is present.
- Added a focused mobile E2E for backend `published` status and extended the project verifier contracts.

### Verification

```text
cd frontend && npm run lint
python scripts\verify_project.py --keep-cache
cd frontend && npx --version
cd frontend && npx playwright test tests/e2e/opc.smoke.spec.ts --grep "mobile published generation status stops at manual lifecycle review" --project=chromium
cd frontend && npm run build
git diff --check
python scripts\verify_project.py --keep-cache
```

All checks passed.

Evidence:

- The focused mobile Playwright test passed after generating a backend-published draft, opening mobile preview, and verifying the lifecycle warning plus disabled export/share actions.
- Frontend typecheck and production build passed.
- The project verifier now checks the shared lifecycle helper, mobile preview lock, and mobile E2E lifecycle guard.
- `git diff --check` passed with only CRLF-to-LF normalization warnings for touched TSX files.

### Score

Use `docs/loop-engineering/EVAL_MATRIX.md`:

- Product value: 25/30
- Correctness: 20/20
- Test coverage: 20/20
- Safety/security: 15/15
- Maintainability: 10/10
- UX polish: 5/5
- Total: 95/100

### Result

Kept. Mobile and PC preview/export surfaces now share the same unsafe generated-content lifecycle guard, keeping already-published or submitted backend content behind manual status review.

### Remaining risk

- Mobile one-click generation still creates a cover asset before the preview lock is visible when the mocked content-generation response is already `published`; this loop only blocks export/share actions.
- A future loop can decide whether mobile automatic cover generation should also halt immediately on unsafe lifecycle statuses.

### Next candidate loop

- Inspect mobile automatic cover generation after unsafe content statuses, or add screenshot artifacts for the lifecycle warning surfaces.

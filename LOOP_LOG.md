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

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

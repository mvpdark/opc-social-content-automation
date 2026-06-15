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

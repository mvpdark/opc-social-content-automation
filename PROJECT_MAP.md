# OPC Project Map

Last updated: 2026-06-16

## Runtime and Framework

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS.
- Frontend package root: `frontend/`.
- Backend: FastAPI, SQLAlchemy, Alembic, Python 3.11+.
- Backend package root: `backend/`.
- Browser automation: Python Playwright for collection; JS Playwright E2E runs through `frontend/playwright.config.ts`.

## Package Managers

- Frontend uses npm with `frontend/package-lock.json`.
- Backend uses Python packaging from `backend/pyproject.toml`.
- There is no root JavaScript package at the time of this map.

## Main Routes

- PC workspace: `frontend/app/page.tsx`, reached as `/?theme=mint`.
- Mobile web workspace: `frontend/app/android/page.tsx`, reached as `/android?from=%2F%3Ftheme%3Dmint&tab=home`.
- Public preview: `frontend/app/preview/[contentId]/page.tsx`.
- Middleware redirects mobile user agents from `/` to `/android`.

## Auth and Session

- PC local account marker: `opc_pc_auth_v1` in browser localStorage.
- Mobile local account marker: `opc_mobile_auth_v1` in browser localStorage.
- PC login UI lives in `frontend/components/workspace-client.tsx`.
- Mobile login UI lives in `frontend/app/android/page.tsx`.
- Login calls the backend endpoint `/api/auth/mobile-login`.
- Passwords should only be submitted to the login request and must not be persisted.
- PC pending-review queue reads a dedicated read-only endpoint: `/api/content/review-queue`.
- Mobile creation draft history reads `/api/content/list` and has a visible retry state when history loading fails.
- Mobile pending-review queue reads `/api/content/list` and has a visible retry state when queue loading fails.
- Mobile home production metrics use status labels for collection/knowledge until real counts are wired; review shows the live pending count.
- Desktop dashboard/delivery fallback metrics use status labels until real counts are wired; disabled publishing actions remain manual-only.

## Data Storage

- Backend models and database wiring live under `backend/app/`.
- Alembic migrations live under `backend/alembic/versions/`.
- Local setup may use SQLite planner-stage storage; Docker/self-hosted mode uses PostgreSQL with pgvector and Redis.

## AI Generation Layer

- Model calls route through `backend/app/services/model_router.py`.
- Prompt templates live under `prompts/`.
- Draft generation, image generation, review, and Tavily/web search support are separated by service modules.
- Tavily/web search is research support only; the app must not invent current facts when sources are required.

## Test Setup

- Backend tests: `backend/tests/`, run with `python -m pytest backend/tests`.
- Project contract checks: `python scripts/verify_project.py`.
- Frontend verification: run from `frontend/` with `npm run typecheck`, `npm run build`, or `npm run verify`.
- E2E smoke tests: run from `frontend/` with `npm run e2e`; specs live in `frontend/tests/e2e/`.
- Playwright starts the local Next dev server automatically when `OPC_BASE_URL` is not provided.
- The PC/mobile login-shell smoke test attaches validated screenshot evidence to Playwright results without committing image baselines.
- Published-status lifecycle smoke tests attach validated warning-surface screenshots while keeping publish/copy actions disabled.
- Mobile review decision failure smoke tests attach validated detail-state screenshots while keeping failed drafts queued and publish-like calls blocked.
- PC review queue retry smoke tests attach validated read-error and recovered-queue screenshots while keeping the queue read-only.
- PC draft history retry smoke tests attach validated history-error and recovered-history screenshots while keeping the review queue available.
- Mobile draft history retry smoke tests attach validated history-error and recovered-card screenshots without triggering generation or publishing calls.
- Mobile review queue retry smoke tests attach validated read-error and recovered-list screenshots without triggering review decisions or publishing calls.
- Mobile Xiaohongshu export buttons must label the flow as manual publishing preparation, not direct or automatic publishing.
- Mobile Xiaohongshu export status messages must say share/download handoff still requires manual confirmation before submission.
- Public preview invalid-link smoke tests verify `/preview/[contentId]` resolves to a clear error without content/image API calls.

## Deployment and Build

- Frontend build command: `npm run build` in `frontend/`.
- Backend health and service startup are documented in `docs/RUNBOOK.md`.
- Cloudflare tunnel notes are in `docs/CLOUDFLARE_OPC.md`.
- CI runs backend project checks, backend tests, frontend typecheck, and Chromium E2E smoke tests.

## Known Risks and Missing Pieces

- E2E only covers unauthenticated PC/mobile login-shell smoke paths by default; credentialed login remains skipped unless `OPC_TEST_USERNAME` and `OPC_TEST_PASSWORD` are provided.
- The local Windows environment in this thread does not expose Bash, so `scripts/opc-loop-check.sh` is primarily for Unix/CI-style shells.
- Mobile and PC login state rely on localStorage account markers; future auth work should keep explicit loading, expired-session, and network-error states.
- PC pending-review queue is read-only and intentionally separate from approval/change-request actions.
- Publishing and platform actions must remain behind human confirmation.

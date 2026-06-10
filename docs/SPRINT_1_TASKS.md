# Sprint 1 Task List

## Goal

Create the foundation for the OPC MVP so later modules can plug into one consistent application shell.

## Tasks

- Initialize repository layout.
- Add FastAPI app factory and health endpoint.
- Add PostgreSQL session management.
- Add baseline SQLAlchemy models.
- Add Alembic migration for core tables.
- Add phone/password auth endpoints.
- Add workspace dashboard summary endpoint.
- Add API_SPEC_V1 route surface for content, knowledge, trends, images, export, and publish records.
- Add authenticated-user dependency for protected write operations.
- Add Next.js admin workspace shell.
- Add seed prompt locations.
- Add smoke tests and syntax verification.

## Acceptance Criteria

- Backend has `/health`, `/api/auth/register`, `/api/auth/login`, and `/api/workspace/dashboard`.
- Backend has the documented v1 route groups wired.
- Baseline database migration includes project core tables.
- Frontend first screen is the operational workspace, not a landing page.
- Prompt templates are stored in `prompts/`, not hardcoded into service modules.

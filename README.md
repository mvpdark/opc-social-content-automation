# OPC Social Content Automation

MVP platform for postgraduate-to-PhD market content operations. The product is built around a safe content pipeline:

Data collection -> Knowledge base -> Draft generation -> Humanization -> Review -> Image generation -> Promoter workspace.

## Principles

- MVP first.
- Data collection is the foundation; generation comes after reusable assets exist.
- All model calls go through the Model Router.
- Prompts live outside application code.
- Human approval is required before publishing.
- Platform longevity and risk control outrank automation speed.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind, Shadcn-style components
- Backend: FastAPI
- Database: PostgreSQL with pgvector
- Queue/cache: Redis
- Browser automation: Playwright

## Project Layout

- `backend/` FastAPI application, database models, migrations, tests.
- `frontend/` Next.js promoter/admin workspace.
- `prompts/` prompt templates used by the Model Router.
- `docs/` local project notes and task breakdowns.
- `scripts/` local verification helpers.

## MVP Phases

1. Project foundation, auth, migrations, admin layout.
2. Knowledge base upload, pgvector integration, RAG search.
3. GPT draft generation, prompt management, content storage.
4. DeepSeek rewrite, human score, content review.
5. Image generation, cover templates, asset management.
6. Trend collector, trend reports, keyword analysis.
7. Promoter workspace, export tools, publish record tracking.

## Current Implementation Notes

- Knowledge embeddings use a deterministic local lexical vectorizer through the Model Router boundary. This makes pgvector search usable during MVP setup and can be replaced by a provider-backed embedding model later.
- Content generation now prepares RAG-backed prompt packages and logs provider-not-configured failures instead of creating fake drafts.
- Review workflow stores human scores and decisions, and export/publish paths require content status `approved`.
- Image generation requires approved content, uses cover templates, and records generated assets with prompt metadata.
- Trend collection jobs store safety profiles for public-first Playwright-assisted collection, including platform search targets, image-text-only enforcement, randomized delays, human-like scrolling, session persistence, and cookie persistence.
- The frontend Platform research panel can open Xiaohongshu/Douyin search pages, queue operator-assisted collection jobs, and summarize stored trend assets into the knowledge base.
- A local visible-browser trend worker can process queued jobs, preserve browser session state, extract public visible image-text page content, skip video/live markers by default, and write real collected assets to `trend_contents`.
- Promoter workspace supports export-ready content, formatted export packages, and publish-record tracking.
- DeepSeek official API is wired for the humanization rewrite provider through the Model Router.
- Draft and image generation support `codex_test` and OpenAI-compatible providers.
- Xiaohongshu drafting and cover generation include a provisional public-source style reference until operator-reviewed platform samples are collected.

## Delivery

- GitHub Actions runs backend verification, backend tests, frontend typecheck, and Playwright E2E smoke tests.
- Local release checks are documented in `docs/RUNBOOK.md`.
- Dependency audit notes are tracked in `docs/SECURITY_NOTES.md`.
- Loop engineering rules and acceptance checks are tracked in `AGENTS.md`,
  `PROJECT_MAP.md`, `LOOP_LOG.md`, and `docs/loop-engineering/`.
- New machines can run `python scripts/setup_local.py` to create the local
  virtual environment, install backend/frontend packages, and prepare SQLite
  planner-stage storage. The command center also exposes an environment doctor
  that checks dependency versions and highlights upgrades.

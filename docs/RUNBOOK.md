# OPC Runbook

## Local Services

Start PostgreSQL with pgvector and Redis:

```bash
docker compose up -d
```

## Backend

Install the backend package and development tools:

```bash
python -m pip install -e "backend[dev]"
```

Run migrations:

```bash
cd backend
alembic upgrade head
```

Run the API:

```bash
uvicorn app.main:app --reload
```

## DeepSeek Rewrite Provider

The humanization rewrite path uses DeepSeek's official OpenAI-compatible Chat Completion API.

Set these values in `.env`:

```bash
DEEPSEEK_API_KEY=your-secret-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_REWRITE_MODEL=deepseek-v4-pro
DEEPSEEK_TIMEOUT_SECONDS=60
```

Only `.env.example` is committed. The real `.env` file stays local and ignored by Git.

Check model availability without generating content:

```bash
python scripts/check_deepseek.py
```

Run a small rewrite smoke test:

```bash
python scripts/smoke_deepseek_rewrite.py
```

## Test Draft and Image Providers

During MVP testing, text draft generation and image generation can use local `codex_test` providers:

```bash
DRAFT_PROVIDER=codex_test
IMAGE_PROVIDER=codex_test
TEST_STATIC_URL_PREFIX=/static/generated
```

This mode creates clearly labeled test drafts and local SVG cover assets under `backend/static/generated/`. It is for workflow testing only. Switch these providers to official API-backed implementations before production.

## OpenAI-Compatible Draft Provider

Draft generation can use an OpenAI-compatible Chat Completions provider:

```bash
DRAFT_PROVIDER=openai_compatible
DRAFT_MODEL=gpt-5.5
DRAFT_TIMEOUT_SECONDS=120
OPENAI_COMPATIBLE_BASE_URL=https://your-compatible-provider.example/v1
OPENAI_COMPATIBLE_API_KEY=your-secret-key
```

Run a small draft smoke test:

```bash
python scripts/smoke_draft_provider.py
```

## OpenAI-Compatible Image Provider

Image generation can use an OpenAI-compatible image generation endpoint:

```bash
IMAGE_PROVIDER=openai_compatible
IMAGE_MODEL=gpt-image-2
IMAGE_SIZE=1024x1536
IMAGE_RESPONSE_FORMAT=
IMAGE_TIMEOUT_SECONDS=180
IMAGE_OPENAI_COMPATIBLE_BASE_URL=https://your-compatible-provider.example/v1
IMAGE_OPENAI_COMPATIBLE_API_KEY=your-secret-key
```

If the provider returns `b64_json`, the backend stores the image under `backend/static/generated/` and returns a `/static/generated/...png` URL. If the provider returns a remote `url`, the backend stores that URL directly.

Run a small image smoke test:

```bash
python scripts/smoke_image_provider.py
```

If a compatible provider returns HTTP 400, use the raw probe to inspect the redacted request shape and first part of the provider error:

```bash
python scripts/probe_image_provider.py
```

For the current relay, `image2` is exposed as `gpt-image-2` in `/models`. If the probe returns `503 No available compatible accounts`, the backend integration is reaching the relay but the relay has no currently available image account for that model.

## Platform Research Collection

The frontend Platform research panel supports Xiaohongshu and Douyin research setup:

- Open the platform search page for a keyword in a visible browser tab.
- Queue a safe collection job through `/api/trends/jobs`.
- Summarize already collected trend assets into the knowledge base through `/api/trends/knowledge-digest`.

Collection jobs are public-first and operator-assisted. The worker tries anonymous public search first. The operator completes login or captcha manually only if the platform blocks public results, and the collection worker must keep randomized delays, visible browsing, session persistence, and account-safety-first pacing enabled. The knowledge digest endpoint does not browse the web or invent platform content; it only summarizes rows already stored in `trend_contents`.

Install the optional browser collector dependency and Chromium runtime:

```bash
python -m pip install -e "backend[collector]"
python -m playwright install chromium
```

Run a queued job in a visible browser session:

```bash
python scripts/run_trend_collection_job.py 1
```

The worker opens the platform search URL stored in the job safety profile, starts with public results, scrolls with randomized delays, extracts only visible public page text, and stores extracted items as `trend_contents`. Collection jobs default to `content_kind=image_text`, so obvious video/live markers are skipped until video collection is explicitly enabled. If no public image-text items are visible, the job is marked `needs_operator_review` and no trend rows are created.

If the public page is blocked and the operator needs time to complete login or captcha, pass an explicit wait window:

```bash
python scripts/run_trend_collection_job.py 1 --operator-wait-seconds 90
```

Run an anonymous public image-text smoke test without writing to the database:

```bash
python scripts/smoke_public_image_text_search.py --platform xiaohongshu --keyword 硕升博 --max-items 8 --attempts 10
```

The smoke test runs serial anonymous no-cookie browser attempts, capped at 10. Each attempt creates a fresh browser context without loading storage state. It writes a JSON artifact under `artifacts/`, filters obvious video/live markers, and does not create trend rows or knowledge-base entries. Do not use account rotation for this test.

Before creating a trend knowledge digest, an operator must review the collected image-text sources and set `source_reviewed=true`. The backend rejects digest creation when this review gate is missing.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Verification

Project structure and safety checks:

```bash
python scripts/verify_project.py
```

Backend tests:

```bash
python -m pytest backend/tests
```

Frontend typecheck:

```bash
cd frontend
npm run typecheck
```

## Safety Rules

- Do not bypass human review.
- Do not create fake model, image, or publishing outputs when providers are not configured.
- Do not hardcode prompts in service code.
- Do not prioritize collection speed over platform account safety.

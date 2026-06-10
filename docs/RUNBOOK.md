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

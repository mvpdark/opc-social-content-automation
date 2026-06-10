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

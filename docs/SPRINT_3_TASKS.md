# Sprint 3 Task List

## Goal

Prepare the content-generation workflow so GPT draft generation can be plugged in without changing API contracts.

## Tasks

- Build draft prompt packages from request data and RAG context.
- Keep prompt templates outside service code.
- Log model requests, successful responses, and provider-not-configured failures.
- Store generated content only after the Model Router returns a draft.
- Reuse the same logging path for the humanization rewrite pass.

## Acceptance Criteria

- `/api/content/generate` retrieves knowledge context before calling the draft model.
- `/api/content/rewrite` logs the DeepSeek humanization model boundary.
- Model-provider failures are visible in `generation_logs`.
- No fake content is created when the model provider is not configured.

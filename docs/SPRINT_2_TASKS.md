# Sprint 2 Task List

## Goal

Turn the knowledge base into a reusable retrieval layer for later content generation.

## Tasks

- Store uploaded knowledge with a pgvector-compatible embedding.
- Keep text keyword search as a fallback path.
- Add hybrid, vector, and keyword search modes.
- Add category filtering for retrieval.
- Add a vector index migration for knowledge embeddings.
- Keep embedding generation behind the Model Router boundary.

## Acceptance Criteria

- `/api/knowledge/upload` stores title, content, category, and embedding.
- `/api/knowledge/search` supports `mode=hybrid`, `mode=vector`, and `mode=keyword`.
- Search returns match metadata without exposing raw embedding vectors.
- The system can later swap local lexical embeddings for a provider-backed embedding model.

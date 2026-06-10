# Sprint 6 Task List

## Goal

Create the trend collection foundation while enforcing platform safety rules.

## Tasks

- Add safe trend collection job records.
- Store Playwright-assisted safety profiles with human-like scrolling and randomized delays.
- Keep session and cookie persistence enabled by default.
- Add keyword analysis from collected trend assets.
- Expand trend reports with comments and shares.
- Keep manual trend asset ingestion available for verified content.

## Acceptance Criteria

- `/api/trends/jobs` creates queued safe collection jobs.
- Collection jobs store a safety profile that prioritizes account longevity.
- `/api/trends/keywords` returns reusable keyword signals.
- `/api/trends/report` includes engagement dimensions beyond likes and favorites.

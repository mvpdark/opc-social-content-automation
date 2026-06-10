# Sprint 7 Task List

## Goal

Make the promoter workspace useful for approved-content handoff, export, and publish tracking.

## Tasks

- Add approved content list endpoint for promoters.
- Generate markdown, plain text, or JSON export payloads.
- Keep export blocked until content is approved or already published.
- Add publish record list endpoint.
- Expand workspace dashboard metrics for review, approved, and published states.
- Update the frontend workspace to show promoter actions and publishing tracking.

## Acceptance Criteria

- `/api/workspace/approved-content` lists export-ready content.
- `/api/workspace/export` returns a ready export payload.
- `/api/workspace/publish-records` lists tracked publishing activity.
- Frontend first screen clearly exposes promoter handoff and publish tracking.

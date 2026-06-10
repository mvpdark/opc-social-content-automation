# Sprint 4 Task List

## Goal

Add the review and approval gate that prevents content from reaching export or publishing workflows before human approval.

## Tasks

- Add content review records.
- Add human review decisions with score, notes, and risk flags.
- Add review request status flow.
- Add AI review model boundary through Model Router.
- Block export and publish records unless content is human-approved.

## Acceptance Criteria

- Content can move into `review_pending`.
- Human review can mark content as `approved`, `rejected`, or `changes_requested`.
- AI review failures are logged when the review provider is not configured.
- Publishing and export paths reject unapproved content.

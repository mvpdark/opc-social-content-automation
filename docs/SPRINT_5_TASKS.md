# Sprint 5 Task List

## Goal

Add image-generation and asset-management foundations without bypassing content review.

## Tasks

- Allow draft cover previews while marking unapproved image assets as `needs_review`.
- Add image template catalog for Xiaohongshu, Douyin, and reusable knowledge cards.
- Build image prompt packages from content, selected template, and platform style references.
- Log image model failures through generation logs.
- Store generated image metadata for asset management.
- Add image list and template endpoints.

## Acceptance Criteria

- `/api/image/generate` rejects published or invalid content, and marks unapproved image previews as `needs_review`.
- `/api/image/templates` returns available cover templates.
- `/api/image/list` lists generated image assets.
- No fake image asset is created when the image model provider is not configured.

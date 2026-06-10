# Sprint 5 Task List

## Goal

Add image-generation and asset-management foundations without bypassing content review.

## Tasks

- Require human-approved content before image generation.
- Add image template catalog for Xiaohongshu, Douyin, and reusable knowledge cards.
- Build image prompt packages from approved content and selected template.
- Log image model failures through generation logs.
- Store generated image metadata for asset management.
- Add image list and template endpoints.

## Acceptance Criteria

- `/api/image/generate` rejects unapproved content.
- `/api/image/templates` returns available cover templates.
- `/api/image/list` lists generated image assets.
- No fake image asset is created when the image model provider is not configured.

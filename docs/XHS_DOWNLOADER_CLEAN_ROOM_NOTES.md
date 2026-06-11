# XHS-Downloader Clean-Room Reference Notes

These notes capture product-level ideas observed from JoeanAmier/XHS-Downloader without copying GPL-licensed implementation code.

## What We Can Reuse As Product Ideas

- Multiple entry modes: desktop UI, command line, API, and MCP-style integration.
- Link-first workflow: users can paste Xiaohongshu share text or URLs, and the software extracts supported targets.
- Safe defaults: media download is optional, cookie configuration is not required for the first step, and unsupported URLs should be explained instead of silently ignored.
- API shape inspiration: a detail/import target can be prepared from `url`, `download`, `index`, `cookie`, `proxy`, and `skip`-style options.

## What We Must Not Copy

- No source files, selectors, request signing code, downloader code, or API implementation are copied from XHS-Downloader.
- No GPL code is vendored into this repository.
- No media download, private content collection, or account action is enabled by default.

## OPC Implementation Boundary

The OPC integration starts with a clean-room link import target:

- Endpoint: `POST /api/trends/link-import-target`
- Input: raw Xiaohongshu share text or URLs
- Output: classified links and safety notes
- Behavior: parse only; no network fetch, no redirect resolving, no media download, no knowledge-base write

Future authorized collectors can consume this target after the operator confirms login/captcha/cookie handling and review rules.

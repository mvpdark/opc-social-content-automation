# Security Notes

## Frontend Dependency Audit

`npm audit` currently reports a moderate issue through Next.js' nested PostCSS dependency:

- Advisory: `GHSA-qx2v-qp2m-jg93`
- Package path: `next -> postcss`
- Reported issue: CSS stringify output can emit unescaped `</style>`

The automated npm fix recommendation points to an old major version of Next.js, which is not a safe remediation for this codebase. Do not run `npm audit fix --force` without separately validating the resulting Next and React compatibility.

Current mitigation:

- The app does not expose user-authored CSS stringification features.
- CI runs frontend typecheck and backend safety checks.
- Revisit after a compatible Next release updates its nested PostCSS dependency.

## Platform Safety

Collection jobs must preserve:

- Human-like scrolling.
- Randomized delay windows.
- Randomized interaction paths.
- Session persistence.
- Cookie persistence.
- Visible browser sessions with manual login or captcha handling.
- No bypassing platform access controls or private-content boundaries.

The Platform research panel may open Xiaohongshu or Douyin search pages and queue collection jobs, but knowledge-base summaries must be created from stored trend assets only. Do not create synthetic trend rows to make a digest look successful.

The local browser worker stores session state under `.browser-sessions/`, which is ignored by Git. Treat those files like logged-in browser state and do not share them.

Publishing and image generation remain blocked until content has passed human approval.

## API Keys

- Real provider keys must live in `.env`, which is ignored by Git.
- Do not commit `.env` or paste provider keys into documentation.
- Provider error messages should be redacted before they are written to generation logs.
- OpenAI-compatible provider keys use the same rule as official provider keys: local `.env` only, never committed.
- Image provider keys also stay local-only. Generated images under `backend/static/generated/` are ignored by Git.

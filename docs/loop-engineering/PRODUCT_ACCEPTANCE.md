# OPC Product Acceptance Criteria

## A. Public/login experience

### PC route: `/?theme=mint`

Must:

- Render OPC identity and product promise.
- Show account and password fields.
- Show a clear loading state only while auth status is actually being checked.
- Resolve loading into login form, authenticated workspace, or a clear error state.
- Never store plaintext password beyond the submission request.
- Never expose test credentials in source, logs, or UI.

Should:

- Preserve theme query behavior such as `theme=mint` if the app supports themes.
- Provide keyboard-accessible login.
- Provide visible bad-credential feedback.

### Mobile route: `/android?from=%2F%3Ftheme%3Dmint&tab=home`

Must:

- Not remain indefinitely on “checking login status.”
- Resolve unauthenticated users to mobile login or a clear auth recovery screen.
- Resolve authenticated users to the selected tab.
- Preserve `from` redirect behavior.
- Preserve `tab=home` behavior.
- Work at common mobile viewport widths: 360, 390, 414 px.

Should:

- Have bottom-tab or equivalent navigation with clear active state.
- Avoid horizontal overflow.
- Keep primary actions reachable by thumb.

## B. Auth/session

Must:

- Store only safe session state, not plaintext passwords.
- Handle expired session, missing token, invalid token, and network error.
- Use environment variables for test credentials.
- Prevent authenticated UI flash before session validation.

Should:

- Centralize auth-state transitions.
- Log client errors in development without exposing secrets.

## C. Xiaohongshu task workflow

Must:

- Let user input business material / offer / target audience.
- Let user reference trend/material context if feature exists.
- Generate structured draft output:
  - title
  - body
  - tags
  - cover suggestion/preview
  - publishing checklist
- Mark generated content as draft until human review.
- Preserve final human confirmation.

Should:

- Warn when input is too thin.
- Show regeneration options without losing the previous draft.
- Track task status: draft, reviewed, ready, published/submitted if supported.

## D. Cover preview

Must:

- Render safely on mobile and PC.
- Have empty/loading/error states.
- Not break if cover asset generation fails.

Should:

- Show first-screen preview close to final posting appearance.
- Allow user to compare cover/title quickly.

## E. Safety confirmation

Must:

- Require user confirmation before final publish/submission.
- Show checklist items before confirmation.
- Make risky or missing fields visible.

Should:

- Separate “generate draft” from “confirm publish.”
- Make irreversible actions visually distinct.

## F. Performance and reliability

Must:

- Avoid infinite loading states.
- Handle failed API calls with retry or recovery.
- Keep build output free of obvious runtime errors.

Should:

- Keep initial route load responsive.
- Avoid unnecessary client-side polling.

# Playwright E2E Spec for OPC

Codex should adapt this spec to the actual framework and DOM.

## Environment

```bash
export OPC_BASE_URL=http://localhost:3000
export OPC_TEST_USERNAME=admin
export OPC_TEST_PASSWORD=admin
```

Do not commit real credentials. Do not hard-code credentials.

## Required smoke scenarios

### 1. PC login page renders

Route: `/?theme=mint`

Assertions:

- Page contains `OPC`.
- Page contains product identity or login heading.
- Account field exists.
- Password field exists.
- Loading state does not permanently hide the login form.

### 2. Mobile route resolves auth state

Route: `/android?from=%2F%3Ftheme%3Dmint&tab=home`

Viewport: 390 × 844.

Assertions:

- Page does not remain stuck on “正在检查登录状态.”
- After auth check, one of these is visible:
  - mobile login
  - mobile home tab
  - clear auth/session error with recovery action

### 3. Login with test credentials

Assertions:

- Credentials are read from env.
- User can submit login form.
- Successful login reaches workspace/mobile home.
- Failed login shows visible error.

### 4. Draft workflow smoke, if feature exists

Assertions:

- User can enter material.
- User can trigger draft generation.
- Draft output has title/body/tags or recoverable error.
- Publishing requires manual confirmation.

### 5. Promotion precision smoke, if feature exists

Assertions:

- Recommended and custom topics preserve their detected intent through title, body,
  tags, cover direction, preview, and copy/export.
- Ranking/list topics stay ranking/list topics and do not drift into mentor
  matching or generic time planning.
- Source-check topics that require current facts show source evidence before
  generation, or clearly fall back to a verification framework.
- Missing current-fact sources do not produce school lists, rankings, prices,
  logos, policies, exchange rates, or market claims as conclusions.
- Preview/checklist makes CTA, source risk, cover/title/body consistency, and
  manual confirmation visible before copy/export.

## Suggested selectors

Prefer accessible selectors:

```ts
page.getByRole('textbox', { name: /账号|用户名|account|username/i })
page.getByLabel(/密码|password/i)
page.getByRole('button', { name: /登录|进入|submit|sign in/i })
```

If current DOM lacks accessible labels, Codex should improve labels instead of only using brittle selectors.

## Failure handling

If E2E cannot run because dependencies are missing, Codex must:

1. document the blocker in `LOOP_LOG.md`;
2. add the intended spec file if useful;
3. still run lint/typecheck/build when available.

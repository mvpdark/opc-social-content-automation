# Review Prompt

Review the content for quality, factual risk, platform tone, and publishing readiness.

## Payload Fields

The review payload includes the following fields:

- `title` — Content title to evaluate.
- `body` — Full content body text to review for quality, risk, and tone.
- `tags` — Content tags; check for relevance and compliance.
- `platform` — Target publishing platform (e.g. xiaohongshu); apply
  platform-specific tone and length expectations.
- `instruction` — Optional review instruction from the operator. If provided,
  prioritize these directives when forming the review.

Return:

- Score from 1 to 100
- Risk flags
- Required edits
- Approval recommendation

Human approval is still required before publishing.

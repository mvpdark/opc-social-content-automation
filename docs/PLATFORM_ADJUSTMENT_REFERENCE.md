# OPC Platform Adjustment Reference

Source reference: local DOCX file provided by the user, `OPC_platform_adjustment_final.docx`.

This note captures the parts of the external platformization proposal that should guide OPC's product and engineering direction. Treat it as strategy input, not as a replacement for user testing, code review, security review, or compliance review.

## Core Positioning

OPC should not be framed as a Xiaohongshu post generator. Xiaohongshu should be the first task module inside a broader AI task execution platform.

The platform promise should be:

> Help individuals and small teams use AI to complete monetizable work with fewer manual steps, explicit human review, and measurable follow-up.

Avoid promising guaranteed revenue, automatic virality, or bypassing platform rules. The safer external phrasing is:

> Use AI to launch and complete monetizable tasks, then review and improve the results.

## Product Model

The durable product primitive should be a task, not a one-off generator.

A task should have:

- Goal: what the user wants to accomplish.
- Inputs: product/service details, target audience, assets, account context, constraints, and risk notes.
- Plan: the decomposed workflow and module calls.
- Outputs: copy, cover concepts, image assets, checklists, SOPs, tables, reports, or other deliverables.
- Confirmation nodes: human approval before publishing, sending, paying, authorizing, or making sensitive claims.
- Logs: model, prompt, inputs, outputs, confirmations, costs, and errors.
- Result feedback: exposure, clicks, inquiries, orders, revenue, saved time, or failure reason.
- Retrospective: what to improve next time.

Recommended task statuses:

- Needs input
- Plan generated
- Running
- Needs human review
- Completed
- Awaiting results
- Reviewed
- Failed

## Platform Layers

Build around five layers:

- Entry layer: task gallery, goals, industry scenes, guided input.
- Task layer: task templates, task instances, status flow, human review, task logs.
- Module layer: Xiaohongshu, Douyin, ecommerce, private-domain sales, design, data, compliance.
- Asset layer: product profiles, brand voice, material library, accounts, customer questions, historical outputs.
- Feedback layer: performance metrics, costs, result notes, retrospectives, next-round suggestions.

## Xiaohongshu Module Direction

Rename and treat the current feature as:

- Xiaohongshu acquisition task
- Xiaohongshu content growth module

The module should produce a full acquisition package, not only a draft:

- Topic list
- Titles
- Body copy
- Cover text and cover layout direction
- Tag suggestions
- First comment / comment guidance
- Publishing checklist
- Compliance warnings
- Source and inspiration references
- Result feedback form
- Next-round optimization notes

Keep these safety boundaries:

- No default fully automatic publishing.
- No scraping or automation that bypasses platform controls.
- No fake engagement, account farming, batch spam, or mass unsolicited messages.
- No fabricated lived experience, false proof, fake revenue screenshots, or unsupported admissions/medical/financial claims.
- No positioning "unlabeled AI content" as a benefit.

## MVP Priorities

Must-have platform pieces:

- Task gallery with at least three task templates.
- Task instance records with state, inputs, outputs, logs, and review gates.
- Unified structured input forms.
- Standard module interface for task execution.
- Human confirmation nodes for high-risk actions.
- Results center for generated deliverables.
- Compliance checks for AI labeling, sensitive words, exaggerated claims, and copyright risks.
- Result feedback for exposure, inquiries, orders, revenue, saved time, and failure reasons.

Recommended first three tasks:

- Xiaohongshu acquisition package
- Ecommerce product listing package
- Private-domain sales package

Not-now items:

- "One-click guaranteed income" marketing.
- Fully automatic cross-platform publishing.
- Platform-control bypass automation.
- Automatic payments, orders, or customer promises without review.
- Complex points, affiliate, or referral systems before task-market fit is proven.

## Security And Trust

Immediate security direction:

- Remove any production-facing default `admin/admin` assumptions.
- Separate demo users from real users.
- Add role separation for admin, operator, reviewer, and normal user.
- Log sensitive operations: publishing, exporting, deleting, authorizing, payment, and third-party dispatch.
- Encrypt stored credentials and sensitive user assets.
- Do not expose debug details through public APIs.
- Track model cost and rate limits by task.

Compliance direction:

- Keep AI labeling reminders visible in generation and export flows.
- Keep human review before publishing or external dispatch.
- Store enough generation and confirmation metadata for auditability.
- For education, finance, medical, admissions, and other sensitive topics, default to stricter review language and no guarantees.

## 90-Day Working Plan

0-15 days:

- Reframe the UI around AI task execution instead of a Xiaohongshu-only tool.
- Add task gallery, my tasks, module center, and asset library entry points.
- Define shared task template fields and task statuses.
- Migrate Xiaohongshu flow into a Xiaohongshu acquisition task.
- Strengthen login, role, and audit-log foundations.

16-45 days:

- Turn Xiaohongshu into a full acquisition package workflow.
- Add product profile and brand voice assets.
- Save task costs, task duration, outputs, and review decisions.
- Add initial industry templates for ecommerce, local services, knowledge products, and personal IP.
- Test with 10-20 real users and record completion, reuse, and willingness to pay.

46-90 days:

- Add ecommerce product listing task.
- Add private-domain sales task.
- Add results dashboard with exposure, leads, orders, revenue, and saved time.
- Add team/project collaboration.
- Test subscription and task-package pricing with real users.

## Engineering Implications For This Repo

Near-term implementation should prioritize:

- Backend task template and task instance models.
- A shared task status model separate from the existing collection job status.
- Migration path that wraps existing content generation and cover generation as module steps.
- Results center and output persistence.
- Review gates that are explicit and reusable.
- Audit logs for generation, export, publish handoff, and settings changes.
- Server-side scheduled collection only after the task model and safety logs are clear.

Current project safety rules still stand:

- Collect and verify source data before generation.
- Keep prompts stored separately.
- Use Model Router for model calls.
- Require human review before publishing.
- Do not create fake model, image, scraping, publishing, or performance outputs.

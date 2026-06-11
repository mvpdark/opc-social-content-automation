# Skill Integration Radar

This radar tracks agent skills, MCP servers, and workflow references that may help OPC Social Content Automation. It is intentionally conservative: tools that touch login, cookies, comments, likes, or publishing are not enabled by default.

## Integration Rules

- Read-only collection first; no automatic publishing in the MVP flow.
- Prompts and reusable style rules stay in the prompt/template layer, not hard-coded inside workflow code.
- External code is not copied into the product until license, dependency, and packaging risks are checked.
- GPL or AGPL projects can inspire product shape or run as optional external tools, but should not be vendored into the app.
- Any workflow using a real Xiaohongshu account must be visible, low-frequency, and require human confirmation.

## Highest-Value Local Skills

These are already available in the Codex environment and should be used during development.

| Skill | Use In OPC | Why It Fits | Boundary |
| --- | --- | --- | --- |
| `redesign-existing-projects` | PC workspace UI polish | Audits existing UI and fixes confusing flows without rewriting the product | Use for targeted UI passes only |
| `build-web-apps:frontend-testing-debugging` | Browser QA after every UI change | Verifies tabs, modals, copy buttons, API states, and visible regressions | Must run after meaningful frontend edits |
| `build-web-apps:react-best-practices` | Frontend refactors | Keeps Next/React state and rendering patterns sane as the workspace grows | No broad refactor unless a bug or scale issue requires it |
| `imagegen-frontend-mobile` | Android app screen concepts | Produces premium mobile screen references for the Android companion UI | Image direction only, not implementation |
| `codex-security:security-scan` | Pre-release security review | Finds key leakage, unsafe local execution, auth gaps, and publishing bypasses | Run before packaging or account automation |
| `documents:documents` | PRD, SOP, handoff docs | Useful for polished manuals and operator runbooks | Use for exported docs, not core product state |
| `spreadsheets:Spreadsheets` | Content calendar and source tracking | Can generate structured planning sheets for campaigns, sources, and review queues | Optional export surface |

## External Candidates Worth Tracking

| Candidate | Priority | Best Use | Risk / Guardrail |
| --- | --- | --- | --- |
| `MilesCool/rednote-mcp` | High | Read-only search, note metadata, image/tag extraction | Requires first-run login and Playwright; keep as optional read-only collector |
| `devinchen2014/xiaohongshu-xhs-rednote-mcp` | High | Hosted read-only social intelligence if API terms are acceptable | Requires third-party key, cost and privacy review |
| `white0dew/XiaohongshuSkills` | High | Skill-style Xiaohongshu workflow reference | Use only read-only search first; no automatic publish |
| `buptweixin/xiaohongshu_skills` | Medium | Text-first Xiaohongshu cover/carousel generation ideas | Windows packaging risk because PNG/JPG path mentions macOS Swift; SVG ideas are safer |
| `xwchris/xhs-cover-mcp` | Medium | External MCP cover renderer candidate | Confirm license, fonts, output ownership, and packaging before use |
| `op7418/guizang-social-card-skill` | Medium | Editorial social card and carousel visual reference | AGPL; do not vendor into closed product |
| `leeguooooo/xhs-skill` | Medium | Publishing safety gate and payload review reference | Do not enable auto-publish; borrow checklist ideas only |
| `vivy-yi/xiaohongshu-skills` | Low / Research | Broad operations skill taxonomy and prompt structure | Large surface area; needs quality and license review per module |
| `JoeanAmier/XHS-Downloader` | External only | Link-first import workflow and optional user-provided archive tool | GPL; clean-room only, no source or selectors copied |
| `vercel-labs/skills` | Tooling | Discover/list/install skills across agents | Do not run arbitrary skill scripts without review |

## Recommended Next Steps

1. Add a read-only collector adapter interface in OPC so different Xiaohongshu MCP/search tools can be tested behind the same safety contract.
2. Add a cover renderer adapter interface so internal SVG rendering, image API generation, and optional MCP renderers can share one output contract.
3. Convert the publishing safety ideas into internal `publish_payload` validation before any browser automation is attempted.
4. Keep the current clean-room Xiaohongshu link importer as the safest first integration point.
5. Before installing any external skill into the product repo, record license, runtime dependencies, network behavior, and whether it stores cookies or media locally.

## Sources

- https://github.com/MilesCool/rednote-mcp
- https://github.com/devinchen2014/xiaohongshu-xhs-rednote-mcp
- https://github.com/white0dew/XiaohongshuSkills
- https://github.com/buptweixin/xiaohongshu_skills
- https://github.com/xwchris/xhs-cover-mcp
- https://github.com/op7418/guizang-social-card-skill
- https://github.com/leeguooooo/xhs-skill
- https://github.com/vivy-yi/xiaohongshu-skills
- https://github.com/JoeanAmier/XHS-Downloader
- https://github.com/vercel-labs/skills

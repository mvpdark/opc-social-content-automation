# OPC Codex Loop Engineering Pack

Repository placement note: in this OPC repo, the long-form pack files live in
`docs/loop-engineering/`. Root-level working files are `AGENTS.md`,
`PROJECT_MAP.md`, and `LOOP_LOG.md`.

这是一套给 Codex 使用的循环工程任务包。用法：把本目录里的文件复制到 OPC 项目仓库根目录，或把 `CODEX_MASTER_PROMPT.md` 的内容直接贴给 Codex，并告诉它这些文件是项目规则。

目标不是一次性“大改”，而是让 Codex 以可验证的小循环持续提升项目：观察现状、提出假设、实施最小改动、运行验收、记录结果，再进入下一轮。

## 文件说明

- `AGENTS.md`：放在仓库根目录，作为 Codex 的长期项目规则。
- `CODEX_MASTER_PROMPT.md`：直接交给 Codex 的总提示词。
- `LOOP_ENGINEERING_RUNBOOK.md`：循环执行方法。
- `EVAL_MATRIX.md`：质量评分与验收矩阵。
- `PRODUCT_ACCEPTANCE.md`：OPC 产品级验收标准。
- `BACKLOG_SEEDS.md`：第一批高价值改进任务。
- `PLAYWRIGHT_E2E_SPEC.md`：移动端和 PC 端 E2E 测试说明。
- `LOOP_LOG_TEMPLATE.md`：每轮循环记录模板。
- `scripts/opc-loop-check.sh`：通用检查脚本，Codex 可按项目栈调整。
- `tests/e2e/opc.smoke.spec.ts`：Playwright 冒烟测试草案，Codex 应根据真实 DOM 调整。

## 使用方式

1. 在项目仓库根目录放入这些文件。
2. 把 `CODEX_MASTER_PROMPT.md` 整段发给 Codex。
3. 给 Codex 提供本地启动方式，例如 `npm run dev` 或 `pnpm dev`。
4. 测试账号只通过环境变量传入：

```bash
export OPC_TEST_USERNAME=admin
export OPC_TEST_PASSWORD=admin
```

5. 让 Codex 每轮最多只做 1 个明确改动，并必须更新 `LOOP_LOG.md`。

## 重要原则

- 不允许硬编码账号密码。
- 不允许跳过人工确认发布。
- 不允许为了测试通过删除核心功能。
- 每轮必须能说明：改了什么、为什么改、怎么验收、下一轮该做什么。

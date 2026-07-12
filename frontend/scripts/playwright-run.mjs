// Node.js v22 + Playwright 1.61.0 兼容修复：
// context.conditions?.includes is not a function
// 需在 Playwright ESM loader 初始化前设置环境变量，
// playwright.config.ts 中的 process.env 赋值时机太晚（loader 已注册）。
process.env.PLAYWRIGHT_FORCE_ASYNC_LOADER = "1";

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const playwrightBin = resolve(frontendRoot, "node_modules", ".bin", "playwright");
const args = process.argv.slice(2);

const child = spawn(playwrightBin, args, {
  cwd: frontendRoot,
  env: {
    ...process.env,
    PLAYWRIGHT_FORCE_ASYNC_LOADER: "1",
  },
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});

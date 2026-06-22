import { defineConfig, devices } from "@playwright/test";

// Node.js v22 的 registerHooks API 中 context.conditions 不是数组，
// 导致 Playwright 1.61.0 同步 ESM loader 抛出 TypeError。
// 强制使用异步 loader 绕过此问题。
process.env.PLAYWRIGHT_FORCE_ASYNC_LOADER = "1";

const defaultBaseUrl = "http://127.0.0.1:3000";
const baseUrl = process.env.OPC_BASE_URL ?? defaultBaseUrl;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "../artifacts/playwright-results",
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "../artifacts/playwright-report" }]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: baseUrl,
    screenshot: "only-on-failure",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: process.env.OPC_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- -H 127.0.0.1 -p 3000",
        url: defaultBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
});

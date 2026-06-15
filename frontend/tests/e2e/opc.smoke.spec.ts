import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

const BASE_URL = process.env.OPC_BASE_URL ?? "http://127.0.0.1:3000";
const BASE_ORIGIN = new URL(BASE_URL).origin;
const USERNAME = process.env.OPC_TEST_USERNAME ?? "";
const PASSWORD = process.env.OPC_TEST_PASSWORD ?? "";

async function resetLocalAuth(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem("opc_pc_auth_v1");
    window.localStorage.removeItem("opc_mobile_auth_v1");
  });
}

async function mockRejectedLogin(page: Page) {
  await page.route("**/api/auth/mobile-login", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ detail: "Invalid credentials" }),
      contentType: "application/json",
      status: 401
    });
  });
}

async function mockSuccessfulLogin(page: Page, account: string) {
  await page.route("**/api/auth/mobile-login", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        account,
        default_keys_bound: true,
        key_profile: "e2e",
        provider_statuses: []
      }),
      contentType: "application/json",
      status: 200
    });
  });
}

function createLoginInput() {
  return {
    account: `e2e-${randomUUID()}`,
    password: `pw-${randomUUID()}`
  };
}

async function localStorageContains(page: Page, value: string) {
  return page.evaluate((needle) => {
    return Object.values(window.localStorage).some((item) => item.includes(needle));
  }, value);
}

test.describe("OPC smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await resetLocalAuth(page);
  });

  test("PC login route renders product identity and login fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/?theme=mint`);

    await expect(page.getByText("OPC").first()).toBeVisible();
    await expect(page.getByText("AI 任务执行平台")).toBeVisible();
    await expect(page.getByRole("heading", { name: "登录 OPC 工作台" })).toBeVisible();
    await expect(page.getByTestId("pc-login-account")).toBeVisible();
    await expect(page.getByTestId("pc-login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /登录并进入工作台|正在检查登录状态|正在登录/ })).toBeVisible();
  });

  for (const width of [360, 390, 414]) {
    test(`mobile route resolves login-state checking at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=home`);

      await expect(page.getByText("正在检查登录状态")).toBeHidden({ timeout: 7000 });
      await expect(
        page.getByText(/登录手机工作台|首页|今日工作台|会话已过期|重新登录|网络错误|重试/)
      ).toBeVisible({ timeout: 3000 });
    });
  }

  test("PC login shows bad-credential feedback without persisting password", async ({ page }) => {
    await mockRejectedLogin(page);
    const rejectedLogin = createLoginInput();

    await page.goto(`${BASE_URL}/?theme=mint`);
    await page.getByTestId("pc-login-account").fill(rejectedLogin.account);
    await page.getByTestId("pc-login-password").fill(rejectedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("pc-login-error")).toContainText("账号或密码不正确。");
    await expect(page.getByTestId("pc-login-submit")).toBeEnabled();
    await expect(await localStorageContains(page, rejectedLogin.password)).toBe(false);
  });

  test("mobile login shows bad-credential feedback without persisting password", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockRejectedLogin(page);
    const rejectedLogin = createLoginInput();

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=home`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(rejectedLogin.account);
    await page.getByTestId("mobile-login-password").fill(rejectedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-login-error")).toContainText("账号或密码不正确。");
    await expect(page.getByTestId("mobile-login-submit")).toBeEnabled();
    await expect(await localStorageContains(page, rejectedLogin.password)).toBe(false);
  });

  test("mobile login preserves requested tab and PC return target", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    await mockSuccessfulLogin(page, acceptedLogin.account);

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint%26tab%3Dcontent&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-tab-create")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "创作项目" })).toBeVisible();
    await expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);

    await page.getByRole("button", { name: "返回 PC 工作台" }).click();
    await expect(page).toHaveURL(/\/\?theme=mint&tab=content$/);
  });

  test("mobile return ignores unsafe external from target", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    await mockSuccessfulLogin(page, acceptedLogin.account);

    await page.goto(`${BASE_URL}/android?from=https%3A%2F%2Fevil.example%2Fsteal&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-tab-create")).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "返回 PC 工作台" }).click();

    await expect(page).toHaveURL(`${BASE_ORIGIN}/`);
  });

  test("login form accepts env-provided test credentials when available", async ({ page }) => {
    test.skip(!USERNAME || !PASSWORD, "Set OPC_TEST_USERNAME and OPC_TEST_PASSWORD to run login smoke test.");

    await page.goto(`${BASE_URL}/?theme=mint`);
    await page.getByTestId("pc-login-account").fill(USERNAME);
    await page.getByTestId("pc-login-password").fill(PASSWORD);
    await page.getByRole("button", { name: /登录并进入工作台|正在登录/ }).click();

    await expect(
      page.getByText(/工作台|首页|生成草稿|账号或密码不正确|无法连接登录服务|登录服务/)
    ).toBeVisible({ timeout: 8000 });
  });
});

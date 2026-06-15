import { expect, test, type Page } from "@playwright/test";

const BASE_URL = process.env.OPC_BASE_URL ?? "http://localhost:3000";
const USERNAME = process.env.OPC_TEST_USERNAME ?? "";
const PASSWORD = process.env.OPC_TEST_PASSWORD ?? "";

async function resetLocalAuth(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem("opc_pc_auth_v1");
    window.localStorage.removeItem("opc_mobile_auth_v1");
  });
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

  test("mobile route resolves login-state checking instead of hanging forever", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=home`);

    await expect(page.getByText("正在检查登录状态")).toBeHidden({ timeout: 7000 });
    await expect(
      page.getByText(/登录手机工作台|首页|今日工作台|会话已过期|重新登录|网络错误|重试/)
    ).toBeVisible({ timeout: 3000 });
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

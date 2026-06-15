import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { parseTagText } from "../../lib/tags";
import { generationTopicPresets, type GenerationTopicPreset } from "../../lib/topic-presets";

const BASE_URL = process.env.OPC_BASE_URL ?? "http://127.0.0.1:3000";
const BASE_ORIGIN = new URL(BASE_URL).origin;
const USERNAME = process.env.OPC_TEST_USERNAME ?? "";
const PASSWORD = process.env.OPC_TEST_PASSWORD ?? "";
const MOBILE_TOPIC_PRESET_BUTTON_SELECTOR =
  'button[data-testid^="mobile-topic-preset-"]:not([data-testid="mobile-topic-preset-refresh"])';
const E2E_GENERATED_CONTENT_ID = 8801;
const E2E_COVER_FAILURE_CONTENT_ID = 8802;
const E2E_CONTENT_FAILURE_CONTENT_ID = 8803;
const E2E_PC_GENERATED_CONTENT_ID = 8901;
const E2E_PC_CONTENT_FAILURE_CONTENT_ID = 8902;
const E2E_PC_COVER_FAILURE_CONTENT_ID = 8903;
const E2E_PC_PUBLISHED_STATUS_CONTENT_ID = 8904;
const E2E_PC_ROUTE_TOPIC_CONTENT_ID = 8905;
const E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID = 8911;
const E2E_MOBILE_REVIEW_CHANGES_CONTENT_ID = 8912;

type JsonPayload = Record<string, unknown>;

type MobileGenerationFixtureOptions = {
  contentId?: number;
  contentStatus?: string;
  failContent?: boolean;
  failCover?: boolean;
};

type MobileGenerationFixtureRequests = {
  contentGenerate: JsonPayload[];
  forbiddenPublishing: string[];
  imageGenerate: JsonPayload[];
  sourcePreview: JsonPayload[];
};

type PcGenerationFixtureRequests = MobileGenerationFixtureRequests & {
  contentList: number;
  imageList: number;
  providerStatus: number;
  rewrite: JsonPayload[];
};

type MobileReviewFixtureItem = {
  contentId: number;
  preset: GenerationTopicPreset;
  status?: "draft" | "review_pending" | "rewritten";
};

type MobileReviewFixtureOptions = {
  failReviewForContentIds?: number[];
};

type MobileReviewFixtureRequests = {
  contentList: number;
  forbiddenPublishing: string[];
  imageList: number[];
  reviewUrls: string[];
  reviews: JsonPayload[];
};

async function resetLocalAuth(page: Page) {
  await page.addInitScript(() => {
    [
      "opc_pc_auth_v1",
      "opc_mobile_auth_v1",
      "opc_latest_generated_content_v1",
      "opc_pinned_draft_ids_v1",
      "opc_mobile_create_draft_history_v1",
      "opc_mobile_draft_history_v1",
      "opc_mobile_deleted_draft_ids_v1"
    ].forEach((key) => window.localStorage.removeItem(key));
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

async function trackGenerationServiceRequests(page: Page) {
  const requests: string[] = [];
  await page.route(/\/api\/(content\/generate|content\/source-preview|image\/generate)/, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      body: JSON.stringify({ detail: "E2E guard blocked generation service call." }),
      contentType: "application/json",
      status: 500
    });
  });
  return requests;
}

function buildE2eSourceContext(preset: GenerationTopicPreset, label: string) {
  return {
    knowledge_items: [
      {
        category: "E2E",
        content: `受控测试知识库引用：${preset.topic} 必须围绕 ${preset.audience} 展开。`,
        id: 701,
        match_type: "fixture",
        score: 0.91,
        title: `E2E 知识库引用：${preset.topic}`
      }
    ],
    knowledge_query: preset.knowledgeQuery,
    review_note: "受控 E2E 夹具：发布前仍需人工核对来源。",
    web_search: {
      answer: `受控测试联网摘要：${label}选题需要保留 ${preset.topic} 的意图。`,
      provider: "tavily",
      query: preset.knowledgeQuery,
      required: true,
      results: [
        {
          content: "受控测试联网结果：只验证 UI 展示和请求契约，不代表真实排名、价格或录取结论。",
          score: 0.84,
          title: `E2E 联网来源：${preset.topic}`,
          url: "https://example.edu/e2e-source"
        }
      ]
    }
  };
}

function buildE2eProviderStatuses() {
  return [
    {
      configured: true,
      model: "e2e-draft-model",
      name: "Draft generation",
      note: "E2E fixture ready",
      provider: "openai",
      status: "ok"
    },
    {
      configured: true,
      model: "e2e-image-model",
      name: "Image generation",
      note: "E2E fixture ready",
      provider: "openai",
      status: "ok"
    },
    {
      configured: false,
      model: null,
      name: "Humanization rewrite",
      note: "E2E rewrite disabled",
      provider: "codex_test",
      status: "missing"
    },
    {
      configured: true,
      model: null,
      name: "Web search",
      note: "E2E fixture ready",
      provider: "tavily",
      status: "ok"
    }
  ];
}

async function mockMobileGenerationFixture(
  page: Page,
  preset: GenerationTopicPreset,
  {
    contentId = E2E_GENERATED_CONTENT_ID,
    failContent = false,
    failCover = false
  }: MobileGenerationFixtureOptions = {}
) {
  const requests: MobileGenerationFixtureRequests = {
    contentGenerate: [],
    forbiddenPublishing: [],
    imageGenerate: [],
    sourcePreview: []
  };
  const tags = parseTagText(preset.tags);
  const sourceContext = buildE2eSourceContext(preset, preset.mobileLabel);

  await page.route("**/api/content/source-preview", async (route) => {
    requests.sourcePreview.push(readJsonPayload(route.request().postData()));
    await route.fulfill({
      body: JSON.stringify({ source_context: sourceContext }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route("**/api/content/generate", async (route) => {
    requests.contentGenerate.push(readJsonPayload(route.request().postData()));
    if (failContent) {
      await route.fulfill({
        body: JSON.stringify({ detail: "撰稿服务暂时不可用，请稍后重试。" }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        body: [
          `【受控测试草稿】${preset.topic}`,
          `这篇内容服务于${preset.audience}，必须保持${preset.mobileLabel}选题意图。`,
          `知识库检索词：${preset.knowledgeQuery}`,
          "发布前仍需人工确认标题、正文、标签和封面。"
        ].join("\n\n"),
        created_at: "2026-06-16T00:00:00.000Z",
        id: contentId,
        platform: "xiaohongshu",
        source_context: sourceContext,
        status: "draft",
        tags,
        title: preset.topic
      }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route("**/api/image/generate", async (route) => {
    requests.imageGenerate.push(readJsonPayload(route.request().postData()));
    if (failCover) {
      await route.fulfill({
        body: JSON.stringify({ detail: "封面服务暂时不可用，请稍后重试。" }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        content_id: contentId,
        created_at: "2026-06-16T00:00:01.000Z",
        id: 9901,
        image_url: buildFixtureCoverDataUri(preset.topic),
        prompt: `受控 E2E 封面方向：${preset.coverDirection}`,
        status: "generated",
        template: "xiaohongshu-cover"
      }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
    requests.forbiddenPublishing.push(route.request().url());
    await route.fulfill({
      body: JSON.stringify({ detail: "E2E guard blocked publishing-like call." }),
      contentType: "application/json",
      status: 500
    });
  });

  return requests;
}

async function mockMobileReviewQueueFixture(
  page: Page,
  items: MobileReviewFixtureItem[],
  { failReviewForContentIds = [] }: MobileReviewFixtureOptions = {}
) {
  const requests: MobileReviewFixtureRequests = {
    contentList: 0,
    forbiddenPublishing: [],
    imageList: [],
    reviewUrls: [],
    reviews: []
  };

  const contents = items.map((item, index) => {
    const sourceContext = buildE2eSourceContext(item.preset, item.preset.mobileLabel);
    return {
      body: [
        `E2E 人工确认草稿：${item.preset.topic}`,
        `这条队列草稿服务于 ${item.preset.audience}，必须由人工核对后再进入发布准备。`,
        `检索词：${item.preset.knowledgeQuery}`
      ].join("\n\n"),
      created_at: `2026-06-16T00:0${index}:00.000Z`,
      id: item.contentId,
      platform: "xiaohongshu",
      source_context: sourceContext,
      status: item.status ?? "review_pending",
      tags: parseTagText(item.preset.tags),
      title: item.preset.topic
    };
  });

  await page.route(/\/api\/content\/list(?:\?|$)/, async (route) => {
    requests.contentList += 1;
    await route.fulfill({
      body: JSON.stringify(contents),
      contentType: "application/json",
      status: 200
    });
  });

  await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const contentId = Number(url.searchParams.get("content_id"));
    requests.imageList.push(contentId);
    const content = contents.find((item) => item.id === contentId);
    await route.fulfill({
      body: JSON.stringify(
        content
          ? [
              {
                content_id: content.id,
                created_at: "2026-06-16T00:00:02.000Z",
                id: content.id + 10000,
                image_url: buildFixtureCoverDataUri(content.title),
                prompt: `E2E 人工确认封面：${content.title}`,
                status: "generated",
                template: "xiaohongshu-cover"
              }
            ]
          : []
      ),
      contentType: "application/json",
      status: 200
    });
  });

  await page.route(/\/api\/content\/\d+\/reviews$/, async (route) => {
    const reviewUrl = route.request().url();
    requests.reviewUrls.push(reviewUrl);
    requests.reviews.push(readJsonPayload(route.request().postData()));
    const contentId = Number(reviewUrl.match(/\/content\/(\d+)\/reviews$/)?.[1] ?? 0);
    if (failReviewForContentIds.includes(contentId)) {
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E 人工确认服务暂时不可用，请稍后重试。" }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ ok: true }),
      contentType: "application/json",
      status: 200
    });
  });

  await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
    requests.forbiddenPublishing.push(route.request().url());
    await route.fulfill({
      body: JSON.stringify({ detail: "E2E guard blocked publishing-like call." }),
      contentType: "application/json",
      status: 500
    });
  });

  return requests;
}

async function mockPcGenerationFixture(
  page: Page,
  preset: GenerationTopicPreset,
  {
    contentId = E2E_PC_GENERATED_CONTENT_ID,
    contentStatus = "draft",
    failContent = false,
    failCover = false
  }: MobileGenerationFixtureOptions = {}
) {
  const requests: PcGenerationFixtureRequests = {
    contentGenerate: [],
    contentList: 0,
    forbiddenPublishing: [],
    imageGenerate: [],
    imageList: 0,
    providerStatus: 0,
    rewrite: [],
    sourcePreview: []
  };
  const tags = parseTagText(preset.tags);
  const sourceContext = buildE2eSourceContext(preset, preset.desktopLabel);

  await page.route("**/api/workspace/provider-status", async (route) => {
    requests.providerStatus += 1;
    await route.fulfill({
      body: JSON.stringify(buildE2eProviderStatuses()),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/content\/list(?:\?|$)/, async (route) => {
    requests.contentList += 1;
    await route.fulfill({
      body: JSON.stringify([]),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
    requests.imageList += 1;
    await route.fulfill({
      body: JSON.stringify([]),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route("**/api/content/source-preview", async (route) => {
    requests.sourcePreview.push(readJsonPayload(route.request().postData()));
    await route.fulfill({
      body: JSON.stringify({ source_context: sourceContext }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route("**/api/content/generate", async (route) => {
    requests.contentGenerate.push(readJsonPayload(route.request().postData()));
    if (failContent) {
      await route.fulfill({
        body: JSON.stringify({ detail: "PC 撰稿服务暂时不可用，请稍后重试。" }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        body: [
          `受控 E2E 正式草稿：${preset.topic}`,
          `这篇 PC 草稿服务于${preset.audience}，必须保持${preset.desktopLabel}选题意图。`,
          `知识库检索词：${preset.knowledgeQuery}`,
          "发布前仍需人工确认标题、正文、标签和封面。"
        ].join("\n\n"),
        created_at: "2026-06-16T00:00:00.000Z",
        id: contentId,
        platform: "xiaohongshu",
        source_context: sourceContext,
        status: contentStatus,
        tags,
        title: preset.topic
      }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route("**/api/content/rewrite", async (route) => {
    requests.rewrite.push(readJsonPayload(route.request().postData()));
    await route.fulfill({
      body: JSON.stringify({ detail: "E2E guard blocked unexpected rewrite call." }),
      contentType: "application/json",
      status: 500
    });
  });
  await page.route("**/api/image/generate", async (route) => {
    requests.imageGenerate.push(readJsonPayload(route.request().postData()));
    if (failCover) {
      await route.fulfill({
        body: JSON.stringify({ detail: "PC 封面服务暂时不可用，请稍后重试。" }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        content_id: contentId,
        created_at: "2026-06-16T00:00:01.000Z",
        id: 9902,
        image_url: buildFixtureCoverDataUri(preset.topic),
        prompt: `受控 E2E PC 封面方向：${preset.coverDirection}`,
        status: "generated",
        template: "xiaohongshu-cover"
      }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
    requests.forbiddenPublishing.push(route.request().url());
    await route.fulfill({
      body: JSON.stringify({ detail: "E2E guard blocked publishing-like call." }),
      contentType: "application/json",
      status: 500
    });
  });

  return requests;
}

function createLoginInput() {
  return {
    account: `e2e-${randomUUID()}`,
    password: `pw-${randomUUID()}`
  };
}

function buildFixtureCoverDataUri(topic: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
<rect width="900" height="1200" fill="#fff7df"/>
<rect x="64" y="90" width="772" height="1020" rx="56" fill="#d9f1e5"/>
<text x="92" y="210" font-family="-apple-system,BlinkMacSystemFont,PingFang SC,sans-serif" font-size="42" font-weight="800" fill="#ff2442">E2E 封面夹具</text>
<text x="92" y="330" font-family="-apple-system,BlinkMacSystemFont,PingFang SC,sans-serif" font-size="58" font-weight="900" fill="#111111">${topic}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function readJsonPayload(postData: string | null) {
  try {
    return JSON.parse(postData ?? "{}") as JsonPayload;
  } catch (_error) {
    return {};
  }
}

async function localStorageContains(page: Page, value: string) {
  return page.evaluate((needle) => {
    return Object.values(window.localStorage).some((item) => item.includes(needle));
  }, value);
}

function findExpectedTopicPreset(topic: string) {
  const preset = generationTopicPresets.find((item) => item.topic === topic.trim());
  expect(preset, `Expected visible mobile topic preset to exist for topic: ${topic}`).toBeTruthy();
  return preset!;
}

function requireTopicPreset(key: string) {
  const preset = generationTopicPresets.find((item) => item.key === key);
  expect(preset, `Expected topic preset key to exist: ${key}`).toBeTruthy();
  return preset!;
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

  test("mobile create project exposes topic controls without generation calls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await trackGenerationServiceRequests(page);

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-tab-create")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("mobile-creation-project-gateway")).toBeVisible();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await expect(page.getByTestId("mobile-create-project-detail")).toBeVisible();
    await expect(page.getByTestId("mobile-topic")).toHaveValue(/硕升博/);
    await expect(page.getByTestId("mobile-topic-preset-list")).toBeVisible();
    await expect(page.locator(MOBILE_TOPIC_PRESET_BUTTON_SELECTOR).first()).toBeVisible();
    await expect(page.getByTestId("mobile-audience")).toHaveValue(/硕升博|博士/);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(/硕升博|博士/);
    await expect(page.getByTestId("mobile-generate-draft")).toBeEnabled();
    await expect(page.getByText("会先生成文案，再自动生成封面图；不会自动发布。")).toBeVisible();
    await expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
    expect(generationRequests).toEqual([]);
  });

  test("mobile recommended topic keeps audience and tags aligned", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await trackGenerationServiceRequests(page);

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    const firstPreset = page.locator(MOBILE_TOPIC_PRESET_BUTTON_SELECTOR).first();
    await expect(firstPreset).toBeVisible();
    const selectedTopic = (await firstPreset.locator("span").nth(1).innerText()).trim();
    const expectedPreset = findExpectedTopicPreset(selectedTopic);

    await firstPreset.click();

    await expect(page.getByTestId("mobile-topic")).toHaveValue(expectedPreset.topic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(expectedPreset.audience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(expectedPreset.tags);
    await expect(page.getByTestId("mobile-generate-draft")).toBeEnabled();
    expect(generationRequests).toEqual([]);
  });

  test("mobile one-click generation keeps selected ranking topic aligned", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("ranking-low-budget");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset);

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(preset.topic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(preset.tags);

    await page.getByTestId("mobile-source-preview-button").click();
    await expect(page.getByTestId("mobile-source-evidence")).toContainText("2 条");
    await page.getByTestId("mobile-source-knowledge-toggle").click();
    await expect(page.getByTestId("mobile-source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );
    await page.getByTestId("mobile-source-web-toggle").click();
    await expect(page.getByTestId("mobile-source-web-list")).toContainText(
      `E2E 联网来源：${preset.topic}`
    );

    await page.getByTestId("mobile-generate-draft").click();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");
    await page.getByTestId(`mobile-draft-history-card-${E2E_GENERATED_CONTENT_ID}`).click();

    const preview = page.getByTestId("draft-preview-editor");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(preset.topic);
    await expect(preview).toContainText(`必须保持${preset.mobileLabel}选题意图`);
    await expect(preview).toContainText(`#${expectedTags[0]}`);
    await expect(preview).toContainText("发布前预览 · 不会自动发布");
    await expect(page.getByTestId("draft-preview-cover-image")).toBeVisible();
    await expect(page.getByTestId("draft-preview-human-review-note")).toContainText(
      "发布前仍需人工确认，不会自动发布"
    );
    await expect(page.getByTestId("draft-open-xiaohongshu")).toBeEnabled();
    await expect(page.getByTestId("draft-preview-copy")).toBeEnabled();
    await expect(page.getByTestId("draft-copy-preview-link")).toBeEnabled();

    await page.getByTestId("draft-preview-copy").click();
    await expect(page.getByTestId("draft-export-status")).toBeVisible();
    const manualCopyText = await page.getByTestId("draft-manual-copy-text").inputValue();
    expect(manualCopyText).toContain(preset.topic);
    expect(manualCopyText).toContain(`#${expectedTags[0]}`);

    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_GENERATED_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile preserves draft when cover generation fails", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("route-main");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      contentId: E2E_COVER_FAILURE_CONTENT_ID,
      failCover: true
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(preset.topic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(preset.tags);

    await page.getByTestId("mobile-generate-draft").click();

    await expect(page.getByTestId("mobile-status")).toContainText(
      "文案草稿已生成，但封面图失败：封面服务暂时不可用，请稍后重试。"
    );
    await expect(page.getByTestId("mobile-generation-progress")).toContainText("生成失败");
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");

    const failedCoverDraftCard = page.getByTestId(
      `mobile-draft-history-card-${E2E_COVER_FAILURE_CONTENT_ID}`
    );
    await expect(failedCoverDraftCard).toBeVisible();
    await expect(failedCoverDraftCard).toContainText(preset.topic);
    await failedCoverDraftCard.click();

    const preview = page.getByTestId("draft-preview-editor");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(preset.topic);
    await expect(preview).toContainText(`必须保持${preset.mobileLabel}选题意图`);
    await expect(preview).toContainText(`#${expectedTags[0]}`);
    await expect(preview).toContainText("文字版");
    await expect(preview).toContainText("发布前预览 · 不会自动发布");
    await expect(page.getByTestId("draft-preview-cover-image")).toHaveCount(0);

    expect(generationRequests.sourcePreview).toHaveLength(0);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_COVER_FAILURE_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile content failure keeps topic inputs and source evidence without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("mentor-direction-check");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      contentId: E2E_CONTENT_FAILURE_CONTENT_ID,
      failContent: true
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(preset.topic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(preset.tags);

    await page.getByTestId("mobile-source-preview-button").click();
    await page.getByTestId("mobile-source-knowledge-toggle").click();
    await expect(page.getByTestId("mobile-source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );

    await page.getByTestId("mobile-generate-draft").click();

    await expect(page.getByTestId("mobile-status")).toContainText(
      "撰稿服务暂时不可用，请稍后重试。"
    );
    await expect(page.getByTestId("mobile-generation-progress")).toContainText("生成失败");
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("一键撰稿+封面图");
    await expect(page.getByTestId(`mobile-draft-history-card-${E2E_CONTENT_FAILURE_CONTENT_ID}`)).toHaveCount(0);
    await expect(page.getByTestId("mobile-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(preset.tags);
    await expect(page.getByTestId("mobile-source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );

    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(await localStorageContains(page, String(E2E_CONTENT_FAILURE_CONTENT_ID))).toBe(false);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile review queue submits human decisions without platform publishing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const approvePreset = requireTopicPreset("timeline-main");
    const changesPreset = requireTopicPreset("sales-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const reviewRequests = await mockMobileReviewQueueFixture(page, [
      {
        contentId: E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID,
        preset: approvePreset,
        status: "review_pending"
      },
      {
        contentId: E2E_MOBILE_REVIEW_CHANGES_CONTENT_ID,
        preset: changesPreset,
        status: "rewritten"
      }
    ]);

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=review`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-review-list")).toBeVisible();
    await expect(page.getByTestId("mobile-review-card")).toHaveCount(2);
    await expect(page.getByTestId("mobile-review-card").first()).toContainText(approvePreset.topic);
    await expect(page.getByTestId("mobile-review-card").nth(1)).toContainText(changesPreset.topic);

    await page.getByTestId("mobile-review-card").first().locator("button").first().click();
    const reviewDetail = page.getByTestId("mobile-review-detail");
    await expect(reviewDetail).toBeVisible();
    await expect(reviewDetail).toContainText(approvePreset.topic);
    await expect(page.getByTestId("mobile-review-source-evidence")).toContainText(approvePreset.topic);
    await page.getByTestId("mobile-review-detail-approve").click();

    await expect(page.getByTestId("mobile-review-detail")).toHaveCount(0);
    await expect(page.getByTestId("mobile-review-card")).toHaveCount(1);
    await expect(page.getByTestId("mobile-review-status")).toContainText(approvePreset.topic);
    expect(reviewRequests.reviews).toHaveLength(1);
    expect(reviewRequests.reviewUrls[0]).toContain(`/content/${E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID}/reviews`);
    expect(reviewRequests.reviews[0]).toMatchObject({
      decision: "approved",
      risk_flags: [],
      score: 95
    });

    await expect(page.getByTestId("mobile-review-card").first()).toContainText(changesPreset.topic);
    await page.getByTestId("mobile-review-card").first().getByTestId("mobile-review-request-changes").click();
    await expect(page.getByTestId("mobile-review-card")).toHaveCount(0);
    await expect(page.getByTestId("mobile-review-status")).toContainText(changesPreset.topic);
    expect(reviewRequests.reviews).toHaveLength(2);
    expect(reviewRequests.reviewUrls[1]).toContain(`/content/${E2E_MOBILE_REVIEW_CHANGES_CONTENT_ID}/reviews`);
    expect(reviewRequests.reviews[1]).toMatchObject({
      decision: "changes_requested",
      risk_flags: ["needs_revision"],
      score: 60
    });

    expect(reviewRequests.contentList).toBeGreaterThanOrEqual(1);
    expect(reviewRequests.imageList).toEqual(
      expect.arrayContaining([
        E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID,
        E2E_MOBILE_REVIEW_CHANGES_CONTENT_ID
      ])
    );
    expect(reviewRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile review decision failure keeps draft queued without publishing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("mentor-email-no-reply");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const reviewRequests = await mockMobileReviewQueueFixture(
      page,
      [
        {
          contentId: E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID,
          preset,
          status: "review_pending"
        }
      ],
      { failReviewForContentIds: [E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID] }
    );

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=review`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-review-list")).toBeVisible();
    await expect(page.getByTestId("mobile-review-card")).toHaveCount(1);
    await expect(page.getByTestId("mobile-review-card").first()).toContainText(preset.topic);

    await page.getByTestId("mobile-review-card").first().locator("button").first().click();
    await expect(page.getByTestId("mobile-review-detail")).toBeVisible();
    await expect(page.getByTestId("mobile-review-source-evidence")).toContainText(preset.topic);
    await page.getByTestId("mobile-review-detail-approve").click();

    await expect(page.getByTestId("mobile-review-detail")).toBeVisible();
    await expect(page.getByTestId("mobile-review-status")).toContainText(
      "E2E 人工确认服务暂时不可用，请稍后重试。"
    );
    expect(reviewRequests.reviews).toHaveLength(1);
    expect(reviewRequests.reviewUrls[0]).toContain(`/content/${E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID}/reviews`);
    expect(reviewRequests.reviews[0]).toMatchObject({
      decision: "approved",
      risk_flags: [],
      score: 95
    });

    await page.getByRole("button", { name: /关闭确认详情/ }).click();
    await expect(page.getByTestId("mobile-review-card")).toHaveCount(1);
    await expect(page.getByTestId("mobile-review-card").first()).toContainText(preset.topic);
    expect(reviewRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC one-click generation keeps selected sales topic aligned through preview copy", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("sales-main");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset);

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(preset.topic);
    await expect(page.getByTestId("content-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(preset.knowledgeQuery);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("content-tags")).toHaveValue(preset.tags);

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toContainText("2 条");
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(
      `E2E 联网来源：${preset.topic}`
    );

    await page.getByTestId("start-production-button").click();
    await expect(page.getByText(/文案和封面图已生成/)).toBeVisible();

    const exportCard = page.getByTestId("pc-generated-export-card");
    await expect(exportCard).toBeVisible();
    await expect(exportCard).toContainText(
      "复制内容包含标题、正文和话题标签；不会自动发布，粘贴到小红书前仍需人工看一遍。"
    );
    await expect(page.getByTestId("pc-export-copy-button")).toBeEnabled();
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("发布前检查");
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText(
      "未发现保录、包过、内部名额等高风险承诺词。"
    );
    await expect(page.getByTestId("pc-export-cover-review-check")).toContainText(
      "封面图生成后仍需人工复核"
    );
    await expect(page.getByTestId("pc-export-cover-card")).toContainText(
      "生成后只是待确认素材，不会自动发布。"
    );

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: preset.topic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(preset.topic);
    await expect(previewModal).toContainText(`必须保持${preset.desktopLabel}选题意图`);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(previewModal).toContainText("这是发布效果预览，不会自动发布");
    await expect(page.getByTestId("xhs-preview-real-cover")).toBeVisible();

    await page.getByTestId("pc-preview-modal-copy-button").click();
    await expect
      .poll(async () => {
        const buttonText = await page.getByTestId("pc-preview-modal-copy-button").textContent();
        const manualCopyVisible = await page
          .getByTestId("pc-preview-modal-manual-copy-text")
          .isVisible()
          .catch(() => false);
        return Boolean(buttonText?.includes("已复制") || manualCopyVisible);
      })
      .toBe(true);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_PC_GENERATED_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC one-click generation keeps selected route topic aligned through preview copy", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("route-main");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_ROUTE_TOPIC_CONTENT_ID
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(preset.topic);
    await expect(page.getByTestId("content-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(preset.knowledgeQuery);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("content-tags")).toHaveValue(preset.tags);
    await expect(page.getByTestId("content-cover-direction-preview")).toContainText(
      preset.coverDirection
    );

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toContainText("2 条");
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(
      `E2E 联网来源：${preset.topic}`
    );

    await page.getByTestId("start-production-button").click();
    await expect(page.getByText(/文案和封面图已生成/)).toBeVisible();

    const exportCard = page.getByTestId("pc-generated-export-card");
    await expect(exportCard).toBeVisible();
    await expect(exportCard).toContainText(preset.topic);
    await expect(exportCard).toContainText(preset.audience);
    await expect(exportCard).toContainText(preset.desktopLabel);
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("发布前检查");
    await expect(page.getByTestId("pc-export-copy-button")).toBeEnabled();

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: preset.topic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(preset.topic);
    await expect(previewModal).toContainText(`必须保持${preset.desktopLabel}选题意图`);
    await expect(previewModal).toContainText(preset.knowledgeQuery);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(previewModal).toContainText("这是发布效果预览，不会自动发布");
    await expect(page.getByTestId("xhs-preview-real-cover")).toBeVisible();

    const copyButton = page.getByTestId("pc-preview-modal-copy-button");
    await copyButton.click();
    await expect(copyButton).toContainText(/\u5df2\u590d\u5236/);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_PC_ROUTE_TOPIC_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC published generation status stops at manual lifecycle review", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("source-official-fee-check");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_PUBLISHED_STATUS_CONTENT_ID,
      contentStatus: "published"
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(preset.topic);
    await expect(page.getByTestId("content-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(preset.knowledgeQuery);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("content-tags")).toHaveValue(preset.tags);

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toContainText("2 条");
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(
      `E2E 联网来源：${preset.topic}`
    );

    await page.getByTestId("start-production-button").click();

    const exportCard = page.getByTestId("pc-generated-export-card");
    await expect(exportCard).toBeVisible();
    await expect(exportCard).toContainText("已发布");
    await expect(page.getByTestId("pc-export-lifecycle-warning")).toContainText(
      "后端返回状态为「已发布」"
    );
    await expect(page.getByTestId("pc-export-lifecycle-warning")).toContainText(
      "发布前请先核对人工确认记录；OPC 不会自动发布。"
    );
    await expect(page.getByTestId("cover-generate-button")).toBeDisabled();
    await expect(page.getByTestId("cover-generate-button")).toContainText("需先核对状态");
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("发布前检查");
    await expect(page.getByTestId("pc-export-cover-card")).toContainText(
      "生成后只是待确认素材，不会自动发布。"
    );

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: preset.topic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(preset.topic);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(previewModal).toContainText("这是发布效果预览，不会自动发布");

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC content failure keeps timing topic evidence without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("timeline-main");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_CONTENT_FAILURE_CONTENT_ID,
      failContent: true
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(preset.topic);
    await expect(page.getByTestId("content-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(preset.knowledgeQuery);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("content-tags")).toHaveValue(preset.tags);

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toContainText("2 条");
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(
      `E2E 联网来源：${preset.topic}`
    );

    await page.getByTestId("start-production-button").click();
    await expect(page.getByText("PC 撰稿服务暂时不可用，请稍后重试。")).toBeVisible();
    await expect(page.getByTestId("content-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(preset.knowledgeQuery);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("content-tags")).toHaveValue(preset.tags);
    await expect(page.getByTestId("generation-source-evidence")).toContainText("2 条");
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(
      `E2E 联网来源：${preset.topic}`
    );
    await expect(page.getByTestId("draft-history-card")).toHaveCount(0);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(await localStorageContains(page, String(E2E_PC_CONTENT_FAILURE_CONTENT_ID))).toBe(false);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC cover failure keeps source topic draft available for preview copy", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("source-official-fee-check");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_COVER_FAILURE_CONTENT_ID,
      failCover: true
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(preset.topic);
    await expect(page.getByTestId("content-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(preset.knowledgeQuery);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("content-tags")).toHaveValue(preset.tags);

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toContainText("2 条");
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(
      `E2E 知识库引用：${preset.topic}`
    );
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(
      `E2E 联网来源：${preset.topic}`
    );

    await page.getByTestId("start-production-button").click();
    await expect(
      page.getByText("文案已生成，但封面图未完成：PC 封面服务暂时不可用，请稍后重试。")
    ).toBeVisible();

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: preset.topic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(preset.topic);
    await expect(previewModal).toContainText(`必须保持${preset.desktopLabel}选题意图`);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(previewModal).toContainText("这是发布效果预览，不会自动发布");
    await expect(previewModal).toContainText("小红书封面预览");
    await expect(page.getByTestId("xhs-preview-real-cover")).toHaveCount(0);

    await page.getByTestId("pc-preview-modal-copy-button").click();
    await expect
      .poll(async () => {
        const buttonText = await page.getByTestId("pc-preview-modal-copy-button").textContent();
        const manualCopyVisible = await page
          .getByTestId("pc-preview-modal-manual-copy-text")
          .isVisible()
          .catch(() => false);
        return Boolean(buttonText?.includes("已复制") || manualCopyVisible);
      })
      .toBe(true);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_PC_COVER_FAILURE_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
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

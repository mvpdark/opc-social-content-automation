import { randomUUID } from "node:crypto";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { parseTagText } from "../../lib/tags";
import {
  buildCustomTopicAudience,
  buildCustomTopicTags,
  generationTopicPresets,
  type GenerationTopicPreset
} from "../../lib/topic-presets";

const BASE_URL = process.env.OPC_BASE_URL ?? "http://127.0.0.1:3000";
const BASE_ORIGIN = new URL(BASE_URL).origin;
const USERNAME = process.env.OPC_TEST_USERNAME ?? "";
const PASSWORD = process.env.OPC_TEST_PASSWORD ?? "";
const MOBILE_TOPIC_PRESET_BUTTON_SELECTOR =
  'button[data-testid^="mobile-topic-preset-"]:not([data-testid="mobile-topic-preset-refresh"])';
const E2E_GENERATED_CONTENT_ID = 8801;
const E2E_COVER_FAILURE_CONTENT_ID = 8802;
const E2E_CONTENT_FAILURE_CONTENT_ID = 8803;
const E2E_MOBILE_SOURCE_PREVIEW_FAILURE_CONTENT_ID = 8804;
const E2E_MOBILE_CUSTOM_SOURCE_PREVIEW_FAILURE_CONTENT_ID = 8805;
const E2E_MOBILE_CUSTOM_TOPIC_CONTENT_ID = 8806;
const E2E_MOBILE_MISSING_TAGS_CONTENT_ID = 8807;
const E2E_MOBILE_SALES_TOPIC_CONTENT_ID = 8808;
const E2E_MOBILE_ROUTE_TOPIC_CONTENT_ID = 8809;
const E2E_MOBILE_MENTOR_TOPIC_CONTENT_ID = 8810;
const E2E_MOBILE_TIMELINE_TOPIC_CONTENT_ID = 8811;
const E2E_PC_GENERATED_CONTENT_ID = 8901;
const E2E_PC_CONTENT_FAILURE_CONTENT_ID = 8902;
const E2E_PC_COVER_FAILURE_CONTENT_ID = 8903;
const E2E_PC_PUBLISHED_STATUS_CONTENT_ID = 8904;
const E2E_PC_ROUTE_TOPIC_CONTENT_ID = 8905;
const E2E_PC_MENTOR_TOPIC_CONTENT_ID = 8906;
const E2E_PC_TIMELINE_TOPIC_CONTENT_ID = 8907;
const E2E_PC_SOURCE_TOPIC_CONTENT_ID = 8908;
const E2E_PC_SOURCE_PREVIEW_FAILURE_CONTENT_ID = 8909;
const E2E_PC_CUSTOM_SOURCE_PREVIEW_FAILURE_CONTENT_ID = 8910;
const E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID = 8911;
const E2E_MOBILE_REVIEW_CHANGES_CONTENT_ID = 8912;
const E2E_PC_CUSTOM_TOPIC_CONTENT_ID = 8913;
const E2E_PC_MISSING_TAGS_CONTENT_ID = 8914;
const E2E_MOBILE_SOURCE_LOGO_PRICE_CONTENT_ID = 8915;
const E2E_PC_SOURCE_LOGO_PRICE_CONTENT_ID = 8916;
const E2E_MOBILE_RANKING_PROGRAMS_CONTENT_ID = 8917;
const E2E_PC_RANKING_PROGRAMS_CONTENT_ID = 8918;
const E2E_MOBILE_GLOBAL_RANKING_CONTENT_ID = 8926;
const E2E_PC_GLOBAL_RANKING_CONTENT_ID = 8927;
const E2E_MOBILE_EXCHANGE_RATE_TOPIC_CONTENT_ID = 8928;
const E2E_PC_EXCHANGE_RATE_TOPIC_CONTENT_ID = 8929;
const E2E_MOBILE_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID = 8933;
const E2E_PC_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID = 8934;
const E2E_MOBILE_PUBLISHED_STATUS_CONTENT_ID = 8919;
const E2E_PC_REVIEW_QUEUE_CONTENT_ID = 8920;
const E2E_PC_REVIEW_QUEUE_APPROVED_CONTENT_ID = 8921;
const E2E_MOBILE_DRAFT_HISTORY_RETRY_CONTENT_ID = 8922;
const E2E_PUBLIC_PREVIEW_CONTENT_ID = 8923;
const E2E_PUBLIC_PREVIEW_FALLBACK_CONTENT_ID = 8924;
const E2E_PUBLIC_PREVIEW_ERROR_CONTENT_ID = 8925;
const E2E_PUBLIC_PREVIEW_MALFORMED_CONTENT_ID = 8930;
const E2E_PUBLIC_PREVIEW_MALFORMED_IMAGE_CONTENT_ID = 8931;
const E2E_PUBLIC_PREVIEW_NON_ARRAY_IMAGE_CONTENT_ID = 8932;

type JsonPayload = Record<string, unknown>;

type PcContentListFixtureItem = {
  contentId: number;
  preset: GenerationTopicPreset;
  status: string;
};

type MobileGenerationFixtureOptions = {
  contentId?: number;
  contentListItems?: PcContentListFixtureItem[];
  contentStatus?: string;
  failContent?: boolean;
  failContentDetail?: string;
  failCover?: boolean;
  failDraftHistory?: boolean;
  failDraftHistoryUntilReleased?: boolean;
  failReviewQueue?: boolean;
  failReviewQueueUntilReleased?: boolean;
  failSourcePreview?: boolean;
  responseTags?: string[];
};

type MobileGenerationFixtureRequests = {
  contentList: number;
  contentGenerate: JsonPayload[];
  forbiddenPublishing: string[];
  imageGenerate: JsonPayload[];
  releaseDraftHistoryFailures: () => void;
  sourcePreview: JsonPayload[];
};

type PcGenerationFixtureRequests = MobileGenerationFixtureRequests & {
  contentList: number;
  imageList: number;
  providerStatus: number;
  releaseDraftHistoryFailures: () => void;
  releaseReviewQueueFailures: () => void;
  reviewQueue: number;
  rewrite: JsonPayload[];
};

type MobileReviewFixtureItem = {
  contentId: number;
  preset: GenerationTopicPreset;
  status?: "draft" | "review_pending" | "rewritten";
};

type MobileReviewFixtureOptions = {
  failContentList?: boolean;
  failContentListUntilReleased?: boolean;
  failReviewForContentIds?: number[];
};

type MobileReviewFixtureRequests = {
  contentList: number;
  forbiddenPublishing: string[];
  imageList: number[];
  releaseContentListFailures: () => void;
  reviewUrls: string[];
  reviews: JsonPayload[];
};

type MobileTopicAlignmentScenarioOptions = {
  contentId: number;
  expectPreviewViewportFit?: boolean;
  expectSourceEvidenceViewportFit?: boolean;
  presetKey: string;
  viewport?: { height: number; width: number };
};

type PcTopicAlignmentScenarioOptions = {
  contentId: number;
  expectExportSafetyCopy?: boolean;
  expectSourceEvidenceViewportFit?: boolean;
  presetKey: string;
};

function countTextOccurrences(text: string, needle: string) {
  return text.split(needle).length - 1;
}

async function captureNextClipboardWrite(page: Page) {
  await page.evaluate(() => {
    const windowWithCopy = window as Window & { __opcCapturedClipboardText?: string };
    windowWithCopy.__opcCapturedClipboardText = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          windowWithCopy.__opcCapturedClipboardText = text;
        }
      }
    });
  });
}

async function readCapturedClipboardText(page: Page) {
  return page.evaluate(
    () => (window as Window & { __opcCapturedClipboardText?: string }).__opcCapturedClipboardText ?? ""
  );
}

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

async function mockUnavailableLogin(page: Page) {
  await page.route("**/api/auth/mobile-login", async (route) => {
    await route.abort("failed");
  });
}

async function mockServerErrorLogin(page: Page) {
  await page.route("**/api/auth/mobile-login", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ detail: "登录服务暂时不可用，请稍后重试。" }),
      contentType: "application/json",
      status: 503
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

function expectPngScreenshotEvidence(
  screenshot: Buffer,
  {
    minBytes,
    minHeight,
    minWidth
  }: { minBytes: number; minHeight: number; minWidth: number }
) {
  expect(screenshot.byteLength).toBeGreaterThan(minBytes);
  expect(screenshot[0]).toBe(0x89);
  expect(screenshot.toString("ascii", 1, 4)).toBe("PNG");
  expect(screenshot.readUInt32BE(16)).toBeGreaterThanOrEqual(minWidth);
  expect(screenshot.readUInt32BE(20)).toBeGreaterThanOrEqual(minHeight);
}

async function attachScreenshotEvidence(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: { minBytes: number; minHeight: number; minWidth: number }
) {
  const screenshot = await page.screenshot({ fullPage: true });
  expectPngScreenshotEvidence(screenshot, options);
  await testInfo.attach(name, {
    body: screenshot,
    contentType: "image/png"
  });
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
    contentListItems = [],
    contentStatus = "draft",
    failContent = false,
    failContentDetail,
    failCover = false,
    failDraftHistory = false,
    failDraftHistoryUntilReleased = false,
    failSourcePreview = false,
    responseTags
  }: MobileGenerationFixtureOptions = {}
) {
  let draftHistoryFailuresReleased = false;
  const requests: MobileGenerationFixtureRequests = {
    contentList: 0,
    contentGenerate: [],
    forbiddenPublishing: [],
    imageGenerate: [],
    releaseDraftHistoryFailures: () => {
      draftHistoryFailuresReleased = true;
    },
    sourcePreview: []
  };
  const tags = parseTagText(preset.tags);
  const generatedTags = responseTags ?? tags;
  const sourceContext = buildE2eSourceContext(preset, preset.mobileLabel);
  const contentList = contentListItems.map((item, index) => ({
    body: [
      `E2E 移动端历史草稿：${item.preset.topic}`,
      `这条草稿服务于 ${item.preset.audience}，只用于验证历史读取恢复。`,
      "不会自动发布，也不会提交审核结论。"
    ].join("\n\n"),
    created_at: `2026-06-16T00:0${index}:00.000Z`,
    id: item.contentId,
    platform: "xiaohongshu",
    source_context: buildE2eSourceContext(item.preset, item.preset.mobileLabel),
    status: item.status,
    tags: parseTagText(item.preset.tags),
    title: item.preset.topic
  }));

  await page.route(/\/api\/content\/source-preview(?:\?|$)/, async (route) => {
    requests.sourcePreview.push(readJsonPayload(route.request().postData()));
    if (failSourcePreview) {
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E mobile source preview unavailable." }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ source_context: sourceContext }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/content\/list(?:\?|$)/, async (route) => {
    requests.contentList += 1;
    if (failDraftHistory || (failDraftHistoryUntilReleased && !draftHistoryFailuresReleased)) {
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E mobile draft history unavailable." }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify(contentList),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
    await route.fulfill({
      body: JSON.stringify([]),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/content\/generate(?:\?|$)/, async (route) => {
    requests.contentGenerate.push(readJsonPayload(route.request().postData()));
    if (failContent) {
      await route.fulfill({
        body: JSON.stringify({ detail: failContentDetail ?? "撰稿服务暂时不可用，请稍后重试。" }),
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
          "发布前仍需人工确认标题、正文、标签和封面。",
          `#${tags[0]} #${tags[1]}`
        ].join("\n\n"),
        created_at: "2026-06-16T00:00:00.000Z",
        id: contentId,
        platform: "xiaohongshu",
        source_context: sourceContext,
        status: contentStatus,
        tags: generatedTags,
        title: preset.topic
      }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/image\/generate(?:\?|$)/, async (route) => {
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
  {
    failContentList = false,
    failContentListUntilReleased = false,
    failReviewForContentIds = []
  }: MobileReviewFixtureOptions = {}
) {
  let contentListFailuresReleased = false;
  const requests: MobileReviewFixtureRequests = {
    contentList: 0,
    forbiddenPublishing: [],
    imageList: [],
    releaseContentListFailures: () => {
      contentListFailuresReleased = true;
    },
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
    if (failContentList || (failContentListUntilReleased && !contentListFailuresReleased)) {
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E mobile review queue unavailable." }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
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
    contentListItems = [],
    contentStatus = "draft",
    failContent = false,
    failContentDetail,
    failCover = false,
    failDraftHistory = false,
    failDraftHistoryUntilReleased = false,
    failReviewQueue = false,
    failReviewQueueUntilReleased = false,
    failSourcePreview = false,
    responseTags
  }: MobileGenerationFixtureOptions = {}
) {
  let draftHistoryFailuresReleased = false;
  let reviewQueueFailuresReleased = false;
  const requests: PcGenerationFixtureRequests = {
    contentGenerate: [],
    contentList: 0,
    forbiddenPublishing: [],
    imageGenerate: [],
    imageList: 0,
    providerStatus: 0,
    releaseDraftHistoryFailures: () => {
      draftHistoryFailuresReleased = true;
    },
    releaseReviewQueueFailures: () => {
      reviewQueueFailuresReleased = true;
    },
    reviewQueue: 0,
    rewrite: [],
    sourcePreview: []
  };
  const tags = parseTagText(preset.tags);
  const generatedTags = responseTags ?? tags;
  const sourceContext = buildE2eSourceContext(preset, preset.desktopLabel);
  const contentList = contentListItems.map((item, index) => ({
    body: [
      `PC 待审核队列夹具：${item.preset.topic}`,
      `这条内容服务于${item.preset.audience}，只用于验证人工确认前的只读队列。`,
      "不会自动发布，也不会提交审核结论。"
    ].join("\n\n"),
    created_at: `2026-06-16T00:0${index}:00.000Z`,
    id: item.contentId,
    platform: "xiaohongshu",
    source_context: buildE2eSourceContext(item.preset, item.preset.desktopLabel),
    status: item.status,
    tags: parseTagText(item.preset.tags),
    title: item.preset.topic
  }));

  await page.route("**/api/workspace/provider-status", async (route) => {
    requests.providerStatus += 1;
    await route.fulfill({
      body: JSON.stringify(buildE2eProviderStatuses()),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/content\/review-queue(?:\?|$)/, async (route) => {
    requests.reviewQueue += 1;
    if (failReviewQueue || (failReviewQueueUntilReleased && !reviewQueueFailuresReleased)) {
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E PC review queue unavailable." }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify(
        contentList.filter((content) =>
          ["draft", "rewritten", "review_pending"].includes(String(content.status))
        )
      ),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route(/\/api\/content\/list(?:\?|$)/, async (route) => {
    requests.contentList += 1;
    if (failDraftHistory || (failDraftHistoryUntilReleased && !draftHistoryFailuresReleased)) {
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E PC draft history unavailable." }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify(contentList),
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
    if (failSourcePreview) {
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E source preview unavailable." }),
        contentType: "application/json",
        status: 503
      });
      return;
    }
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
        body: JSON.stringify({ detail: failContentDetail ?? "PC 撰稿服务暂时不可用，请稍后重试。" }),
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
        tags: generatedTags,
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

async function expectNoHorizontalViewportOverflow(
  page: Page,
  context: string,
  targets: Array<{ label: string; testId: string }>
) {
  const viewport = page.viewportSize();
  expect(viewport, `${context} viewport should be configured`).not.toBeNull();
  const viewportWidth = viewport!.width;

  for (const { label, testId } of targets) {
    const locator = page.getByTestId(testId);
    await expect(locator, `${context} ${label} should be visible`).toBeVisible();
    const box = await locator.boundingBox();
    expect(box, `${context} ${label} should have a layout box`).not.toBeNull();
    expect(Math.floor(box!.x), `${context} ${label} left edge`).toBeGreaterThanOrEqual(-1);
    expect(Math.ceil(box!.x + box!.width), `${context} ${label} right edge`).toBeLessThanOrEqual(
      viewportWidth + 1
    );
  }
}

async function waitForMobileGenerationState(page: Page, stateText: string) {
  await expect(page.getByTestId("mobile-generation-progress")).toContainText(stateText, {
    timeout: 20000
  });
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

async function runMobileTopicAlignmentScenario(
  page: Page,
  {
    contentId,
    expectPreviewViewportFit = false,
    expectSourceEvidenceViewportFit = false,
    presetKey,
    viewport = { height: 844, width: 390 }
  }: MobileTopicAlignmentScenarioOptions
) {
  await page.setViewportSize(viewport);
  const acceptedLogin = createLoginInput();
  const preset = requireTopicPreset(presetKey);
  const expectedTags = parseTagText(preset.tags);
  await mockSuccessfulLogin(page, acceptedLogin.account);
  const generationRequests = await mockMobileGenerationFixture(page, preset, { contentId });

  await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
  await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
  await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
  await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
  await page.getByTestId("mobile-login-submit").click();
  await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

  await page.getByTestId("mobile-topic").fill(preset.topic);
  await expect(page.getByTestId("mobile-topic")).toHaveValue(preset.topic);
  await expect(page.getByTestId("mobile-audience")).toHaveValue(preset.audience);
  await expect(page.getByTestId("mobile-tags")).toHaveValue(preset.tags);

  await page.getByTestId("mobile-source-preview-button").click();
  await expect(page.getByTestId("mobile-source-evidence")).toContainText("2 条");
  await page.getByTestId("mobile-source-knowledge-toggle").click();
  await expect(page.getByTestId("mobile-source-knowledge-list")).toContainText(preset.topic);
  if (expectSourceEvidenceViewportFit) {
    await expectNoHorizontalViewportOverflow(page, "mobile source evidence", [
      { label: "card", testId: "mobile-source-evidence" },
      { label: "knowledge list", testId: "mobile-source-knowledge-list" }
    ]);
  }
  await page.getByTestId("mobile-source-web-toggle").click();
  await expect(page.getByTestId("mobile-source-web-list")).toContainText(preset.topic);
  if (expectSourceEvidenceViewportFit) {
    await expectNoHorizontalViewportOverflow(page, "mobile source evidence", [
      { label: "card", testId: "mobile-source-evidence" },
      { label: "web list", testId: "mobile-source-web-list" }
    ]);
  }

  await page.getByTestId("mobile-generate-draft").click();
  await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");
  await page.getByTestId(`mobile-draft-history-card-${contentId}`).click();

  const preview = page.getByTestId("draft-preview-editor");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(preset.topic);
  await expect(preview).toContainText(`必须保持${preset.mobileLabel}选题意图`);
  await expect(preview).toContainText(`#${expectedTags[0]}`);
  await expect(preview).toContainText("发布前预览 · 不会自动发布");
  await expect(page.getByTestId("draft-preview-cover-image")).toBeVisible();
  await expect(page.getByTestId("draft-preview-prepublish-check-content")).toContainText("已就绪");
  await expect(page.getByTestId("draft-preview-prepublish-check-sources")).toContainText("待核对");
  await expect(page.getByTestId("draft-open-xiaohongshu")).toContainText("人工去小红书发布");
  await expect(page.getByTestId("draft-preview-copy")).toBeEnabled();
  await expect(page.getByTestId("draft-copy-preview-link")).toBeEnabled();
  if (expectPreviewViewportFit) {
    await expectNoHorizontalViewportOverflow(page, "mobile selected draft preview", [
      { label: "editor", testId: "draft-preview-editor" },
      { label: "cover image", testId: "draft-preview-cover-image" },
      { label: "checklist", testId: "draft-preview-prepublish-checklist" },
      { label: "copy action", testId: "draft-preview-copy" },
      { label: "preview link action", testId: "draft-copy-preview-link" }
    ]);
  }

  await page.getByTestId("draft-preview-copy").click();
  await expect(page.getByTestId("draft-export-status")).toBeVisible();
  const manualCopyText = await page.getByTestId("draft-manual-copy-text").inputValue();
  expect(manualCopyText).toContain(preset.topic);
  expect(manualCopyText).toContain(`#${expectedTags[0]}`);
  expect(countTextOccurrences(manualCopyText, `#${expectedTags[0]}`)).toBe(1);

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
    content_id: contentId,
    template: "xiaohongshu-cover"
  });
  expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection);
  expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
}

async function runPcTopicAlignmentScenario(
  page: Page,
  {
    contentId,
    expectExportSafetyCopy = false,
    expectSourceEvidenceViewportFit = false,
    presetKey
  }: PcTopicAlignmentScenarioOptions
) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const acceptedLogin = createLoginInput();
  const preset = requireTopicPreset(presetKey);
  const expectedTags = parseTagText(preset.tags);
  await mockSuccessfulLogin(page, acceptedLogin.account);
  const generationRequests = await mockPcGenerationFixture(page, preset, { contentId });

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
  if (expectSourceEvidenceViewportFit) {
    await expectNoHorizontalViewportOverflow(page, "PC source evidence", [
      { label: "card", testId: "generation-source-evidence" },
      { label: "knowledge list", testId: "source-knowledge-list" }
    ]);
  }
  await page.getByTestId("source-web-toggle").click();
  await expect(page.getByTestId("source-web-list")).toContainText(
    `E2E 联网来源：${preset.topic}`
  );
  if (expectSourceEvidenceViewportFit) {
    await expectNoHorizontalViewportOverflow(page, "PC source evidence", [
      { label: "card", testId: "generation-source-evidence" },
      { label: "web list", testId: "source-web-list" }
    ]);
  }

  await page.getByTestId("start-production-button").click();
  await expect(page.getByText(/文案和封面图已生成/)).toBeVisible();

  const exportCard = page.getByTestId("pc-generated-export-card");
  await expect(exportCard).toBeVisible();
  await expect(exportCard).toContainText(preset.topic);
  await expect(exportCard).toContainText(preset.audience);
  await expect(exportCard).toContainText(preset.desktopLabel);
  await expect(page.getByTestId("pc-export-copy-button")).toBeEnabled();
  await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("发布前检查");
  if (expectExportSafetyCopy) {
    await expect(exportCard).toContainText(
      "复制内容包含标题、正文和话题标签；不会自动发布，粘贴到小红书前仍需人工看一遍。"
    );
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText(
      "未发现保录、包过、内部名额等高风险承诺词。"
    );
    await expect(page.getByTestId("pc-export-cover-review-check")).toContainText(
      "封面图生成后仍需人工复核"
    );
    await expect(page.getByTestId("pc-export-cover-card")).toContainText(
      "生成后只是待确认素材，不会自动发布。"
    );
  }

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

  await captureNextClipboardWrite(page);
  const copyButton = page.getByTestId("pc-preview-modal-copy-button");
  await copyButton.click();
  await expect(copyButton).toContainText(/\u5df2\u590d\u5236/);
  const copiedPreviewText = await readCapturedClipboardText(page);
  expect(copiedPreviewText).toContain(preset.topic);
  expect(copiedPreviewText).toContain(`#${expectedTags[0]}`);
  expect(countTextOccurrences(copiedPreviewText, `#${expectedTags[0]}`)).toBe(1);

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
    content_id: contentId,
    template: "xiaohongshu-cover"
  });
  expect(String(generationRequests.imageGenerate[0].style_notes)).toContain(preset.coverDirection);
  expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
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

  test("PC and mobile login shells attach screenshot evidence", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/?theme=mint`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await expect(page.getByTestId("pc-login-account")).toBeVisible();
    await expect(page.getByTestId("pc-login-password")).toBeVisible();
    const pcLoginBox = await page.getByTestId("pc-login-form").boundingBox();
    expect(pcLoginBox?.width ?? 0).toBeGreaterThan(360);
    expect(pcLoginBox?.height ?? 0).toBeGreaterThan(440);
    await attachScreenshotEvidence(page, testInfo, "pc-login-shell.png", {
      minBytes: 20_000,
      minHeight: 700,
      minWidth: 1000
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=home`);
    await expect(page.getByText("正在检查登录状态")).toBeHidden({ timeout: 7000 });
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await expect(page.getByTestId("mobile-login-account")).toBeVisible();
    await expect(page.getByTestId("mobile-login-password")).toBeVisible();
    const mobileLoginBox = await page.getByTestId("mobile-login-form").boundingBox();
    expect(mobileLoginBox?.width ?? 0).toBeGreaterThan(300);
    expect(mobileLoginBox?.height ?? 0).toBeGreaterThan(220);
    await attachScreenshotEvidence(page, testInfo, "mobile-login-shell.png", {
      minBytes: 12_000,
      minHeight: 800,
      minWidth: 390
    });
  });

  test("public preview invalid link resolves to clear error without API calls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const previewApiRequests: string[] = [];
    await page.route(/\/api\/(content|image)\//, async (route) => {
      previewApiRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked unexpected public preview API call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/preview/not-a-draft`);

    await expect(page.getByTestId("public-preview-state")).toHaveAttribute("data-state", "error", {
      timeout: 7000
    });
    await expect(page.getByTestId("public-preview-status-title")).toContainText("预览打不开");
    await expect(page.getByTestId("public-preview-status-message")).toContainText("预览链接无效");
    await expect(page.getByTestId("public-preview-page")).toHaveCount(0);
    await expectNoHorizontalViewportOverflow(page, "public preview invalid link", [
      { label: "status shell", testId: "public-preview-state" },
      { label: "status card", testId: "public-preview-status-card" }
    ]);
    expect(previewApiRequests).toEqual([]);
  });

  test("public preview renders draft content and cover without publishing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const previewTitle = "E2E public preview timeline topic";
    const expectedTags = ["#硕升博", "#时间规划"];
    const contentRequests: string[] = [];
    const imageRequests: string[] = [];
    const forbiddenPublishing: string[] = [];

    await page.route(`**/api/content/${E2E_PUBLIC_PREVIEW_CONTENT_ID}`, async (route) => {
      contentRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({
          body: [
            `这是一条公共预览草稿：${previewTitle}`,
            "预览只用于人工核对标题、正文、标签和封面。"
          ].join("\n\n"),
          created_at: "2026-06-16T00:00:00.000Z",
          id: E2E_PUBLIC_PREVIEW_CONTENT_ID,
          platform: "xiaohongshu",
          status: "draft",
          tags: expectedTags,
          title: previewTitle
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
      imageRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify([
          {
            content_id: E2E_PUBLIC_PREVIEW_CONTENT_ID,
            created_at: "2026-06-16T00:00:01.000Z",
            id: E2E_PUBLIC_PREVIEW_CONTENT_ID + 1000,
            image_url: buildFixtureCoverDataUri(previewTitle),
            prompt: `E2E public preview cover: ${previewTitle}`,
            status: "generated",
            template: "xiaohongshu-cover"
          }
        ]),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
      forbiddenPublishing.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked public preview publishing-like call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/preview/${E2E_PUBLIC_PREVIEW_CONTENT_ID}`);

    await expect(page.getByTestId("public-preview-page")).toBeVisible({ timeout: 7000 });
    await expect(page.getByTestId("public-preview-state")).toHaveCount(0);
    await expect(page.getByTestId("public-preview-cover")).toBeVisible();
    await expect(page.getByTestId("public-preview-cover")).toHaveAttribute("src", /data:image\/svg\+xml/);
    await expect(page.getByTestId("public-preview-title")).toContainText(previewTitle);
    await expect(page.getByTestId("public-preview-body")).toContainText(`这是一条公共预览草稿：${previewTitle}`);
    await expect(page.getByTestId("public-preview-body")).toContainText("预览只用于人工核对");
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[0]);
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[1]);
    await expect(page.getByTestId("public-preview-safety-message")).toContainText("发布前预览");
    await expect(page.getByTestId("public-preview-safety-message")).toContainText("不会自动发布");
    await expectNoHorizontalViewportOverflow(page, "public preview valid draft", [
      { label: "page", testId: "public-preview-page" },
      { label: "cover", testId: "public-preview-cover" },
      { label: "body", testId: "public-preview-body" },
      { label: "safety message", testId: "public-preview-safety-message" }
    ]);
    expect(contentRequests).toHaveLength(1);
    expect(imageRequests).toHaveLength(1);
    expect(forbiddenPublishing).toEqual([]);
  });

  test("public preview keeps draft readable when cover lookup fails", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const previewTitle = "E2E public preview missing cover topic";
    const expectedTags = ["#硕升博", "#封面复核"];
    const contentRequests: string[] = [];
    const imageRequests: string[] = [];
    const forbiddenPublishing: string[] = [];

    await page.route(`**/api/content/${E2E_PUBLIC_PREVIEW_FALLBACK_CONTENT_ID}`, async (route) => {
      contentRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({
          body: [
            `这是一条缺少真实封面的公共预览草稿：${previewTitle}`,
            "即使封面接口失败，正文和人工复核提示也必须保留。"
          ].join("\n\n"),
          created_at: "2026-06-16T00:05:00.000Z",
          id: E2E_PUBLIC_PREVIEW_FALLBACK_CONTENT_ID,
          platform: "xiaohongshu",
          status: "draft",
          tags: expectedTags,
          title: previewTitle
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
      imageRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E cover lookup temporarily unavailable." }),
        contentType: "application/json",
        status: 503
      });
    });
    await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
      forbiddenPublishing.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked public preview publishing-like call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/preview/${E2E_PUBLIC_PREVIEW_FALLBACK_CONTENT_ID}`);

    await expect(page.getByTestId("public-preview-page")).toBeVisible({ timeout: 7000 });
    await expect(page.getByTestId("public-preview-state")).toHaveCount(0);
    await expect(page.getByTestId("public-preview-cover")).toHaveCount(0);
    await expect(page.getByTestId("public-preview-fallback-cover")).toBeVisible();
    await expect(page.getByTestId("public-preview-fallback-cover")).toContainText("封面预览");
    await expect(page.getByTestId("public-preview-fallback-cover")).toContainText(previewTitle);
    await expect(page.getByTestId("public-preview-title")).toContainText(previewTitle);
    await expect(page.getByTestId("public-preview-body")).toContainText(
      `这是一条缺少真实封面的公共预览草稿：${previewTitle}`
    );
    await expect(page.getByTestId("public-preview-body")).toContainText("封面接口失败");
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[0]);
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[1]);
    await expect(page.getByTestId("public-preview-safety-message")).toContainText("不会自动发布");
    await expectNoHorizontalViewportOverflow(page, "public preview missing cover fallback", [
      { label: "page", testId: "public-preview-page" },
      { label: "fallback cover", testId: "public-preview-fallback-cover" },
      { label: "body", testId: "public-preview-body" },
      { label: "safety message", testId: "public-preview-safety-message" }
    ]);
    expect(contentRequests).toHaveLength(1);
    expect(imageRequests).toHaveLength(1);
    expect(forbiddenPublishing).toEqual([]);
  });

  test("public preview uses text cover when image payload is malformed", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const previewTitle = "E2E public preview malformed image topic";
    const expectedTags = ["#E2E", "#FallbackCover"];
    const contentRequests: string[] = [];
    const imageRequests: string[] = [];
    const forbiddenPublishing: string[] = [];

    await page.route(`**/api/content/${E2E_PUBLIC_PREVIEW_MALFORMED_IMAGE_CONTENT_ID}`, async (route) => {
      contentRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({
          body: [
            `E2E public preview remains readable for ${previewTitle}.`,
            "Malformed image payload should use the text cover fallback before manual review."
          ].join("\n\n"),
          created_at: "2026-06-16T00:10:00.000Z",
          id: E2E_PUBLIC_PREVIEW_MALFORMED_IMAGE_CONTENT_ID,
          platform: "xiaohongshu",
          status: "draft",
          tags: expectedTags,
          title: previewTitle
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
      imageRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify([
          {
            content_id: E2E_PUBLIC_PREVIEW_MALFORMED_IMAGE_CONTENT_ID,
            error: "E2E image list returned malformed asset.",
            id: E2E_PUBLIC_PREVIEW_MALFORMED_IMAGE_CONTENT_ID + 1000,
            status: "generated"
          }
        ]),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
      forbiddenPublishing.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked public preview publishing-like call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/preview/${E2E_PUBLIC_PREVIEW_MALFORMED_IMAGE_CONTENT_ID}`);

    await expect(page.getByTestId("public-preview-page")).toBeVisible({ timeout: 7000 });
    await expect(page.getByTestId("public-preview-state")).toHaveCount(0);
    await expect(page.getByTestId("public-preview-cover")).toHaveCount(0);
    await expect(page.getByTestId("public-preview-fallback-cover")).toBeVisible();
    await expect(page.getByTestId("public-preview-fallback-cover")).toContainText("\u5c01\u9762\u9884\u89c8");
    await expect(page.getByTestId("public-preview-fallback-cover")).toContainText(previewTitle);
    await expect(page.getByTestId("public-preview-title")).toContainText(previewTitle);
    await expect(page.getByTestId("public-preview-body")).toContainText("Malformed image payload");
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[0]);
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[1]);
    await expect(page.getByTestId("public-preview-safety-message")).toContainText("\u4e0d\u4f1a\u81ea\u52a8\u53d1\u5e03");
    await expectNoHorizontalViewportOverflow(page, "public preview malformed image fallback", [
      { label: "page", testId: "public-preview-page" },
      { label: "fallback cover", testId: "public-preview-fallback-cover" },
      { label: "body", testId: "public-preview-body" },
      { label: "safety message", testId: "public-preview-safety-message" }
    ]);
    expect(contentRequests).toHaveLength(1);
    expect(imageRequests).toHaveLength(1);
    expect(forbiddenPublishing).toEqual([]);
  });

  test("public preview uses text cover when image payload is not an array", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const previewTitle = "E2E public preview non-array image topic";
    const expectedTags = ["#E2E", "#NonArrayCover"];
    const contentRequests: string[] = [];
    const imageRequests: string[] = [];
    const forbiddenPublishing: string[] = [];

    await page.route(`**/api/content/${E2E_PUBLIC_PREVIEW_NON_ARRAY_IMAGE_CONTENT_ID}`, async (route) => {
      contentRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({
          body: [
            `E2E public preview remains readable for ${previewTitle}.`,
            "Non-array image payload should not hide the manual review preview."
          ].join("\n\n"),
          created_at: "2026-06-16T00:15:00.000Z",
          id: E2E_PUBLIC_PREVIEW_NON_ARRAY_IMAGE_CONTENT_ID,
          platform: "xiaohongshu",
          status: "draft",
          tags: expectedTags,
          title: previewTitle
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
      imageRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({
          detail: "E2E image list returned a non-array payload.",
          items: null
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
      forbiddenPublishing.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked public preview publishing-like call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/preview/${E2E_PUBLIC_PREVIEW_NON_ARRAY_IMAGE_CONTENT_ID}`);

    await expect(page.getByTestId("public-preview-page")).toBeVisible({ timeout: 7000 });
    await expect(page.getByTestId("public-preview-state")).toHaveCount(0);
    await expect(page.getByTestId("public-preview-cover")).toHaveCount(0);
    await expect(page.getByTestId("public-preview-fallback-cover")).toBeVisible();
    await expect(page.getByTestId("public-preview-fallback-cover")).toContainText("\u5c01\u9762\u9884\u89c8");
    await expect(page.getByTestId("public-preview-fallback-cover")).toContainText(previewTitle);
    await expect(page.getByTestId("public-preview-title")).toContainText(previewTitle);
    await expect(page.getByTestId("public-preview-body")).toContainText("Non-array image payload");
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[0]);
    await expect(page.getByTestId("public-preview-tags")).toContainText(expectedTags[1]);
    await expect(page.getByTestId("public-preview-safety-message")).toContainText("\u4e0d\u4f1a\u81ea\u52a8\u53d1\u5e03");
    await expectNoHorizontalViewportOverflow(page, "public preview non-array image fallback", [
      { label: "page", testId: "public-preview-page" },
      { label: "fallback cover", testId: "public-preview-fallback-cover" },
      { label: "body", testId: "public-preview-body" },
      { label: "safety message", testId: "public-preview-safety-message" }
    ]);
    expect(contentRequests).toHaveLength(1);
    expect(imageRequests).toHaveLength(1);
    expect(forbiddenPublishing).toEqual([]);
  });

  test("public preview resolves content backend errors without follow-up calls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const contentRequests: string[] = [];
    const imageRequests: string[] = [];
    const forbiddenPublishing: string[] = [];

    await page.route(`**/api/content/${E2E_PUBLIC_PREVIEW_ERROR_CONTENT_ID}`, async (route) => {
      contentRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E content service temporarily unavailable." }),
        contentType: "application/json",
        status: 503
      });
    });
    await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
      imageRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked image lookup after content error." }),
        contentType: "application/json",
        status: 500
      });
    });
    await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
      forbiddenPublishing.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked public preview publishing-like call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/preview/${E2E_PUBLIC_PREVIEW_ERROR_CONTENT_ID}`);

    await expect(page.getByTestId("public-preview-state")).toHaveAttribute("data-state", "error", {
      timeout: 7000
    });
    await expect(page.getByTestId("public-preview-status-title")).toContainText("预览打不开");
    await expect(page.getByTestId("public-preview-status-message")).toContainText("暂时无法打开");
    await expect(page.getByTestId("public-preview-page")).toHaveCount(0);
    await expectNoHorizontalViewportOverflow(page, "public preview content backend error", [
      { label: "status shell", testId: "public-preview-state" },
      { label: "status card", testId: "public-preview-status-card" }
    ]);
    expect(contentRequests).toHaveLength(1);
    expect(imageRequests).toEqual([]);
    expect(forbiddenPublishing).toEqual([]);
  });

  test("public preview resolves malformed content without cover lookup", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const contentRequests: string[] = [];
    const imageRequests: string[] = [];
    const forbiddenPublishing: string[] = [];

    await page.route(`**/api/content/${E2E_PUBLIC_PREVIEW_MALFORMED_CONTENT_ID}`, async (route) => {
      contentRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({
          id: E2E_PUBLIC_PREVIEW_MALFORMED_CONTENT_ID,
          status: "draft",
          title: "E2E malformed public preview draft"
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route(/\/api\/image\/list(?:\?|$)/, async (route) => {
      imageRequests.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked image lookup after malformed content." }),
        contentType: "application/json",
        status: 500
      });
    });
    await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
      forbiddenPublishing.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked public preview publishing-like call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/preview/${E2E_PUBLIC_PREVIEW_MALFORMED_CONTENT_ID}`);

    await expect(page.getByTestId("public-preview-state")).toHaveAttribute("data-state", "error", {
      timeout: 7000
    });
    await expect(page.getByTestId("public-preview-status-title")).toContainText("\u9884\u89c8\u6253\u4e0d\u5f00");
    await expect(page.getByTestId("public-preview-status-message")).toContainText("\u6570\u636e\u4e0d\u5b8c\u6574");
    await expect(page.getByTestId("public-preview-page")).toHaveCount(0);
    await expectNoHorizontalViewportOverflow(page, "public preview malformed content", [
      { label: "status shell", testId: "public-preview-state" },
      { label: "status card", testId: "public-preview-status-card" }
    ]);
    expect(contentRequests).toHaveLength(1);
    expect(imageRequests).toEqual([]);
    expect(forbiddenPublishing).toEqual([]);
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

  test("PC login shows service-unavailable feedback without persisting password", async ({ page }) => {
    await mockUnavailableLogin(page);
    const rejectedLogin = createLoginInput();

    await page.goto(`${BASE_URL}/?theme=mint`);
    await page.getByTestId("pc-login-account").fill(rejectedLogin.account);
    await page.getByTestId("pc-login-password").fill(rejectedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("pc-login-error")).toContainText(
      "无法连接登录服务，请确认应用服务正在运行。"
    );
    await expect(page.getByTestId("pc-login-submit")).toBeEnabled();
    await expect(await localStorageContains(page, rejectedLogin.password)).toBe(false);
  });

  test("mobile login shows service-unavailable feedback without persisting password", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockUnavailableLogin(page);
    const rejectedLogin = createLoginInput();

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=home`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(rejectedLogin.account);
    await page.getByTestId("mobile-login-password").fill(rejectedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-login-error")).toContainText(
      "登录服务暂时不可用，请确认应用服务已启动。"
    );
    await expect(page.getByTestId("mobile-login-submit")).toBeEnabled();
    await expect(await localStorageContains(page, rejectedLogin.password)).toBe(false);
  });

  test("PC login shows server-error feedback without persisting password", async ({ page }) => {
    await mockServerErrorLogin(page);
    const rejectedLogin = createLoginInput();

    await page.goto(`${BASE_URL}/?theme=mint`);
    await page.getByTestId("pc-login-account").fill(rejectedLogin.account);
    await page.getByTestId("pc-login-password").fill(rejectedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("pc-login-error")).toContainText(
      "登录服务暂时不可用，请稍后重试。"
    );
    await expect(page.getByTestId("pc-login-error")).not.toContainText("账号或密码不正确。");
    await expect(page.getByTestId("pc-login-submit")).toBeEnabled();
    await expect(await localStorageContains(page, rejectedLogin.password)).toBe(false);
  });

  test("mobile login shows server-error feedback without persisting password", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockServerErrorLogin(page);
    const rejectedLogin = createLoginInput();

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=home`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(rejectedLogin.account);
    await page.getByTestId("mobile-login-password").fill(rejectedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-login-error")).toContainText(
      "登录服务暂时不可用，请稍后重试。"
    );
    await expect(page.getByTestId("mobile-login-error")).not.toContainText("账号或密码不正确。");
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

  test("mobile home metrics use workflow status instead of stale counts", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await trackGenerationServiceRequests(page);

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=home`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-tab-home")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("metric-collect").locator("div").first()).toHaveText("待采集");
    await expect(page.getByTestId("metric-knowledge").locator("div").first()).toHaveText("待检索");
    await expect(page.getByTestId("metric-review").locator("div").first()).toHaveText("0");
    await expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
    expect(generationRequests).toEqual([]);
  });

  test("PC delivery fallback metrics use status labels without publishing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await trackGenerationServiceRequests(page);
    const forbiddenPublishing: string[] = [];
    await page.route(/\/api\/[^?]*(publish|submit)/i, async (route) => {
      forbiddenPublishing.push(route.request().url());
      await route.fulfill({
        body: JSON.stringify({ detail: "E2E guard blocked publishing-like call." }),
        contentType: "application/json",
        status: 500
      });
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=delivery`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("delivery-action-status-0")).toHaveText("待确认后启用");
    await expect(page.getByTestId("delivery-action-status-2")).toHaveText("待人工记录");
    await expect(page.getByTestId("delivery-queue-count-0")).toHaveText("待采集");
    await expect(page.getByTestId("delivery-queue-count-1")).toHaveText("待入库");
    await expect(page.getByTestId("delivery-queue-count-2")).toHaveText("待生成");
    await expect(page.getByTestId("delivery-queue-count-3")).toHaveText("待确认");
    await expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
    expect(generationRequests).toEqual([]);
    expect(forbiddenPublishing).toEqual([]);
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

  test("mobile draft history read error is recoverable without generation calls", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("timeline-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      failDraftHistoryUntilReleased: true,
      contentListItems: [
        {
          contentId: E2E_MOBILE_DRAFT_HISTORY_RETRY_CONTENT_ID,
          preset,
          status: "draft"
        }
      ]
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await expect(page.getByTestId("mobile-draft-history-error")).toContainText(
      "E2E mobile draft history unavailable."
    );
    await expect(
      page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_DRAFT_HISTORY_RETRY_CONTENT_ID}`)
    ).toHaveCount(0);
    const mobileDraftHistoryErrorBox = await page.getByTestId("mobile-draft-history-error").boundingBox();
    expect(mobileDraftHistoryErrorBox?.width ?? 0).toBeGreaterThan(300);
    expect(mobileDraftHistoryErrorBox?.height ?? 0).toBeGreaterThan(90);
    await attachScreenshotEvidence(page, testInfo, "mobile-draft-history-error.png", {
      minBytes: 14_000,
      minHeight: 800,
      minWidth: 390
    });

    generationRequests.releaseDraftHistoryFailures();
    await page.getByTestId("mobile-draft-history-retry").click();

    await expect(
      page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_DRAFT_HISTORY_RETRY_CONTENT_ID}`)
    ).toContainText(preset.topic);
    await expect(page.getByTestId("mobile-draft-history-error")).toHaveCount(0);
    const mobileDraftHistoryRecoveredBox = await page
      .getByTestId(`mobile-draft-history-card-${E2E_MOBILE_DRAFT_HISTORY_RETRY_CONTENT_ID}`)
      .boundingBox();
    expect(mobileDraftHistoryRecoveredBox?.width ?? 0).toBeGreaterThan(200);
    expect(mobileDraftHistoryRecoveredBox?.height ?? 0).toBeGreaterThan(90);
    await attachScreenshotEvidence(page, testInfo, "mobile-draft-history-recovered.png", {
      minBytes: 14_000,
      minHeight: 800,
      minWidth: 390
    });

    expect(generationRequests.contentList).toBeGreaterThan(1);
    expect(generationRequests.sourcePreview).toHaveLength(0);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
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
    expect(countTextOccurrences(manualCopyText, `#${expectedTags[0]}`)).toBe(1);

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

  test("mobile published generation status stops at manual lifecycle review", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("source-official-fee-check");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      contentId: E2E_MOBILE_PUBLISHED_STATUS_CONTENT_ID,
      contentStatus: "published"
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
    await expect(page.getByTestId("mobile-source-evidence")).toContainText("2 条");

    await page.getByTestId("mobile-generate-draft").click();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");
    await expect(page.getByTestId("mobile-generation-progress")).toContainText("需先核对状态");
    await page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_PUBLISHED_STATUS_CONTENT_ID}`).click();

    const preview = page.getByTestId("draft-preview-editor");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(preset.topic);
    await expect(preview).toContainText(`#${expectedTags[0]}`);
    await expect(page.getByTestId("draft-preview-lifecycle-warning")).toContainText(
      "后端返回状态为「已发布」"
    );
    const mobileLifecycleWarningBox = await page.getByTestId("draft-preview-lifecycle-warning").boundingBox();
    expect(mobileLifecycleWarningBox?.width ?? 0).toBeGreaterThan(300);
    expect(mobileLifecycleWarningBox?.height ?? 0).toBeGreaterThan(40);
    await expect(page.getByTestId("draft-preview-prepublish-check-human")).toContainText("需补充");
    await expect(page.getByTestId("draft-open-xiaohongshu")).toBeDisabled();
    await expect(page.getByTestId("draft-open-xiaohongshu")).toContainText("需先核对状态");
    await expect(page.getByTestId("draft-preview-copy")).toBeDisabled();
    await expect(page.getByTestId("draft-preview-copy")).toContainText("需先核对状态");
    await expect(page.getByTestId("draft-copy-preview-link")).toBeDisabled();
    await expect(page.getByTestId("draft-copy-preview-link")).toContainText("需先核对状态");
    await attachScreenshotEvidence(page, testInfo, "mobile-published-lifecycle-warning.png", {
      minBytes: 14_000,
      minHeight: 800,
      minWidth: 390
    });

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
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile one-click generation keeps selected sales topic aligned through preview copy", async ({ page }) => {
    await runMobileTopicAlignmentScenario(page, {
      contentId: E2E_MOBILE_SALES_TOPIC_CONTENT_ID,
      presetKey: "sales-main"
    });
  });

  test("mobile one-click generation keeps selected route topic aligned through preview copy", async ({ page }) => {
    await runMobileTopicAlignmentScenario(page, {
      contentId: E2E_MOBILE_ROUTE_TOPIC_CONTENT_ID,
      presetKey: "route-main"
    });
  });

  test("mobile one-click generation keeps selected mentor topic aligned through preview copy", async ({ page }) => {
    await runMobileTopicAlignmentScenario(page, {
      contentId: E2E_MOBILE_MENTOR_TOPIC_CONTENT_ID,
      presetKey: "mentor-direction-check"
    });
  });

  test("mobile one-click generation keeps selected timing topic aligned through preview copy", async ({ page }) => {
    await runMobileTopicAlignmentScenario(page, {
      contentId: E2E_MOBILE_TIMELINE_TOPIC_CONTENT_ID,
      presetKey: "timeline-main"
    });
  });

  test("mobile one-click generation keeps selected source logo-price topic aligned through preview copy", async ({ page }) => {
    await runMobileTopicAlignmentScenario(page, {
      contentId: E2E_MOBILE_SOURCE_LOGO_PRICE_CONTENT_ID,
      expectPreviewViewportFit: true,
      expectSourceEvidenceViewportFit: true,
      presetKey: "source-logo-price",
      viewport: { height: 780, width: 360 }
    });
  });

  test("mobile one-click generation keeps selected ranking project-list topic aligned through preview copy", async ({ page }) => {
    await runMobileTopicAlignmentScenario(page, {
      contentId: E2E_MOBILE_RANKING_PROGRAMS_CONTENT_ID,
      expectPreviewViewportFit: true,
      expectSourceEvidenceViewportFit: true,
      presetKey: "ranking-water-programs",
      viewport: { height: 780, width: 360 }
    });
  });

  test("mobile one-click generation keeps selected global ranking topic aligned through preview copy", async ({ page }) => {
    await runMobileTopicAlignmentScenario(page, {
      contentId: E2E_MOBILE_GLOBAL_RANKING_CONTENT_ID,
      expectPreviewViewportFit: true,
      expectSourceEvidenceViewportFit: true,
      presetKey: "ranking-water-global",
      viewport: { height: 780, width: 360 }
    });
  });

  test("mobile source preview failure blocks source topic generation without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("source-official-fee-check");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      contentId: E2E_MOBILE_SOURCE_PREVIEW_FAILURE_CONTENT_ID,
      failSourcePreview: true
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(preset.topic);
    await expect(page.getByTestId("mobile-topic")).toHaveValue(preset.topic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(preset.audience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(preset.tags);

    await page.getByTestId("mobile-source-preview-button").click();
    await expect(page.getByTestId("mobile-source-evidence")).toContainText(
      "E2E mobile source preview unavailable."
    );
    await expectNoHorizontalViewportOverflow(page, "mobile source preview failure", [
      { label: "error card", testId: "mobile-source-evidence" },
      { label: "retry button", testId: "mobile-source-preview-button" }
    ]);
    await expect(page.getByTestId("mobile-source-preview-button")).toBeEnabled();
    await expect(page.getByTestId("mobile-generate-draft")).toBeDisabled();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("先重新查看依据");
    await expect(
      page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_SOURCE_PREVIEW_FAILURE_CONTENT_ID}`)
    ).toHaveCount(0);

    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: preset.knowledgeQuery,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: preset.audience,
      topic: preset.topic
    });
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile custom fact topic source preview failure blocks generation without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic = "overseas doctoral exchange rate and currency conversion check";
    const preset = requireTopicPreset("source-official-fee-check");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      contentId: E2E_MOBILE_CUSTOM_SOURCE_PREVIEW_FAILURE_CONTENT_ID,
      failSourcePreview: true
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(customSourceTopic);
    await expect(page.getByTestId("mobile-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(new RegExp(customSourceTopic));
    await expect(page.getByTestId("mobile-tags")).toHaveValue(customSourceTopic);
    const customAudience = await page.getByTestId("mobile-audience").inputValue();
    const customTags = await page.getByTestId("mobile-tags").inputValue();
    const expectedTags = parseTagText(customTags);

    await page.getByTestId("mobile-source-preview-button").click();
    await expect(page.getByTestId("mobile-source-evidence")).toContainText(
      "E2E mobile source preview unavailable."
    );
    await expectNoHorizontalViewportOverflow(page, "mobile custom source preview failure", [
      { label: "error card", testId: "mobile-source-evidence" },
      { label: "retry button", testId: "mobile-source-preview-button" }
    ]);
    await expect(page.getByTestId("mobile-generate-draft")).toBeDisabled();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("先重新查看依据");
    await expect(
      page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_CUSTOM_SOURCE_PREVIEW_FAILURE_CONTENT_ID}`)
    ).toHaveCount(0);

    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: customAudience,
      topic: customSourceTopic
    });
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile one-click generation keeps custom fact topic aligned through preview copy", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic =
      "overseas doctoral consulting market data and pricing benchmarks";
    const expectedAudience = buildCustomTopicAudience(customSourceTopic);
    const expectedTagsText = buildCustomTopicTags(customSourceTopic);
    const expectedTags = parseTagText(expectedTagsText);
    const customPreset: GenerationTopicPreset = {
      ...requireTopicPreset("source-official-fee-check"),
      audience: expectedAudience,
      coverDirection:
        "Custom mobile source verification checklist for current market data and pricing benchmarks.",
      desktopHelper: "Custom source verification",
      desktopLabel: "自定义",
      key: "e2e-mobile-custom-fact-topic",
      knowledgeQuery: customSourceTopic,
      mobileHelper: "Custom source",
      mobileLabel: "自定义",
      tags: expectedTagsText,
      topic: customSourceTopic
    };
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, customPreset, {
      contentId: E2E_MOBILE_CUSTOM_TOPIC_CONTENT_ID
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(customSourceTopic);
    await expect(page.getByTestId("mobile-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(expectedAudience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(expectedTagsText);

    await page.getByTestId("mobile-source-preview-button").click();
    await expect(page.getByTestId("mobile-source-evidence")).toContainText("2 条");
    await page.getByTestId("mobile-source-knowledge-toggle").click();
    await expect(page.getByTestId("mobile-source-knowledge-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "mobile custom source evidence", [
      { label: "card", testId: "mobile-source-evidence" },
      { label: "knowledge list", testId: "mobile-source-knowledge-list" }
    ]);
    await page.getByTestId("mobile-source-web-toggle").click();
    await expect(page.getByTestId("mobile-source-web-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "mobile custom source evidence", [
      { label: "card", testId: "mobile-source-evidence" },
      { label: "web list", testId: "mobile-source-web-list" }
    ]);

    await page.getByTestId("mobile-generate-draft").click();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");
    await page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_CUSTOM_TOPIC_CONTENT_ID}`).click();

    const preview = page.getByTestId("draft-preview-editor");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(customSourceTopic);
    await expect(preview).toContainText(expectedAudience);
    await expect(preview).toContainText("必须保持自定义选题意图");
    await expect(preview).toContainText(`#${expectedTags[0]}`);
    await expect(preview).toContainText("发布前预览 · 不会自动发布");
    await expect(page.getByTestId("draft-preview-cover-image")).toBeVisible();
    await expect(page.getByTestId("draft-preview-human-review-note")).toContainText(
      "发布前仍需人工确认，不会自动发布"
    );
    await expect(page.getByTestId("draft-preview-prepublish-checklist")).toBeVisible();
    await expect(page.getByTestId("draft-preview-prepublish-check-content")).toContainText("已就绪");
    await expect(page.getByTestId("draft-preview-prepublish-check-sources")).toContainText("待核对");
    await expect(page.getByTestId("draft-preview-prepublish-check-cover")).toContainText("待核对");
    await expect(page.getByTestId("draft-preview-prepublish-check-risk")).toContainText("已就绪");
    await expect(page.getByTestId("draft-preview-prepublish-check-human")).toContainText("待核对");
    await expect(page.getByTestId("draft-preview-copy")).toBeEnabled();
    await expect(page.getByTestId("draft-copy-preview-link")).toBeEnabled();
    await expectNoHorizontalViewportOverflow(page, "mobile custom draft preview", [
      { label: "editor", testId: "draft-preview-editor" },
      { label: "cover image", testId: "draft-preview-cover-image" },
      { label: "checklist", testId: "draft-preview-prepublish-checklist" },
      { label: "copy action", testId: "draft-preview-copy" },
      { label: "preview link action", testId: "draft-copy-preview-link" }
    ]);

    await captureNextClipboardWrite(page);
    await page.getByTestId("draft-preview-copy").click();
    await expect(page.getByTestId("draft-export-status")).toBeVisible();
    const copiedMobileDraftText = await readCapturedClipboardText(page);
    expect(copiedMobileDraftText).toContain(customSourceTopic);
    expect(copiedMobileDraftText).toContain(`#${expectedTags[0]}`);
    expect(countTextOccurrences(copiedMobileDraftText, `#${expectedTags[0]}`)).toBe(1);
    const manualCopyText = await page.getByTestId("draft-manual-copy-text").inputValue();
    expect(manualCopyText).toContain(customSourceTopic);
    expect(manualCopyText).toContain(`#${expectedTags[0]}`);
    expect(countTextOccurrences(manualCopyText, `#${expectedTags[0]}`)).toBe(1);

    await page.getByTestId("draft-preview-close").click();
    const nextCustomTopic = "mentor matching checklist for part-time doctoral applicants";
    await page.getByTestId("mobile-topic").fill(nextCustomTopic);
    await expect(page.getByTestId("mobile-stale-draft-warning")).toContainText(customSourceTopic);
    await expect(page.getByTestId("mobile-stale-draft-warning")).toContainText(nextCustomTopic);
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("一键");

    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_MOBILE_CUSTOM_TOPIC_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).not.toContain(
      requireTopicPreset("source-official-fee-check").coverDirection
    );
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile one-click generation keeps exchange-rate custom topic evidence aligned", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic = "overseas doctoral exchange rate and currency conversion check";
    const expectedAudience = buildCustomTopicAudience(customSourceTopic);
    const expectedTagsText = buildCustomTopicTags(customSourceTopic);
    const expectedTags = parseTagText(expectedTagsText);
    const customPreset: GenerationTopicPreset = {
      ...requireTopicPreset("source-official-fee-check"),
      audience: expectedAudience,
      coverDirection:
        "Custom mobile source verification checklist for current exchange rates and currency conversion.",
      desktopHelper: "Custom exchange-rate source verification",
      desktopLabel: "自定义",
      key: "e2e-mobile-exchange-rate-topic",
      knowledgeQuery: customSourceTopic,
      mobileHelper: "Custom exchange rate",
      mobileLabel: "自定义",
      tags: expectedTagsText,
      topic: customSourceTopic
    };
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, customPreset, {
      contentId: E2E_MOBILE_EXCHANGE_RATE_TOPIC_CONTENT_ID
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(customSourceTopic);
    await expect(page.getByTestId("mobile-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(expectedAudience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(expectedTagsText);

    await page.getByTestId("mobile-source-preview-button").click();
    await expect(page.getByTestId("mobile-source-evidence")).toContainText("2 条");
    await page.getByTestId("mobile-source-knowledge-toggle").click();
    await expect(page.getByTestId("mobile-source-knowledge-list")).toContainText(customSourceTopic);
    await page.getByTestId("mobile-source-web-toggle").click();
    await expect(page.getByTestId("mobile-source-web-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "mobile exchange-rate source evidence", [
      { label: "card", testId: "mobile-source-evidence" },
      { label: "web list", testId: "mobile-source-web-list" }
    ]);

    await page.getByTestId("mobile-generate-draft").click();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");
    await page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_EXCHANGE_RATE_TOPIC_CONTENT_ID}`).click();

    const preview = page.getByTestId("draft-preview-editor");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(customSourceTopic);
    await expect(preview).toContainText(expectedAudience);
    await expect(preview).toContainText("必须保持自定义选题意图");
    await expect(preview).toContainText(`#${expectedTags[0]}`);
    await expect(preview).toContainText("发布前预览 · 不会自动发布");
    await expect(page.getByTestId("draft-preview-cover-image")).toBeVisible();
    await expect(page.getByTestId("draft-preview-prepublish-check-sources")).toContainText("待核对");

    await captureNextClipboardWrite(page);
    await page.getByTestId("draft-preview-copy").click();
    await expect(page.getByTestId("draft-export-status")).toBeVisible();
    const copiedMobileDraftText = await readCapturedClipboardText(page);
    expect(copiedMobileDraftText).toContain(customSourceTopic);
    expect(copiedMobileDraftText).toContain(`#${expectedTags[0]}`);
    const manualCopyText = await page.getByTestId("draft-manual-copy-text").inputValue();
    expect(manualCopyText).toContain(customSourceTopic);
    expect(manualCopyText).toContain(`#${expectedTags[0]}`);

    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_MOBILE_EXCHANGE_RATE_TOPIC_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).not.toContain(
      requireTopicPreset("source-official-fee-check").coverDirection
    );
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile one-click generation keeps official logo-price custom topic evidence aligned", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic = "official overseas doctoral logo authorization and tuition price verification";
    const expectedAudience = buildCustomTopicAudience(customSourceTopic);
    const expectedTagsText = buildCustomTopicTags(customSourceTopic);
    const expectedTags = parseTagText(expectedTagsText);
    const customCoverDirection =
      "Custom mobile source verification checklist for official logo authorization and tuition price evidence.";
    const customPreset: GenerationTopicPreset = {
      ...requireTopicPreset("source-logo-price"),
      audience: expectedAudience,
      coverDirection: customCoverDirection,
      desktopHelper: "Custom official logo-price source verification",
      desktopLabel: "自定义",
      key: "e2e-mobile-official-logo-price-topic",
      knowledgeQuery: customSourceTopic,
      mobileHelper: "Custom logo price",
      mobileLabel: "自定义",
      tags: expectedTagsText,
      topic: customSourceTopic
    };
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, customPreset, {
      contentId: E2E_MOBILE_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID
    });

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=create`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();
    await page.getByTestId("mobile-creation-project-postgraduate-phd").click();

    await page.getByTestId("mobile-topic").fill(customSourceTopic);
    await expect(page.getByTestId("mobile-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("mobile-audience")).toHaveValue(expectedAudience);
    await expect(page.getByTestId("mobile-tags")).toHaveValue(expectedTagsText);

    await page.getByTestId("mobile-source-preview-button").click();
    await expect(page.getByTestId("mobile-source-evidence")).toContainText("2 条");
    await page.getByTestId("mobile-source-knowledge-toggle").click();
    await expect(page.getByTestId("mobile-source-knowledge-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "mobile official logo-price source evidence", [
      { label: "card", testId: "mobile-source-evidence" },
      { label: "knowledge list", testId: "mobile-source-knowledge-list" }
    ]);
    await page.getByTestId("mobile-source-web-toggle").click();
    await expect(page.getByTestId("mobile-source-web-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "mobile official logo-price source evidence", [
      { label: "card", testId: "mobile-source-evidence" },
      { label: "web list", testId: "mobile-source-web-list" }
    ]);

    await page.getByTestId("mobile-generate-draft").click();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");
    await page
      .getByTestId(`mobile-draft-history-card-${E2E_MOBILE_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID}`)
      .click();

    const preview = page.getByTestId("draft-preview-editor");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(customSourceTopic);
    await expect(preview).toContainText(expectedAudience);
    await expect(preview).toContainText("必须保持自定义选题意图");
    await expect(preview).toContainText(`#${expectedTags[0]}`);
    await expect(preview).toContainText("不会自动发布");
    await expect(page.getByTestId("draft-preview-cover-image")).toBeVisible();
    await expect(page.getByTestId("draft-preview-prepublish-check-sources")).toContainText("待核对");
    await expectNoHorizontalViewportOverflow(page, "mobile official logo-price draft preview", [
      { label: "editor", testId: "draft-preview-editor" },
      { label: "cover image", testId: "draft-preview-cover-image" },
      { label: "checklist", testId: "draft-preview-prepublish-checklist" },
      { label: "copy action", testId: "draft-preview-copy" },
      { label: "preview link action", testId: "draft-copy-preview-link" }
    ]);

    await captureNextClipboardWrite(page);
    await page.getByTestId("draft-preview-copy").click();
    await expect(page.getByTestId("draft-export-status")).toBeVisible();
    const copiedMobileDraftText = await readCapturedClipboardText(page);
    expect(copiedMobileDraftText).toContain(customSourceTopic);
    expect(copiedMobileDraftText).toContain(`#${expectedTags[0]}`);
    const manualCopyText = await page.getByTestId("draft-manual-copy-text").inputValue();
    expect(manualCopyText).toContain(customSourceTopic);
    expect(manualCopyText).toContain(`#${expectedTags[0]}`);

    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_MOBILE_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).not.toContain(
      requireTopicPreset("source-logo-price").coverDirection
    );
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile generated draft missing tags shows recovery checklist", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("sales-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      contentId: E2E_MOBILE_MISSING_TAGS_CONTENT_ID,
      responseTags: []
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
    await page.getByTestId("mobile-tags").fill("");

    await page.getByTestId("mobile-generate-draft").click();
    await expect(page.getByTestId("mobile-generate-draft")).toContainText("重新一键生成");
    await page.getByTestId(`mobile-draft-history-card-${E2E_MOBILE_MISSING_TAGS_CONTENT_ID}`).click();

    const contentCheck = page.getByTestId("draft-preview-prepublish-check-content");
    await expect(contentCheck).toContainText("需补充");
    await expect(contentCheck).toContainText("缺少标签");
    await expect(contentCheck).toContainText("重新生成");
    await expect(page.getByTestId("draft-preview-copy")).toBeEnabled();

    expect(generationRequests.sourcePreview).toHaveLength(0);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      platform: "xiaohongshu",
      tags: [],
      target_audience: preset.audience,
      topic: preset.topic
    });
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

    await waitForMobileGenerationState(page, "生成失败");
    await expect(page.getByTestId("mobile-status")).toContainText(
      "文案草稿已生成，但封面图失败：封面服务暂时不可用，请稍后重试。"
    );
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
    await expect(page.getByTestId("draft-preview-prepublish-checklist")).toBeVisible();
    await expect(page.getByTestId("draft-preview-prepublish-check-cover")).toContainText("需补充");
    await expect(page.getByTestId("draft-preview-prepublish-check-cover")).toContainText(
      "封面尚未生成"
    );

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

  test("mobile schema-invalid draft failure gives recovery copy without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("mentor-direction-check");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockMobileGenerationFixture(page, preset, {
      contentId: E2E_CONTENT_FAILURE_CONTENT_ID,
      failContent: true,
      failContentDetail:
        "草稿正文过短，无法覆盖选题、受众、行动建议和人工核对提醒，请补充素材后重新生成。"
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
      "生成结果需要补救：请补充业务素材、核对选题/标签/检索依据后重新生成；系统不会保存这次不合格草稿。"
    );
    await expect(page.getByTestId("mobile-status")).toContainText(
      "草稿正文过短，无法覆盖选题、受众、行动建议和人工核对提醒"
    );
    await waitForMobileGenerationState(page, "生成失败");
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
    await expect(page.getByTestId("mobile-review-knowledge-list")).toContainText(approvePreset.topic);
    await expect(page.getByTestId("mobile-review-web-list")).toContainText(approvePreset.topic);
    await expectNoHorizontalViewportOverflow(page, "mobile review detail evidence", [
      { label: "detail sheet", testId: "mobile-review-detail" },
      { label: "source evidence", testId: "mobile-review-source-evidence" },
      { label: "knowledge list", testId: "mobile-review-knowledge-list" },
      { label: "web list", testId: "mobile-review-web-list" },
      { label: "approve action", testId: "mobile-review-detail-approve" },
      { label: "request changes action", testId: "mobile-review-detail-request-changes" }
    ]);
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

  test("mobile review queue read error is recoverable without publishing", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("timeline-main");
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
      { failContentListUntilReleased: true }
    );

    await page.goto(`${BASE_URL}/android?from=%2F%3Ftheme%3Dmint&tab=review`);
    await expect(page.getByTestId("mobile-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("mobile-login-account").fill(acceptedLogin.account);
    await page.getByTestId("mobile-login-password").fill(acceptedLogin.password);
    await page.getByTestId("mobile-login-submit").click();

    await expect(page.getByTestId("mobile-review-queue-error")).toContainText(
      "E2E mobile review queue unavailable."
    );
    await expect(page.getByTestId("mobile-review-card")).toHaveCount(0);
    const mobileReviewQueueErrorBox = await page.getByTestId("mobile-review-queue-error").boundingBox();
    expect(mobileReviewQueueErrorBox?.width ?? 0).toBeGreaterThan(300);
    expect(mobileReviewQueueErrorBox?.height ?? 0).toBeGreaterThan(80);
    await attachScreenshotEvidence(page, testInfo, "mobile-review-queue-error.png", {
      minBytes: 14_000,
      minHeight: 800,
      minWidth: 390
    });

    reviewRequests.releaseContentListFailures();
    await page.getByTestId("mobile-review-queue-retry").click();

    await expect(page.getByTestId("mobile-review-list")).toBeVisible();
    await expect(page.getByTestId("mobile-review-card").first()).toContainText(preset.topic);
    await expect(page.getByTestId("mobile-review-queue-error")).toHaveCount(0);
    const mobileReviewQueueRecoveredBox = await page.getByTestId("mobile-review-list").boundingBox();
    expect(mobileReviewQueueRecoveredBox?.width ?? 0).toBeGreaterThan(300);
    expect(mobileReviewQueueRecoveredBox?.height ?? 0).toBeGreaterThan(100);
    await attachScreenshotEvidence(page, testInfo, "mobile-review-queue-recovered.png", {
      minBytes: 14_000,
      minHeight: 800,
      minWidth: 390
    });

    expect(reviewRequests.contentList).toBeGreaterThan(1);
    expect(reviewRequests.imageList).toContain(E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID);
    expect(reviewRequests.reviews).toHaveLength(0);
    expect(reviewRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("mobile review decision failure keeps draft queued without publishing", async ({ page }, testInfo) => {
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
    const approveFailureStatusBox = await page.getByTestId("mobile-review-status").boundingBox();
    expect(approveFailureStatusBox?.width ?? 0).toBeGreaterThan(300);
    expect(approveFailureStatusBox?.height ?? 0).toBeGreaterThan(16);
    await expect(page.getByTestId("mobile-review-source-evidence")).toContainText(preset.topic);
    await expect(page.getByTestId("mobile-review-knowledge-list")).toContainText(preset.topic);
    await expect(page.getByTestId("mobile-review-web-list")).toContainText(preset.topic);
    await expectNoHorizontalViewportOverflow(page, "mobile review failure detail evidence", [
      { label: "detail sheet", testId: "mobile-review-detail" },
      { label: "source evidence", testId: "mobile-review-source-evidence" },
      { label: "knowledge list", testId: "mobile-review-knowledge-list" },
      { label: "web list", testId: "mobile-review-web-list" },
      { label: "approve action", testId: "mobile-review-detail-approve" },
      { label: "request changes action", testId: "mobile-review-detail-request-changes" }
    ]);
    await attachScreenshotEvidence(page, testInfo, "mobile-review-approve-failure.png", {
      minBytes: 14_000,
      minHeight: 800,
      minWidth: 390
    });
    expect(reviewRequests.reviews).toHaveLength(1);
    expect(reviewRequests.reviewUrls[0]).toContain(`/content/${E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID}/reviews`);
    expect(reviewRequests.reviews[0]).toMatchObject({
      decision: "approved",
      risk_flags: [],
      score: 95
    });

    await page.getByTestId("mobile-review-detail-request-changes").click();
    await expect(page.getByTestId("mobile-review-detail")).toBeVisible();
    await expect(page.getByTestId("mobile-review-status")).toContainText(
      "E2E 人工确认服务暂时不可用，请稍后重试。"
    );
    const requestChangesFailureStatusBox = await page.getByTestId("mobile-review-status").boundingBox();
    expect(requestChangesFailureStatusBox?.width ?? 0).toBeGreaterThan(300);
    expect(requestChangesFailureStatusBox?.height ?? 0).toBeGreaterThan(16);
    await expect(page.getByTestId("mobile-review-source-evidence")).toContainText(preset.topic);
    await expectNoHorizontalViewportOverflow(page, "mobile review request-changes failure detail evidence", [
      { label: "detail sheet", testId: "mobile-review-detail" },
      { label: "source evidence", testId: "mobile-review-source-evidence" },
      { label: "approve action", testId: "mobile-review-detail-approve" },
      { label: "request changes action", testId: "mobile-review-detail-request-changes" }
    ]);
    await attachScreenshotEvidence(page, testInfo, "mobile-review-request-changes-failure.png", {
      minBytes: 14_000,
      minHeight: 800,
      minWidth: 390
    });
    expect(reviewRequests.reviews).toHaveLength(2);
    expect(reviewRequests.reviewUrls[1]).toContain(`/content/${E2E_MOBILE_REVIEW_APPROVE_CONTENT_ID}/reviews`);
    expect(reviewRequests.reviews[1]).toMatchObject({
      decision: "changes_requested",
      risk_flags: ["needs_revision"],
      score: 60
    });

    await page.getByRole("button", { name: /关闭确认详情/ }).click();
    await expect(page.getByTestId("mobile-review-card")).toHaveCount(1);
    await expect(page.getByTestId("mobile-review-card").first()).toContainText(preset.topic);
    expect(reviewRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC content page shows a read-only pending review queue", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const pendingPreset = requireTopicPreset("timeline-main");
    const approvedPreset = requireTopicPreset("sales-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, pendingPreset, {
      contentListItems: [
        {
          contentId: E2E_PC_REVIEW_QUEUE_CONTENT_ID,
          preset: pendingPreset,
          status: "review_pending"
        },
        {
          contentId: E2E_PC_REVIEW_QUEUE_APPROVED_CONTENT_ID,
          preset: approvedPreset,
          status: "approved"
        }
      ]
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    const reviewQueue = page.getByTestId("pc-review-queue");
    await expect(reviewQueue).toBeVisible();
    await expect(page.getByTestId("pc-review-queue-count")).toContainText("1");
    await expect(page.getByTestId(`pc-review-queue-card-${E2E_PC_REVIEW_QUEUE_CONTENT_ID}`)).toContainText(
      pendingPreset.topic
    );
    await expect(reviewQueue).toContainText("只读预览，不会自动发布");
    await expect(reviewQueue).not.toContainText(approvedPreset.topic);

    await page.getByTestId(`pc-review-queue-card-${E2E_PC_REVIEW_QUEUE_CONTENT_ID}`).click();
    await expect(page.getByTestId("draft-history-card").filter({ hasText: pendingPreset.topic })).toBeVisible();

    expect(generationRequests.reviewQueue).toBeGreaterThan(0);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC read-only review queue shows recoverable read errors", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("timeline-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      failReviewQueue: true
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("pc-review-queue")).toBeVisible();
    await expect(page.getByTestId("pc-review-queue-error")).toContainText(
      "E2E PC review queue unavailable."
    );
    await expect(page.getByTestId("pc-review-queue-error")).toContainText(
      "不会在队列不可读时自动发布"
    );

    expect(generationRequests.reviewQueue).toBeGreaterThan(0);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC read-only review queue retry reloads content list only", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const pendingPreset = requireTopicPreset("timeline-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, pendingPreset, {
      failReviewQueueUntilReleased: true,
      contentListItems: [
        {
          contentId: E2E_PC_REVIEW_QUEUE_CONTENT_ID,
          preset: pendingPreset,
          status: "review_pending"
        }
      ]
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("pc-review-queue-error")).toContainText(
      "E2E PC review queue unavailable."
    );
    const pcReviewQueueErrorBox = await page.getByTestId("pc-review-queue-error").boundingBox();
    expect(pcReviewQueueErrorBox?.width ?? 0).toBeGreaterThan(280);
    expect(pcReviewQueueErrorBox?.height ?? 0).toBeGreaterThan(90);
    await attachScreenshotEvidence(page, testInfo, "pc-review-queue-error.png", {
      minBytes: 20_000,
      minHeight: 700,
      minWidth: 1000
    });
    generationRequests.releaseReviewQueueFailures();
    await page.getByTestId("pc-review-queue-retry").click();

    await expect(page.getByTestId("pc-review-queue-count")).toContainText("1");
    await expect(page.getByTestId(`pc-review-queue-card-${E2E_PC_REVIEW_QUEUE_CONTENT_ID}`)).toContainText(
      pendingPreset.topic
    );
    await expect(page.getByTestId("pc-review-queue-error")).toHaveCount(0);
    const pcReviewQueueRecoveredBox = await page.getByTestId("pc-review-queue-list").boundingBox();
    expect(pcReviewQueueRecoveredBox?.width ?? 0).toBeGreaterThan(280);
    expect(pcReviewQueueRecoveredBox?.height ?? 0).toBeGreaterThan(90);
    await attachScreenshotEvidence(page, testInfo, "pc-review-queue-recovered.png", {
      minBytes: 20_000,
      minHeight: 700,
      minWidth: 1000
    });

    expect(generationRequests.reviewQueue).toBeGreaterThan(1);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC draft history read error keeps review queue available", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const pendingPreset = requireTopicPreset("timeline-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, pendingPreset, {
      failDraftHistoryUntilReleased: true,
      contentListItems: [
        {
          contentId: E2E_PC_REVIEW_QUEUE_CONTENT_ID,
          preset: pendingPreset,
          status: "review_pending"
        }
      ]
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("draft-history-error")).toContainText(
      "E2E PC draft history unavailable."
    );
    await expect(page.getByTestId(`pc-review-queue-card-${E2E_PC_REVIEW_QUEUE_CONTENT_ID}`)).toContainText(
      pendingPreset.topic
    );
    const pcDraftHistoryErrorBox = await page.getByTestId("draft-history-error").boundingBox();
    expect(pcDraftHistoryErrorBox?.width ?? 0).toBeGreaterThan(560);
    expect(pcDraftHistoryErrorBox?.height ?? 0).toBeGreaterThan(90);
    const pcReviewQueueAvailableBox = await page
      .getByTestId(`pc-review-queue-card-${E2E_PC_REVIEW_QUEUE_CONTENT_ID}`)
      .boundingBox();
    expect(pcReviewQueueAvailableBox?.width ?? 0).toBeGreaterThan(280);
    expect(pcReviewQueueAvailableBox?.height ?? 0).toBeGreaterThan(80);
    await attachScreenshotEvidence(page, testInfo, "pc-draft-history-error-with-review-queue.png", {
      minBytes: 20_000,
      minHeight: 700,
      minWidth: 1000
    });

    generationRequests.releaseDraftHistoryFailures();
    await page.getByTestId("draft-history-retry").click();

    await expect(
      page.getByTestId("draft-history-card").filter({ hasText: pendingPreset.topic }).first()
    ).toBeVisible();
    await expect(page.getByTestId("draft-history-error")).toHaveCount(0);
    const pcDraftHistoryRecoveredBox = await page.getByTestId("draft-history-strip").boundingBox();
    expect(pcDraftHistoryRecoveredBox?.width ?? 0).toBeGreaterThan(560);
    expect(pcDraftHistoryRecoveredBox?.height ?? 0).toBeGreaterThan(100);
    await attachScreenshotEvidence(page, testInfo, "pc-draft-history-recovered.png", {
      minBytes: 20_000,
      minHeight: 700,
      minWidth: 1000
    });

    expect(generationRequests.contentList).toBeGreaterThan(1);
    expect(generationRequests.reviewQueue).toBeGreaterThan(0);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC one-click generation keeps selected sales topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_GENERATED_CONTENT_ID,
      expectExportSafetyCopy: true,
      presetKey: "sales-main"
    });
  });

  test("PC one-click generation keeps selected route topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_ROUTE_TOPIC_CONTENT_ID,
      presetKey: "route-main"
    });
  });

  test("PC one-click generation keeps selected mentor topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_MENTOR_TOPIC_CONTENT_ID,
      presetKey: "mentor-direction-check"
    });
  });

  test("PC one-click generation keeps selected timing topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_TIMELINE_TOPIC_CONTENT_ID,
      presetKey: "timeline-main"
    });
  });

  test("PC one-click generation keeps selected source topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_SOURCE_TOPIC_CONTENT_ID,
      presetKey: "source-official-fee-check"
    });
  });

  test("PC one-click generation keeps selected source logo-price topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_SOURCE_LOGO_PRICE_CONTENT_ID,
      expectSourceEvidenceViewportFit: true,
      presetKey: "source-logo-price"
    });
  });

  test("PC one-click generation keeps selected ranking project-list topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_RANKING_PROGRAMS_CONTENT_ID,
      expectSourceEvidenceViewportFit: true,
      presetKey: "ranking-water-programs"
    });
  });

  test("PC one-click generation keeps selected global ranking topic aligned through preview copy", async ({ page }) => {
    await runPcTopicAlignmentScenario(page, {
      contentId: E2E_PC_GLOBAL_RANKING_CONTENT_ID,
      expectSourceEvidenceViewportFit: true,
      presetKey: "ranking-water-global"
    });
  });

  test("PC generated draft missing tags shows recovery checklist", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("sales-main");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_MISSING_TAGS_CONTENT_ID,
      responseTags: []
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(preset.topic);
    await expect(page.getByTestId("content-tags")).toHaveValue(preset.tags);
    await page.getByTestId("content-tags").fill("");
    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toContainText("2 条");

    await page.getByTestId("start-production-button").click();

    const contentCheck = page.getByTestId("pc-export-prepublish-check-content");
    await expect(contentCheck).toContainText("需补充");
    await expect(contentCheck).toContainText("缺少标签");
    await expect(contentCheck).toContainText("重新生成");
    await expect(page.getByTestId("pc-export-copy-button")).toBeEnabled();

    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      tags: [],
      topic: preset.topic
    });
  });

  test("PC source preview failure blocks source topic generation without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("source-official-fee-check");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_SOURCE_PREVIEW_FAILURE_CONTENT_ID,
      failSourcePreview: true
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
    await expect(page.getByTestId("generation-source-evidence")).toContainText(
      "E2E source preview unavailable."
    );
    await expectNoHorizontalViewportOverflow(page, "PC source preview failure", [
      { label: "error card", testId: "generation-source-evidence" },
      { label: "retry button", testId: "source-preview-button" }
    ]);
    await expect(page.getByTestId("source-preview-button")).toBeEnabled();
    await expect(page.getByTestId("start-production-button")).toBeDisabled();
    await expect(page.getByTestId("start-production-button")).toContainText("先重新查看依据");
    await expect(page.getByTestId("draft-history-card")).toHaveCount(0);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
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
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC custom fact topic source preview failure blocks generation without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic = "overseas doctoral exchange rate and currency conversion check";
    const preset = requireTopicPreset("source-official-fee-check");
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_CUSTOM_SOURCE_PREVIEW_FAILURE_CONTENT_ID,
      failSourcePreview: true
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(customSourceTopic);
    await expect(page.getByTestId("content-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(new RegExp(customSourceTopic));
    await expect(page.getByTestId("content-tags")).toHaveValue(customSourceTopic);
    const customAudience = await page.getByTestId("content-target-audience").inputValue();
    const customTags = await page.getByTestId("content-tags").inputValue();
    const expectedTags = parseTagText(customTags);

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toContainText(
      "E2E source preview unavailable."
    );
    await expectNoHorizontalViewportOverflow(page, "PC custom source preview failure", [
      { label: "error card", testId: "generation-source-evidence" },
      { label: "retry button", testId: "source-preview-button" }
    ]);
    await expect(page.getByTestId("source-preview-button")).toBeEnabled();
    await expect(page.getByTestId("start-production-button")).toBeDisabled();
    await expect(page.getByTestId("start-production-button")).toContainText("先重新查看依据");
    await expect(page.getByTestId("draft-history-card")).toHaveCount(0);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(0);
    expect(generationRequests.imageGenerate).toHaveLength(0);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: customAudience,
      topic: customSourceTopic
    });
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC one-click generation keeps custom fact topic aligned through preview copy", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic =
      "overseas doctoral consulting market data and pricing benchmarks";
    const expectedAudience = buildCustomTopicAudience(customSourceTopic);
    const expectedTagsText = buildCustomTopicTags(customSourceTopic);
    const expectedTags = parseTagText(expectedTagsText);
    const customPreset: GenerationTopicPreset = {
      ...requireTopicPreset("source-official-fee-check"),
      audience: expectedAudience,
      coverDirection:
        "Custom source verification checklist focused on current market data and pricing benchmarks.",
      desktopHelper: "Custom source verification",
      desktopLabel: "自定义",
      key: "e2e-custom-fact-topic",
      knowledgeQuery: customSourceTopic,
      mobileHelper: "Custom source",
      mobileLabel: "自定义",
      tags: expectedTagsText,
      topic: customSourceTopic
    };
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, customPreset, {
      contentId: E2E_PC_CUSTOM_TOPIC_CONTENT_ID
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(customSourceTopic);
    await expect(page.getByTestId("content-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(expectedAudience);
    await expect(page.getByTestId("content-tags")).toHaveValue(expectedTagsText);
    await expect(page.getByTestId("content-cover-direction-type")).toContainText("自定义");

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toBeVisible();
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "PC custom source evidence", [
      { label: "card", testId: "generation-source-evidence" },
      { label: "knowledge list", testId: "source-knowledge-list" }
    ]);
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "PC custom source evidence", [
      { label: "card", testId: "generation-source-evidence" },
      { label: "web list", testId: "source-web-list" }
    ]);

    await page.getByTestId("start-production-button").click();

    const exportCard = page.getByTestId("pc-generated-export-card");
    await expect(exportCard).toBeVisible();
    await expect(exportCard).toContainText(customSourceTopic);
    await expect(exportCard).toContainText(expectedAudience);
    await expect(page.getByTestId("pc-export-copy-button")).toBeEnabled();
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("发布前检查");
    await expect(page.getByTestId("pc-export-prepublish-checklist")).toBeVisible();
    await expect(page.getByTestId("pc-export-prepublish-check-content")).toContainText("已就绪");
    await expect(page.getByTestId("pc-export-prepublish-check-sources")).toContainText("待核对");
    await expect(page.getByTestId("pc-export-prepublish-check-cover")).toContainText("待核对");
    await expect(page.getByTestId("pc-export-prepublish-check-risk")).toContainText("已就绪");
    await expect(page.getByTestId("pc-export-prepublish-check-human")).toContainText("待核对");

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: customSourceTopic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(customSourceTopic);
    await expect(previewModal).toContainText(expectedAudience);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(page.getByTestId("xhs-preview-real-cover")).toBeVisible();

    await captureNextClipboardWrite(page);
    const copyButton = page.getByTestId("pc-preview-modal-copy-button");
    await copyButton.click();
    await expect(copyButton).toContainText(/\u5df2\u590d\u5236/);
    const copiedPreviewText = await readCapturedClipboardText(page);
    expect(copiedPreviewText).toContain(customSourceTopic);
    expect(copiedPreviewText).toContain(`#${expectedTags[0]}`);
    expect(countTextOccurrences(copiedPreviewText, `#${expectedTags[0]}`)).toBe(1);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_PC_CUSTOM_TOPIC_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).not.toContain(
      requireTopicPreset("source-official-fee-check").coverDirection
    );
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC one-click generation keeps exchange-rate custom topic evidence aligned", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic = "overseas doctoral exchange rate and currency conversion check";
    const expectedAudience = buildCustomTopicAudience(customSourceTopic);
    const expectedTagsText = buildCustomTopicTags(customSourceTopic);
    const expectedTags = parseTagText(expectedTagsText);
    const customPreset: GenerationTopicPreset = {
      ...requireTopicPreset("source-official-fee-check"),
      audience: expectedAudience,
      coverDirection:
        "Custom PC source verification checklist for current exchange rates and currency conversion.",
      desktopHelper: "Custom exchange-rate source verification",
      desktopLabel: "自定义",
      key: "e2e-pc-exchange-rate-topic",
      knowledgeQuery: customSourceTopic,
      mobileHelper: "Custom exchange rate",
      mobileLabel: "自定义",
      tags: expectedTagsText,
      topic: customSourceTopic
    };
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, customPreset, {
      contentId: E2E_PC_EXCHANGE_RATE_TOPIC_CONTENT_ID
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(customSourceTopic);
    await expect(page.getByTestId("content-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(expectedAudience);
    await expect(page.getByTestId("content-tags")).toHaveValue(expectedTagsText);

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toBeVisible();
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(customSourceTopic);
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "PC exchange-rate source evidence", [
      { label: "card", testId: "generation-source-evidence" },
      { label: "web list", testId: "source-web-list" }
    ]);

    await page.getByTestId("start-production-button").click();

    const exportCard = page.getByTestId("pc-generated-export-card");
    await expect(exportCard).toBeVisible();
    await expect(exportCard).toContainText(customSourceTopic);
    await expect(exportCard).toContainText(expectedAudience);
    await expect(page.getByTestId("pc-export-copy-button")).toBeEnabled();
    await expect(page.getByTestId("pc-export-prepublish-check-sources")).toContainText("待核对");

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: customSourceTopic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(customSourceTopic);
    await expect(previewModal).toContainText(expectedAudience);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(page.getByTestId("xhs-preview-real-cover")).toBeVisible();

    await captureNextClipboardWrite(page);
    const copyButton = page.getByTestId("pc-preview-modal-copy-button");
    await copyButton.click();
    await expect(copyButton).toContainText(/\u5df2\u590d\u5236/);
    const copiedPreviewText = await readCapturedClipboardText(page);
    expect(copiedPreviewText).toContain(customSourceTopic);
    expect(copiedPreviewText).toContain(`#${expectedTags[0]}`);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_PC_EXCHANGE_RATE_TOPIC_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).not.toContain(
      requireTopicPreset("source-official-fee-check").coverDirection
    );
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC one-click generation keeps official logo-price custom topic evidence aligned", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const customSourceTopic = "official overseas doctoral logo authorization and tuition price verification";
    const expectedAudience = buildCustomTopicAudience(customSourceTopic);
    const expectedTagsText = buildCustomTopicTags(customSourceTopic);
    const expectedTags = parseTagText(expectedTagsText);
    const customPreset: GenerationTopicPreset = {
      ...requireTopicPreset("source-logo-price"),
      audience: expectedAudience,
      coverDirection:
        "Custom PC source verification checklist for official logo authorization and tuition price evidence.",
      desktopHelper: "Custom official logo-price source verification",
      desktopLabel: "自定义",
      key: "e2e-pc-official-logo-price-topic",
      knowledgeQuery: customSourceTopic,
      mobileHelper: "Custom logo price",
      mobileLabel: "自定义",
      tags: expectedTagsText,
      topic: customSourceTopic
    };
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, customPreset, {
      contentId: E2E_PC_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID
    });

    await page.goto(`${BASE_URL}/?theme=mint&tab=content&project=postgraduate-phd`);
    await expect(page.getByTestId("pc-login-form")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("pc-login-account").fill(acceptedLogin.account);
    await page.getByTestId("pc-login-password").fill(acceptedLogin.password);
    await page.getByTestId("pc-login-submit").click();

    await expect(page.getByTestId("creation-project-return")).toBeVisible();
    await expect(page.getByTestId("generation-launcher")).toBeVisible();
    await page.getByTestId("content-topic").fill(customSourceTopic);
    await expect(page.getByTestId("content-topic")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-knowledge-query")).toHaveValue(customSourceTopic);
    await expect(page.getByTestId("content-target-audience")).toHaveValue(expectedAudience);
    await expect(page.getByTestId("content-tags")).toHaveValue(expectedTagsText);
    await expect(page.getByTestId("content-cover-direction-type")).toContainText("\u81ea\u5b9a\u4e49");

    await page.getByTestId("source-preview-button").click();
    await expect(page.getByTestId("generation-source-evidence")).toBeVisible();
    await page.getByTestId("source-knowledge-toggle").click();
    await expect(page.getByTestId("source-knowledge-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "PC official logo-price source evidence", [
      { label: "card", testId: "generation-source-evidence" },
      { label: "knowledge list", testId: "source-knowledge-list" }
    ]);
    await page.getByTestId("source-web-toggle").click();
    await expect(page.getByTestId("source-web-list")).toContainText(customSourceTopic);
    await expectNoHorizontalViewportOverflow(page, "PC official logo-price source evidence", [
      { label: "card", testId: "generation-source-evidence" },
      { label: "web list", testId: "source-web-list" }
    ]);

    await page.getByTestId("start-production-button").click();

    const exportCard = page.getByTestId("pc-generated-export-card");
    await expect(exportCard).toBeVisible();
    await expect(exportCard).toContainText(customSourceTopic);
    await expect(exportCard).toContainText(expectedAudience);
    await expect(page.getByTestId("pc-export-copy-button")).toBeEnabled();
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("\u53d1\u5e03\u524d\u68c0\u67e5");
    await expect(page.getByTestId("pc-export-prepublish-check-sources")).toContainText("\u5f85\u6838\u5bf9");

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: customSourceTopic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(customSourceTopic);
    await expect(previewModal).toContainText(expectedAudience);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(page.getByTestId("xhs-preview-real-cover")).toBeVisible();

    await captureNextClipboardWrite(page);
    const copyButton = page.getByTestId("pc-preview-modal-copy-button");
    await copyButton.click();
    await expect(copyButton).toContainText(/\u5df2\u590d\u5236/);
    const copiedPreviewText = await readCapturedClipboardText(page);
    expect(copiedPreviewText).toContain(customSourceTopic);
    expect(copiedPreviewText).toContain(`#${expectedTags[0]}`);

    expect(generationRequests.providerStatus).toBeGreaterThan(0);
    expect(generationRequests.contentList).toBeGreaterThan(0);
    expect(generationRequests.sourcePreview).toHaveLength(1);
    expect(generationRequests.contentGenerate).toHaveLength(1);
    expect(generationRequests.imageGenerate).toHaveLength(1);
    expect(generationRequests.rewrite).toHaveLength(0);
    expect(generationRequests.forbiddenPublishing).toEqual([]);
    expect(generationRequests.sourcePreview[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.contentGenerate[0]).toMatchObject({
      knowledge_limit: 5,
      knowledge_query: customSourceTopic,
      platform: "xiaohongshu",
      tags: expectedTags,
      target_audience: expectedAudience,
      topic: customSourceTopic
    });
    expect(generationRequests.imageGenerate[0]).toMatchObject({
      aspect_ratio: "3:4",
      content_id: E2E_PC_OFFICIAL_LOGO_PRICE_TOPIC_CONTENT_ID,
      template: "xiaohongshu-cover"
    });
    expect(String(generationRequests.imageGenerate[0].style_notes)).not.toContain(
      requireTopicPreset("source-logo-price").coverDirection
    );
    expect(await localStorageContains(page, acceptedLogin.password)).toBe(false);
  });

  test("PC published generation status stops at manual lifecycle review", async ({ page }, testInfo) => {
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
    const pcLifecycleWarningBox = await page.getByTestId("pc-export-lifecycle-warning").boundingBox();
    expect(pcLifecycleWarningBox?.width ?? 0).toBeGreaterThan(360);
    expect(pcLifecycleWarningBox?.height ?? 0).toBeGreaterThan(44);
    await expect(page.getByTestId("cover-generate-button")).toBeDisabled();
    await expect(page.getByTestId("cover-generate-button")).toContainText("需先核对状态");
    await expect(page.getByTestId("pc-export-copy-button")).toBeDisabled();
    await expect(page.getByTestId("pc-export-copy-button")).toContainText("需先核对状态");
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("发布前检查");
    await expect(page.getByTestId("pc-export-cover-card")).toContainText(
      "生成后只是待确认素材，不会自动发布。"
    );
    await attachScreenshotEvidence(page, testInfo, "pc-published-lifecycle-warning.png", {
      minBytes: 20_000,
      minHeight: 700,
      minWidth: 1000
    });

    const draftCard = page.getByTestId("draft-history-card").filter({ hasText: preset.topic }).first();
    await expect(page.getByTestId("draft-history-strip")).toBeVisible();
    await expect(draftCard).toBeVisible();
    await draftCard.locator("button").first().click();

    const previewModal = page.getByTestId("xhs-preview-modal");
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText(preset.topic);
    await expect(previewModal).toContainText(`#${expectedTags[0]}`);
    await expect(previewModal).toContainText("这是发布效果预览，不会自动发布");
    await expect(page.getByTestId("pc-preview-modal-lifecycle-warning")).toContainText(
      "后端返回状态为「已发布」"
    );
    await expect(page.getByTestId("pc-preview-modal-copy-button")).toBeDisabled();
    await expect(page.getByTestId("pc-preview-modal-copy-button")).toContainText("需先核对状态");

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

  test("PC schema-invalid draft failure gives recovery copy without false draft", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const acceptedLogin = createLoginInput();
    const preset = requireTopicPreset("timeline-main");
    const expectedTags = parseTagText(preset.tags);
    await mockSuccessfulLogin(page, acceptedLogin.account);
    const generationRequests = await mockPcGenerationFixture(page, preset, {
      contentId: E2E_PC_CONTENT_FAILURE_CONTENT_ID,
      failContent: true,
      failContentDetail:
        "草稿正文过短，无法覆盖选题、受众、行动建议和人工核对提醒，请补充素材后重新生成。"
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
    await expect(page.getByText("生成结果需要补救：请补充业务素材")).toBeVisible();
    await expect(page.getByText("草稿正文过短，无法覆盖选题、受众、行动建议和人工核对提醒")).toBeVisible();
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
    await expect(page.getByTestId("pc-export-prepublish-check")).toContainText("发布前检查");
    await expect(page.getByTestId("pc-export-prepublish-checklist")).toBeVisible();
    await expect(page.getByTestId("pc-export-prepublish-check-cover")).toContainText("需补充");
    await expect(page.getByTestId("pc-export-prepublish-check-cover")).toContainText(
      "封面尚未生成或不可用"
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

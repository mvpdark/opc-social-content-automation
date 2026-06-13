import { sanitizeServiceErrorMessage } from "./service-error-copy";

export type ProviderStatusItem = {
  configured: boolean;
  model: string | null;
  name: string;
  note: string;
  provider: string;
  status: string;
};

export function sanitizeProviderStatusItems(statuses: ProviderStatusItem[]) {
  return statuses.map((item) => ({
    ...item,
    note: sanitizeServiceErrorMessage(item.note)
  }));
}

export type ProviderBindingDefaults = {
  draft: boolean;
  image: boolean;
  rewrite: boolean;
  webSearch: boolean;
};

export type ProviderKeyCredentials = {
  draftApiKey: string;
  imageApiKey: string;
  rewriteApiKey: string;
};

export function providerBindingDefaultsFromStatuses(
  statuses: ProviderStatusItem[]
): ProviderBindingDefaults {
  const draftStatus = statuses.find((item) => item.name === "Draft generation");
  const imageStatus = statuses.find((item) => item.name === "Image generation");
  const rewriteStatus = statuses.find((item) => item.name === "Humanization rewrite");
  const webSearchStatus = statuses.find((item) => item.name === "Web search");

  return {
    draft: Boolean(draftStatus?.configured && draftStatus.provider !== "codex_test"),
    image: Boolean(imageStatus?.configured && imageStatus.provider !== "codex_test"),
    rewrite: Boolean(rewriteStatus?.configured),
    webSearch: Boolean(webSearchStatus?.configured && webSearchStatus.provider === "tavily")
  };
}

export function providerKeyUpdatePayload(credentials: ProviderKeyCredentials) {
  const payload: Record<string, string> = {};
  const draftApiKey = credentials.draftApiKey.trim();
  const imageApiKey = credentials.imageApiKey.trim();
  const rewriteApiKey = credentials.rewriteApiKey.trim();

  if (draftApiKey) {
    payload.draft_api_key = draftApiKey;
  }
  if (imageApiKey) {
    payload.image_api_key = imageApiKey;
  }
  if (rewriteApiKey) {
    payload.deepseek_api_key = rewriteApiKey;
  }

  return payload;
}

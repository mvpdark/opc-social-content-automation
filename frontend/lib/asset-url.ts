import { getApiBase } from "@/lib/api-base";

export function resolveAssetUrl(assetUrl: string, apiBase = getApiBase()) {
  const normalizedUrl = assetUrl.trim();
  if (!normalizedUrl) {
    return "";
  }
  if (/^(https?:|data:|blob:|file:)/i.test(normalizedUrl)) {
    return normalizedUrl;
  }
  if (normalizedUrl.startsWith("//")) {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
    return `${protocol}${normalizedUrl}`;
  }

  const baseUrl = new URL(apiBase);
  return `${baseUrl.origin}${normalizedUrl.startsWith("/") ? normalizedUrl : `/${normalizedUrl}`}`;
}

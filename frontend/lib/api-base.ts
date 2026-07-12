const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "60001";
const DEFAULT_LOCAL_API_BASE = `http://localhost:${DEFAULT_API_PORT}/api`;
const DEFAULT_ZSCJ_API_PORT = process.env.NEXT_PUBLIC_ZSCJ_API_PORT ?? "60002";
const DEFAULT_LOCAL_ZSCJ_API_BASE = `http://localhost:${DEFAULT_ZSCJ_API_PORT}/api/v1`;


function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}


function normalizedHostname(hostname: string) {
  return hostname.trim().toLowerCase();
}


function isLoopbackHostname(hostname: string) {
  const normalized = normalizedHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}


export function isLocalOrPrivateHostname(hostname: string) {
  const normalized = normalizedHostname(hostname);
  return (
    isLoopbackHostname(normalized) ||
    normalized === "0.0.0.0" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}


function resolveConfiguredApiBase(
  configuredApiBase: string,
  browserHostname: string,
  browserOrigin?: string,
  browserProtocol?: string,
) {
  const normalizedBase = trimTrailingSlash(configuredApiBase);
  const protocol = browserProtocol ?? "https:";

  try {
    const url = new URL(normalizedBase);
    const configuredIsLocalOrPrivate = isLocalOrPrivateHostname(url.hostname);

    // 配置的是公网地址，但浏览器在本地访问 → 用浏览器地址+默认端口
    if (!configuredIsLocalOrPrivate && isLocalOrPrivateHostname(browserHostname)) {
      const localUrl = new URL(`${protocol}//${browserHostname || "localhost"}`);
      localUrl.port = DEFAULT_API_PORT;
      localUrl.pathname = "/api";
      localUrl.search = "";
      localUrl.hash = "";
      return trimTrailingSlash(localUrl.toString());
    }

    // 配置的是本地地址，但浏览器从公网访问 → 用浏览器 origin（保持 protocol 一致）
    // 等价于 return `${browserOrigin}/api`
    if (
      configuredIsLocalOrPrivate &&
      !isLocalOrPrivateHostname(browserHostname) &&
      browserOrigin
    ) {
      const originUrl = new URL(browserOrigin);
      originUrl.pathname = "/api";
      originUrl.search = "";
      originUrl.hash = "";
      return trimTrailingSlash(originUrl.toString());
    }

    // loopback 配置但浏览器在局域网 IP → 替换 hostname，保持 protocol 和端口
    const shouldUseBrowserHost =
      isLoopbackHostname(url.hostname) &&
      isLocalOrPrivateHostname(browserHostname) &&
      !isLoopbackHostname(browserHostname);

    if (shouldUseBrowserHost) {
      url.hostname = browserHostname;
      url.protocol = protocol;
      return trimTrailingSlash(url.toString());
    }
  } catch {
    return normalizedBase;
  }

  return normalizedBase;
}


export function getApiBase() {
  const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (typeof window === "undefined") {
    return trimTrailingSlash(configuredApiBase ?? DEFAULT_LOCAL_API_BASE);
  }

  const { hostname, origin, protocol } = window.location;
  if (configuredApiBase) {
    return resolveConfiguredApiBase(configuredApiBase, hostname, origin, protocol);
  }

  if (!isLocalOrPrivateHostname(hostname)) {
    return `${origin}/api`;
  }

  return `${protocol}//${hostname || "localhost"}:${DEFAULT_API_PORT}/api`;
}

/**
 * 获取 OMPC-ZSCJ（知识库与趋势采集）项目的 API base URL。
 * knowledge/trends 端点已从 OMPC-SSB 迁移至独立的 OMPC-ZSCJ 项目，
 * 前端调用这些端点时需使用此函数获取正确的 API 地址。
 */
export function getZscjApiBase() {
  const configuredApiBase = process.env.NEXT_PUBLIC_ZSCJ_API_BASE_URL;

  if (typeof window === "undefined") {
    return trimTrailingSlash(configuredApiBase ?? DEFAULT_LOCAL_ZSCJ_API_BASE);
  }

  const { hostname, origin, protocol } = window.location;
  if (configuredApiBase) {
    return resolveConfiguredApiBase(configuredApiBase, hostname, origin, protocol);
  }

  if (!isLocalOrPrivateHostname(hostname)) {
    return `${origin}/zscj/api/v1`;
  }

  return `${protocol}//${hostname || "localhost"}:${DEFAULT_ZSCJ_API_PORT}/api/v1`;
}

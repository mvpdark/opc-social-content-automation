const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8010";
const DEFAULT_LOCAL_API_BASE = `http://localhost:${DEFAULT_API_PORT}/api`;


function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}


function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}


function isLocalOrPrivateHostname(hostname: string) {
  return (
    isLoopbackHostname(hostname) ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}


function resolveConfiguredApiBase(
  configuredApiBase: string,
  browserHostname: string,
  browserOrigin?: string,
) {
  const normalizedBase = trimTrailingSlash(configuredApiBase);

  try {
    const url = new URL(normalizedBase);
    const configuredIsLocalOrPrivate = isLocalOrPrivateHostname(url.hostname);

    if (
      configuredIsLocalOrPrivate &&
      !isLocalOrPrivateHostname(browserHostname) &&
      browserOrigin
    ) {
      return `${browserOrigin}/api`;
    }

    const shouldUseBrowserHost =
      isLoopbackHostname(url.hostname) &&
      isLocalOrPrivateHostname(browserHostname) &&
      !isLoopbackHostname(browserHostname);

    if (shouldUseBrowserHost) {
      url.hostname = browserHostname;
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
    return resolveConfiguredApiBase(configuredApiBase, hostname, origin);
  }

  if (!isLocalOrPrivateHostname(hostname)) {
    return `${origin}/api`;
  }

  return `${protocol}//${hostname || "localhost"}:${DEFAULT_API_PORT}/api`;
}

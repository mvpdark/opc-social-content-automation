const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8010";
const DEFAULT_LOCAL_API_BASE = `http://localhost:${DEFAULT_API_PORT}/api`;


function isLocalOrPrivateHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}


export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_API_BASE;
  }

  const { hostname, origin, protocol } = window.location;
  if (!isLocalOrPrivateHostname(hostname)) {
    return `${origin}/api`;
  }

  return `${protocol}//${hostname || "localhost"}:${DEFAULT_API_PORT}/api`;
}

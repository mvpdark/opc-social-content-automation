const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8010";
const DEFAULT_LOCAL_API_BASE = `http://localhost:${DEFAULT_API_PORT}/api`;


export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_API_BASE;
  }

  const { hostname, protocol } = window.location;
  return `${protocol}//${hostname || "localhost"}:${DEFAULT_API_PORT}/api`;
}

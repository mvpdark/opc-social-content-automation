import { NextRequest, NextResponse } from "next/server";


const mobileUserAgentPattern =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;


function requestedTerminal(request: NextRequest) {
  const value =
    request.nextUrl.searchParams.get("terminal") ??
    request.nextUrl.searchParams.get("device") ??
    request.nextUrl.searchParams.get("view");
  return value?.toLowerCase() ?? null;
}


function isMobileTerminal(request: NextRequest) {
  const forcedTerminal = requestedTerminal(request);
  if (forcedTerminal === "android" || forcedTerminal === "mobile") {
    return true;
  }
  if (forcedTerminal === "pc" || forcedTerminal === "desktop") {
    return false;
  }

  const uaMobile = request.headers.get("sec-ch-ua-mobile") === "?1";
  const userAgent = request.headers.get("user-agent") ?? "";
  return uaMobile || mobileUserAgentPattern.test(userAgent);
}


export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 移动端访问首页 → 重定向到 /android（不带 query string，避免参数泄漏）
  if (pathname === "/") {
    if (!isMobileTerminal(request)) {
      return NextResponse.next();
    }

    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/android";
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }

  // PC 直接访问 /android → 重定向回首页
  if (pathname === "/android" || pathname.startsWith("/android/")) {
    if (isMobileTerminal(request)) {
      return NextResponse.next();
    }

    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}


export const config = {
  matcher: ["/", "/android/:path*"]
};

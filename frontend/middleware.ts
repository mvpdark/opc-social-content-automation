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
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  if (!isMobileTerminal(request)) {
    return NextResponse.next();
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = "/android";
  return NextResponse.redirect(nextUrl);
}


export const config = {
  matcher: ["/"]
};

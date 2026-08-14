import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "retail_session";
const protectedPrefixes = ["/overview", "/branches", "/products", "/inventory", "/pos", "/reports", "/sales", "/transfers", "/team", "/audit", "/settings"];

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (isProtected && !hasSession) return NextResponse.redirect(new URL("/login", request.url));
  const requestHeaders = new Headers(request.headers);
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"] };

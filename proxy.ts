import { NextResponse, NextRequest } from "next/server";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

// Edge-level cookie *presence* check only — no signature verification, so this
// is a UX guard that stops private shells painting for signed-out visitors.
// Real enforcement lives in the API routes (lib/requireAuth.ts).
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Let the client handle auth pages so it can redirect by role.
  if (isAuthPage) {
    return NextResponse.next();
  }

  if (!req.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Every private route, not just a subset. Keep in step with app/(private).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/links/:path*",
    "/media/:path*",
    "/products/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};

// middleware.ts
import { NextResponse, NextRequest } from "next/server";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

// Public routes that don't need authentication
const publicRoutes = ["/", "/about"];

export async function middleware(req: NextRequest) {
  console.log("Middleware hit");
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(REFRESH_TOKEN_COOKIE_NAME);
  const hasToken = !!token?.value;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  const isProtectedPage = pathname.startsWith("/dashboard");

  // Allow public routes
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Case 1: User is on an auth page (login/register)
  if (isAuthPage) {
    if (hasToken) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Case 2: User is on a protected page (dashboard)
  if (isProtectedPage) {
    if (!hasToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // For other pages, require authentication by default
  if (!hasToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/profile/:path*"],
};

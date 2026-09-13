// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDb from "@/lib/db";
import { verifyRefreshToken } from "@/lib/auth";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  revokeSession,
  clearSessionCookie,
} from "@/lib/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME);

    // 1. Check if the refresh token cookie exists
    if (tokenCookie) {
      const refreshTokenString = tokenCookie.value;

      try {
        const payload = verifyRefreshToken(refreshTokenString);

        // 2. If the token is valid, revoke just this device's session
        if (payload) {
          await connectToDb();
          await revokeSession(payload.jti);
        }
      } catch (verifyError) {
        // Token verification failed, but we still want to clear the cookie
        console.warn("[AUTH_LOGOUT] Invalid token during logout:", verifyError);
      }
    }

    // 3. Delete the cookie using Next.js 15 cookies API
    await clearSessionCookie();

    // 4. Return success
    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_LOGOUT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

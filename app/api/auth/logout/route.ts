// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDb from "@/lib/db";
import RefreshToken from "@/models/RefreshToken";
import { verifyRefreshToken } from "@/lib/auth";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME);

    // 1. Check if the refresh token cookie exists
    if (tokenCookie) {
      const refreshTokenString = tokenCookie.value;

      try {
        const payload = verifyRefreshToken(refreshTokenString);

        // 2. If the token is valid, revoke it from the database
        if (payload) {
          await connectToDb();
          await RefreshToken.deleteOne({ jti: payload.jti });
        }
      } catch (verifyError) {
        // Token verification failed, but we still want to clear the cookie
        console.warn("[AUTH_LOGOUT] Invalid token during logout:", verifyError);
      }
    }

    // 3. Delete the cookie using Next.js 15 cookies API
    cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME);

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

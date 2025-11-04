// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serialize } from "cookie";
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
      const payload = verifyRefreshToken(refreshTokenString);

      // 2. If the token is valid, revoke it from the database
      if (payload) {
        await connectToDb();
        await RefreshToken.deleteOne({ jti: payload.jti });
      }
    }

    // 3. Create a new cookie that is already expired to clear it
    const expiredCookie = serialize(REFRESH_TOKEN_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      expires: new Date(0), // Set expiration to a time in the past
    });

    // 4. Return success and set the expired cookie
    return NextResponse.json(
      { message: "Logged out successfully" },
      {
        status: 200,
        headers: { "Set-Cookie": expiredCookie },
      }
    );
  } catch (error) {
    console.error("[AUTH_LOGOUT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

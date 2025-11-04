// app/api/auth/refresh/route.ts
import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import {
  generateAccessToken,
  verifyRefreshToken,
  RefreshTokenPayload,
} from "@/lib/auth";
import { cookies } from "next/headers";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

export async function POST(req: NextRequest) {
  try {
    // 1. Get the refresh token from the httpOnly cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME);

    if (!tokenCookie) {
      return NextResponse.json(
        { error: "Unauthorized: No token" },
        { status: 401 }
      );
    }
    const refreshTokenString = tokenCookie.value;

    // 2. Verify the token's signature
    const payload: RefreshTokenPayload | null =
      verifyRefreshToken(refreshTokenString);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    // 3. Connect to DB
    await connectToDb();

    // 4. Check if the token is in our "allow-list"
    const tokenEntry = await RefreshToken.findOne({
      jti: payload.jti,
      user: payload.userId,
    });

    if (!tokenEntry) {
      return NextResponse.json(
        { error: "Unauthorized: Token has been revoked" },
        { status: 401 }
      );
    }

    // 5. Check if the token entry is expired
    if (new Date(tokenEntry.expires) < new Date()) {
      await RefreshToken.findByIdAndDelete(tokenEntry._id);
      return NextResponse.json(
        { error: "Unauthorized: Token expired" },
        { status: 401 }
      );
    }

    // 6. Get user details
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 7. Issue a new access token
    const newAccessToken = generateAccessToken({
      userId: user._id,
      email: user.email,
    });

    return NextResponse.json({ accessToken: newAccessToken }, { status: 200 });
  } catch (error) {
    // *** FIX: Removed the "Opening" typo ***
    console.error("[AUTH_REFRESH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

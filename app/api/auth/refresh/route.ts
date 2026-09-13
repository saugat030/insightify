// app/api/auth/refresh/route.ts
import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  RefreshTokenPayload,
} from "@/lib/auth";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  setSessionCookie,
  revokeFamily,
  classifyRefreshRow,
} from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME);

    if (!tokenCookie) {
      return NextResponse.json(
        { error: "Unauthorized: No token" },
        { status: 401 }
      );
    }

    const payload: RefreshTokenPayload | null = verifyRefreshToken(
      tokenCookie.value
    );
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    await connectToDb();

    const row = await RefreshToken.findOne({
      jti: payload.jti,
      user: payload.userId,
    });
    if (!row) {
      return NextResponse.json(
        { error: "Unauthorized: Token has been revoked" },
        { status: 401 }
      );
    }

    const { decision, cap } = classifyRefreshRow(row);

    if (decision === "expired") {
      await revokeFamily(row.family);
      await RefreshToken.findByIdAndDelete(row._id);
      return NextResponse.json(
        { error: "Unauthorized: Token expired" },
        { status: 401 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newAccessToken = () =>
      generateAccessToken({ userId: String(user._id), email: user.email });

    // The losing tab: hand back an access token but do NOT rotate and do NOT
    // touch the cookie — the winner already replaced it.
    if (decision === "grace") {
      return NextResponse.json(
        { accessToken: newAccessToken() },
        { status: 200 }
      );
    }

    if (decision === "reuse") {
      const revoked = await revokeFamily(row.family);
      console.warn(
        "[AUTH_REFRESH] Refresh-token reuse detected; revoked session family.",
        { user: String(user._id), revoked }
      );
      return NextResponse.json(
        { error: "Unauthorized: Token has been revoked" },
        { status: 401 }
      );
    }

    const { token: nextToken, jti: nextJti } = generateRefreshToken({
      userId: String(user._id),
    });

    // Atomic compare-and-set: whoever flips usedAt first owns the rotation.
    const claimed = await RefreshToken.findOneAndUpdate(
      { _id: row._id, usedAt: null },
      { usedAt: new Date(), replacedBy: nextJti }
    );
    if (!claimed) {
      // Lost the race to a concurrent refresh — same situation as the grace path.
      return NextResponse.json(
        { accessToken: newAccessToken() },
        { status: 200 }
      );
    }

    await RefreshToken.create({
      user: user._id,
      jti: nextJti,
      family: row.family,
      expires: cap,
      absoluteExpiresAt: cap,
    });

    await setSessionCookie(nextToken, cap);

    return NextResponse.json({ accessToken: newAccessToken() }, { status: 200 });
  } catch (error) {
    console.error("[AUTH_REFRESH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

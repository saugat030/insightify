import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import RefreshToken from "@/models/RefreshToken";
import { requireAuth } from "@/lib/requireAuth";
import { verifyRefreshToken } from "@/lib/auth";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_EXPIRATION_DAYS,
  revokeFamily,
  clearSessionCookie,
} from "@/lib/session";
import { describeUserAgent } from "@/lib/userAgent";

const DAY_MS = 24 * 60 * 60 * 1000;

// Which family the caller is browsing from. The access token carries no family,
// so it has to come from the refresh cookie.
async function currentFamily(userId: string): Promise<string | null> {
  const cookie = (await cookies()).get(REFRESH_TOKEN_COOKIE_NAME);
  if (!cookie) return null;
  const payload = verifyRefreshToken(cookie.value);
  if (!payload) return null;
  const row = await RefreshToken.findOne({
    jti: payload.jti,
    user: userId,
  }).select("family");
  return row?.family ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    // One live row per family, so this is exactly the active sessions.
    const rows = await RefreshToken.find({
      user: auth.userId,
      usedAt: null,
    }).sort({ createdAt: -1 });

    const current = await currentFamily(auth.userId);

    const sessions = rows.map((row) => ({
      family: row.family,
      device: describeUserAgent(row.userAgent ?? ""),
      // The cap is set once at login and never extended, so it dates the login.
      signedInAt: new Date(
        new Date(row.absoluteExpiresAt).getTime() -
          REFRESH_TOKEN_EXPIRATION_DAYS * DAY_MS
      ),
      // This row was minted by the most recent refresh on that session.
      lastActiveAt: row.createdAt,
      expiresAt: row.absoluteExpiresAt,
      current: row.family === current,
    }));

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error("[AUTH_SESSIONS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { family } = await req.json();
    if (!family || typeof family !== "string") {
      return NextResponse.json({ error: "family is required" }, { status: 400 });
    }

    // Scoped to the caller — without this, anyone could revoke anyone's session.
    const owned = await RefreshToken.findOne({ family, user: auth.userId });
    if (!owned) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Read before revoking — afterwards the row is gone and "current" would be
    // indistinguishable from "no cookie at all".
    const wasCurrent = (await currentFamily(auth.userId)) === family;
    const revoked = await revokeFamily(family);
    if (wasCurrent) await clearSessionCookie();

    return NextResponse.json(
      { success: true, revoked, wasCurrent },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_SESSIONS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

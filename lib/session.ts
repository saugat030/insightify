import { cookies } from "next/headers";
import RefreshToken from "@/models/RefreshToken";
import User from "@/models/User";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_EXPIRATION_DAYS = 30;

interface SessionUser {
  _id: unknown;
  email: string;
}

// The single place a session is minted, so the password and Google paths cannot
// drift apart in claim shape or cookie flags. See docs/AUTH-FIX.md §2.
export async function issueSession(user: SessionUser): Promise<string> {
  const userId = String(user._id);

  const accessToken = generateAccessToken({ userId, email: user.email });
  const { token: refreshTokenString, jti } = generateRefreshToken({ userId });

  const expires = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
  );

  // Deliberately uncapped: the TTL index bounds growth, and evicting by age
  // would kill stable sessions in favour of churn. See docs/AUTH-FIX.md §4.
  await RefreshToken.create({ user: user._id, jti, expires });

  const cookieStore = await cookies();
  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, refreshTokenString, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
    sameSite: "lax",
  });

  return accessToken;
}

// "Sign out of all devices". Also what a password change triggers, so a
// compromised session cannot outlive the password it was opened with.
export async function revokeAllSessions(userId: unknown): Promise<number> {
  const result = await RefreshToken.deleteMany({ user: userId });
  // Stamps the user so already-issued access tokens die now rather than at
  // their natural expiry — requireAuth() enforces it. See docs/AUTH-FIX.md §5.
  await User.updateOne({ _id: userId }, { sessionsRevokedAt: new Date() });
  return result.deletedCount ?? 0;
}

// Revokes one session by its jti — the handle carried in that browser's cookie.
export async function revokeSession(jti: string): Promise<void> {
  await RefreshToken.deleteOne({ jti });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME);
}

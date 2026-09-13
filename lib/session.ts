import { cookies } from "next/headers";
import { randomUUID } from "crypto";
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
  await RefreshToken.create({
    user: user._id,
    jti,
    family: randomUUID(),
    expires,
    // Equal to `expires` in v1; v2's idle window makes them differ.
    absoluteExpiresAt: expires,
  });

  await setSessionCookie(refreshTokenString, expires);
  return accessToken;
}

export async function setSessionCookie(
  token: string,
  expires: Date
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
    sameSite: "lax",
  });
}

// Revokes one rotation lineage — what detected token reuse triggers. Guarded
// because deleteMany({ family: undefined }) would match every legacy row.
export async function revokeFamily(family: unknown): Promise<number> {
  if (typeof family !== "string" || family.length === 0) return 0;
  const result = await RefreshToken.deleteMany({ family });
  return result.deletedCount ?? 0;
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

// Two tabs share one cookie jar, so both can refresh with the same token. The
// loser arrives holding a token the winner already consumed, which is
// indistinguishable from reuse without this window. See docs/AUTH-FIX.md §6.
export const ROTATION_GRACE_MS = 60 * 1000;

export type RefreshDecision = "expired" | "grace" | "reuse" | "rotate";

export interface RefreshRowShape {
  usedAt?: Date | null;
  expires: Date;
  absoluteExpiresAt?: Date | null;
}

// The whole rotation state machine, kept pure so it can be tested directly.
// Rows predating rotation carry no cap; their `expires` is already login+30d.
export function classifyRefreshRow(
  row: RefreshRowShape,
  now: Date = new Date(),
  graceMs: number = ROTATION_GRACE_MS
): { decision: RefreshDecision; cap: Date } {
  const cap = new Date(row.absoluteExpiresAt ?? row.expires);

  if (cap < now) return { decision: "expired", cap };
  if (!row.usedAt) return { decision: "rotate", cap };

  const sinceUse = now.getTime() - new Date(row.usedAt).getTime();
  return { decision: sinceUse <= graceMs ? "grace" : "reuse", cap };
}

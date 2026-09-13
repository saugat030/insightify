import { cookies } from "next/headers";
import RefreshToken from "@/models/RefreshToken";
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

  // Clears every other session for this user — see F10, still open.
  await RefreshToken.deleteMany({ user: user._id });
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

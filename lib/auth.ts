import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  iat?: number;
}
export interface RefreshTokenPayload {
  userId: string;
  jti: string;
}
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("Missing JWT_SECRET or JWT_REFRESH_SECRET in .env.local");
}

// A valid signature proves we minted the token, not that its claims are the
// right shape. These guards check the shape. See docs/AUTH-FIX.md §1.
function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== "object" || value === null) return false;
  const { userId, email } = value as Partial<AccessTokenPayload>;
  return (
    typeof userId === "string" &&
    userId.length > 0 &&
    typeof email === "string" &&
    email.length > 0
  );
}

function isRefreshTokenPayload(value: unknown): value is RefreshTokenPayload {
  if (typeof value !== "object" || value === null) return false;
  const { userId, jti } = value as Partial<RefreshTokenPayload>;
  return (
    typeof userId === "string" &&
    userId.length > 0 &&
    typeof jti === "string" &&
    jti.length > 0
  );
}

// Claim names only — the values are user identifiers.
function claimNames(payload: unknown): string[] {
  return typeof payload === "object" && payload !== null
    ? Object.keys(payload)
    : [];
}

export function generateAccessToken(payload: AccessTokenPayload) {
  // String() so a caller's ObjectId becomes a string claim explicitly.
  return jwt.sign(
    { userId: String(payload.userId), email: payload.email },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

//returns access token's payload or just returns null incase of invalid token.
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!isAccessTokenPayload(payload)) {
      console.warn(
        "[AUTH] Access token signature is valid but the claim shape is wrong. " +
          "Expected userId + email, got:",
        claimNames(payload)
      );
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

//Generates a long-lived Refresh Token JWT. the payload contains the userId and a unique token ID (jti).

export function generateRefreshToken(payload: { userId: string }): {
  token: string;
  jti: string;
} {
  const jti = randomUUID();
  const token = jwt.sign(
    {
      userId: String(payload.userId),
      jti,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );
  return { token, jti };
}

// verifies the refresh token JWT. returns the payload if the signature is valid.
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET);
    if (!isRefreshTokenPayload(payload)) {
      console.warn(
        "[AUTH] Refresh token signature is valid but the claim shape is wrong. " +
          "Expected userId + jti, got:",
        claimNames(payload)
      );
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

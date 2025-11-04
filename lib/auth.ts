// lib/auth.ts
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto"; // Node.js built-in

// --- Environment Variables ---
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("Missing JWT_SECRET or JWT_REFRESH_SECRET in .env.local");
}

// --- Interfaces ---
export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string; // jti (JWT ID), the unique token identifier
}

// --- Access Token ---
export function generateAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
  } catch (error) {
    return null;
  }
}

// --- Refresh Token ---
/**
 * Generates a long-lived Refresh Token JWT.
 * The payload contains the userId and a unique token ID (jti).
 */
export function generateRefreshToken(payload: { userId: string }): {
  token: string;
  jti: string;
} {
  const jti = randomUUID();
  const token = jwt.sign(
    {
      userId: payload.userId,
      jti,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: "30d" } // Long-lived
  );
  return { token, jti };
}

/**
 * Verifies the Refresh Token JWT.
 * Returns the payload if the signature is valid.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    return null;
  }
}

import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";

// Mongoose models here are untyped, so the document is `any` — the same as it
// was at every call site this helper replaces.
type UserDoc = any; // eslint-disable-line @typescript-eslint/no-explicit-any

type AuthOk = {
  ok: true;
  user: UserDoc;
  userId: string;
  payload: AccessTokenPayload;
};
type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

function fail(error: string, status: number): AuthFail {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

// An access token minted before the user's sessions were revoked is dead, even
// though its signature and expiry are still valid. `iat` is second-precision,
// so compare seconds: a token minted in the same second as the revocation
// survives, which is what lets change-password re-issue one immediately.
function isStale(payload: AccessTokenPayload, user: UserDoc): boolean {
  if (!user.sessionsRevokedAt) return false;
  if (typeof payload.iat !== "number") return true;
  return payload.iat < Math.floor(new Date(user.sessionsRevokedAt).getTime() / 1000);
}

// The single auth gate for API routes. Verifies the bearer token, loads the
// user, and rejects revoked sessions. See docs/AUTH-FIX.md §5.
export async function requireAuth(
  req: Request,
  opts: { withPassword?: boolean } = {}
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return fail("Unauthorized: No token provided", 401);
  }

  const payload = verifyAccessToken(authHeader.split(" ")[1]);
  if (!payload) {
    return fail("Unauthorized: Invalid or expired token", 401);
  }

  await connectToDb();
  const query = User.findById(payload.userId);
  const user = await (opts.withPassword ? query.select("+password") : query);

  if (!user) return fail("User not found", 404);
  if (isStale(payload, user)) return fail("Unauthorized: Session revoked", 401);

  return { ok: true, user, userId: String(user._id), payload };
}

// requireAuth plus a role check.
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin") {
    return fail("Forbidden: Admin access required", 403);
  }
  return auth;
}

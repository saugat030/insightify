import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { revokeAllSessions, clearSessionCookie } from "@/lib/session";

// "Sign out of all devices" — revokes every refresh-token row for the caller,
// including their own. See docs/AUTH-FIX.md §4.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const revoked = await revokeAllSessions(auth.userId);
    await clearSessionCookie();

    return NextResponse.json(
      { success: true, message: "Signed out of all devices", revoked },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_LOGOUT_ALL_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

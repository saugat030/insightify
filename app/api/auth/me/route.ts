import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  try {
    // password is select:false on the schema, so it is never loaded here
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    // Explicit projection — vault material and session bookkeeping are not the
    // client's business, and /api/vault serves the vault fields separately.
    const u = auth.user;
    return NextResponse.json(
      {
        _id: u._id,
        username: u.username,
        email: u.email,
        emailVerified: !!u.emailVerified,
        role: u.role,
        tier: u.tier,
        profilePicture: u.profilePicture ?? null,
        googleId: u.googleId ?? null,
        linksCreatedCount: u.linksCreatedCount,
        lastResetDate: u.lastResetDate,
        createdAt: u.createdAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

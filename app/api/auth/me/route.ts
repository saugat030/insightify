import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  try {
    // password is select:false on the schema, so it is never loaded here
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    // return the user data
    return NextResponse.json(auth.user, { status: 200 });
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

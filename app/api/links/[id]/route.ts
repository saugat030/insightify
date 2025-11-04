// app/api/links/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import Link from "@/models/Link";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";
import mongoose from "mongoose";

interface Params {
  params: { id: string };
}

// --- DELETE: Delete a specific link by its ID ---
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    // 1. Validate the ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid link ID" }, { status: 400 });
    }

    // 2. Verify Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 3. Connect to DB
    await connectToDb();

    // 4. Find the link
    const link = await Link.findById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // 5. *** CRITICAL: Verify Ownership ***
    // Ensure the link's user field matches the token's userId
    if (link.user.toString() !== payload.userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't own this link" },
        { status: 403 }
      );
    }

    // 6. Delete the link
    await Link.findByIdAndDelete(id);

    // 7. Return success
    return NextResponse.json(
      { message: "Link deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[LINKS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

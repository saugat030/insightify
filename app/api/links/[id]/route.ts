import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import Link from "@/models/Link";
import { requireAuth } from "@/lib/requireAuth";
import mongoose from "mongoose";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid link ID" }, { status: 400 });
    }

    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const link = await Link.findById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // verify ownership
    if (link.user.toString() !== auth.userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't own this link" },
        { status: 403 }
      );
    }

    // delete the link
    await Link.findByIdAndDelete(id);
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

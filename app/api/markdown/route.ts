import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import MarkdownDoc from "@/models/MarkdownDoc";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const docs = await MarkdownDoc.find({ user: auth.userId }).sort({ updatedAt: -1 });
    return NextResponse.json(docs, { status: 200 });
  } catch (error) {
    console.error("[MARKDOWN_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    
    const { title, content, encrypted, nonce } = await req.json();

    const newDoc = await MarkdownDoc.create({
      user: auth.userId,
      title: title || "markdown-1",
      content: content || "",
      // For encrypted docs `content` is ciphertext and `nonce` its base64 nonce.
      encrypted: !!encrypted,
      nonce: encrypted ? nonce ?? null : null,
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error: any) {
    console.error("[MARKDOWN_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    
    const { id, title, content, encrypted, nonce } = await req.json();

    if (!id) {
       return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // When a doc is encrypted, `content` is ciphertext and `nonce` is required;
    // toggling back to plaintext clears the nonce. Only set encryption fields
    // when the client provides `encrypted` so partial saves stay backward-safe.
    const update: Record<string, unknown> = {
      title,
      content,
      updatedAt: Date.now(),
    };
    if (encrypted !== undefined) {
      update.encrypted = !!encrypted;
      update.nonce = encrypted ? nonce ?? null : null;
    }

    const updatedDoc = await MarkdownDoc.findOneAndUpdate(
      { _id: id, user: auth.userId },
      update,
      { new: true }
    );

    if (!updatedDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(updatedDoc, { status: 200 });
  } catch (error: any) {
    console.error("[MARKDOWN_PUT_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
       return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deletedDoc = await MarkdownDoc.findOneAndDelete({ _id: id, user: auth.userId });

    if (!deletedDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[MARKDOWN_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

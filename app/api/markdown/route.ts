import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import MarkdownDoc from "@/models/MarkdownDoc";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Unauthorized access");
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    await connectToDb();
    const docs = await MarkdownDoc.find({ user: payload.userId }).sort({ updatedAt: -1 });
    return NextResponse.json(docs, { status: 200 });
  } catch (error) {
    console.error("[MARKDOWN_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    await connectToDb();
    
    const { title, content } = await req.json();
    
    const newDoc = await MarkdownDoc.create({
      user: payload.userId,
      title: title || "markdown-1",
      content: content || "",
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error: any) {
    console.error("[MARKDOWN_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    await connectToDb();
    
    const { id, title, content } = await req.json();
    
    if (!id) {
       return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updatedDoc = await MarkdownDoc.findOneAndUpdate(
      { _id: id, user: payload.userId },
      { title, content, updatedAt: Date.now() },
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    await connectToDb();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
       return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deletedDoc = await MarkdownDoc.findOneAndDelete({ _id: id, user: payload.userId });

    if (!deletedDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[MARKDOWN_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

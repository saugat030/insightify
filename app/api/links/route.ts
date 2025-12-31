import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import Link from "@/models/Link";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";
import { scrapeUrl } from "@/lib/scraper";
import { getAiAnalysis } from "@/lib/gemini";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
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
    await connectToDb();
    const links = await Link.find({ user: payload.userId }).sort({
      createdAt: -1,
    });

    return NextResponse.json(links, { status: 200 });
  } catch (error) {
    console.error("[LINKS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    await connectToDb();
    const user = await User.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found in db" },
        { status: 404 }
      );
    }
    if (user.tier === "free") {
      console.log("user seems to beon the free side.. Checking his quota");
      const freeUserLinks = await Link.countDocuments({ user: payload.userId });
      if (freeUserLinks >= 2) {
        return NextResponse.json(
          { error: "Free users cannot create more than 2 links" },
          { status: 403 }
        );
      }
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const { title, imageUrl, textContent } = await scrapeUrl(url);

    const { summary, tags } = await getAiAnalysis(textContent);

    const newLink = await Link.create({
      user: payload.userId,
      url,
      title,
      imageUrl,
      aiSummary: summary,
      aiTags: tags,
    });

    return NextResponse.json(newLink, { status: 201 });
  } catch (error: any) {
    console.error("[LINKS_POST_ERROR]", error);
    // Handle specific errors
    if (
      error.message.includes("scrape") ||
      error.message.includes("AI analysis")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

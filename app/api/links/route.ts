import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import Link from "@/models/Link";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";
import { scrapeUrl, ScrapeError } from "@/lib/scraper";
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
        { status: 401 },
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
      { status: 500 },
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
        { status: 401 },
      );
    }
    await connectToDb();
    const user = await User.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found in db" },
        { status: 404 },
      );
    }
    if (!user.canCreateLink()) {
      return NextResponse.json(
        {
          error: `${user.tier} tier limit reached. Please wait for the reset or upgrade.`,
        },
        { status: 403 },
      );
    }
    // (canCreateLink above is the single source of truth for the limits — the
    // duplicate hardcoded tier checks that used to sit here were unreachable.)
    const { url, category, keyword } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const { title, imageUrl, textContent } = await scrapeUrl(url);
    const { summary, tags, extraInfo } = await getAiAnalysis(textContent, category || "Other", keyword || "");

    const newLink = await Link.create({
      user: payload.userId,
      url,
      title,
      imageUrl,
      aiSummary: summary,
      aiTags: tags,
      category: category || "Other",
      keyword: keyword || "",
      aiExtraInfo: extraInfo || "",
    });
    // Persist the quota usage on the same document canCreateLink() inspected,
    // so a rolled-over window (linksCreatedCount + lastResetDate) is saved too.
    // A bare $inc here would never write lastResetDate and the limit would
    // silently stop being enforced.
    await user.recordLinkCreated();

    return NextResponse.json(newLink, { status: 201 });
  } catch (error: unknown) {
    console.error("[LINKS_POST_ERROR]", error);

    // Scraping failures are the user's problem to act on (bad link, blocked
    // site, paywall), so pass the specific reason through instead of a generic
    // message. 422 = we understood the request but couldn't process that page.
    if (error instanceof ScrapeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "invalid_url" ? 400 : 422 },
      );
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("AI analysis")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

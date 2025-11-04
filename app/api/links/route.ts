// app/api/links/route.ts
import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import Link from "@/models/Link";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";
import { scrapeUrl } from "@/lib/scraper";
import { getAiAnalysis } from "@/lib/gemini";

// --- GET: Fetch all links for the logged-in user ---
export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authentication
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

    // 2. Connect to DB
    await connectToDb();

    // 3. Fetch links for the user
    const links = await Link.find({ user: payload.userId }).sort({
      createdAt: -1,
    }); // Sort by newest first

    // 4. Return the links
    return NextResponse.json(links, { status: 200 });
  } catch (error) {
    console.error("[LINKS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// --- POST: Create a new link ---
export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication
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

    // 2. Validate Request Body
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // 3. Connect to DB
    await connectToDb();

    // 4. Scrape the URL
    // This is the function we built in `lib/scraper.ts`
    const { title, imageUrl, textContent } = await scrapeUrl(url);

    // 5. Get AI Analysis
    // This is the function we built in `lib/gemini.ts`
    const { summary, tags } = await getAiAnalysis(textContent);

    // 6. Save the new link to the database
    const newLink = await Link.create({
      user: payload.userId,
      url,
      title,
      imageUrl,
      aiSummary: summary,
      aiTags: tags,
    });

    // 7. Return the newly created link
    return NextResponse.json(newLink, { status: 201 }); // 201 Created
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

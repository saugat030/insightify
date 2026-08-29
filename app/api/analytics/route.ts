import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import connectToDb from "@/lib/db";
import Link from "@/models/Link";
import MarkdownDoc from "@/models/MarkdownDoc";
import User from "@/models/User";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";
import {
  DAY_MS,
  WEEK_MS,
  TIER_LIMITS,
  TREND_DAYS,
  dailyGroupStage,
  fillDailySeries,
} from "@/lib/analytics";

// Analytics for the signed-in user.
//
// Everything returned here is derived from data we actually store (Link,
// MarkdownDoc, User) — there are no synthetic metrics. If a number can't be
// computed from the schema, it isn't reported.
//
// Note on encrypted documents: we can count them and read their timestamps,
// but never their contents — the server only holds ciphertext.

function authUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const payload: AccessTokenPayload | null = verifyAccessToken(token);
  return payload?.userId ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const userIdStr = authUserId(req);
    if (!userIdStr) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDb();

    const userId = new mongoose.Types.ObjectId(userIdStr);
    const since = new Date(Date.now() - (TREND_DAYS - 1) * DAY_MS);

    const user = await User.findById(userId).select(
      "username email tier vaultEnabled linksCreatedCount lastResetDate createdAt",
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [
      totalLinks,
      totalDocs,
      encryptedDocs,
      linksByDay,
      topTags,
      categories,
      recentLinks,
      recentDocs,
    ] = await Promise.all([
      Link.countDocuments({ user: userId }),
      MarkdownDoc.countDocuments({ user: userId }),
      MarkdownDoc.countDocuments({ user: userId, encrypted: true }),

      // links created per day over the trend window
      Link.aggregate([
        { $match: { user: userId, createdAt: { $gte: since } } },
        dailyGroupStage("createdAt"),
        { $sort: { _id: 1 } },
      ]),

      // most frequent AI-generated tags
      Link.aggregate([
        { $match: { user: userId } },
        { $unwind: "$aiTags" },
        { $group: { _id: "$aiTags", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 8 },
      ]),

      // saved links by category
      Link.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 },
      ]),

      Link.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title url category createdAt imageUrl"),

      // titles are plaintext even for encrypted docs; content never is
      MarkdownDoc.find({ user: userId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("title updatedAt encrypted"),
    ]);

    // Mirror User.canCreateLink() read-only: the stored counter is stale once
    // the window has elapsed, so report it as reset without writing.
    const tier = (user.tier as string) || "free";
    const resetWindow = tier === "pro" ? DAY_MS : WEEK_MS;
    const lastReset = user.lastResetDate
      ? new Date(user.lastResetDate).getTime()
      : Date.now();
    const windowElapsed = Date.now() - lastReset >= resetWindow;
    const used = windowElapsed ? 0 : user.linksCreatedCount || 0;
    const limit = TIER_LIMITS[tier] ?? 0;

    return NextResponse.json(
      {
        profile: {
          username: user.username,
          email: user.email,
          tier,
          vaultEnabled: !!user.vaultEnabled,
          memberSince: user.createdAt,
        },
        totals: {
          links: totalLinks,
          documents: totalDocs,
          encryptedDocuments: encryptedDocs,
          tags: topTags.length,
        },
        quota: {
          used,
          limit,
          remaining: Math.max(0, limit - used),
          // window restarts from the last reset, or now if it already elapsed
          resetsAt: new Date(
            (windowElapsed ? Date.now() : lastReset) + resetWindow,
          ),
          windowLabel: tier === "pro" ? "day" : "week",
        },
        linksOverTime: fillDailySeries(linksByDay, TREND_DAYS),
        topTags: topTags.map((t) => ({ tag: t._id, count: t.count })),
        categories: categories.map((c) => ({
          category: c._id || "Other",
          count: c.count,
        })),
        recentLinks,
        recentDocuments: recentDocs,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ANALYTICS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

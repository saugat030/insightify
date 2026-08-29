import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import Link from "@/models/Link";
import MarkdownDoc from "@/models/MarkdownDoc";
import RefreshToken from "@/models/RefreshToken";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";
import {
  DAY_MS,
  TREND_DAYS,
  dailyGroupStage,
  fillDailySeries,
} from "@/lib/analytics";

// Platform-wide analytics for admins.
//
// Like the user endpoint, every figure here comes from a real collection —
// User, Link, MarkdownDoc and RefreshToken. Nothing is synthesised.
//
// We report how many documents are encrypted, never what they contain: the
// server only ever stores { nonce, ciphertext } for those.

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectToDb();

    const requester = await User.findById(payload.userId).select("role");
    if (!requester || requester.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const since = new Date(Date.now() - (TREND_DAYS - 1) * DAY_MS);
    const now = new Date();

    const [
      totalUsers,
      totalLinks,
      totalDocs,
      encryptedDocs,
      activeSessions,
      admins,
      proUsers,
      googleUsers,
      vaultUsers,
      signupsByDay,
      linksByDay,
      topCategories,
      topTags,
      topUsers,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({}),
      Link.countDocuments({}),
      MarkdownDoc.countDocuments({}),
      MarkdownDoc.countDocuments({ encrypted: true }),

      // a live session == a refresh token that hasn't expired yet
      RefreshToken.countDocuments({ expires: { $gt: now } }),

      User.countDocuments({ role: "admin" }),
      User.countDocuments({ tier: "pro" }),
      User.countDocuments({ googleId: { $exists: true, $ne: null } }),
      User.countDocuments({ vaultEnabled: true }),

      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        dailyGroupStage("createdAt"),
        { $sort: { _id: 1 } },
      ]),

      Link.aggregate([
        { $match: { createdAt: { $gte: since } } },
        dailyGroupStage("createdAt"),
        { $sort: { _id: 1 } },
      ]),

      Link.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 },
      ]),

      Link.aggregate([
        { $unwind: "$aiTags" },
        { $group: { _id: "$aiTags", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 8 },
      ]),

      // most active users by number of saved links
      Link.aggregate([
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 0,
            count: 1,
            username: "$user.username",
            email: "$user.email",
            tier: "$user.tier",
          },
        },
      ]),

      User.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("username email tier role createdAt googleId"),
    ]);

    return NextResponse.json(
      {
        totals: {
          users: totalUsers,
          links: totalLinks,
          documents: totalDocs,
          encryptedDocuments: encryptedDocs,
          activeSessions,
        },
        breakdown: {
          admins,
          regularUsers: totalUsers - admins,
          proUsers,
          freeUsers: totalUsers - proUsers,
          googleUsers,
          passwordUsers: totalUsers - googleUsers,
          vaultUsers,
        },
        signupsOverTime: fillDailySeries(signupsByDay, TREND_DAYS),
        linksOverTime: fillDailySeries(linksByDay, TREND_DAYS),
        topCategories: topCategories.map((c) => ({
          category: c._id || "Other",
          count: c.count,
        })),
        topTags: topTags.map((t) => ({ tag: t._id, count: t.count })),
        topUsers,
        recentUsers,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ADMIN_ANALYTICS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

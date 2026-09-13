import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAuth";
import connectToDb from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    // ---- Offset pagination + optional search ----
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10),
    );
    const search = (searchParams.get("search") || "").trim();

    // Build the query filter. When searching, match username OR email
    // (case-insensitive); escape regex metacharacters in the input.
    const filter: Record<string, unknown> = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      filter.$or = [{ username: regex }, { email: regex }];
    }

    const total = await User.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json(
      {
        success: true,
        message: "Users fetched successfully",
        data: users,
        pagination: { page, limit, total, totalPages },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { username, email, password, role, tier } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 },
      );
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 409 },
      );
    }

    const newUser = await User.create({
      username,
      email,
      password, // hashed by pre-save hook
      role: role || "user",
      tier: tier || "free",
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    return NextResponse.json(userObj, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

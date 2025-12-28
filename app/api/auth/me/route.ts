import { NextResponse, NextRequest } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // get the authorization header
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    // extract and verify the access token
    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }

    // connect to the database
    await connectToDb();

    // find the user and return their data
    // .select('-password') ensures the hashed password is never sent
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // return the user data
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

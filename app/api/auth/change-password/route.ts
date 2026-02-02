import { AccessTokenPayload, verifyAccessToken } from "@/lib/auth";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const token = authHeader.split(" ")[1];
    const payload: AccessTokenPayload | null = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    await connectToDb();
    // we need to explicitly select the password because it's set to select: false in the schema
    const user = await User.findById(payload.userId).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }
    const { oldPassword, newPassword } = await req.json();
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Old and new passwords are required" },
        { status: 400 },
      );
    }

    if (typeof newPassword !== "string" || newPassword.trim().length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be at least 8 characters long",
        },
        { status: 400 },
      );
    }

    // verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Incorrect old password" },
        { status: 401 },
      );
    }
    // update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();
    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[CHANGE_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

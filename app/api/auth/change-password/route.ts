import { requireAuth } from "@/lib/requireAuth";
import { issueSession, revokeAllSessions } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // withPassword because the field is select:false on the schema
    const auth = await requireAuth(req, { withPassword: true });
    if (!auth.ok) return auth.response;
    const { user } = auth;
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

    // A password change must not leave sessions opened under the old one alive.
    const revoked = await revokeAllSessions(user._id);
    // The caller keeps working: they get a brand-new session straight away.
    const accessToken = await issueSession(user);

    return NextResponse.json(
      {
        success: true,
        message: "Password updated successfully",
        accessToken,
        revokedSessions: revoked,
      },
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

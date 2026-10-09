import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { consumeOtp } from "@/lib/otpFlow";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import { issueSession, revokeAllSessions } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const limited = await rateLimit(req, LIMITS.otpVerifyIp);
    if (!limited.ok) return limited.response;

    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: "Email, code and new password are required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.trim().length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    await connectToDb();
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+otpHash +password");

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 400 }
      );
    }

    // Strength is checked before the code is spent, so a rejected password
    // does not cost the user their code.
    const strength = await checkPasswordStrength(newPassword, [
      user.email,
      user.username,
    ]);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    const result = await consumeOtp(user, String(code), "reset");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    user.password = newPassword; // pre-save hook re-hashes
    // Receiving the code proves control of the address.
    user.emailVerified = true;
    await user.save();

    // A reset is exactly the moment to evict whoever else was signed in.
    const revoked = await revokeAllSessions(user._id);
    const accessToken = await issueSession(user);

    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.otpHash;

    return NextResponse.json(
      {
        success: true,
        message: "Password updated",
        user: userObject,
        accessToken,
        revokedSessions: revoked,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

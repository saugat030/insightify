import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { otpMatches, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { clearOtp } from "@/lib/emailVerification";
import { issueSession } from "@/lib/session";

// One message for every failure mode, so this cannot be used to probe which
// addresses exist or which codes are close.
const INVALID = { error: "Invalid or expired code" };

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    await connectToDb();
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+otpHash");

    if (!user || !user.otpHash || !user.otpExpiresAt) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    if (new Date(user.otpExpiresAt) < new Date()) {
      clearOtp(user);
      await user.save();
      return NextResponse.json(INVALID, { status: 400 });
    }

    if ((user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
      clearOtp(user);
      await user.save();
      return NextResponse.json(
        { error: "Too many attempts. Request a new code." },
        { status: 429 }
      );
    }

    if (!(await otpMatches(String(code), user.otpHash))) {
      user.otpAttempts = (user.otpAttempts ?? 0) + 1;
      await user.save();
      return NextResponse.json(INVALID, { status: 400 });
    }

    user.emailVerified = true;
    clearOtp(user);
    await user.save();

    const accessToken = await issueSession(user);
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.otpHash;

    return NextResponse.json(
      { success: true, user: userObject, accessToken },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_VERIFY_OTP_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

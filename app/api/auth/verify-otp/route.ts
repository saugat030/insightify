import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { consumeOtp } from "@/lib/otpFlow";
import { issueSession } from "@/lib/session";

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

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 400 }
      );
    }

    const result = await consumeOtp(user, String(code), "verify");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    user.emailVerified = true;
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

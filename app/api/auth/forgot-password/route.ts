import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { issueOtp } from "@/lib/otpFlow";
import { sendMail } from "@/lib/mail";
import { noPasswordSetEmail } from "@/lib/otp";
import { LIMITS, rateLimit } from "@/lib/rateLimit";

// Identical answer whether the address is unknown, password-backed, or
// Google-only. The real answer goes to the inbox — telling the caller which
// case applies would undo F7.
const GENERIC_OK = {
  success: true,
  message: "If that account exists, a reset code is on its way.",
};

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const limited = await rateLimit(req, LIMITS.forgotIp, {
      rule: LIMITS.forgotAccount,
      subject: String(email),
    });
    if (!limited.ok) return limited.response;

    await connectToDb();
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+otpHash +password");

    if (!user) {
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    // Google-only accounts have nothing to reset; say so by email, not here.
    if (!user.password) {
      await sendMail({ to: user.email, ...noPasswordSetEmail() });
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    await issueOtp(user, "reset");
    return NextResponse.json(GENERIC_OK, { status: 200 });
  } catch (error) {
    console.error("[AUTH_FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { issueOtp } from "@/lib/otpFlow";

// Always the same answer, whether or not the address exists or is already
// verified — this endpoint must not become an account oracle.
const GENERIC_OK = {
  success: true,
  message: "If that account needs verifying, a new code is on its way.",
};

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectToDb();
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+otpHash");

    if (!user || user.emailVerified) {
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    const { sent, retryAfterMs } = await issueOtp(user, "verify");
    if (!sent) {
      return NextResponse.json(
        {
          error: "A code was just sent. Please wait before requesting another.",
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        },
        { status: 429 }
      );
    }

    return NextResponse.json(GENERIC_OK, { status: 200 });
  } catch (error) {
    console.error("[AUTH_RESEND_OTP_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

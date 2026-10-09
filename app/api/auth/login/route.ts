import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { issueSession } from "@/lib/session";
import { issueOtp } from "@/lib/otpFlow";
import { LIMITS, consume, resetLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/clientIp";
import bcrypt from "bcryptjs";

// Burned when the account does not exist, so a missing user costs the same
// bcrypt work as a wrong password. Cost 12, matching the User pre-save hook.
const DUMMY_HASH =
  "$2b$12$AObv5IHj72.4AqqTAcBKJOMPr2v5uBaEervMRHUmrE.uLUHbeMkFK";

export async function POST(req: Request) {
  try {
    // Checked before the body is even parsed — this is the endpoint under attack.
    const byIp = await consume(LIMITS.loginIp, clientIp(req));
    if (!byIp.ok) return byIp.response;

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const byAccount = await consume(LIMITS.loginAccount, String(email));
    if (!byAccount.ok) return byAccount.response;

    await connectToDb();
    //we need to manually select the password as well so that out this.password can be accessed from the user model.
    const user = await User.findOne({ email }).select("+password");

    // Exactly one compare runs on every path — including Google-only accounts,
    // which have no password at all.
    const matches = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !user.password || !matches) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Checked only after the password, so it reveals nothing to a guesser.
    if (!user.emailVerified) {
      await issueOtp(user, "verify");
      return NextResponse.json(
        {
          error: "Verify your email address to sign in. We've sent you a code.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Honest users who mistyped a few times should not stay penalised.
    await resetLimit(LIMITS.loginAccount, String(email));

    // mints both tokens, writes the jti allow-list row and sets the cookie
    const accessToken = await issueSession(user);

    // const { password, ...userWithoutPassword } = user.toObject();
    const userObject = user.toObject();
    delete userObject.password;

    // return the access token and user info
    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: userObject,
        accessToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

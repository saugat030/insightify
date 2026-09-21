import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import { issueEmailOtp } from "@/lib/emailVerification";
import { sendMail } from "@/lib/mail";
import { accountExistsEmail } from "@/lib/otp";

// Registration never reveals whether an email is already taken — the answer
// goes to the inbox instead. See docs/AUTH-FIX.md §9.
const GENERIC_OK = {
  success: true,
  message: "Check your inbox for a verification code.",
};

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const strength = await checkPasswordStrength(password, [email, username]);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    await connectToDb();
    const normalizedEmail = String(email).toLowerCase().trim();

    // Usernames are not secret, so collisions can be reported directly.
    const usernameTaken = await User.findOne({
      username,
      email: { $ne: normalizedEmail },
    });
    if (usernameTaken) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const existing = await User.findOne({ email: normalizedEmail }).select(
      "+otpHash"
    );

    if (existing?.emailVerified) {
      await sendMail({ to: normalizedEmail, ...accountExistsEmail() });
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    // An unverified record can be taken over by a later registration, otherwise
    // an abandoned signup would squat the address forever. Only once its code
    // has expired, so a registration still in flight cannot be hijacked.
    if (existing) {
      const inFlight =
        existing.otpExpiresAt && new Date(existing.otpExpiresAt) > new Date();
      if (!inFlight) {
        existing.username = username;
        existing.password = password; // pre-save hook re-hashes
        await existing.save();
      }
      await issueEmailOtp(existing);
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    const user = new User({
      username,
      email: normalizedEmail,
      password,
    });
    await user.save();
    await issueEmailOtp(user);

    return NextResponse.json(GENERIC_OK, { status: 200 });
  } catch (error) {
    console.error("[AUTH_REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

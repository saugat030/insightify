import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { issueSession } from "@/lib/session";
import bcrypt from "bcryptjs";

// Burned when the account does not exist, so a missing user costs the same
// bcrypt work as a wrong password. Cost 12, matching the User pre-save hook.
const DUMMY_HASH =
  "$2b$12$AObv5IHj72.4AqqTAcBKJOMPr2v5uBaEervMRHUmrE.uLUHbeMkFK";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

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

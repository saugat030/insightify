import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";

const REFRESH_TOKEN_EXPIRATION_DAYS = 30;
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

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
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 1. Generate Access Token (short-lived)
    const accessToken = generateAccessToken({
      userId: user._id,
      email: user.email,
    });

    // 2. Generate Refresh Token (long-lived) and its unique ID (jti)
    const { token: refreshTokenString, jti } = generateRefreshToken({
      userId: user._id,
    });

    const expires = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
    );

    // 3. Clear old refresh tokens for this user
    await RefreshToken.deleteMany({ user: user._id });

    // 4. Save the new jti (the allow-list entry) to the database
    await RefreshToken.create({
      user: user._id,
      jti: jti,
      expires: expires,
    });

    // 5. Set the Refresh Token in a secure cookie using Next.js 15 cookies API
    const cookieStore = await cookies();
    cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, refreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expires,
      sameSite: "lax", // Changed from "strict" for better compatibility
    });

    // 6. Return the access token and user info
    return NextResponse.json(
      {
        message: "Login successful",
        accessToken,
        user,
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

// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { serialize } from "cookie";

const REFRESH_TOKEN_EXPIRATION_DAYS = 30;
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

    // 3. Save the jti (the allow-list entry) to the database
    await RefreshToken.create({
      user: user._id,
      jti: jti,
      expires: expires,
    });

    // 4. Set the Refresh Token in a secure cookie
    const cookie = serialize(REFRESH_TOKEN_COOKIE_NAME, refreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expires,
      sameSite: "strict",
    });

    // 5. Return the access token and user info
    return NextResponse.json(
      {
        message: "Login successful",
        accessToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      },
      {
        status: 200,
        headers: { "Set-Cookie": cookie },
      }
    );
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

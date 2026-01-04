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
    //we need to manually select the password as well so that out this.password can be accessed from the user model.
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // generate Access Token
    const accessToken = generateAccessToken({
      userId: user._id,
      email: user.email,
    });

    // generate Refresh Token (long-lived) and its unique ID (jti)
    const { token: refreshTokenString, jti } = generateRefreshToken({
      userId: user._id,
    });

    const expires = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
    );

    // clear old refresh tokens for this user
    await RefreshToken.deleteMany({ user: user._id });

    // save the new jti (the allow-list entry) to the database
    await RefreshToken.create({
      user: user._id,
      jti: jti,
      expires: expires,
    });

    // naya next15 cookie syntax
    const cookieStore = await cookies();
    cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, refreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expires,
      sameSite: "lax", // changed from "strict" for better compatibility
    });

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

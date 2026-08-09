import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// The Google auth library needs exactly the same callback URL or 'postmessage' for headless flow
const oAuth2Client = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    // Exchange the auth code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Verify the id_token to get user info
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid Google token payload" },
        { status: 400 }
      );
    }

    const {
      email,
      name,
      picture,
      sub: googleId,
    } = payload;

    if (!email) {
      return NextResponse.json(
        { error: "Google account does not have an email" },
        { status: 400 }
      );
    }

    await connectToDb();

    // Check if user exists by email
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user using Google details
      user = new User({
        username: name || email.split("@")[0],
        email: email,
        googleId: googleId,
        profilePicture: picture || null,
        role: "user",
      });
      await user.save();
    } else {
      // If user exists but doesn't have googleId yet, we link them
      if (!user.googleId) {
        user.googleId = googleId;
        // Optional: update picture if they don't have one
        if (!user.profilePicture && picture) {
          user.profilePicture = picture;
        }
        await user.save();
      }
    }

    // Generate JWT access and refresh tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "7d" }
    );

    // Get cookie store
    const cookieStore = await cookies();

    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    const userObj = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      tier: user.tier,
      profilePicture: user.profilePicture,
    };

    return NextResponse.json({ accessToken, user: userObj }, { status: 200 });
  } catch (error: any) {
    console.error("Google Auth Error:", error.message);
    return NextResponse.json(
      { error: "Authentication with Google failed" },
      { status: 500 }
    );
  }
}

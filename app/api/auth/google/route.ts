import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import connectToDb from "@/lib/db";
import User from "@/models/User";
import { issueSession } from "@/lib/session";

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
      email_verified: googleEmailVerified,
    } = payload;

    if (!email) {
      return NextResponse.json(
        { error: "Google account does not have an email" },
        { status: 400 }
      );
    }

    // Without this an unverified Google address could claim a matching account.
    if (googleEmailVerified !== true) {
      return NextResponse.json(
        {
          error:
            "Your Google account's email address is not verified. " +
            "Verify it with Google, then try again.",
          code: "GOOGLE_EMAIL_UNVERIFIED",
        },
        { status: 403 }
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
        // Google just proved ownership of this address in the ID token.
        emailVerified: true,
      });
      await user.save();
    } else if (!user.googleId) {
      // Linking onto an existing account requires that account to have proved
      // the address too, otherwise whoever registered it first captures the
      // session. Password accounts stay unverified until the v2 OTP flow.
      if (!user.emailVerified) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. " +
              "Please sign in with your password.",
            code: "PASSWORD_ACCOUNT_EXISTS",
          },
          { status: 409 }
        );
      }

      user.googleId = googleId;
      // Optional: update picture if they don't have one
      if (!user.profilePicture && picture) {
        user.profilePicture = picture;
      }
      await user.save();
    } else if (!user.emailVerified) {
      // Already linked, but predates this check — record the proof Google gave.
      user.emailVerified = true;
      await user.save();
    }

    // same session issuer the password flow uses, so the two cannot drift
    const accessToken = await issueSession(user);

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

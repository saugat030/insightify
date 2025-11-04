// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import connectToDb from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    // 1. Get the request body
    const { username, email, password } = await req.json();

    // 2. Validate the input
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

    // 3. Connect to the database
    await connectToDb();

    // 4. Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 } // 409 Conflict
      );
    }

    // 5. Create and save the new user
    // The password will be hashed by the 'pre' hook in the User model
    const newUser = new User({
      username,
      email,
      password,
    });

    await newUser.save();

    // 6. Return a success response
    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 } // 201 Created
    );
  } catch (error) {
    console.error("[AUTH_REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

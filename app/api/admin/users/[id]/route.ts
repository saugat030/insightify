import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAuth";
import connectToDb from "@/lib/db";
import User from "@/models/User";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    //no need to unselect password by select(-password), model already handles that.
    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const { username, email, role, tier, password } = body;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update fields if provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (tier) user.tier = tier;
    if (password && password.trim().length >= 8) {
      user.password = password;
    } else if (password) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    await user.save();
    const updatedUser = user.toObject();
    delete updatedUser.password;

    return NextResponse.json(
      {
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    // Prevent an admin from deleting their own account.
    if (auth.user && String(auth.user._id) === String(id)) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 },
      );
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH is used for quick, single-field inline edits from the users table
// (tier and/or role) without opening the full edit dialog.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const { tier, role } = body;

    const validTiers = ["free", "pro"];
    const validRoles = ["admin", "user"];

    // At least one updatable field must be provided.
    if (tier === undefined && role === undefined) {
      return NextResponse.json(
        { error: "Nothing to update. Provide a 'tier' and/or 'role'." },
        { status: 400 },
      );
    }

    if (tier !== undefined && !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(", ")}` },
        { status: 400 },
      );
    }

    if (role !== undefined && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 },
      );
    }

    // Prevent an admin from demoting themselves (would lock them out of admin).
    if (
      role !== undefined &&
      role !== "admin" &&
      auth.user &&
      String(auth.user._id) === String(id)
    ) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 400 },
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (tier !== undefined) user.tier = tier;
    if (role !== undefined) user.role = role;
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    return NextResponse.json(
      {
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user (PATCH):", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

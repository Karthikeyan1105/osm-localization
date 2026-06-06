import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

// ── POST /api/auth/change-password ───────────────────────────────────────────
export async function POST(request: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only credentials users can change password
  if ((session.user as any).provider === "openstreetmap") {
    return NextResponse.json(
      { error: "OSM account users cannot change password here. Manage your password on openstreetmap.org." },
      { status: 400 }
    );
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = (session.user as any).id;

    let user = null;
    try {
      user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    } catch {
      user = await db.collection("users").findOne({ email: session.user.email });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Verify current password (support both plain-text legacy and bcrypt)
    const isBcryptHash = /^\$2[aby]\$/.test(user.password || "");
    let valid = false;
    if (isBcryptHash) {
      valid = await bcrypt.compare(currentPassword, user.password);
    } else {
      valid = user.password === currentPassword;
    }

    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { password: hashed, updatedAt: new Date() } });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("change-password error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

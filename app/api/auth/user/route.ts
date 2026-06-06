import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ── GET /api/auth/user — Return current user's profile ───────────────────────
export async function GET() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const userId = (session.user as any).id;

    // For OSM OAuth users, userId may be a string that isn't a valid ObjectId
    let user = null;
    try {
      user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });
    } catch {
      user = await db.collection("users").findOne({ email: session.user.email });
    }

    if (!user) {
      // Return session data if DB record not found (e.g., new OSM OAuth user)
      return NextResponse.json({
        id: userId,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        provider: (session.user as any).provider || "credentials",
        osmId: (session.user as any).osmId || null,
        osmDisplayName: (session.user as any).osmDisplayName || null,
        osmConnected: !!(session.user as any).osmId,
        createdAt: null,
      });
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image || session.user.image || null,
      provider: user.provider || "credentials",
      osmId: user.osmId || (session.user as any).osmId || null,
      osmDisplayName: user.osmDisplayName || (session.user as any).osmDisplayName || null,
      osmConnected: !!(user.osmId || (session.user as any).osmId),
      createdAt: user.createdAt || null,
    });
  } catch (error) {
    console.error("GET /api/auth/user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── PATCH /api/auth/user — Update display name ────────────────────────────────
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = (session.user as any).id;

    let result;
    try {
      result = await db
        .collection("users")
        .updateOne(
          { _id: new ObjectId(userId) },
          { $set: { name: name.trim(), updatedAt: new Date() } }
        );
    } catch {
      result = await db
        .collection("users")
        .updateOne(
          { email: session.user.email },
          { $set: { name: name.trim(), updatedAt: new Date() } }
        );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error) {
    console.error("PATCH /api/auth/user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions as any);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: any = {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: (session.user as any).image,
      provider: (session.user as any).provider || "credentials",
      osmId: (session.user as any).osmId || null,
      osmDisplayName: (session.user as any).osmDisplayName || null,
      osmChangesetCount: (session.user as any).osmChangesetCount || 0,
      osmAccountCreated: (session.user as any).osmAccountCreated || null,
    },
    osmProfile: null,
    recentChangesets: [],
    translationStats: null,
  };

  // If user logged in via OSM OAuth, fetch live data from OSM API
  const accessToken = (session as any).accessToken;
  if (accessToken && (session.user as any).provider === "openstreetmap") {
    try {
      // Fetch fresh OSM profile
      const profileRes = await fetch(
        "https://api.openstreetmap.org/api/0.6/user/details.json",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          next: { revalidate: 60 },
        }
      );
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const u = profileData.user;
        result.osmProfile = {
          id: u.id,
          displayName: u.display_name,
          accountCreated: u.account_created,
          description: u.description || "",
          image: u.img?.href || null,
          changesets: u.changesets?.count || 0,
          traces: u.traces?.count || 0,
          blocks: u.blocks?.received?.active || 0,
        };
      }

      // Fetch recent changesets
      if (result.osmProfile?.id) {
        const csRes = await fetch(
          `https://api.openstreetmap.org/api/0.6/changesets.json?user=${result.osmProfile.id}&limit=5`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            next: { revalidate: 30 },
          }
        );
        if (csRes.ok) {
          const csData = await csRes.json();
          result.recentChangesets = (csData.changesets || []).map((cs: any) => ({
            id: cs.id,
            createdAt: cs.created_at,
            closedAt: cs.closed_at,
            open: cs.open,
            changesCount: cs.changes_count,
            commentsCount: cs.comments_count,
            comment: cs.tags?.comment || "(no comment)",
          }));
        }
      }
    } catch (err) {
      console.error("OSM API fetch error:", err);
    }
  }

  // Fetch this user's translation stats from MongoDB
  try {
    const db = await (await clientPromise).db("osm");
    const translations = await db
      .collection("translations")
      .find({ userId: session.user.id })
      .toArray();

    const byLanguage: Record<string, number> = {};
    translations.forEach((t: any) => {
      byLanguage[t.languageCode] = (byLanguage[t.languageCode] || 0) + 1;
    });

    result.translationStats = {
      total: translations.length,
      byLanguage,
      recentActivity: translations
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((t: any) => ({
          id: t._id.toString(),
          languageCode: t.languageCode,
          value: t.value,
          createdAt: t.createdAt,
        })),
    };
  } catch (err) {
    console.error("MongoDB translation stats error:", err);
  }

  return NextResponse.json(result);
}

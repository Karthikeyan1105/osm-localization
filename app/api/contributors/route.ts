import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    
    // We fetch top contributors using translationCount
    const allContributors = await db.collection('users').find(
      { translationCount: { $gt: 0 } }
    ).sort({ translationCount: -1 }).limit(20).toArray();

    // Map them cleanly for the frontend
    const users = allContributors.map(user => ({
      id: user._id.toString(),
      name: user.name || "Anonymous Mapper",
      email: user.email,
      count: user.translationCount || 0,
      recentLanguage: user.recentLanguage || "General",
      lastActive: user.lastActive || user.createdAt
    }));

    // If nobody has translated yet computationally, return a blank array and the UI handles empty states.
    return NextResponse.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Contributors fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve contributors' }, { status: 500 });
  }
}

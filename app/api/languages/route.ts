import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    const rawLanguages = await db.collection("languages").find({}).sort({ progress: -1 }).toArray();
    const languages = rawLanguages.map(l => ({ ...l, id: l._id.toString() }));
    return NextResponse.json(languages);
  } catch (error) {
    console.error('Failed to fetch languages:', error);
    return NextResponse.json({ error: 'Failed to fetch languages' }, { status: 500 });
  }
}

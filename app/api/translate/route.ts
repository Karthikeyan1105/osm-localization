import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(request: Request) {
  try {
    const { sourceStringId, languageCode, value } = await request.json();

    if (!sourceStringId || !languageCode || !value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const language = await db.collection('languages').findOne({ code: languageCode });

    if (!language) {
      return NextResponse.json({ error: 'Language not found' }, { status: 404 });
    }

    const langIdStr = language._id.toString();

    // Create or update translation
    const translationCollection = db.collection('translations');
    const session = await getServerSession(authOptions as any);
    const userId = session?.user?.id || null;
    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Anonymous';

    await translationCollection.updateOne(
      { languageId: langIdStr, sourceStringId: sourceStringId },
      { 
        $set: { value, status: 'Pending', updatedAt: new Date(), userId, userName },
        $setOnInsert: { createdAt: new Date(), languageId: langIdStr, sourceStringId: sourceStringId, languageCode }
      },
      { upsert: true }
    );

    // Fetch the updated translation format
    const translation = await translationCollection.findOne({ languageId: langIdStr, sourceStringId: sourceStringId });

    // Update progress globally
    const totalStrings = await db.collection('sourceStrings').countDocuments();
    const translatedStrings = await translationCollection.countDocuments({ languageId: langIdStr });
    
    const progress = totalStrings > 0 ? Math.round((translatedStrings / totalStrings) * 100) : 0;
    
    await db.collection('languages').updateOne(
      { _id: new ObjectId(language._id) },
      { $set: { progress } }
    );

    // Update real user leaderboard!
    if (session?.user?.email) {
      await db.collection('users').updateOne(
        { email: session.user.email },
        { 
          $inc: { translationCount: 1 },
          $set: { 
            name: session.user.name || session.user.email.split('@')[0],
            recentLanguage: language.name, 
            lastActive: new Date() 
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json(translation);
  } catch (error) {
    console.error('Failed to save translation:', error);
    return NextResponse.json({ error: 'Failed to save translation' }, { status: 500 });
  }
}

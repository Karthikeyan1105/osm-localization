import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const langCode = searchParams.get('lang');

  if (!langCode) {
    return NextResponse.json({ error: 'Language code is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const language = await db.collection('languages').findOne({ code: langCode });

    if (!language) {
      return NextResponse.json({ error: 'Language not found' }, { status: 404 });
    }

    // Fetch strings and manually lookup translations for standard behavior
    const strings = await db.collection('sourceStrings').aggregate([
      {
        $lookup: {
          from: 'translations',
          let: { stringId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$sourceStringId', '$$stringId'] },
              { $eq: ['$languageId', language._id.toString()] }
            ]}}} 
          ],
          as: 'translations'
        }
      },
      {
        $addFields: { id: { $toString: '$_id' } }
      }
    ]).toArray();

    return NextResponse.json(strings);
  } catch (error) {
    console.error('Failed to fetch strings:', error);
    return NextResponse.json({ error: 'Failed to fetch strings' }, { status: 500 });
  }
}

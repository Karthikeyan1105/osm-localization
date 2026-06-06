import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

const OSM_API_BASE = 'https://api.openstreetmap.org/api/0.6';

async function fetchOsmElement(type: string, id: string) {
  const url = `${OSM_API_BASE}/${type}/${id}`;
  console.log("Fetching OSM element:", url);
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/xml',
      'User-Agent': 'OSM-Localize-App/1.0',
    }
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => 'no body');
    console.error("OSM fetch failed:", response.status, response.statusText, errText);
    throw new Error(`Failed to fetch element: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function createChangeset(accessToken: string, comment: string) {
  const xml = `
    <osm>
      <changeset>
        <tag k="created_by" v="OSM Localize App"/>
        <tag k="comment" v="${comment}"/>
      </changeset>
    </osm>
  `;
  const url = `${OSM_API_BASE}/changeset/create`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/xml',
    },
    body: xml,
  });

  if (!response.ok) {
    throw new Error(`Failed to create changeset: ${response.statusText} - ${await response.text()}`);
  }
  return response.text(); // returns the changeset id
}

async function updateElement(accessToken: string, type: string, id: string, modifiedXml: string) {
  const url = `${OSM_API_BASE}/${type}/${id}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/xml',
    },
    body: modifiedXml,
  });

  if (!response.ok) {
    throw new Error(`Failed to update element: ${response.statusText} - ${await response.text()}`);
  }
  return response.text(); // returns the new version number
}

async function closeChangeset(accessToken: string, changesetId: string) {
  const url = `${OSM_API_BASE}/changeset/${changesetId}/close`;
  await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

function modifyXmlWithTranslation(originalXml: string, changesetId: string, langCode: string, translatedName: string) {
  // A naive XML parsing using regex, since we know OSM XML structure is relatively simple.
  // We need to inject <tag k="name:lang" v="translatedName" /> inside the <node> or <way> element.
  // Also we need to update the changeset="..." attribute to the new changesetId.
  
  // 1. Update changeset attribute
  let modified = originalXml.replace(/changeset="\d+"/g, `changeset="${changesetId}"`);
  
  // 2. Check if the tag already exists
  const tagRegex = new RegExp(`<tag\\s+k="name:${langCode}"\\s+v="[^"]*"\\s*\\/?>`);
  if (tagRegex.test(modified)) {
    modified = modified.replace(tagRegex, `<tag k="name:${langCode}" v="${translatedName}"/>`);
  } else {
    // Inject the new tag right before the closing tag of the element (e.g., </node> or </way>)
    // If it's a self-closing tag like <node ... /> we need to open it: <node ...><tag .../></node>
    
    // Check if it's self closing: <node id="123" ... />
    const selfClosingRegex = /<(node|way|relation)([^>]*?)\/>/;
    const selfClosingMatch = modified.match(selfClosingRegex);
    if (selfClosingMatch) {
      const type = selfClosingMatch[1];
      const attrs = selfClosingMatch[2];
      modified = modified.replace(selfClosingRegex, `<${type}${attrs}>\n    <tag k="name:${langCode}" v="${translatedName}"/>\n  </${type}>`);
    } else {
      // It's not self closing, so it has </node> or </way>. Inject before it.
      const closingTagRegex = /<\/(node|way|relation)>/;
      modified = modified.replace(closingTagRegex, `  <tag k="name:${langCode}" v="${translatedName}"/>\n  </$1>`);
    }
  }

  return modified;
}

import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    
    // Log session to debug what we are receiving
    console.log("SESSION:", JSON.stringify({ 
      hasSession: !!session, 
      userId: session?.user?.id, 
      hasToken: !!session?.accessToken 
    }));

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    let accessToken = session.accessToken;

    // Robust fallback: always search MongoDB for the OSM token
    if (!accessToken) {
      const db = await (await clientPromise).db('osm');
      
      // Try matching by userId string first (as stored in DB)
      let account: any = null;
      if (session.user?.id) {
        account = await db.collection('accounts').findOne({ 
          userId: session.user.id,
          provider: 'openstreetmap' 
        });
        // Also try as ObjectId if string match failed
        if (!account) {
          try {
            account = await db.collection('accounts').findOne({ 
              userId: new ObjectId(session.user.id),
              provider: 'openstreetmap' 
            });
          } catch (_) {}
        }
      }
      
      // Last resort: just find any OSM account (works when only 1 OSM user exists)
      if (!account) {
        account = await db.collection('accounts').findOne({ provider: 'openstreetmap' });
      }
      
      console.log("DB ACCOUNT FOUND:", !!account, "access_token:", account?.access_token?.slice(0,10));
      
      if (account?.access_token) {
        accessToken = account.access_token;
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized, or OSM access token missing.' }, { status: 401 });
    }

    const body = await req.json();
    const { type, id, langCode, translatedName } = body;

    if (!type || !id || !langCode || !translatedName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validTypes = ['node', 'way', 'relation'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid element type' }, { status: 400 });
    }

    // 1. Fetch current element
    const originalContent = await fetchOsmElement(type, id);

    // 2. Create Changeset
    const changesetId = await createChangeset(accessToken as string, 'Multilingual update via script');

    // 3. Modify XML
    const modifiedXml = modifyXmlWithTranslation(originalContent, changesetId, langCode, translatedName);

    // 4. Update Element
    await updateElement(accessToken as string, type, id, modifiedXml);

    // 5. Close Changeset
    await closeChangeset(accessToken as string, changesetId);

    // 6. Track translation in MongoDB for the leaderboard
    try {
      const db = await (await clientPromise).db('osm');
      const userName = session.user?.name;
      const userEmail = session.user?.email;

      // Try to find the user by email or name (OSM users may not have email)
      const userFilter = userEmail 
        ? { $or: [{ email: userEmail }, { name: userName }] }
        : { name: userName };

      await db.collection('users').updateOne(
        userFilter,
        { 
          $inc: { translationCount: 1 },
          $set: { lastActive: new Date().toISOString(), recentLanguage: langCode },
          $setOnInsert: { name: userName, email: userEmail, createdAt: new Date().toISOString() }
        },
        { upsert: true }
      );
    } catch (dbErr) {
      // Don't fail the whole request if leaderboard update fails
      console.warn("Failed to update leaderboard:", dbErr);
    }

    return NextResponse.json({ success: true, changesetId });
  } catch (error: any) {
    console.error("OSM translation error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

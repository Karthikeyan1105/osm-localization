import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const DB_NAME = "osm";

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // ── Email / Password ──────────────────────────────────────────────────────
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = await (await clientPromise).db(DB_NAME);
        const user = await db
          .collection("users")
          .findOne({ email: credentials.email });

        if (!user) return null;

        // ── Password verification with transparent bcrypt migration ──────────
        // If the stored password looks like a bcrypt hash, use bcrypt.compare.
        // Otherwise the user registered before hashing was introduced —
        // verify the plain-text match and silently upgrade to bcrypt on the fly.
        let passwordValid = false;
        const isBcryptHash = /^\$2[aby]\$/.test(user.password || "");

        if (isBcryptHash) {
          passwordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
        } else {
          // Legacy plain-text comparison
          passwordValid = user.password === credentials.password;
          if (passwordValid) {
            // Upgrade: replace plain-text with bcrypt hash
            const hashed = await bcrypt.hash(credentials.password, 12);
            await db
              .collection("users")
              .updateOne({ _id: user._id }, { $set: { password: hashed } });
          }
        }

        if (!passwordValid) return null;

        return {
          id: user._id.toString(),
          name: user.name || user.email.split("@")[0],
          email: user.email,
          image: user.image || null,
        };
      },
    }),

    // ── OpenStreetMap OAuth 2.0 ───────────────────────────────────────────────
    {
      id: "openstreetmap",
      name: "OpenStreetMap",
      type: "oauth",
      version: "2.0",
      authorization: {
        url: "https://www.openstreetmap.org/oauth2/authorize",
        params: { scope: "read_prefs write_api" },
      },
      token: "https://www.openstreetmap.org/oauth2/token",
      userinfo: "https://api.openstreetmap.org/api/0.6/user/details.json",
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      clientId: process.env.OSM_CLIENT_ID || "mock",
      clientSecret: process.env.OSM_CLIENT_SECRET || "mock",
      profile(profile: any) {
        return {
          id: profile.user.id.toString(),
          name: profile.user.display_name,
          email:
            profile.user.email ||
            `osm-${profile.user.id}@openstreetmap.org`,
          image: profile.user.img?.href || null,
          osmId: profile.user.id.toString(),
          osmDisplayName: profile.user.display_name,
          changesetCount: profile.user.changesets?.count || 0,
          accountCreated: profile.user.account_created,
        };
      },
    },
  ],

  // ── JWT & Session Callbacks ───────────────────────────────────────────────
  callbacks: {
    async jwt({ token, account, profile, user }: any) {
      // First sign-in: enrich token from OAuth profile
      if (account?.provider === "openstreetmap" && profile) {
        token.osmId = profile.user?.id?.toString();
        token.osmDisplayName = profile.user?.display_name;
        token.osmImage = profile.user?.img?.href || null;
        token.osmChangesetCount = profile.user?.changesets?.count || 0;
        token.osmAccountCreated = profile.user?.account_created;
        token.provider = "openstreetmap";
      }
      // Store the OSM access token so API routes can call OSM on the user's behalf
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      // Persist provider for credentials users
      if (account?.provider === "credentials") {
        token.provider = "credentials";
      }
      return token;
    },

    async session({ session, token }: any) {
      if (session.user && token) {
        session.user.id = token.sub;
        session.user.osmId = token.osmId || null;
        session.user.osmDisplayName = token.osmDisplayName || null;
        session.user.image = token.osmImage || session.user.image || null;
        session.user.osmChangesetCount = token.osmChangesetCount || 0;
        session.user.osmAccountCreated = token.osmAccountCreated || null;
        session.user.provider = token.provider || "credentials";
        // Expose the OSM access token to server components / API routes
        session.accessToken = token.accessToken || null;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "secret123",
};

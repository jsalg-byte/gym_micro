import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { env } from "@/lib/env";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) {
        return null;
      }

      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, credentials.email))
        .limit(1);

      if (!user || !user.passwordHash) {
        return null;
      }

      const validPassword = await compare(credentials.password, user.passwordHash);
      if (!validPassword) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email.split("@")[0],
      };
    },
  }),
];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const db = getDb();
      const [existing] = await db.select().from(users).where(eq(users.email, user.email)).limit(1);

      if (!existing) {
        const displayName = user.name?.trim() || user.email.split("@")[0];
        await db.insert(users).values({
          email: user.email,
          name: displayName,
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        return token;
      }

      if (token.email) {
        const db = getDb();
        const [dbUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, token.email))
          .limit(1);

        if (dbUser?.id) {
          token.sub = dbUser.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler };

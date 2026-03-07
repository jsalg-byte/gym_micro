import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Username and Password",
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.username || !credentials.password) {
        return null;
      }
      const normalizedUsername = credentials.username.trim().toLowerCase();

      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, normalizedUsername))
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
        email: user.email ?? undefined,
        name: user.name ?? user.username,
      };
    },
  }),
];

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
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

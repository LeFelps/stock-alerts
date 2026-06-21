import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { isGoogleProfileAllowed } from "@/lib/auth/google-profile";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    session({ session, user }) {
      session.user.id = user.id;
      session.user.email = user.email.toLowerCase();

      return session;
    },
    signIn({ profile }) {
      return isGoogleProfileAllowed(profile);
    },
  },
  pages: {
    error: "/",
    signIn: "/",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "database",
  },
});

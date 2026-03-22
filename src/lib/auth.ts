import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginToken: { label: "Login Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        // Login via one-time token (after OTP verification)
        if (credentials.loginToken) {
          if (
            user.resetToken === credentials.loginToken &&
            user.resetTokenExpiry &&
            user.resetTokenExpiry > new Date()
          ) {
            // Clear the token after use
            await prisma.user.update({
              where: { id: user.id },
              data: { resetToken: null, resetTokenExpiry: null },
            });
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              onboarded: user.onboarded,
              isAdmin: user.isAdmin,
            };
          }
          return null;
        }

        // Normal password login
        if (!credentials.password || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // Block unverified users
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          onboarded: user.onboarded,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.onboarded = (user as { onboarded?: boolean }).onboarded;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin;
      }
      if (trigger === "update" && session?.onboarded !== undefined) {
        token.onboarded = session.onboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { onboarded?: boolean }).onboarded =
          token.onboarded as boolean;
        (session.user as { isAdmin?: boolean }).isAdmin =
          token.isAdmin as boolean;
      }
      return session;
    },
  },
};

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import argon2 from "argon2"
import prisma from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { auditLog } from "@/lib/auth-utils"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "abudfun@gmail.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const ip = req.headers?.['x-forwarded-for'] || "unknown";
        const allowed = await checkRateLimit(`login:${ip}:${credentials.email}`, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
        if (!allowed) {
          throw new Error("Too many login attempts. Try again later.")
        }
        
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) {
          await auditLog(null, null, "auth.login_failed", "User", { email: credentials.email })
          return null;
        }
        
        const isPasswordValid = await argon2.verify(user.passwordHash, credentials.password);
        if (!isPasswordValid) {
          await auditLog(null, user.id, "auth.login_failed", "User", { email: user.email })
          return null;
        }

        await auditLog(null, user.id, "auth.login_success", "User", { email: user.email })
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          forcePasswordChange: user.forcePasswordChange,
          sessionVersion: user.sessionVersion,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.forcePasswordChange = (user as any).forcePasswordChange;
        token.sessionVersion = (user as any).sessionVersion;
      } else if (token.email) {
        const currentUser = await prisma.user.findUnique({
          where: { email: String(token.email) },
          select: { forcePasswordChange: true, sessionVersion: true },
        })
        if (!currentUser || currentUser.sessionVersion !== token.sessionVersion) {
          token.revoked = true
        } else {
          token.forcePasswordChange = currentUser.forcePasswordChange
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        (session.user as any).forcePasswordChange = token.forcePasswordChange;
        (session.user as any).sessionRevoked = token.revoked === true;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../[...nextauth]/route"
import prisma from "@/lib/prisma"
import argon2 from "argon2"
import { auditLog } from "@/lib/auth-utils"

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  if (!cookie) return null
  return decodeURIComponent(cookie.slice(name.length + 1))
}

function verifyCsrf(req: Request) {
  const submitted = req.headers.get("x-csrf-token")
  const cookieHeader = req.headers.get("cookie")
  const cookieValue =
    readCookie(cookieHeader, "next-auth.csrf-token") ??
    readCookie(cookieHeader, "__Host-next-auth.csrf-token") ??
    readCookie(cookieHeader, "__Secure-next-auth.csrf-token")
  const cookieToken = cookieValue?.split("|")[0]
  return Boolean(submitted && cookieToken && submitted === cookieToken)
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isValid = await argon2.verify(user.passwordHash, currentPassword)
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 })
    }

    const newHash = await argon2.hash(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        forcePasswordChange: false,
        sessionVersion: { increment: 1 },
      }
    })

    await auditLog(null, user.id, "auth.password_change", "User", { userId: user.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

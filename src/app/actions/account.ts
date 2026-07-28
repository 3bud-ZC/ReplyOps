'use server'

import argon2 from "argon2"
import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

type ResetState = {
  ok: boolean
  message: string
  temporaryPassword?: string
}

async function requirePlatformOwner() {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const allowed = user.memberships.some((membership) => membership.role === Role.platform_owner)
  if (!allowed) throw new Error("Forbidden")
  return user
}

function secureTemporaryPassword() {
  return randomBytes(24).toString("base64url")
}

export async function resetUserCredential(_previousState: ResetState, formData: FormData): Promise<ResetState> {
  try {
    const actor = await requirePlatformOwner()
    const email = String(formData.get("email") ?? "").trim().toLowerCase()
    if (!email) {
      return { ok: false, message: "Email required" }
    }

    const target = await prisma.user.findUnique({ where: { email } })
    if (!target) {
      return { ok: false, message: "User not found" }
    }

    const temporaryPassword = secureTemporaryPassword()
    const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id })

    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash,
        forcePasswordChange: true,
        sessionVersion: { increment: 1 },
      },
    })

    await auditLog(null, actor.id, "auth.credential_reset", "User", {
      targetUserId: target.id,
      targetEmail: target.email,
    })

    revalidatePath("/dashboard/account")
    return {
      ok: true,
      message: "Temporary password generated. It is shown once.",
      temporaryPassword,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Reset failed",
    }
  }
}

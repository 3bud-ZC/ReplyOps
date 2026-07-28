"use server"

import { createHash, randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import argon2 from "argon2"
import { Role } from "@prisma/client"
import { auditLog, checkTenantAccess, getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function parseRole(value: string): Role {
  if (Object.values(Role).includes(value as Role)) return value as Role
  throw new Error("invalid_role")
}

async function requireTeamAdmin(tenantId: string) {
  return checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])
}

export async function inviteTeamMember(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const email = readText(formData, "email").toLowerCase()
  const name = readText(formData, "name")
  const role = parseRole(readText(formData, "role"))
  if (!tenantId || !email) throw new Error("tenant_and_email_required")
  const { user } = await requireTeamAdmin(tenantId)
  if (role === Role.platform_owner && !user.memberships.some((membership) => membership.role === Role.platform_owner)) {
    throw new Error("platform_owner_required")
  }

  const temporaryPassword = randomBytes(18).toString("base64url")
  const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id })
  const member = await prisma.user.upsert({
    where: { email },
    update: { name: name || undefined, active: true },
    create: { email, name: name || null, passwordHash, forcePasswordChange: true, active: true },
  })
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: member.id, tenantId } },
    update: { role, active: true },
    create: { userId: member.id, tenantId, role, active: true },
  })
  const invitationToken = randomBytes(24).toString("base64url")
  await prisma.invitation.create({
    data: {
      tenantId,
      email,
      role,
      tokenHash: createHash("sha256").update(invitationToken).digest("hex"),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
  await auditLog(tenantId, user.id, "team.invite", "Membership", { email, role })
  revalidatePath("/dashboard/team")
  return { temporaryPassword }
}

export async function changeMemberRole(formData: FormData) {
  const membershipId = readText(formData, "membershipId")
  const role = parseRole(readText(formData, "role"))
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } })
  if (!membership) throw new Error("membership_not_found")
  const { user } = await requireTeamAdmin(membership.tenantId)
  await prisma.membership.update({ where: { id: membershipId }, data: { role } })
  await auditLog(membership.tenantId, user.id, "team.role_change", "Membership", { membershipId, role })
  revalidatePath("/dashboard/team")
}

export async function removeMembership(formData: FormData) {
  const membershipId = readText(formData, "membershipId")
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } })
  if (!membership) throw new Error("membership_not_found")
  const { user } = await requireTeamAdmin(membership.tenantId)
  await prisma.membership.update({ where: { id: membershipId }, data: { active: false } })
  await auditLog(membership.tenantId, user.id, "team.membership_remove", "Membership", { membershipId })
  revalidatePath("/dashboard/team")
}

export async function setUserActive(formData: FormData) {
  const userId = readText(formData, "userId")
  const active = readText(formData, "active") === "true"
  const current = await getAuthenticatedUser()
  if (!current) throw new Error("Unauthorized")
  const isPlatformOwner = current.memberships.some((membership) => membership.role === Role.platform_owner)
  if (!isPlatformOwner) throw new Error("Forbidden")
  await prisma.user.update({
    where: { id: userId },
    data: { active, sessionVersion: active ? undefined : { increment: 1 } },
  })
  await auditLog(null, current.id, active ? "team.user_reactivate" : "team.user_deactivate", "User", { userId })
  revalidatePath("/dashboard/team")
}

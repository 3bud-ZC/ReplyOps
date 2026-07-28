'use server'

import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, checkTenantAccess, getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

function readText(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim()
}

function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function assertSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must use lowercase letters, numbers, and hyphens")
  }
}

async function requirePlatformOwner() {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const allowed = user.memberships.some((membership) => membership.role === Role.platform_owner)
  if (!allowed) throw new Error("Forbidden")
  return user
}

export async function createTenant(formData: FormData) {
  const user = await requirePlatformOwner()
  const name = readText(formData, "name")
  const slug = readText(formData, "slug")
  if (!name || !slug) throw new Error("Name and slug are required")
  assertSlug(slug)

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      industry: readText(formData, "industry") || null,
      description: readText(formData, "description") || null,
      timezone: readText(formData, "timezone", "Africa/Cairo"),
      primaryLanguage: readText(formData, "primaryLanguage", "ar"),
      supportedLanguages: parseList(readText(formData, "supportedLanguages", "ar,en")),
      defaultCurrency: readText(formData, "defaultCurrency", "EGP"),
      enabled: formData.get("enabled") === "on",
      memberships: {
        create: {
          userId: user.id,
          role: Role.tenant_owner,
        },
      },
      assistantConfiguration: {
        create: {},
      },
    },
  })

  await auditLog(tenant.id, user.id, "tenant.create", "Tenant", { tenantId: tenant.id })
  revalidatePath("/dashboard/businesses")
}

export async function updateTenant(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  if (!tenantId) throw new Error("Tenant ID is required")
  const { user } = await checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])

  const name = readText(formData, "name")
  const slug = readText(formData, "slug")
  if (!name || !slug) throw new Error("Name and slug are required")
  assertSlug(slug)

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      slug,
      industry: readText(formData, "industry") || null,
      description: readText(formData, "description") || null,
      timezone: readText(formData, "timezone", "Africa/Cairo"),
      primaryLanguage: readText(formData, "primaryLanguage", "ar"),
      supportedLanguages: parseList(readText(formData, "supportedLanguages", "ar,en")),
      defaultCurrency: readText(formData, "defaultCurrency", "EGP"),
      enabled: formData.get("enabled") === "on",
      dataRetentionDays: Number(readText(formData, "dataRetentionDays", "365")),
    },
  })

  await auditLog(tenantId, user.id, "tenant.update", "Tenant", { tenantId })
  revalidatePath("/dashboard/businesses")
}

export async function archiveTenant(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const { user } = await checkTenantAccess(tenantId, [Role.tenant_owner])
  await prisma.tenant.update({ where: { id: tenantId }, data: { deletedAt: new Date(), enabled: false } })
  await auditLog(tenantId, user.id, "tenant.archive", "Tenant", { tenantId })
  revalidatePath("/dashboard/businesses")
}

export async function restoreTenant(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const user = await requirePlatformOwner()
  await prisma.tenant.update({ where: { id: tenantId }, data: { deletedAt: null, enabled: true } })
  await auditLog(tenantId, user.id, "tenant.restore", "Tenant", { tenantId })
  revalidatePath("/dashboard/businesses")
}

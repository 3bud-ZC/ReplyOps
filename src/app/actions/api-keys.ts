'use server'

import { createHash, randomBytes, randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, getAuthenticatedUser } from "@/lib/auth-utils"
import { encryptSecret } from "@/lib/crypto/encryption"
import prisma from "@/lib/prisma"

const INTERNAL_API_SCOPES = [
  "runtime:read",
  "memory:read",
  "knowledge:read",
  "messages:write",
  "handoff:write",
  "actions:write",
  "channel:send",
  "usage:write",
  "errors:write",
] as const

type ApiKeyActionState = {
  ok: boolean
  message: string
  plaintextSecret?: string
  keyId?: string
}

const initialError = { ok: false, message: "Action failed" }

function readText(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim()
}

async function requirePlatformOwner() {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  if (!user.memberships.some((membership) => membership.role === Role.platform_owner)) {
    throw new Error("Forbidden")
  }
  return user
}

function parseScopes(formData: FormData) {
  const selected = formData.getAll("scopes").map(String)
  return selected.filter((scope) => INTERNAL_API_SCOPES.includes(scope as any))
}

function parseExpiration(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Invalid expiration")
  return date
}

function newSecret() {
  return `rop_${randomBytes(32).toString("base64url")}`
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex")
}

export async function createInternalApiKey(
  _previousState: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  try {
    const user = await requirePlatformOwner()
    const tenantId = readText(formData, "tenantId")
    const name = readText(formData, "name")
    const scopes = parseScopes(formData)
    const expiresAt = parseExpiration(readText(formData, "expiresAt"))
    if (!tenantId || !name) throw new Error("Tenant and name required")
    if (scopes.length === 0) throw new Error("At least one scope required")

    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } })
    if (!tenant) throw new Error("Tenant not found")

    const plaintextSecret = newSecret()
    const encrypted = encryptSecret(plaintextSecret)
    const keyId = `rop_${randomUUID()}`

    await prisma.apiKey.create({
      data: {
        tenantId,
        keyId,
        keyHash: hashSecret(plaintextSecret),
        name,
        scopes,
        expiresAt,
        encryptedSecret: encrypted.encryptedPayload,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        enabled: true,
      },
    })

    await auditLog(tenantId, user.id, "api_key.create", "ApiKey", { keyId, name, scopes, expiresAt })
    revalidatePath("/dashboard/internal-api-keys")
    return { ok: true, message: "Key created. Secret shown once.", plaintextSecret, keyId }
  } catch (error) {
    return { ...initialError, message: error instanceof Error ? error.message : initialError.message }
  }
}

export async function revokeInternalApiKey(formData: FormData) {
  const user = await requirePlatformOwner()
  const id = readText(formData, "id")
  const key = await prisma.apiKey.update({
    where: { id },
    data: { enabled: false, revokedAt: new Date() },
  })
  await auditLog(key.tenantId, user.id, "api_key.revoke", "ApiKey", { keyId: key.keyId })
  revalidatePath("/dashboard/internal-api-keys")
}

export async function activateInternalApiKey(formData: FormData) {
  const user = await requirePlatformOwner()
  const id = readText(formData, "id")
  const key = await prisma.apiKey.update({
    where: { id },
    data: { enabled: true, revokedAt: null },
  })
  await auditLog(key.tenantId, user.id, "api_key.activate", "ApiKey", { keyId: key.keyId })
  revalidatePath("/dashboard/internal-api-keys")
}

export async function rotateInternalApiKey(
  _previousState: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  try {
    const user = await requirePlatformOwner()
    const id = readText(formData, "id")
    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) throw new Error("Key not found")

    const plaintextSecret = newSecret()
    const encrypted = encryptSecret(plaintextSecret)
    const replacementKeyId = `rop_${randomUUID()}`

    await prisma.$transaction([
      prisma.apiKey.update({
        where: { id },
        data: { enabled: false, revokedAt: new Date() },
      }),
      prisma.apiKey.create({
        data: {
          tenantId: existing.tenantId,
          keyId: replacementKeyId,
          keyHash: hashSecret(plaintextSecret),
          name: `${existing.name} rotation`,
          scopes: existing.scopes,
          expiresAt: existing.expiresAt,
          encryptedSecret: encrypted.encryptedPayload,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          enabled: true,
        },
      }),
    ])

    await auditLog(existing.tenantId, user.id, "api_key.rotate", "ApiKey", {
      oldKeyId: existing.keyId,
      replacementKeyId,
    })
    revalidatePath("/dashboard/internal-api-keys")
    return {
      ok: true,
      message: "Key rotated. Replacement secret shown once.",
      plaintextSecret,
      keyId: replacementKeyId,
    }
  } catch (error) {
    return { ...initialError, message: error instanceof Error ? error.message : initialError.message }
  }
}

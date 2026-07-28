import { randomBytes, randomUUID } from "crypto"
import prisma from "@/lib/prisma"
import { decryptSecret, encryptSecret } from "@/lib/crypto/encryption"

export type TelegramCredential = {
  botToken: string
  botId: string
  username: string
  firstName?: string
}

export type WhatsAppCredential = {
  appId: string
  appSecret: string
  accessToken: string
  phoneNumberId: string
  businessAccountId: string
  verifyToken: string
  graphApiVersion: string
}

export type WebChatCredential = {
  publicKey: string
  allowedOrigins: string[]
  title: string
  assistantName: string
  welcomeMessage: string
  position: "left" | "right"
  brandColor: string
  offlineBehavior: string
}

export function createConnectionId(type: string) {
  return `${type}_${randomUUID()}`
}

export function createWebhookSecret() {
  return randomBytes(32).toString("base64url")
}

export function createPublicKey() {
  return `ropk_${randomBytes(24).toString("base64url")}`
}

export async function storeChannelCredential(channelConnectionId: string, payload: unknown) {
  const encrypted = encryptSecret(JSON.stringify(payload))
  await prisma.channelCredential.upsert({
    where: { channelConnectionId },
    update: {
      encryptedPayload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      credentialVersion: { increment: 1 },
    },
    create: {
      channelConnectionId,
      encryptedPayload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    },
  })
}

export async function readChannelCredential<T>(channelConnectionId: string): Promise<T | null> {
  const credential = await prisma.channelCredential.findUnique({ where: { channelConnectionId } })
  if (!credential) return null
  return JSON.parse(
    decryptSecret({
      encryptedPayload: credential.encryptedPayload,
      iv: credential.iv,
      authTag: credential.authTag,
    }),
  ) as T
}

export function parseAllowedOrigins(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin)
}

export function isAllowedOrigin(origin: string | null, allowedOrigins: string[]) {
  if (!origin) return false
  try {
    const normalized = new URL(origin).origin
    return allowedOrigins.includes(normalized)
  } catch {
    return false
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, checkTenantAccess } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import {
  createConnectionId,
  createPublicKey,
  createWebhookSecret,
  parseAllowedOrigins,
  storeChannelCredential,
  WhatsAppCredential,
  WebChatCredential,
} from "@/lib/channels/credentials"
import { setTelegramWebhook, validateTelegramToken } from "@/lib/channels/telegram"
import { validateWhatsAppCredential } from "@/lib/channels/whatsapp"

function readText(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim()
}

function publicBaseUrl() {
  return (process.env.REPLYOPS_PUBLIC_URL ?? process.env.NEXTAUTH_URL ?? "https://replyops.abud.fun").replace(/\/$/, "")
}

async function requireChannelAdmin(tenantId: string) {
  return checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])
}

export async function connectTelegram(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const botToken = readText(formData, "botToken")
  if (!tenantId || !botToken) throw new Error("tenant_and_token_required")
  const { user } = await requireChannelAdmin(tenantId)

  const verified = await validateTelegramToken(botToken)
  const connectionId = createConnectionId("telegram")
  const webhookSecret = createWebhookSecret()
  const webhookUrl = `${publicBaseUrl()}/api/webhooks/telegram/${connectionId}`
  await setTelegramWebhook(botToken, webhookUrl, webhookSecret)

  const connection = await prisma.channelConnection.create({
    data: {
      tenantId,
      type: "telegram",
      connectionId,
      status: "connected",
      displayName: verified.username ? `@${verified.username}` : verified.firstName ?? "Telegram bot",
      webhookSecret,
      externalAccountId: verified.botId,
      lastVerifiedTime: new Date(),
    },
  })
  await storeChannelCredential(connection.id, verified)
  await auditLog(tenantId, user.id, "channel.telegram.connect", "ChannelConnection", {
    connectionId,
    botId: verified.botId,
    username: verified.username,
  })
  revalidatePath("/dashboard/channels")
}

export async function createWebChatConnection(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  if (!tenantId) throw new Error("tenant_required")
  const { user } = await requireChannelAdmin(tenantId)
  const credential: WebChatCredential = {
    publicKey: createPublicKey(),
    allowedOrigins: parseAllowedOrigins(readText(formData, "allowedOrigins")),
    title: readText(formData, "title", "ReplyOps Chat"),
    assistantName: readText(formData, "assistantName", "Assistant"),
    welcomeMessage: readText(formData, "welcomeMessage", "How can I help?"),
    position: readText(formData, "position", "right") === "left" ? "left" : "right",
    brandColor: readText(formData, "brandColor", "#0F766E"),
    offlineBehavior: readText(formData, "offlineBehavior", "show_handoff_option"),
  }
  if (credential.allowedOrigins.length === 0) throw new Error("allowed_origin_required")

  const connection = await prisma.channelConnection.create({
    data: {
      tenantId,
      type: "web_chat",
      connectionId: createConnectionId("webchat"),
      status: "connected",
      displayName: credential.title,
      externalAccountId: credential.publicKey,
      lastVerifiedTime: new Date(),
    },
  })
  await storeChannelCredential(connection.id, credential)
  await auditLog(tenantId, user.id, "channel.webchat.create", "ChannelConnection", {
    connectionId: connection.connectionId,
    allowedOrigins: credential.allowedOrigins,
  })
  revalidatePath("/dashboard/channels")
}

export async function connectWhatsApp(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  if (!tenantId) throw new Error("tenant_required")
  const { user } = await requireChannelAdmin(tenantId)
  const credential: WhatsAppCredential = {
    appId: readText(formData, "appId"),
    appSecret: readText(formData, "appSecret"),
    accessToken: readText(formData, "accessToken"),
    phoneNumberId: readText(formData, "phoneNumberId"),
    businessAccountId: readText(formData, "businessAccountId"),
    verifyToken: readText(formData, "verifyToken", createWebhookSecret()),
    graphApiVersion: readText(formData, "graphApiVersion", "v21.0"),
  }
  if (!credential.appId || !credential.appSecret || !credential.accessToken || !credential.phoneNumberId || !credential.businessAccountId) {
    throw new Error("whatsapp_credentials_required")
  }
  const metadata = await validateWhatsAppCredential(credential)
  const connection = await prisma.channelConnection.create({
    data: {
      tenantId,
      type: "whatsapp",
      connectionId: createConnectionId("whatsapp"),
      status: "connected",
      displayName: metadata.verified_name ?? metadata.display_phone_number ?? "WhatsApp Business",
      webhookSecret: credential.verifyToken,
      externalAccountId: credential.phoneNumberId,
      lastVerifiedTime: new Date(),
    },
  })
  await storeChannelCredential(connection.id, credential)
  await auditLog(tenantId, user.id, "channel.whatsapp.connect", "ChannelConnection", {
    connectionId: connection.connectionId,
    phoneNumberId: credential.phoneNumberId,
    businessAccountId: credential.businessAccountId,
  })
  revalidatePath("/dashboard/channels")
}

export async function disconnectChannel(formData: FormData) {
  const channelConnectionId = readText(formData, "channelConnectionId")
  const channel = await prisma.channelConnection.findUnique({ where: { id: channelConnectionId } })
  if (!channel) throw new Error("channel_not_found")
  const { user } = await requireChannelAdmin(channel.tenantId)
  await prisma.channelConnection.update({
    where: { id: channel.id },
    data: { status: "disconnected", enabled: false, deletedAt: new Date() },
  })
  await auditLog(channel.tenantId, user.id, "channel.disconnect", "ChannelConnection", {
    connectionId: channel.connectionId,
    type: channel.type,
  })
  revalidatePath("/dashboard/channels")
}

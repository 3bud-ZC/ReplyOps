"use server"

import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, checkTenantAccess, getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { readChannelCredential, TelegramCredential, WhatsAppCredential } from "@/lib/channels/credentials"
import { sendTelegramMessage } from "@/lib/channels/telegram"
import { sendWhatsAppText } from "@/lib/channels/whatsapp"

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

async function loadHandoff(handoffId: string) {
  const handoff = await prisma.handoff.findUnique({
    where: { id: handoffId },
    include: {
      conversation: { include: { channelConnection: true, customer: true } },
    },
  })
  if (!handoff) throw new Error("handoff_not_found")
  await checkTenantAccess(handoff.tenantId, [Role.tenant_owner, Role.tenant_admin, Role.agent])
  return handoff
}

export async function claimHandoff(formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const handoff = await loadHandoff(readText(formData, "handoffId"))
  const existing = await prisma.handoffAssignment.findFirst({ where: { handoffId: handoff.id, userId: user.id } })
  if (!existing) await prisma.handoffAssignment.create({ data: { handoffId: handoff.id, userId: user.id } })
  await prisma.handoff.update({ where: { id: handoff.id }, data: { status: "claimed" } })
  await auditLog(handoff.tenantId, user.id, "handoff.claim", "Handoff", { handoffId: handoff.id })
  revalidatePath("/dashboard/handoff")
}

export async function releaseHandoff(formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const handoff = await loadHandoff(readText(formData, "handoffId"))
  await prisma.handoffAssignment.deleteMany({ where: { handoffId: handoff.id, userId: user.id } })
  await prisma.handoff.update({ where: { id: handoff.id }, data: { status: "open" } })
  await auditLog(handoff.tenantId, user.id, "handoff.release", "Handoff", { handoffId: handoff.id })
  revalidatePath("/dashboard/handoff")
}

export async function addHandoffNote(formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const handoff = await loadHandoff(readText(formData, "handoffId"))
  const body = readText(formData, "body")
  if (!body) throw new Error("note_required")
  await prisma.internalNote.create({
    data: {
      tenantId: handoff.tenantId,
      conversationId: handoff.conversationId,
      handoffId: handoff.id,
      authorUserId: user.id,
      body,
    },
  })
  await auditLog(handoff.tenantId, user.id, "handoff.note", "InternalNote", { handoffId: handoff.id })
  revalidatePath("/dashboard/handoff")
}

export async function replyFromHandoff(formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const handoff = await loadHandoff(readText(formData, "handoffId"))
  const content = readText(formData, "content")
  if (!content) throw new Error("reply_required")

  const recentDuplicate = await prisma.message.findFirst({
    where: {
      conversationId: handoff.conversationId,
      direction: "outbound",
      role: "agent",
      content,
      createdAt: { gte: new Date(Date.now() - 30_000) },
    },
  })
  if (recentDuplicate) {
    await auditLog(handoff.tenantId, user.id, "handoff.reply_duplicate_ignored", "Message", { handoffId: handoff.id, messageId: recentDuplicate.id })
    revalidatePath("/dashboard/handoff")
    return
  }

  const message = await prisma.message.create({
    data: {
      conversationId: handoff.conversationId,
      direction: "outbound",
      role: "agent",
      content,
      deliveryStatus: "queued",
    },
  })

  try {
    if (handoff.conversation.channelConnection.type === "telegram") {
      const credential = await readChannelCredential<TelegramCredential>(handoff.conversation.channelConnection.id)
      if (!credential?.botToken || !handoff.conversation.externalThreadId) throw new Error("telegram_delivery_unavailable")
      const delivery = await sendTelegramMessage(credential.botToken, handoff.conversation.externalThreadId, content)
      await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "delivered", providerPayload: delivery } })
    } else if (handoff.conversation.channelConnection.type === "whatsapp") {
      const credential = await readChannelCredential<WhatsAppCredential>(handoff.conversation.channelConnection.id)
      if (!credential || !handoff.conversation.externalThreadId) throw new Error("whatsapp_delivery_unavailable")
      const delivery = await sendWhatsAppText(credential, handoff.conversation.externalThreadId, content)
      await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "delivered", providerPayload: delivery } })
    } else {
      await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "stored" } })
    }
  } catch (error) {
    await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "failed" } })
    await prisma.deadLetterEvent.create({
      data: {
        tenantId: handoff.tenantId,
        source: "handoff.reply",
        eventType: "agent_reply_delivery_failed",
        payload: { handoffId: handoff.id, messageId: message.id },
        errorMessage: error instanceof Error ? error.message : "delivery_failed",
      },
    })
  }

  await auditLog(handoff.tenantId, user.id, "handoff.reply", "Message", { handoffId: handoff.id, messageId: message.id })
  revalidatePath("/dashboard/handoff")
  revalidatePath("/dashboard/conversations")
}

export async function resolveHandoff(formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const handoff = await loadHandoff(readText(formData, "handoffId"))
  await prisma.handoff.update({ where: { id: handoff.id }, data: { status: "resolved" } })
  await prisma.conversation.update({ where: { id: handoff.conversationId }, data: { status: "resolved", automationPaused: true } })
  await auditLog(handoff.tenantId, user.id, "handoff.resolve", "Handoff", { handoffId: handoff.id })
  revalidatePath("/dashboard/handoff")
  revalidatePath("/dashboard/conversations")
}

export async function resumeConversationAutomation(formData: FormData) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")
  const handoff = await loadHandoff(readText(formData, "handoffId"))
  await prisma.conversation.update({ where: { id: handoff.conversationId }, data: { status: "active", automationPaused: false } })
  await auditLog(handoff.tenantId, user.id, "conversation.automation_resume", "Conversation", { handoffId: handoff.id, conversationId: handoff.conversationId })
  revalidatePath("/dashboard/handoff")
  revalidatePath("/dashboard/conversations")
}

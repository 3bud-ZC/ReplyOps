import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"
import { readChannelCredential, TelegramCredential, WhatsAppCredential } from "@/lib/channels/credentials"
import { sendTelegramMessage } from "@/lib/channels/telegram"
import { sendWhatsAppText } from "@/lib/channels/whatsapp"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "channel:send", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const channelConnectionId = requireString(json.channel_connection_id, "channel_connection_id")
    const conversationId = requireString(json.conversation_id, "conversation_id")
    const content = requireString(json.content, "content")
    const channel = await prisma.channelConnection.findFirst({ where: { id: channelConnectionId, tenantId, deletedAt: null, enabled: true } })
    if (!channel) return NextResponse.json({ success: false, request_id: requestId, error: "channel_not_found" }, { status: 404 })
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId, channelConnectionId } })
    if (!conversation) return NextResponse.json({ success: false, request_id: requestId, error: "conversation_not_found" }, { status: 404 })
    const message = await prisma.message.create({
      data: { conversationId, direction: "outbound", role: "agent", content, actionState: "channel_send_queued" },
    })
    try {
      if (channel.type === "telegram") {
        const credential = await readChannelCredential<TelegramCredential>(channel.id)
        if (!credential?.botToken || !conversation.externalThreadId) throw new Error("telegram_delivery_unavailable")
        const delivery = await sendTelegramMessage(credential.botToken, conversation.externalThreadId, content)
        await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "delivered", providerPayload: delivery } })
        return NextResponse.json({ success: true, request_id: requestId, message_id: message.id, delivery_state: "delivered" })
      }
      if (channel.type === "whatsapp") {
        const credential = await readChannelCredential<WhatsAppCredential>(channel.id)
        if (!credential || !conversation.externalThreadId) throw new Error("whatsapp_delivery_unavailable")
        const delivery = await sendWhatsAppText(credential, conversation.externalThreadId, content)
        await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "delivered", providerPayload: delivery } })
        return NextResponse.json({ success: true, request_id: requestId, message_id: message.id, delivery_state: "delivered" })
      }
      await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "stored" } })
      return NextResponse.json({ success: true, request_id: requestId, message_id: message.id, delivery_state: "stored" })
    } catch (error) {
      await prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "failed" } })
      await prisma.deadLetterEvent.create({
        data: {
          tenantId,
          source: "internal.channel-send",
          eventType: "channel_send_failed",
          payload: { request_id: requestId, channel_connection_id: channelConnectionId, message_id: message.id },
          errorMessage: error instanceof Error ? error.message : "delivery_failed",
          status: "open",
        },
      })
      return NextResponse.json({ success: false, request_id: requestId, message_id: message.id, delivery_state: "failed" }, { status: 502 })
    }
  })
}

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { readChannelCredential, TelegramCredential } from "@/lib/channels/credentials"
import { handleRuntimeInbound, markOutboundDelivered, markOutboundFailed } from "@/lib/channels/runtime"
import { sendTelegramMessage, sendTelegramTyping } from "@/lib/channels/telegram"

export async function POST(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  const channel = await prisma.channelConnection.findUnique({ where: { connectionId } })
  if (!channel || channel.type !== "telegram" || !channel.enabled || channel.deletedAt) {
    return NextResponse.json({ ok: false, error: "channel_not_found" }, { status: 404 })
  }

  const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token")
  if (!channel.webhookSecret || suppliedSecret !== channel.webhookSecret) {
    return NextResponse.json({ ok: false, error: "invalid_secret" }, { status: 401 })
  }

  const body = await request.json()
  const message = body.message ?? body.edited_message ?? body.callback_query?.message
  const from = body.callback_query?.from ?? message?.from
  const chatId = message?.chat?.id
  const text = String(message?.text ?? message?.caption ?? body.callback_query?.data ?? "").trim()
  if (!chatId || !from || !text) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const externalMessageId = `telegram:${body.update_id ?? message.message_id}`
  const runtimeResult = await handleRuntimeInbound({
    tenantId: channel.tenantId,
    channelConnectionId: channel.id,
    externalCustomerId: String(from.id ?? chatId),
    externalThreadId: String(chatId),
    externalMessageId,
    content: text,
    customerName: [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || null,
    providerPayload: {
      update_id: body.update_id,
      chat_id: chatId,
      message_id: message.message_id,
      username: from.username,
    },
  })

  if (runtimeResult.reply && runtimeResult.outboundMessageId) {
    const credential = await readChannelCredential<TelegramCredential>(channel.id)
    if (!credential?.botToken) {
      await markOutboundFailed(runtimeResult.outboundMessageId, "telegram_credential_missing", channel.tenantId, { connectionId })
      return NextResponse.json({ ok: true, queued: false, error: "telegram_credential_missing" })
    }
    try {
      await sendTelegramTyping(credential.botToken, String(chatId))
      const delivery = await sendTelegramMessage(credential.botToken, String(chatId), runtimeResult.reply)
      await markOutboundDelivered(runtimeResult.outboundMessageId, delivery)
    } catch (error) {
      await markOutboundFailed(
        runtimeResult.outboundMessageId,
        error instanceof Error ? error.message : "telegram_send_failed",
        channel.tenantId,
        { connectionId, chatId },
      )
    }
  }

  return NextResponse.json({ ok: true, deduplicated: runtimeResult.deduplicated, conversation_id: runtimeResult.conversationId })
}

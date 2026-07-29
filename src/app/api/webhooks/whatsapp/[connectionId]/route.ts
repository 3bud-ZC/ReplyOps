import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { readChannelCredential, WhatsAppCredential } from "@/lib/channels/credentials"
import { handleRuntimeInbound, markOutboundDelivered, markOutboundFailed } from "@/lib/channels/runtime"
import { normalizeWhatsAppDeliveryStatus, normalizeWhatsAppInbound, sendWhatsAppText, verifyWhatsAppSignature } from "@/lib/channels/whatsapp"

export async function GET(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  const channel = await prisma.channelConnection.findUnique({ where: { connectionId } })
  if (!channel || channel.type !== "whatsapp" || !channel.enabled || channel.deletedAt) {
    return NextResponse.json({ error: "channel_not_found" }, { status: 404 })
  }
  const mode = request.nextUrl.searchParams.get("hub.mode")
  const token = request.nextUrl.searchParams.get("hub.verify_token")
  const challenge = request.nextUrl.searchParams.get("hub.challenge")
  if (mode === "subscribe" && token && token === channel.webhookSecret && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "invalid_verify_token" }, { status: 403 })
}

export async function POST(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  const channel = await prisma.channelConnection.findUnique({ where: { connectionId } })
  if (!channel || channel.type !== "whatsapp" || !channel.enabled || channel.deletedAt) {
    return NextResponse.json({ success: false, error: "channel_not_found" }, { status: 404 })
  }
  const credential = await readChannelCredential<WhatsAppCredential>(channel.id)
  if (!credential) return NextResponse.json({ success: false, error: "credential_missing" }, { status: 409 })

  const bodyText = await request.text()
  if (!verifyWhatsAppSignature(credential.appSecret, bodyText, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ success: false, error: "invalid_signature" }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(bodyText || "{}")
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }
  const change = body.entry?.[0]?.changes?.[0]?.value
  const statusUpdate = change?.statuses?.[0]
  if (statusUpdate?.id && statusUpdate?.status) {
    const deliveryStatus = normalizeWhatsAppDeliveryStatus(statusUpdate.status)
    await prisma.$executeRaw`
      UPDATE "Message"
      SET "deliveryStatus" = ${deliveryStatus}, "providerPayload" = COALESCE("providerPayload", '{}'::jsonb) || ${JSON.stringify({
        whatsapp_status: {
          id: statusUpdate.id,
          status: statusUpdate.status,
          timestamp: statusUpdate.timestamp,
          error_code: statusUpdate.errors?.[0]?.code,
        },
      })}::jsonb
      WHERE "conversationId" IN (
        SELECT c.id
        FROM "Conversation" c
        WHERE c."tenantId" = ${channel.tenantId} AND c."channelConnectionId" = ${channel.id}
      )
      AND "providerPayload"::text LIKE ${`%${statusUpdate.id}%`}
    `
    await prisma.webhookEvent.create({
      data: {
        tenantId: channel.tenantId,
        eventType: "whatsapp.delivery_status",
        payload: {
          message_id: statusUpdate.id,
          status: statusUpdate.status,
          timestamp: statusUpdate.timestamp,
          error_code: statusUpdate.errors?.[0]?.code,
        },
      },
    })
    return NextResponse.json({ success: true, status_received: true })
  }

  const message = change?.messages?.[0]
  const contact = change?.contacts?.[0]
  const normalized = normalizeWhatsAppInbound(message ?? {})
  const text = normalized.content
  const from = String(message?.from ?? "")
  if (!message?.id || !from || !text) return NextResponse.json({ success: true, ignored: true })

  const result = await handleRuntimeInbound({
    tenantId: channel.tenantId,
    channelConnectionId: channel.id,
    externalCustomerId: from,
    externalThreadId: from,
    externalMessageId: `whatsapp:${message.id}`,
    content: text,
    customerName: contact?.profile?.name ?? null,
    providerPayload: {
      message_id: message.id,
      phone_number_id: change?.metadata?.phone_number_id,
      metadata: normalized.metadata,
    },
  })

  if (result.reply && result.outboundMessageId) {
    try {
      const delivery = await sendWhatsAppText(credential, from, result.reply)
      await markOutboundDelivered(result.outboundMessageId, delivery)
    } catch (error) {
      await markOutboundFailed(
        result.outboundMessageId,
        error instanceof Error ? error.message : "whatsapp_send_failed",
        channel.tenantId,
        { connectionId, to: from },
      )
    }
  }

  return NextResponse.json({ success: true, deduplicated: result.deduplicated, conversation_id: result.conversationId })
}

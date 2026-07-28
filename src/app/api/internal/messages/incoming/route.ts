import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"
import { handleRuntimeInbound } from "@/lib/channels/runtime"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "messages:write", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const channelConnectionId = requireString(json.channel_connection_id, "channel_connection_id")
    const externalCustomerId = requireString(json.external_customer_id, "external_customer_id")
    const content = requireString(json.content, "content")
    const externalMessageId = String(json.external_message_id ?? requestId)
    const externalThreadId = String(json.external_thread_id ?? json.conversation_id ?? externalCustomerId)

    const channel = await prisma.channelConnection.findFirst({ where: { id: channelConnectionId, tenantId, deletedAt: null } })
    if (!channel) return NextResponse.json({ success: false, request_id: requestId, error: "channel_not_found" }, { status: 404 })

    const result = await handleRuntimeInbound({
      requestId,
      tenantId,
      channelConnectionId,
      externalCustomerId,
      externalThreadId,
      externalMessageId,
      content,
      customerName: String(json.customer_name ?? "") || null,
      providerPayload: json.provider_payload ?? {},
    })

    await prisma.webhookEvent.create({
      data: { tenantId, eventType: "internal.message.incoming", payload: { external_message_id: externalMessageId, conversation_id: result.conversationId } },
    })
    return NextResponse.json(result)
  })
}

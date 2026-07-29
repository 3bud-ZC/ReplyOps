import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { handleRuntimeInbound } from "@/lib/channels/runtime"
import prisma from "@/lib/prisma"
import { blockedCorsHeaders, corsHeaders, getWebChatConnection, webChatOptionsResponse } from "../cors"

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  return webChatOptionsResponse(connectionId, request.headers.get("origin"))
}

export async function POST(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  const origin = request.headers.get("origin")
  const resolved = await getWebChatConnection(connectionId, origin)
  if (!resolved.ok) return NextResponse.json({ success: false, error: "origin_not_allowed" }, { status: resolved.response.status, headers: blockedCorsHeaders() })

  const suppliedKey = request.headers.get("x-replyops-public-key")
  if (suppliedKey !== resolved.credential.publicKey) {
    return NextResponse.json({ success: false, error: "invalid_public_key" }, { status: 401, headers: corsHeaders(origin) })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rateLimitOk = await checkRateLimit(`webchat:${connectionId}:${ip}`, 30, 60_000)
  if (!rateLimitOk) {
    return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429, headers: corsHeaders(origin) })
  }

  const body = await request.json()
  const content = String(body.message ?? "").trim()
  const sessionId = String(body.session_id ?? "").trim()
  const customerEmail = String(body.customer_email ?? "").trim().toLowerCase()
  const customerName = String(body.customer_name ?? "").trim()
  if (!content || !sessionId) {
    return NextResponse.json({ success: false, error: "message_and_session_required" }, { status: 400, headers: corsHeaders(origin) })
  }
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return NextResponse.json({ success: false, error: "invalid_customer_email" }, { status: 400, headers: corsHeaders(origin) })
  }

  const result = await handleRuntimeInbound({
    tenantId: resolved.channel.tenantId,
    channelConnectionId: resolved.channel.id,
    externalCustomerId: String(body.customer_id ?? (customerEmail || sessionId)),
    externalThreadId: sessionId,
    externalMessageId: String(body.message_id ?? `${sessionId}:${Date.now()}`),
    content,
    customerName: customerName || null,
    providerPayload: { origin, session_id: sessionId, customer_email_supplied: Boolean(customerEmail) },
  })
  if (customerEmail) {
    await prisma.customer.updateMany({
      where: { tenantId: resolved.channel.tenantId, externalId: String(body.customer_id ?? (customerEmail || sessionId)) },
      data: { email: customerEmail, name: customerName || undefined },
    })
  }

  return NextResponse.json(
    {
      success: true,
      deduplicated: result.deduplicated,
      conversation_id: result.conversationId,
      reply: result.reply,
      handoff: result.handoff,
    },
    { headers: corsHeaders(origin) },
  )
}

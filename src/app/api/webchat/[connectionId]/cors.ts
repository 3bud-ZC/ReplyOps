import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { isAllowedOrigin, readChannelCredential, WebChatCredential } from "@/lib/channels/credentials"

export async function getWebChatConnection(connectionId: string, origin: string | null) {
  const channel = await prisma.channelConnection.findUnique({ where: { connectionId } })
  if (!channel || channel.type !== "web_chat" || !channel.enabled || channel.deletedAt) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "channel_not_found" }, { status: 404 }) }
  }
  const credential = await readChannelCredential<WebChatCredential>(channel.id)
  if (!credential || !isAllowedOrigin(origin, credential.allowedOrigins)) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "origin_not_allowed" }, { status: 403 }) }
  }
  return { ok: true as const, channel, credential }
}

export function corsHeaders(origin: string | null) {
  return {
    "access-control-allow-origin": origin ?? "null",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-replyops-public-key",
    "access-control-max-age": "600",
    vary: "Origin",
  }
}

export async function webChatOptionsResponse(connectionId: string, origin: string | null) {
  const resolved = await getWebChatConnection(connectionId, origin)
  if (!resolved.ok) return resolved.response
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

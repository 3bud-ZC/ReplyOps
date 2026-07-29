import { NextRequest, NextResponse } from "next/server"
import { blockedCorsHeaders, corsHeaders, getWebChatConnection, webChatOptionsResponse } from "../cors"

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  return webChatOptionsResponse(connectionId, request.headers.get("origin"))
}

export async function GET(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  const origin = request.headers.get("origin")
  const resolved = await getWebChatConnection(connectionId, origin)
  if (!resolved.ok) return NextResponse.json({ success: false, error: "origin_not_allowed" }, { status: resolved.response.status, headers: blockedCorsHeaders() })
  const { credential } = resolved

  return NextResponse.json(
    {
      success: true,
      title: credential.title,
      assistant_name: credential.assistantName,
      welcome_message: credential.welcomeMessage,
      brand_color: credential.brandColor,
      position: credential.position,
      offline_behavior: credential.offlineBehavior,
      session_fields: {
        customer_name: "optional",
        customer_email: "optional",
      },
    },
    { headers: corsHeaders(origin) },
  )
}

import { NextRequest, NextResponse } from "next/server"
import { corsHeaders, getWebChatConnection, webChatOptionsResponse } from "../cors"

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  return webChatOptionsResponse(connectionId, request.headers.get("origin"))
}

export async function GET(request: NextRequest, context: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await context.params
  const origin = request.headers.get("origin")
  const resolved = await getWebChatConnection(connectionId, origin)
  if (!resolved.ok) return resolved.response
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
    },
    { headers: corsHeaders(origin) },
  )
}

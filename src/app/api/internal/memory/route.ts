import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "memory:read", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const conversationId = requireString(json.conversation_id, "conversation_id")
    const limit = Math.min(Number(json.limit ?? 10) || 10, 50)
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: limit },
      },
    })
    if (!conversation) {
      return NextResponse.json({ success: false, request_id: requestId, error: "conversation_not_found" }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      request_id: requestId,
      messages: conversation.messages.reverse().map((message) => ({
        id: message.id,
        direction: message.direction,
        role: message.role,
        content: message.content,
        created_at: message.createdAt,
      })),
    })
  })
}

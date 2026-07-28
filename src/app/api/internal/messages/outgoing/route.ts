import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "messages:write", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const conversationId = requireString(json.conversation_id, "conversation_id")
    const content = requireString(json.content, "content")
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId } })
    if (!conversation) {
      return NextResponse.json({ success: false, request_id: requestId, error: "conversation_not_found" }, { status: 404 })
    }
    const message = await prisma.message.create({
      data: {
        conversationId,
        direction: "outbound",
        role: "model",
        content,
        intent: String(json.intent ?? "") || null,
        confidence: typeof json.confidence === "number" ? json.confidence : null,
        knowledgeGap: Boolean(json.knowledge_gap),
        handoffRequired: Boolean(json.handoff_required),
        sourcesUsed: json.sources ?? undefined,
        actionState: json.action_state ? String(json.action_state) : null,
      },
    })
    return NextResponse.json({ success: true, request_id: requestId, message_id: message.id })
  })
}

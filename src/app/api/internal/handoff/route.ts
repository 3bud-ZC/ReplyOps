import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "handoff:write", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const conversationId = requireString(json.conversation_id, "conversation_id")
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId } })
    if (!conversation) {
      return NextResponse.json({ success: false, request_id: requestId, error: "conversation_not_found" }, { status: 404 })
    }
    const existing = await prisma.handoff.findFirst({ where: { tenantId, conversationId, status: { in: ["open", "claimed"] } } })
    if (existing) return NextResponse.json({ success: true, request_id: requestId, handoff_id: existing.id, deduplicated: true })
    const handoff = await prisma.handoff.create({
      data: {
        tenantId,
        conversationId,
        reason: String(json.reason ?? "requested"),
        priority: String(json.priority ?? "normal"),
        internalNotes: String(json.summary ?? "") || null,
      },
    })
    await prisma.auditLog.create({ data: { tenantId, action: "handoff.create", resource: "Handoff", details: { handoffId: handoff.id, requestId } } })
    return NextResponse.json({ success: true, request_id: requestId, handoff_id: handoff.id })
  })
}

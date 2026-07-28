import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "errors:write", async ({ json, requestId }) => {
    const event = await prisma.deadLetterEvent.create({
      data: {
        tenantId: typeof json.tenant_id === "string" ? json.tenant_id : null,
        source: String(json.source ?? "internal"),
        eventType: String(json.event_type ?? "execution_error"),
        payload: { request_id: requestId, payload: json.payload ?? {} },
        errorMessage: String(json.error ?? "unknown_error"),
        status: "open",
        attempts: Number(json.attempts ?? 0) || 0,
      },
    })
    return NextResponse.json({ success: true, request_id: requestId, dead_letter_id: event.id })
  })
}

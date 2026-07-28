import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "runtime:read", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const assistant = await prisma.assistantConfiguration.findUnique({ where: { tenantId } })
    if (!assistant) {
      return NextResponse.json({ success: false, request_id: requestId, error: "assistant_not_found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, request_id: requestId, assistant })
  })
}

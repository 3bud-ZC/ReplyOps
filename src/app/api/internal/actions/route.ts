import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "actions:write", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const actionDefinitionId = requireString(json.action_definition_id, "action_definition_id")
    const definition = await prisma.actionDefinition.findFirst({ where: { id: actionDefinitionId, tenantId, deletedAt: null, enabled: true } })
    if (!definition) {
      return NextResponse.json({ success: false, request_id: requestId, error: "action_definition_not_found" }, { status: 404 })
    }
    const action = await prisma.actionRequest.create({
      data: {
        actionDefinitionId,
        status: definition.requiresApproval ? "pending_approval" : "pending",
        executionLog: { request_id: requestId, payload: json.payload ?? {} },
      },
    })
    await prisma.auditLog.create({ data: { tenantId, action: "action.create", resource: "ActionRequest", details: { actionRequestId: action.id, requestId } } })
    return NextResponse.json({ success: true, request_id: requestId, action_request_id: action.id, status: action.status })
  })
}

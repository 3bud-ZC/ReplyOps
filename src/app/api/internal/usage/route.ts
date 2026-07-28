import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "usage:write", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const metric = requireString(json.metric, "metric")
    const value = Number(json.value)
    if (!Number.isFinite(value)) throw new Error("invalid_payload")
    const created = await prisma.usageMetric.create({ data: { tenantId, metric, value } })
    return NextResponse.json({ success: true, request_id: requestId, usage_metric_id: created.id })
  })
}

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "runtime:read", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")

    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        deletedAt: null,
      },
      include: {
        assistantConfiguration: true,
        channelConnections: {
          where: { deletedAt: null, enabled: true },
          select: {
            id: true,
            type: true,
            connectionId: true,
            status: true,
            displayName: true,
            externalAccountId: true,
            lastVerifiedTime: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json({ success: false, request_id: requestId, error: "tenant_not_found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
        primaryLanguage: tenant.primaryLanguage,
      },
      assistant: tenant.assistantConfiguration,
      channels: tenant.channelConnections,
    })
  })
}

import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AuditLogsPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const logs = await prisma.auditLog.findMany({
    where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
    include: { tenant: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <OperationalPage
      title="Audit Logs"
      description="Security and operational events stored without secret values."
    >
      <div className="rounded-lg border bg-card">
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No audit events recorded.</p>
        ) : logs.map((log) => (
          <div key={log.id} className="border-b p-4 last:border-b-0">
            <p className="font-medium">{log.action}</p>
            <p className="text-sm text-muted-foreground">
              {log.tenant?.name ?? "Platform"} · {log.user?.email ?? "System"} · {log.createdAt.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </OperationalPage>
  )
}

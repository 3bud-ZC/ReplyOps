import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const metrics = await prisma.usageMetric.findMany({
    where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <OperationalPage
      title="Analytics"
      description="Persisted usage and operations metrics. Empty state means no measured events, not zero performance."
    >
      <div className="rounded-lg border bg-card">
        {metrics.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No usage metrics recorded.</p>
        ) : metrics.map((metric) => (
          <div key={metric.id} className="flex justify-between border-b p-4 last:border-b-0">
            <div>
              <p className="font-medium">{metric.metric}</p>
              <p className="text-sm text-muted-foreground">{metric.tenant.name}</p>
            </div>
            <p className="font-mono">{metric.value}</p>
          </div>
        ))}
      </div>
    </OperationalPage>
  )
}

import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ServicesPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const services = await prisma.service.findMany({
    where: isPlatformOwner ? { deletedAt: null } : { tenantId: { in: tenantIds }, deletedAt: null },
    include: { tenant: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  return (
    <OperationalPage
      title="Services"
      description="Service catalog records used for grounded support answers."
      unavailableAction="Create/edit controls are disabled until service mutation forms are connected to audited server actions."
    >
      <div className="rounded-lg border bg-card">
        {services.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No services stored.</p>
        ) : (
          <div className="divide-y">
            {services.map((service) => (
              <div key={service.id} className="p-4">
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-muted-foreground">{service.tenant.name} · {service.duration ?? "No duration"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </OperationalPage>
  )
}

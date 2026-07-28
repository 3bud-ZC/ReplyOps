import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const products = await prisma.product.findMany({
    where: isPlatformOwner ? { deletedAt: null } : { tenantId: { in: tenantIds }, deletedAt: null },
    include: { tenant: true, variants: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  return (
    <OperationalPage
      title="Products"
      description="Real product records available to AI answers and actions."
      unavailableAction="Create/edit controls are disabled until product mutation forms are connected to audited server actions."
    >
      <div className="rounded-lg border bg-card">
        {products.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No products stored.</p>
        ) : (
          <div className="divide-y">
            {products.map((product) => (
              <div key={product.id} className="p-4">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">{product.tenant.name} · {product.currency} · {product.variants.length} variants</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </OperationalPage>
  )
}

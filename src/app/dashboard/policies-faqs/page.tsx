import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function PoliciesFaqsPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const where = isPlatformOwner ? { deletedAt: null } : { tenantId: { in: tenantIds }, deletedAt: null }
  const [policies, faqs] = await Promise.all([
    prisma.policy.findMany({ where, include: { tenant: true }, orderBy: { updatedAt: "desc" }, take: 25 }),
    prisma.fAQ.findMany({ where, include: { tenant: true }, orderBy: { updatedAt: "desc" }, take: 25 }),
  ])

  return (
    <OperationalPage
      title="Policies and FAQs"
      description="Tenant policies and frequent answers used as governed knowledge."
      unavailableAction="Create/edit controls are disabled until policy and FAQ mutation forms are connected to audited server actions."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Policies</h2>
          {policies.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No policies stored.</p> : policies.map((policy) => (
            <div key={policy.id} className="border-t py-3 first:mt-3">
              <p className="font-medium">{policy.title}</p>
              <p className="text-sm text-muted-foreground">{policy.tenant.name} · {policy.type}</p>
            </div>
          ))}
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">FAQs</h2>
          {faqs.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No FAQs stored.</p> : faqs.map((faq) => (
            <div key={faq.id} className="border-t py-3 first:mt-3">
              <p className="font-medium">{faq.question}</p>
              <p className="text-sm text-muted-foreground">{faq.tenant.name}</p>
            </div>
          ))}
        </section>
      </div>
    </OperationalPage>
  )
}

import { cancelFollowupJob, createFollowupRule, scheduleFollowupJob, setCustomerConsent } from "@/app/actions/follow-ups"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { StatusBadge } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function FollowUpsPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const tenantWhere = isPlatformOwner ? { deletedAt: null } : { id: { in: tenantIds }, deletedAt: null }
  const [tenants, rules, conversations, customers] = await Promise.all([
    prisma.tenant.findMany({ where: tenantWhere, orderBy: { name: "asc" } }),
    prisma.followupRule.findMany({
      where: isPlatformOwner ? { deletedAt: null } : { tenantId: { in: tenantIds }, deletedAt: null },
      include: { tenant: true, jobs: { take: 8, orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.conversation.findMany({
      where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
      include: { tenant: true, customer: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.customer.findMany({
      where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
      include: { tenant: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ])

  return (
    <OperationalPage
      title="Follow-ups"
      description="Database-owned follow-up rules and jobs with consent, opt-out, quiet hours, caps, and stop conditions."
    >
      <form action={createFollowupRule} className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">Create rule</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select name="tenantId" aria-label="Business" required className="h-10 rounded-md border bg-background px-3 text-sm">
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <Input name="minimumDelay" type="number" defaultValue={3600} min={300} />
          <Input name="maximumAttempts" type="number" defaultValue={3} min={1} max={10} />
          <Input name="timezone" defaultValue="Africa/Cairo" />
          <Input name="quietHoursStart" defaultValue="22:00" />
          <Input name="quietHoursEnd" defaultValue="08:00" />
          <Input name="customerDailyCap" type="number" defaultValue={1} min={1} />
          <Input name="tenantDailyCap" type="number" defaultValue={50} min={1} />
          <textarea name="template" aria-label="Follow-up template" className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm md:col-span-4" defaultValue="Can we help with anything else?" />
          <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" /> Enabled</label>
          <label className="flex items-center gap-2 text-sm"><input name="consentRequired" type="checkbox" defaultChecked /> Consent required</label>
        </div>
        <Button className="mt-4" type="submit" disabled={tenants.length === 0}>Create rule</Button>
      </form>

      <section className="rounded-lg border bg-card shadow-sm">
        {rules.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No follow-up rules stored. Follow-ups are disabled by default.</p>
        ) : rules.map((rule) => (
          <article key={rule.id} className="border-b p-4 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-lg font-semibold">{rule.tenant.name}</h2>
              <StatusBadge status={rule.enabled ? "enabled" : "disabled"} />
              <StatusBadge status={rule.consentRequired ? "consent required" : "consent optional"} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Quiet hours {rule.quietHoursStart}-{rule.quietHoursEnd} · max attempts {rule.maximumAttempts} · minimum delay {rule.minimumDelay}s
            </p>
            <form action={scheduleFollowupJob} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="followupRuleId" value={rule.id} />
              <select name="conversationId" aria-label="Conversation" required className="h-10 min-w-64 rounded-md border bg-background px-3 text-sm">
                {conversations.filter((conversation) => conversation.tenantId === rule.tenantId).map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>{conversation.customer.name ?? conversation.customer.externalId ?? conversation.id}</option>
                ))}
              </select>
              <Button type="submit" variant="outline">Schedule job</Button>
            </form>
            <div className="mt-4 space-y-2">
              {rule.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs queued.</p>
              ) : rule.jobs.map((job) => (
                <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div>
                    <StatusBadge status={job.status} />
                    <p className="mt-1 text-muted-foreground">Scheduled {job.scheduledFor.toLocaleString()} · attempts {job.attempts}</p>
                  </div>
                  <form action={cancelFollowupJob}>
                    <input type="hidden" name="followupJobId" value={job.id} />
                    <Button type="submit" size="sm" variant="outline">Cancel</Button>
                  </form>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">Customer consent</h2>
        <div className="mt-4 grid gap-3">
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers stored.</p>
          ) : customers.map((customer) => (
            <div key={customer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="font-medium">{customer.name ?? customer.externalId ?? "Unknown customer"}</p>
                <p className="text-sm text-muted-foreground">{customer.tenant.name}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={customer.marketingConsent && !customer.optedOutAt ? "consented" : "opted out"} />
                <form action={setCustomerConsent}>
                  <input type="hidden" name="customerId" value={customer.id} />
                  <input type="hidden" name="consent" value={customer.marketingConsent && !customer.optedOutAt ? "false" : "true"} />
                  <Button type="submit" variant="outline" size="sm">{customer.marketingConsent && !customer.optedOutAt ? "Opt out" : "Mark consent"}</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </OperationalPage>
  )
}

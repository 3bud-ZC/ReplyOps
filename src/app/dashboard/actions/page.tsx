import { approveActionRequest, createActionDefinition, executeActionRequest, rejectActionRequest, requestActionExecution } from "@/app/actions/actions"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { StatusBadge } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ActionsPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const tenantWhere = isPlatformOwner ? { deletedAt: null } : { id: { in: tenantIds }, deletedAt: null }
  const [tenants, definitions] = await Promise.all([
    prisma.tenant.findMany({ where: tenantWhere, orderBy: { name: "asc" } }),
    prisma.actionDefinition.findMany({
      where: isPlatformOwner ? { deletedAt: null } : { tenantId: { in: tenantIds }, deletedAt: null },
      include: { tenant: true, requests: { include: { approvals: true }, take: 8, orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ])

  return (
    <OperationalPage
      title="Actions and Approvals"
      description="Configure SSRF-guarded HTTP actions, collect execution requests, approve sensitive actions, and retry failures."
    >
      <form action={createActionDefinition} className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">Create HTTP action</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <select name="tenantId" aria-label="Business" required className="h-10 rounded-md border bg-background px-3 text-sm">
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <Input name="name" required placeholder="request_quote" />
          <select name="method" aria-label="HTTP method" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="POST">
            {["POST", "GET", "PUT", "PATCH"].map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
          <Input name="url" required placeholder="https://api.example.com/action" />
          <Input name="requiredFields" placeholder="name,phone,details" />
          <Input name="allowedDomains" placeholder="api.example.com" />
          <Input name="timeout" type="number" defaultValue={5000} min={1000} max={30000} />
          <Input name="authHeader" type="password" placeholder="Authorization header value" autoComplete="off" />
          <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> Enabled</label>
          <label className="flex items-center gap-2 text-sm"><input name="requiresApproval" type="checkbox" defaultChecked /> Requires approval</label>
          <textarea name="headers" aria-label="Headers JSON" className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm lg:col-span-2" placeholder='{"x-client":"replyops"}' />
          <textarea name="requestTemplate" aria-label="Request template JSON" className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm lg:col-span-2" placeholder='{"source":"replyops"}' />
        </div>
        <Button className="mt-4" type="submit" disabled={tenants.length === 0}>Create action</Button>
      </form>

      <section className="rounded-lg border bg-card shadow-sm">
        {definitions.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No action definitions stored.</p>
        ) : definitions.map((definition) => (
          <article key={definition.id} className="border-b p-4 last:border-b-0">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-lg font-semibold">{definition.name}</p>
                  <StatusBadge status={definition.enabled ? "enabled" : "disabled"} />
                  <StatusBadge status={definition.requiresApproval ? "approval required" : "auto approved"} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{definition.tenant.name} · {definition.method} · {definition.url}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Allowed domains: {definition.allowedDomains.join(", ") || "resolved host must be public"}
                </p>
              </div>
              <form action={requestActionExecution} className="grid gap-2 sm:min-w-96">
                <input type="hidden" name="actionDefinitionId" value={definition.id} />
                <textarea name="input" aria-label="Action input JSON" className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" placeholder='{"customer":"..."}' />
                <Button type="submit" variant="outline">Create request</Button>
              </form>
            </div>
            <div className="mt-4 space-y-3">
              {definition.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              ) : definition.requests.map((request) => (
                <div key={request.id} className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <StatusBadge status={request.status} />
                    <p className="mt-2 text-xs text-muted-foreground">Request {request.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={approveActionRequest}>
                      <input type="hidden" name="actionRequestId" value={request.id} />
                      <Button type="submit" size="sm" variant="outline">Approve</Button>
                    </form>
                    <form action={rejectActionRequest}>
                      <input type="hidden" name="actionRequestId" value={request.id} />
                      <Button type="submit" size="sm" variant="outline">Reject</Button>
                    </form>
                    <form action={executeActionRequest}>
                      <input type="hidden" name="actionRequestId" value={request.id} />
                      <Button type="submit" size="sm">Execute</Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </OperationalPage>
  )
}

import { Role } from "@prisma/client"
import { changeMemberRole, removeMembership, setUserActive } from "@/app/actions/team"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { EmptyState, StatusBadge } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { Users } from "lucide-react"
import { InviteMemberForm } from "./TeamForms"

export const dynamic = "force-dynamic"

export default async function TeamPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const tenantWhere = isPlatformOwner ? { deletedAt: null } : { id: { in: tenantIds }, deletedAt: null }
  const [tenants, memberships, invitations] = await Promise.all([
    prisma.tenant.findMany({ where: tenantWhere, orderBy: { name: "asc" } }),
    prisma.membership.findMany({
      where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
      include: { user: true, tenant: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invitation.findMany({
      where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
      include: { tenant: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return (
    <OperationalPage
      title="Team"
      description="Invite users, assign tenant roles, remove memberships, and deactivate accounts with audit events."
    >
      <InviteMemberForm tenants={tenants.map((tenant) => ({ id: tenant.id, name: tenant.name }))} />

      <section className="rounded-lg border bg-card shadow-sm">
        {memberships.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No members"
            description="Tenant memberships will appear here after users are added."
          />
        ) : (
          <div className="divide-y">
            {memberships.map((membership) => (
              <div key={membership.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_auto_auto] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{membership.user.name ?? membership.user.email}</p>
                    <StatusBadge status={membership.active && membership.user.active ? "active" : "inactive"} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{membership.tenant.name} · {membership.user.email}</p>
                </div>
                <form action={changeMemberRole} className="flex flex-wrap gap-2">
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <select name="role" defaultValue={membership.role} className="h-10 rounded-md border bg-background px-3 text-sm">
                    {Object.values(Role).map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <Button type="submit" variant="outline">Save role</Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form action={removeMembership}>
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <Button type="submit" variant="outline">Remove membership</Button>
                  </form>
                  {isPlatformOwner && (
                    <form action={setUserActive}>
                      <input type="hidden" name="userId" value={membership.userId} />
                      <input type="hidden" name="active" value={membership.user.active ? "false" : "true"} />
                      <Button type="submit" variant="outline">{membership.user.active ? "Deactivate user" : "Reactivate user"}</Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">Recent invitations</h2>
        <div className="mt-4 divide-y">
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invitations stored.</p>
          ) : (
            invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-muted-foreground">{invitation.tenant.name} · {invitation.role}</p>
                </div>
                <StatusBadge status={invitation.acceptedAt ? "accepted" : invitation.expiresAt < new Date() ? "expired" : "pending"} />
              </div>
            ))
          )}
        </div>
      </section>
    </OperationalPage>
  )
}

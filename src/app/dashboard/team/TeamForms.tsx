"use client"

import { useState, useTransition } from "react"
import { Role } from "@prisma/client"
import { inviteTeamMember } from "@/app/actions/team"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function InviteMemberForm({ tenants }: { tenants: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition()
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="rounded-lg border bg-card p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        const formData = new FormData(event.currentTarget)
        startTransition(async () => {
          try {
            const result = await inviteTeamMember(formData)
            setTemporaryPassword(result.temporaryPassword)
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "invite_failed")
          }
        })
      }}
    >
      <h2 className="font-heading text-lg font-semibold">Invite member</h2>
      <p className="mt-1 text-sm text-muted-foreground">Creates or reactivates a user, assigns tenant role, and records an invitation audit event.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <select name="tenantId" required className="h-10 rounded-md border bg-background px-3 text-sm">
          {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        <Input name="email" type="email" required placeholder="email@example.com" />
        <Input name="name" placeholder="Name" />
        <select name="role" required className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={Role.agent}>
          {[Role.tenant_owner, Role.tenant_admin, Role.agent, Role.viewer].map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <Button type="submit" disabled={pending || tenants.length === 0}>{pending ? "Inviting" : "Invite"}</Button>
      </div>
      {temporaryPassword && (
        <output className="mt-4 block rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Temporary password shown once: <span className="font-mono">{temporaryPassword}</span>
        </output>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  )
}

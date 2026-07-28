import { archiveTenant, createTenant, restoreTenant, updateTenant } from "@/app/actions/tenants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { Building2, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function BusinessesPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")

  const tenants = isPlatformOwner
    ? await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } })
    : await prisma.tenant.findMany({
        where: { id: { in: user.memberships.map((membership) => membership.tenantId) } },
        orderBy: { createdAt: "desc" },
      })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage tenant settings stored in ReplyOps.</p>
      </div>

      {isPlatformOwner && (
        <form action={createTenant} className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Create business</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-slug">Slug</Label>
              <Input id="new-slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-industry">Industry</Label>
              <Input id="new-industry" name="industry" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-timezone">Timezone</Label>
              <Input id="new-timezone" name="timezone" defaultValue="Africa/Cairo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-languages">Supported languages</Label>
              <Input id="new-languages" name="supportedLanguages" defaultValue="ar,en" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-currency">Currency</Label>
              <Input id="new-currency" name="defaultCurrency" defaultValue="EGP" />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="new-description">Description</Label>
              <Input id="new-description" name="description" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="enabled" type="checkbox" defaultChecked />
              Enabled
            </label>
          </div>
          <Button className="mt-4" type="submit">Create</Button>
        </form>
      )}

      <div className="grid gap-4">
        {tenants.map((tenant) => (
          <form key={tenant.id} action={updateTenant} className="rounded-lg border bg-card p-5">
            <input type="hidden" name="tenantId" value={tenant.id} />
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">{tenant.name}</h2>
                  <p className="text-sm text-muted-foreground">{tenant.deletedAt ? "Archived" : tenant.enabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                {tenant.deletedAt ? (
                  <Button formAction={restoreTenant} variant="outline">Restore</Button>
                ) : (
                  <Button formAction={archiveTenant} variant="outline">Archive</Button>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" defaultValue={tenant.name} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input name="slug" defaultValue={tenant.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input name="industry" defaultValue={tenant.industry ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input name="timezone" defaultValue={tenant.timezone} />
              </div>
              <div className="space-y-2">
                <Label>Primary language</Label>
                <Input name="primaryLanguage" defaultValue={tenant.primaryLanguage} />
              </div>
              <div className="space-y-2">
                <Label>Supported languages</Label>
                <Input name="supportedLanguages" defaultValue={tenant.supportedLanguages.join(",")} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input name="defaultCurrency" defaultValue={tenant.defaultCurrency} />
              </div>
              <div className="space-y-2">
                <Label>Retention days</Label>
                <Input name="dataRetentionDays" type="number" min={1} defaultValue={tenant.dataRetentionDays} />
              </div>
              <label className="flex items-center gap-2 pt-8 text-sm">
                <input name="enabled" type="checkbox" defaultChecked={tenant.enabled} />
                Enabled
              </label>
              <div className="space-y-2 md:col-span-3">
                <Label>Description</Label>
                <Input name="description" defaultValue={tenant.description ?? ""} />
              </div>
            </div>
          </form>
        ))}

        {tenants.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <h2 className="font-semibold">No businesses found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a business to start tenant-scoped configuration.</p>
          </div>
        )}
      </div>
    </div>
  )
}

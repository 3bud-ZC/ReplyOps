import { activateInternalApiKey, revokeInternalApiKey } from "@/app/actions/api-keys"
import { Button } from "@/components/ui/button"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { CreateApiKeyForm, RotateApiKeyForm } from "./ApiKeyForms"

export const dynamic = "force-dynamic"

function keyStatus(key: { enabled: boolean; revokedAt: Date | null; expiresAt: Date | null }) {
  if (key.revokedAt) return "revoked"
  if (key.expiresAt && key.expiresAt < new Date()) return "expired"
  return key.enabled ? "active" : "disabled"
}

export default async function InternalApiKeysPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>
  const isPlatformOwner = user.memberships.some((membership) => membership.role === Role.platform_owner)
  if (!isPlatformOwner) return <div>Forbidden</div>

  const [tenants, keys, audits] = await Promise.all([
    prisma.tenant.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.apiKey.findMany({
      where: { deletedAt: null },
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: { action: { startsWith: "api_key." } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return (
    <OperationalPage
      title="Internal API Keys"
      description="HMAC credentials for n8n and private runtime integrations."
    >
      <CreateApiKeyForm tenants={tenants} />
      <RotateApiKeyForm keys={keys.filter((key) => !key.revokedAt).map((key) => ({ id: key.id, name: `${key.name} (${key.keyId})` }))} />

      <div className="rounded-lg border bg-card">
        {keys.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No internal API keys stored.</p>
        ) : (
          <div className="divide-y">
            {keys.map((key) => (
              <div key={key.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{key.keyId}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {key.tenant.name} · {keyStatus(key)} · created {key.createdAt.toISOString()} · last used {key.lastUsedAt?.toISOString() ?? "never"} · expires {key.expiresAt?.toISOString() ?? "never"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{key.scopes.join(", ") || "No scopes"}</p>
                </div>
                <div className="flex gap-2 self-start">
                  {key.revokedAt || !key.enabled ? (
                    <form action={activateInternalApiKey}>
                      <input type="hidden" name="id" value={key.id} />
                      <Button variant="outline" type="submit">Activate</Button>
                    </form>
                  ) : (
                    <form action={revokeInternalApiKey}>
                      <input type="hidden" name="id" value={key.id} />
                      <Button variant="outline" type="submit">Revoke</Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <h2 className="border-b p-4 font-semibold">Audit history</h2>
        {audits.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No API key audit events.</p>
        ) : (
          <div className="divide-y">
            {audits.map((event) => (
              <div key={event.id} className="p-4 text-sm">
                <p className="font-medium">{event.action}</p>
                <p className="text-muted-foreground">{event.createdAt.toISOString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </OperationalPage>
  )
}

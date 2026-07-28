import { connectTelegram, connectWhatsApp, createWebChatConnection, disconnectChannel } from "@/app/actions/channels"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { EmptyState, StatusBadge } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { MessageSquare } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ChannelsPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const tenants = await prisma.tenant.findMany({
    where: isPlatformOwner ? { deletedAt: null } : { id: { in: tenantIds }, deletedAt: null },
    orderBy: { name: "asc" },
  })
  const connections = await prisma.channelConnection.findMany({
    where: isPlatformOwner ? { deletedAt: null } : { tenantId: { in: tenantIds }, deletedAt: null },
    include: { tenant: true, credentials: true },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <OperationalPage
      title="Channels"
      description="Connect Telegram, Web Chat, and WhatsApp credentials. Secrets are encrypted and never shown after save."
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <form action={connectTelegram} className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold">Telegram</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Validates `getMe`, stores the token encrypted, creates a connection ID, and registers the ReplyOps webhook.</p>
          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="telegram-tenant">Business</Label>
              <select id="telegram-tenant" name="tenantId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram-token">Bot token</Label>
              <Input id="telegram-token" name="botToken" type="password" required autoComplete="off" />
            </div>
          </div>
          <Button className="mt-4" type="submit" disabled={tenants.length === 0}>Connect Telegram</Button>
        </form>

        <form action={createWebChatConnection} className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold">Web Chat</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Creates a public key, origin allowlist, embed endpoint, and runtime chat connection.</p>
          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="webchat-tenant">Business</Label>
              <select id="webchat-tenant" name="tenantId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="title" defaultValue="ReplyOps Chat" aria-label="Widget title" />
              <Input name="assistantName" defaultValue="Assistant" aria-label="Assistant name" />
            </div>
            <Input name="welcomeMessage" defaultValue="How can I help?" aria-label="Welcome message" />
            <Input name="brandColor" defaultValue="#0F766E" aria-label="Brand color" />
            <textarea name="allowedOrigins" aria-label="Allowed origins" required className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://example.com" />
          </div>
          <Button className="mt-4" type="submit" disabled={tenants.length === 0}>Create Web Chat</Button>
        </form>

        <form action={connectWhatsApp} className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Software path is implemented; live connection requires approved Meta credentials.</p>
          <div className="mt-4 grid gap-3">
            <select name="tenantId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" aria-label="Business">
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
            <Input name="appId" placeholder="App ID" />
            <Input name="appSecret" type="password" placeholder="App Secret" autoComplete="off" />
            <Input name="accessToken" type="password" placeholder="Access Token" autoComplete="off" />
            <Input name="phoneNumberId" placeholder="Phone Number ID" />
            <Input name="businessAccountId" placeholder="Business Account ID" />
            <Input name="verifyToken" type="password" placeholder="Verify Token" autoComplete="off" />
            <Input name="graphApiVersion" defaultValue="v21.0" />
          </div>
          <Button className="mt-4" type="submit" disabled={tenants.length === 0}>Validate and Connect</Button>
        </form>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        {connections.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-10 w-10" />}
            title="No channel connections"
            description="Connect Telegram, create a Web Chat widget, or add Meta credentials for WhatsApp."
          />
        ) : (
          <div className="divide-y">
            {connections.map((connection) => {
              const embedSnippet =
                connection.type === "web_chat"
                  ? `<script async src="https://replyops.abud.fun/api/webchat/${connection.connectionId}/embed.js" data-replyops-key="${connection.externalAccountId ?? ""}"></script>`
                  : null
              return (
                <div key={connection.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{connection.displayName}</p>
                      <StatusBadge status={connection.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {connection.tenant.name} · {connection.type} · {connection.connectionId}
                    </p>
                    {embedSnippet && (
                      <code className="mt-3 block overflow-x-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">
                        {embedSnippet}
                      </code>
                    )}
                  </div>
                  <form action={disconnectChannel}>
                    <input type="hidden" name="channelConnectionId" value={connection.id} />
                    <Button type="submit" variant="outline">Disconnect</Button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </OperationalPage>
  )
}

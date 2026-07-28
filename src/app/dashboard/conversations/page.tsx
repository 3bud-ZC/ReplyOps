import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { EmptyState, StatusBadge } from "@/components/dashboard/primitives"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { MessagesSquare } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; status?: string; channel?: string }>
}) {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const params = await searchParams
  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const scopedWhere = isPlatformOwner ? {} : { tenantId: { in: tenantIds } }
  const where = {
    ...scopedWhere,
    ...(params.status ? { status: params.status } : {}),
    ...(params.channel ? { channelConnection: { type: params.channel } } : {}),
  }
  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      tenant: true,
      customer: true,
      channelConnection: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      handoffs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
  })
  const selected = conversations.find((conversation) => conversation.id === params.selected) ?? conversations[0]
  const selectedWithMessages = selected
    ? await prisma.conversation.findFirst({
        where: { id: selected.id, ...scopedWhere },
        include: {
          tenant: true,
          customer: true,
          channelConnection: true,
          messages: { orderBy: { createdAt: "asc" }, take: 100 },
          handoffs: { orderBy: { createdAt: "desc" }, take: 5 },
          internalNotes: { orderBy: { createdAt: "desc" }, take: 5, include: { author: true } },
        },
      })
    : null

  return (
    <OperationalPage
      title="Conversations"
      description="Three-panel support inbox with persisted message history, delivery state, sources, handoff state, and customer context."
    >
      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="h-10 w-10" />}
          title="No conversations yet"
          description="Telegram, Web Chat, WhatsApp, or Test Lab messages will appear here after they are persisted."
        />
      ) : (
        <div className="grid min-h-[650px] overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[320px_1fr_340px]">
          <aside className="border-b lg:border-b-0 lg:border-e">
            <div className="border-b p-4">
              <h2 className="font-heading font-semibold">Inbox</h2>
              <p className="text-sm text-muted-foreground">{conversations.length} recent conversations</p>
            </div>
            <div className="max-h-[620px] divide-y overflow-y-auto">
              {conversations.map((conversation) => (
                <a
                  key={conversation.id}
                  href={`/dashboard/conversations?selected=${conversation.id}`}
                  className={`block p-4 transition hover:bg-secondary/70 ${selected?.id === conversation.id ? "bg-secondary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{conversation.customer.name ?? conversation.customer.externalId ?? "Unknown customer"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{conversation.channelConnection.type} · {conversation.tenant.name}</p>
                    </div>
                    <StatusBadge status={conversation.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{conversation.messages[0]?.content ?? "No messages stored"}</p>
                </a>
              ))}
            </div>
          </aside>

          <section className="flex min-w-0 flex-col border-b lg:border-b-0 lg:border-e">
            <div className="border-b p-4">
              <h2 className="font-heading font-semibold">{selectedWithMessages?.customer.name ?? selectedWithMessages?.customer.externalId ?? "Conversation"}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedWithMessages?.channelConnection.displayName} · {selectedWithMessages?.externalThreadId ?? "No external thread"}
              </p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-background p-4">
              {selectedWithMessages?.messages.map((message) => (
                <div key={message.id} className={`flex ${message.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[82%] rounded-lg border p-3 text-sm shadow-sm ${message.direction === "inbound" ? "bg-card" : "bg-primary text-primary-foreground"}`}>
                    <p className="leading-6">{message.content}</p>
                    <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${message.direction === "inbound" ? "text-muted-foreground" : "text-primary-foreground/80"}`}>
                      <span>{message.role}</span>
                      <span>{message.deliveryStatus}</span>
                      {message.knowledgeGap && <span>Knowledge gap</span>}
                      {message.confidence != null && <span>{Math.round(message.confidence * 100)}% confidence</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4 p-4">
            <section className="rounded-md border p-4">
              <h3 className="font-heading font-semibold">Customer</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="text-muted-foreground">Name</dt><dd>{selectedWithMessages?.customer.name ?? "Unknown"}</dd></div>
                <div><dt className="text-muted-foreground">External ID</dt><dd className="break-all">{selectedWithMessages?.customer.externalId ?? "Not stored"}</dd></div>
                <div><dt className="text-muted-foreground">Phone</dt><dd>{selectedWithMessages?.customer.phone ?? "Not stored"}</dd></div>
              </dl>
            </section>
            <section className="rounded-md border p-4">
              <h3 className="font-heading font-semibold">AI and handoff</h3>
              <div className="mt-3 space-y-2 text-sm">
                <p>Automation: {selectedWithMessages?.automationPaused ? "paused" : "active"}</p>
                <p>Latest handoff: {selectedWithMessages?.handoffs[0]?.status ?? "none"}</p>
              </div>
            </section>
            <section className="rounded-md border p-4">
              <h3 className="font-heading font-semibold">Internal notes</h3>
              <div className="mt-3 space-y-3">
                {selectedWithMessages?.internalNotes.length ? (
                  selectedWithMessages.internalNotes.map((note) => (
                    <div key={note.id} className="rounded-md bg-muted p-3 text-sm">
                      <p>{note.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{note.author?.name ?? note.author?.email ?? "System"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No notes.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </OperationalPage>
  )
}

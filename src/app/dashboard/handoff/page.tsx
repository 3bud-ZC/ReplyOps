import { addHandoffNote, claimHandoff, releaseHandoff, replyFromHandoff, resolveHandoff, resumeConversationAutomation } from "@/app/actions/handoff"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { EmptyState, StatusBadge } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { UserCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function HandoffPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const handoffs = await prisma.handoff.findMany({
    where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
    include: {
      tenant: true,
      conversation: {
        include: {
          customer: true,
          channelConnection: true,
          messages: { orderBy: { createdAt: "desc" }, take: 6 },
        },
      },
      assignments: { include: { user: true } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 4 },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  return (
    <OperationalPage
      title="Human Handoff"
      description="Claim customer escalations, add internal notes, reply through connected channels, and resume automation."
    >
      {handoffs.length === 0 ? (
        <EmptyState
          icon={<UserCircle className="h-10 w-10" />}
          title="No handoffs"
          description="Customer requests for human support will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {handoffs.map((handoff) => (
            <article key={handoff.id} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold">{handoff.conversation.customer.name ?? "Unknown customer"}</h2>
                    <StatusBadge status={handoff.status} />
                    <StatusBadge status={handoff.priority} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {handoff.tenant.name} · {handoff.conversation.channelConnection.type} · {handoff.conversation.status}
                  </p>
                  {handoff.reason && <p className="mt-3 text-sm leading-6">{handoff.reason}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Assigned: {handoff.assignments.map((assignment) => assignment.user.name ?? assignment.user.email).join(", ") || "Nobody"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={claimHandoff}>
                    <input type="hidden" name="handoffId" value={handoff.id} />
                    <Button type="submit" variant="outline">Claim</Button>
                  </form>
                  <form action={releaseHandoff}>
                    <input type="hidden" name="handoffId" value={handoff.id} />
                    <Button type="submit" variant="outline">Release</Button>
                  </form>
                  <form action={resolveHandoff}>
                    <input type="hidden" name="handoffId" value={handoff.id} />
                    <Button type="submit">Resolve</Button>
                  </form>
                  <form action={resumeConversationAutomation}>
                    <input type="hidden" name="handoffId" value={handoff.id} />
                    <Button type="submit" variant="outline">Resume AI</Button>
                  </form>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <section className="rounded-md border bg-background p-4">
                  <h3 className="font-medium">Recent messages</h3>
                  <div className="mt-3 space-y-3">
                    {handoff.conversation.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No messages stored.</p>
                    ) : (
                      handoff.conversation.messages.map((message) => (
                        <div key={message.id} className="rounded-md bg-muted p-3 text-sm">
                          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>{message.direction} · {message.role}</span>
                            <span>{message.deliveryStatus}</span>
                          </div>
                          <p className="leading-6">{message.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-md border bg-background p-4">
                  <h3 className="font-medium">Agent workspace</h3>
                  <form action={replyFromHandoff} className="mt-3 grid gap-3">
                    <input type="hidden" name="handoffId" value={handoff.id} />
                    <textarea name="content" required className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm" placeholder="Write customer reply" />
                    <Button type="submit">Send reply</Button>
                  </form>
                  <form action={addHandoffNote} className="mt-4 grid gap-3 border-t pt-4">
                    <input type="hidden" name="handoffId" value={handoff.id} />
                    <textarea name="body" required className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm" placeholder="Internal note" />
                    <Button type="submit" variant="outline">Add note</Button>
                  </form>
                  <div className="mt-4 space-y-2">
                    {handoff.notes.map((note) => (
                      <div key={note.id} className="rounded-md border p-3 text-sm">
                        <p>{note.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{note.author?.name ?? note.author?.email ?? "System"}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          ))}
        </div>
      )}
    </OperationalPage>
  )
}

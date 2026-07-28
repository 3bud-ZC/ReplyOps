import Link from "next/link"
import { cookies } from "next/headers"
import { AlertTriangle, Database, MessageSquare, UserCircle } from "lucide-react"
import { MetricCard, PageHeader, StatusBadge, StatusCard } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { normalizeLocale } from "@/lib/i18n"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return "No data"
  return `${Math.round((numerator / denominator) * 100)}%`
}

export default async function DashboardOverview() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const locale = normalizeLocale((await cookies()).get("replyops_locale")?.value)
  const dateFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const tenantWhere = isPlatformOwner ? {} : { tenantId: { in: tenantIds } }

  const [
    conversationsToday,
    activeConversations,
    totalConversations,
    handoffOpen,
    knowledgeGaps,
    outboundAutomated,
    channelConnections,
    pendingApprovals,
    pendingFollowups,
    recentConversations,
    recentHandoffs,
    recentAuditLogs,
    deadLetters,
    readyKnowledge,
    failedKnowledge,
    usageMetrics,
  ] = await Promise.all([
    prisma.conversation.count({ where: { ...tenantWhere, createdAt: { gte: startOfDay } } }),
    prisma.conversation.count({ where: { ...tenantWhere, status: "active" } }),
    prisma.conversation.count({ where: tenantWhere }),
    prisma.handoff.count({ where: { ...tenantWhere, status: { in: ["open", "claimed"] } } }),
    prisma.message.count({ where: { knowledgeGap: true, conversation: tenantWhere } }),
    prisma.message.count({ where: { direction: "outbound", role: "model", conversation: tenantWhere } }),
    prisma.channelConnection.findMany({
      where: { ...tenantWhere, deletedAt: null },
      include: { tenant: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.actionApproval.count({ where: { status: "pending", actionRequest: { actionDefinition: tenantWhere } } }),
    prisma.followupJob.count({ where: { status: "pending", followupRule: tenantWhere } }),
    prisma.conversation.findMany({
      where: tenantWhere,
      include: {
        tenant: true,
        customer: true,
        channelConnection: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.handoff.findMany({
      where: { ...tenantWhere, status: { in: ["open", "claimed"] } },
      include: { tenant: true, conversation: { include: { customer: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.auditLog.findMany({
      where: isPlatformOwner ? {} : { tenantId: { in: tenantIds } },
      include: { tenant: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.deadLetterEvent.count({ where: isPlatformOwner ? { status: "open" } : { tenantId: { in: tenantIds }, status: "open" } }),
    prisma.knowledgeDocument.count({ where: { ...tenantWhere, indexingStatus: "READY", deletedAt: null } }),
    prisma.knowledgeDocument.count({ where: { ...tenantWhere, indexingStatus: "FAILED", deletedAt: null } }),
    prisma.usageMetric.findMany({ where: tenantWhere, orderBy: { createdAt: "desc" }, take: 20 }),
  ])

  const geminiUsage = usageMetrics
    .filter((metric) => metric.metric.toLowerCase().includes("gemini") || metric.metric.toLowerCase().includes("token"))
    .reduce((sum, metric) => sum + metric.value, 0)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Operational state from ReplyOps database. Empty metrics mean no production events have reached that subsystem yet."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/test-lab">Open Test Lab</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/knowledge">Manage Knowledge</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Conversations today" value={conversationsToday} detail="Created since local midnight." />
        <MetricCard label="Active conversations" value={activeConversations} detail={`${totalConversations} total stored conversations.`} />
        <MetricCard
          label="Automation resolution"
          value={pct(outboundAutomated, Math.max(totalConversations, outboundAutomated))}
          detail={`${outboundAutomated} automated outbound messages recorded.`}
        />
        <MetricCard label="Handoff queue" value={handoffOpen} tone={handoffOpen > 0 ? "warning" : "good"} detail="Open or claimed human handoffs." />
        <MetricCard label="Knowledge gaps" value={knowledgeGaps} tone={knowledgeGaps > 0 ? "warning" : "good"} detail="Messages flagged as ungrounded or missing source support." />
        <MetricCard label="Average response time" value="No data" detail="No response-latency metric events found." />
        <MetricCard label="Pending approvals" value={pendingApprovals} tone={pendingApprovals > 0 ? "warning" : "good"} detail="Action approvals awaiting review." />
        <MetricCard label="Pending follow-ups" value={pendingFollowups} tone={pendingFollowups > 0 ? "warning" : "good"} detail="Database-owned follow-up jobs waiting to run." />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <StatusCard title="Knowledge health" status={failedKnowledge > 0 ? "degraded" : readyKnowledge > 0 ? "ready" : "not configured"} detail={`${readyKnowledge} ready documents, ${failedKnowledge} failed documents.`} />
        <StatusCard title="Channel health" status={channelConnections.some((channel) => channel.status !== "connected") ? "degraded" : channelConnections.length > 0 ? "healthy" : "not configured"} detail={`${channelConnections.length} channel connections stored.`} />
        <StatusCard title="Gemini usage" status={geminiUsage > 0 ? "active" : "no usage events"} detail={`${geminiUsage} recorded Gemini/token metric units.`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Recent conversations</h2>
              <p className="text-sm text-muted-foreground">Latest persisted customer threads.</p>
            </div>
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="divide-y">
            {recentConversations.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No conversations stored yet.</div>
            ) : (
              recentConversations.map((conversation) => (
                <Link key={conversation.id} href="/dashboard/conversations" className="block p-4 transition hover:bg-secondary/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{conversation.customer.name ?? conversation.customer.externalId ?? "Unknown customer"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {conversation.tenant.name} · {conversation.channelConnection.type} · {conversation.status}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm">{conversation.messages[0]?.content ?? "No messages stored"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{dateFormat.format(conversation.updatedAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Handoff queue</h2>
              <p className="text-sm text-muted-foreground">Human support requests needing action.</p>
            </div>
            <UserCircle className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="divide-y">
            {recentHandoffs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No open handoffs.</div>
            ) : (
              recentHandoffs.map((handoff) => (
                <Link key={handoff.id} href="/dashboard/handoff" className="block p-4 transition hover:bg-secondary/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{handoff.conversation.customer.name ?? "Unknown customer"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{handoff.tenant.name}</p>
                    </div>
                    <StatusBadge status={handoff.priority} />
                  </div>
                  {handoff.reason && <p className="mt-2 line-clamp-2 text-sm">{handoff.reason}</p>}
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-heading text-lg font-semibold">Channel status</h2>
          </div>
          <div className="space-y-3">
            {channelConnections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No channels configured.</p>
            ) : (
              channelConnections.map((channel) => (
                <div key={channel.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{channel.displayName}</p>
                    <p className="text-sm text-muted-foreground">{channel.tenant.name} · {channel.type}</p>
                  </div>
                  <StatusBadge status={channel.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
            <h2 className="font-heading text-lg font-semibold">Recent audit activity</h2>
          </div>
          <div className="space-y-3">
            {recentAuditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events stored.</p>
            ) : (
              recentAuditLogs.map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{event.action}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{dateFormat.format(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.resource}{event.tenant ? ` · ${event.tenant.name}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <StatusCard
        title="System incidents"
        status={deadLetters > 0 ? "degraded" : "healthy"}
        detail={deadLetters > 0 ? `${deadLetters} open Dead Letter records require review.` : "No open Dead Letter records."}
      />

      <div className="sr-only" aria-live="polite">
        Dashboard metrics loaded at {dateFormat.format(new Date())}.
      </div>
    </div>
  )
}

import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { calculateAnalytics } from "@/lib/analytics/calculator"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string; channel?: string; status?: string; intent?: string; from?: string; to?: string }>
}) {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const filters = await searchParams
  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const selectedTenantIds = filters?.tenant
    ? [filters.tenant]
    : tenantIds
  const allowedTenantWhere = isPlatformOwner ? {} : { tenantId: { in: tenantIds } }
  const createdAt = {
    ...(filters?.from ? { gte: new Date(filters.from) } : {}),
    ...(filters?.to ? { lt: new Date(filters.to) } : {}),
  }
  const metrics = await prisma.usageMetric.findMany({
    where: {
      ...(isPlatformOwner ? {} : { tenantId: { in: tenantIds } }),
      ...(filters?.tenant ? { tenantId: filters.tenant } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    },
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  const [conversations, messages, handoffs, deadLetters, audits] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        ...allowedTenantWhere,
        ...(filters?.tenant ? { tenantId: { in: selectedTenantIds } } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      include: { channelConnection: true, messages: { orderBy: { createdAt: "asc" } } },
      take: 500,
    }),
    prisma.message.findMany({
      where: {
        conversation: {
          ...allowedTenantWhere,
          ...(filters?.tenant ? { tenantId: { in: selectedTenantIds } } : {}),
          ...(filters?.channel ? { channelConnection: { type: filters.channel } } : {}),
        },
        ...(filters?.intent ? { intent: filters.intent } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      include: { conversation: { include: { channelConnection: true } } },
      take: 1000,
    }),
    prisma.handoff.findMany({
      where: { ...allowedTenantWhere, ...(filters?.tenant ? { tenantId: { in: selectedTenantIds } } : {}), ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      take: 500,
    }),
    prisma.deadLetterEvent.findMany({
      where: { ...allowedTenantWhere, ...(filters?.tenant ? { tenantId: { in: selectedTenantIds } } : {}), ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      take: 500,
    }),
    prisma.auditLog.findMany({
      where: {
        ...(isPlatformOwner ? {} : { tenantId: { in: tenantIds } }),
        ...(filters?.tenant ? { tenantId: filters.tenant } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      take: 500,
    }),
  ])
  const calculated = calculateAnalytics({
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      tenantId: conversation.tenantId,
      channel: conversation.channelConnection.type,
      status: conversation.status,
      createdAt: conversation.createdAt,
      firstResponseMs: null,
      resolutionMs: null,
      agentId: null,
      intent: conversation.messages.find((message) => message.intent)?.intent ?? null,
      sentiment: null,
    })),
    messages: messages.map((message) => ({
      conversationId: message.conversationId,
      channel: message.conversation.channelConnection.type,
      direction: message.direction === "inbound" ? "inbound" : "outbound",
      role: message.role,
      createdAt: message.createdAt,
      aiResponseMs: message.role === "model" ? Number((message.providerPayload as any)?.ai_response_ms ?? 0) : null,
      humanResponseMs: message.role === "agent" ? Number((message.providerPayload as any)?.human_response_ms ?? 0) : null,
      deliveryStatus: message.deliveryStatus,
      inputTokens: Number((message.providerPayload as any)?.input_tokens ?? 0),
      outputTokens: Number((message.providerPayload as any)?.output_tokens ?? 0),
    })),
    events: [
      ...handoffs.map((handoff) => ({ tenantId: handoff.tenantId, type: "handoff", status: handoff.status, createdAt: handoff.createdAt })),
      ...deadLetters.map((event) => ({ tenantId: event.tenantId ?? "system", type: "dead_letter", status: event.status, createdAt: event.createdAt })),
      ...audits.map((event) => ({ tenantId: event.tenantId ?? "system", type: event.action.includes("approval") ? "approval" : event.action.includes("followup") ? "followup" : event.action.includes("action") ? "action" : "audit", status: event.action.split(".").at(-1), createdAt: event.createdAt })),
      ...metrics.filter((metric) => metric.metric.includes("gemini")).map((metric) => ({ tenantId: metric.tenantId, type: "gemini_request", status: "recorded", createdAt: metric.createdAt })),
    ],
  })

  return (
    <OperationalPage
      title="Analytics"
      description="Persisted usage and operations metrics. Empty state means no measured events, not zero performance."
    >
      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Total conversations", calculated.totalConversations],
          ["Active conversations", calculated.activeConversations],
          ["Resolved conversations", calculated.resolvedConversations],
          ["Human Handoff count", calculated.handoffCount],
          ["Knowledge-gap count", calculated.knowledgeGapCount],
          ["Delivery failure rate", calculated.channelDeliveryFailureRate.toFixed(3)],
          ["Total token usage", calculated.totalTokenUsage],
          ["Dead Letter count", calculated.deadLetterCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <div className="rounded-lg border bg-card">
        {metrics.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No usage metrics recorded.</p>
        ) : metrics.map((metric) => (
          <div key={metric.id} className="flex justify-between border-b p-4 last:border-b-0">
            <div>
              <p className="font-medium">{metric.metric}</p>
              <p className="text-sm text-muted-foreground">{metric.tenant.name}</p>
            </div>
            <p className="font-mono">{metric.value}</p>
          </div>
        ))}
      </div>
    </OperationalPage>
  )
}

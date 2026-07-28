import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { StatusCard } from "@/components/dashboard/primitives"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

async function probeUrl(name: string, url: string | undefined) {
  if (!url) return { name, status: "not configured", detail: "No URL configured." }
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(5000) })
    return { name, status: response.ok ? "healthy" : "degraded", detail: `${url} returned HTTP ${response.status}.` }
  } catch (error) {
    return { name, status: "unavailable", detail: error instanceof Error ? error.message : "probe_failed" }
  }
}

export default async function SystemHealthPage() {
  const [systemEvents, deadLetters, tenants, channels, pendingFollowups, failedKnowledge, dbOk, replyOpsProbe, n8nProbe] = await Promise.all([
    prisma.systemEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.deadLetterEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.tenant.count({ where: { deletedAt: null } }),
    prisma.channelConnection.findMany({
      where: { deletedAt: null },
      select: { type: true, status: true, credentials: { select: { id: true } } },
    }),
    prisma.followupJob.count({ where: { status: "pending" } }),
    prisma.knowledgeDocument.count({ where: { indexingStatus: "FAILED", deletedAt: null } }),
    prisma.$queryRaw`SELECT 1 AS ok`.then(() => true).catch(() => false),
    probeUrl("ReplyOps HTTPS", process.env.NEXTAUTH_URL ?? "https://replyops.abud.fun"),
    probeUrl("n8n HTTPS", process.env.REPLYOPS_N8N_URL ?? "https://botn8n.abud.fun"),
  ])

  const geminiDegraded = systemEvents.some((event) => event.type === "gemini.degraded")
    || deadLetters.some((event) => event.eventType === "provider_failure" && event.status === "open")
  const channelCount = channels.length
  const telegramConfigured = channels.some((channel) => channel.type === "telegram" && channel.credentials)
  const webChatConfigured = channels.some((channel) => channel.type === "webchat" && channel.credentials)
  const whatsAppConfigured = channels.some((channel) => channel.type === "whatsapp" && channel.credentials)

  const probes = [
    { name: "PostgreSQL", status: dbOk ? "healthy" : "unavailable", detail: dbOk ? "Database query succeeded." : "Database query failed." },
    replyOpsProbe,
    n8nProbe,
    {
      name: "Gemini",
      status: !process.env.GEMINI_API_KEY ? "not configured" : geminiDegraded ? "degraded" : "healthy",
      detail: geminiDegraded ? "Recent provider failure or quota event recorded. Credential presence only; no secret exposed." : "Credential presence only; no secret exposed.",
    },
    { name: "Telegram", status: telegramConfigured ? "healthy" : "not configured", detail: telegramConfigured ? "Telegram channel has stored credentials." : "No Telegram credentials stored." },
    { name: "Web Chat", status: webChatConfigured ? "healthy" : "not configured", detail: webChatConfigured ? "Web Chat public key configuration exists." : "No Web Chat connection configured." },
    { name: "WhatsApp", status: whatsAppConfigured ? "healthy" : "not configured", detail: whatsAppConfigured ? "WhatsApp credentials are stored." : "Meta credentials are missing." },
    { name: "Dead Letter queue", status: deadLetters.length > 0 ? "degraded" : "healthy", detail: `${deadLetters.length} open or recent records loaded.` },
    { name: "Follow-up jobs", status: pendingFollowups > 0 ? "healthy" : "healthy", detail: `${pendingFollowups} pending jobs.` },
    { name: "Knowledge indexing", status: failedKnowledge > 0 ? "degraded" : "healthy", detail: `${failedKnowledge} failed Knowledge documents.` },
  ]

  return (
    <OperationalPage
      title="System Health"
      description="Live and database-backed health signals from ReplyOps runtime."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Tenants" status={tenants > 0 ? "active" : "not configured"} detail={`${tenants} active tenants.`} />
        <StatusCard title="Channel connections" status={channelCount > 0 ? "healthy" : "not configured"} detail={`${channelCount} channel records.`} />
        <StatusCard title="System events" status={systemEvents.length > 0 ? "healthy" : "healthy"} detail={`${systemEvents.length} recent events loaded.`} />
        <StatusCard title="Dead letters" status={deadLetters.length > 0 ? "degraded" : "healthy"} detail={`${deadLetters.length} records loaded.`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {probes.map((probe) => (
          <StatusCard key={probe.name} title={probe.name} status={probe.status} detail={probe.detail} />
        ))}
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold">Recent runtime events</h2>
        <div className="mt-4 space-y-3">
          {systemEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No system events stored.</p>
          ) : systemEvents.map((event) => (
            <div key={event.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{event.type}</p>
              <p className="mt-1 text-muted-foreground">{event.message}</p>
            </div>
          ))}
        </div>
      </section>
    </OperationalPage>
  )
}

export type AnalyticsConversation = {
  id: string
  tenantId: string
  channel: string
  status: string
  createdAt: Date
  resolvedAt?: Date | null
  firstResponseMs?: number | null
  resolutionMs?: number | null
  agentId?: string | null
  intent?: string | null
  sentiment?: string | null
}

export type AnalyticsMessage = {
  conversationId: string
  channel: string
  direction: "inbound" | "outbound"
  role: string
  createdAt: Date
  aiResponseMs?: number | null
  humanResponseMs?: number | null
  deliveryStatus?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
}

export type AnalyticsOperationalEvent = {
  tenantId: string
  type: string
  status?: string | null
  createdAt: Date
}

export type AnalyticsDataset = {
  conversations: AnalyticsConversation[]
  messages: AnalyticsMessage[]
  events: AnalyticsOperationalEvent[]
}

function count<T>(items: T[], predicate: (item: T) => boolean) {
  return items.filter(predicate).length
}

function average(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  if (usable.length === 0) return 0
  return usable.reduce((sum, value) => sum + value, 0) / usable.length
}

function distribution(items: string[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1
    return acc
  }, {})
}

export function calculateAnalytics(dataset: AnalyticsDataset) {
  const totalConversations = dataset.conversations.length
  const handoffCount = count(dataset.events, (event) => event.type === "handoff")
  const knowledgeGapCount = count(dataset.events, (event) => event.type === "knowledge_gap")
  const deliveryFailures = count(dataset.messages, (message) => message.deliveryStatus === "failed")
  const outboundMessages = count(dataset.messages, (message) => message.direction === "outbound")
  const actionCompleted = count(dataset.events, (event) => event.type === "action" && event.status === "completed")
  const actionFailed = count(dataset.events, (event) => event.type === "action" && event.status === "failed")
  const followupScheduled = count(dataset.events, (event) => event.type === "followup" && event.status === "scheduled")
  const followupSent = count(dataset.events, (event) => event.type === "followup" && event.status === "sent")
  const followupCancelled = count(dataset.events, (event) => event.type === "followup" && event.status === "cancelled")
  const followupFailed = count(dataset.events, (event) => event.type === "followup" && event.status === "failed")
  const inputTokenUsage = dataset.messages.reduce((sum, message) => sum + (message.inputTokens ?? 0), 0)
  const outputTokenUsage = dataset.messages.reduce((sum, message) => sum + (message.outputTokens ?? 0), 0)

  return {
    totalConversations,
    activeConversations: count(dataset.conversations, (conversation) => conversation.status === "active"),
    resolvedConversations: count(dataset.conversations, (conversation) => conversation.status === "resolved"),
    automatedResolutions: count(dataset.events, (event) => event.type === "automation_resolution"),
    automationResolutionRate: totalConversations ? count(dataset.events, (event) => event.type === "automation_resolution") / totalConversations : 0,
    handoffCount,
    handoffRate: totalConversations ? handoffCount / totalConversations : 0,
    knowledgeGapCount,
    knowledgeGapRate: totalConversations ? knowledgeGapCount / totalConversations : 0,
    averageFirstResponseTime: average(dataset.conversations.map((conversation) => conversation.firstResponseMs)),
    averageAiResponseTime: average(dataset.messages.map((message) => message.aiResponseMs)),
    averageHumanResponseTime: average(dataset.messages.map((message) => message.humanResponseMs)),
    averageResolutionTime: average(dataset.conversations.map((conversation) => conversation.resolutionMs)),
    topIntents: distribution(dataset.conversations.map((conversation) => conversation.intent ?? "unknown")),
    sentimentDistribution: distribution(dataset.conversations.map((conversation) => conversation.sentiment ?? "unknown")),
    messagesPerChannel: distribution(dataset.messages.map((message) => message.channel)),
    conversationsPerChannel: distribution(dataset.conversations.map((conversation) => conversation.channel)),
    channelDeliveryFailureRate: outboundMessages ? deliveryFailures / outboundMessages : 0,
    geminiRequestCount: count(dataset.events, (event) => event.type === "gemini_request"),
    inputTokenUsage,
    outputTokenUsage,
    totalTokenUsage: inputTokenUsage + outputTokenUsage,
    actionCompleted,
    actionFailed,
    approvalAccepted: count(dataset.events, (event) => event.type === "approval" && event.status === "accepted"),
    approvalRejected: count(dataset.events, (event) => event.type === "approval" && event.status === "rejected"),
    followupScheduled,
    followupSent,
    followupCancelled,
    followupFailed,
    providerIncidentCount: count(dataset.events, (event) => event.type === "provider_incident"),
    deadLetterCount: count(dataset.events, (event) => event.type === "dead_letter"),
  }
}

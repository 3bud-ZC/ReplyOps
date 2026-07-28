import prisma from "@/lib/prisma"
import { GeminiProviderError, generateResponse } from "@/lib/knowledge/generator"
import { hybridSearch, SearchResult } from "@/lib/knowledge/retriever"

export type RuntimeInbound = {
  requestId?: string
  tenantId: string
  channelConnectionId: string
  externalCustomerId: string
  externalThreadId: string
  externalMessageId: string
  content: string
  customerName?: string | null
  providerPayload?: unknown
}

type RuntimeAction = {
  type: string
  status: string
  requires_approval: boolean
  request_id: string | null
}

type RuntimeFollowup = {
  scheduled: boolean
  job_id: string | null
}

export type RuntimeContract = {
  success: boolean
  request_id: string
  tenant_id: string
  conversation_id: string
  reply: string | null
  intent: string
  language: string
  sentiment: string
  confidence: number
  knowledge_gap: boolean
  grounding_accepted: boolean
  handoff_required: boolean
  handoff_reason: string | null
  action: RuntimeAction
  followup: RuntimeFollowup
  sources: Array<Record<string, unknown>>
  usage: Record<string, unknown>
  timings: Record<string, number>
  deduplicated: boolean
  inbound_message_id?: string
  outbound_message_id?: string
  provider_state?: string
  conversationId: string
  inboundMessageId?: string
  outboundMessageId?: string
  grounded?: boolean
  providerFailure?: boolean
  handoff: boolean
}

function fallbackAnswer(content: string) {
  if (/[\u0600-\u06FF]/.test(content)) {
    return "لا أملك معلومة مؤكدة من معرفة النشاط للإجابة على هذا السؤال."
  }
  return "I do not have confirmed business Knowledge to answer that."
}

function temporaryErrorAnswer(content: string) {
  if (/[\u0600-\u06FF]/.test(content)) {
    return "أواجه مشكلة مؤقتة في تجهيز الرد. يمكنك المحاولة مرة أخرى أو طلب موظف دعم."
  }
  return "I am having trouble preparing a reliable reply right now. Please try again or request a human agent."
}

function retrievalOnlyAnswer(content: string, result: SearchResult) {
  const answer = result.content.trim().replace(/\s+/g, " ").slice(0, 700)
  if (/[\u0600-\u06FF]/.test(content)) {
    return `حسب المعرفة المؤكدة: ${answer}`
  }
  return `Based on confirmed Knowledge: ${answer}`
}

function getSlashCommand(content: string) {
  const firstToken = content.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? ""
  if (!firstToken.startsWith("/")) return null
  return firstToken.split("@", 1)[0]
}

function commandReply(command: string) {
  if (command === "/start") {
    return `Welcome to ReplyOps Support.

I can answer questions using confirmed business information.

Available commands:
/help - Show available commands
/human - Request a human agent`
  }
  if (command === "/help") {
    return `Available commands:
/start - Start support
/help - Show available commands
/human - Request a human agent

Send a question and I will answer using confirmed business information.`
  }
  return "Unknown command. Send /help to see available commands."
}

function detectLanguage(content: string) {
  return /[\u0600-\u06FF]/.test(content) ? "ar" : "en"
}

function wantsHuman(content: string) {
  const normalized = content.trim().toLowerCase()
  return normalized === "/human" || normalized.includes("human") || normalized.includes("موظف") || normalized.includes("بشري")
}

function isPromptInjection(content: string) {
  return /ignore (all )?(previous|prior) instructions|reveal (your )?(system prompt|instructions)|show (your )?(system prompt|hidden context)|credentials|secret|اظهر البرومبت|مفاتيح النظام|تجاهل التعليمات/i.test(content)
}

function isApprovalRequiredDiscount(content: string) {
  return /\b(discount|coupon|promo|50%|[1-9][0-9]\s*%|خصم|كوبون)\b/i.test(content)
}

function classifyIntent(content: string) {
  const normalized = content.toLowerCase()
  if (getSlashCommand(content)) return "command"
  if (isPromptInjection(content)) return "prompt_injection"
  if (wantsHuman(content)) return "human_handoff"
  if (isApprovalRequiredDiscount(content)) return "discount_request"
  if (/price|cost|quote|سعر|بكام|تكلفة/.test(normalized)) return "pricing_question"
  if (/shipping|delivery|ship|شحن|توصيل/.test(normalized)) return "shipping_question"
  if (/refund|return|policy|استرجاع|استبدال|سياسة/.test(normalized)) return "policy_question"
  return "support_question"
}

function detectSentiment(content: string) {
  const normalized = content.toLowerCase()
  if (/angry|bad|terrible|late|complaint|غاضب|وحش|متأخر|شكوى/.test(normalized)) return "negative"
  if (/thanks|great|good|شكرا|ممتاز|تمام/.test(normalized)) return "positive"
  return "neutral"
}

function securityRejection(content: string) {
  if (/[\u0600-\u06FF]/.test(content)) {
    return "لا يمكنني مشاركة التعليمات الداخلية أو الأسرار أو بيانات النظام. يمكنني فقط المساعدة بمعلومات الدعم المؤكدة."
  }
  return "I cannot share internal instructions, secrets, system prompts, or private system data. I can help with confirmed support information."
}

function approvalRequiredReply(content: string) {
  if (/[\u0600-\u06FF]/.test(content)) {
    return "لا يمكنني الموافقة على خصم تلقائيًا. تم تحويل الطلب لفريق الدعم للمراجعة."
  }
  return "I cannot approve a discount automatically. I have sent this request to the support team for review."
}

function defaultAction(): RuntimeAction {
  return { type: "none", status: "not_required", requires_approval: false, request_id: null }
}

function defaultFollowup(): RuntimeFollowup {
  return { scheduled: false, job_id: null }
}

function sourceContract(results: SearchResult[]) {
  return results.map((result) => ({
    knowledge_chunk_id: result.id,
    score: result.score,
    content: result.content.slice(0, 240),
    metadata: result.metadata ?? {},
  }))
}

function withContract(
  input: RuntimeInbound,
  values: {
    conversationId: string
    inboundMessageId?: string
    outboundMessageId?: string
    reply?: string | null
    intent?: string
    sentiment?: string
    confidence?: number
    knowledgeGap?: boolean
    groundingAccepted?: boolean
    handoffRequired?: boolean
    handoffReason?: string | null
    action?: RuntimeAction
    followup?: RuntimeFollowup
    sources?: Array<Record<string, unknown>>
    usage?: Record<string, unknown>
    timings?: Record<string, number>
    deduplicated?: boolean
    providerState?: string
  },
): RuntimeContract {
  const confidence = Number(values.confidence ?? 0)
  const result = {
    success: true,
    request_id: input.requestId ?? input.externalMessageId,
    tenant_id: input.tenantId,
    conversation_id: values.conversationId,
    reply: values.reply ?? null,
    intent: values.intent ?? classifyIntent(input.content),
    language: detectLanguage(input.content),
    sentiment: values.sentiment ?? detectSentiment(input.content),
    confidence: Number.isFinite(confidence) ? confidence : 0,
    knowledge_gap: values.knowledgeGap ?? true,
    grounding_accepted: values.groundingAccepted ?? false,
    handoff_required: values.handoffRequired ?? false,
    handoff_reason: values.handoffReason ?? null,
    action: values.action ?? defaultAction(),
    followup: values.followup ?? defaultFollowup(),
    sources: values.sources ?? [],
    usage: values.usage ?? {},
    timings: values.timings ?? {},
    deduplicated: values.deduplicated ?? false,
    inbound_message_id: values.inboundMessageId,
    outbound_message_id: values.outboundMessageId,
    provider_state: values.providerState,
    conversationId: values.conversationId,
    inboundMessageId: values.inboundMessageId,
    outboundMessageId: values.outboundMessageId,
    grounded: values.groundingAccepted ?? false,
    providerFailure: values.providerState ? values.providerState !== "ok" : false,
    handoff: values.handoffRequired ?? false,
  }
  return result
}

async function createOrReuseHandoff(tenantId: string, conversationId: string, reason: string, triggerMessageId: string) {
  const existing = await prisma.handoff.findFirst({
    where: { tenantId, conversationId, status: { in: ["open", "claimed"] } },
  })
  if (existing) return existing

  const handoff = await prisma.handoff.create({
    data: {
      tenantId,
      conversationId,
      reason,
      priority: "normal",
      status: "open",
    },
  })
  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "handoff.create",
      resource: "Handoff",
      details: { handoffId: handoff.id, conversationId, triggerMessageId },
    },
  })
  return handoff
}

async function persistUsage(tenantId: string, metrics: Record<string, number>) {
  await Promise.all(
    Object.entries(metrics).map(([metric, value]) =>
      prisma.usageMetric.create({ data: { tenantId, metric, value } }),
    ),
  )
}

export async function handleRuntimeInbound(input: RuntimeInbound) {
  const startedAt = Date.now()
  const existingMessage = await prisma.message.findFirst({
    where: {
      externalMessageId: input.externalMessageId,
      conversation: { tenantId: input.tenantId, channelConnectionId: input.channelConnectionId },
    },
    include: { conversation: true },
  })
  if (existingMessage) {
    return withContract(input, {
      deduplicated: true,
      conversationId: existingMessage.conversationId,
      knowledgeGap: true,
      timings: { total_ms: Date.now() - startedAt },
    })
  }

  const customer = await prisma.customer.upsert({
    where: { tenantId_externalId: { tenantId: input.tenantId, externalId: input.externalCustomerId } },
    update: { name: input.customerName || undefined },
    create: { tenantId: input.tenantId, externalId: input.externalCustomerId, name: input.customerName ?? null },
  })

  const conversation = await prisma.conversation.upsert({
    where: {
      tenantId_channelConnectionId_externalThreadId: {
        tenantId: input.tenantId,
        channelConnectionId: input.channelConnectionId,
        externalThreadId: input.externalThreadId,
      },
    },
    update: { lastMessageAt: new Date() },
    create: {
      tenantId: input.tenantId,
      customerId: customer.id,
      channelConnectionId: input.channelConnectionId,
      externalThreadId: input.externalThreadId,
      status: "active",
      lastMessageAt: new Date(),
    },
  })

  const inbound = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      externalMessageId: input.externalMessageId,
      direction: "inbound",
      role: "user",
      content: input.content,
      providerPayload: input.providerPayload as any,
      deliveryStatus: "received",
    },
  })

  const slashCommand = getSlashCommand(input.content)
  if (slashCommand && slashCommand !== "/human") {
    const reply = commandReply(slashCommand)
    const outbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        role: "model",
        content: reply,
        deliveryStatus: "queued",
      },
    })
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        action: slashCommand === "/start" || slashCommand === "/help" ? "command.reply" : "command.unknown",
        resource: "Conversation",
        details: { conversationId: conversation.id, command: slashCommand, triggerMessageId: inbound.id },
      },
    })
    return withContract(input, {
      conversationId: conversation.id,
      inboundMessageId: inbound.id,
      outboundMessageId: outbound.id,
      reply,
      intent: "command",
      knowledgeGap: false,
      groundingAccepted: true,
      timings: { total_ms: Date.now() - startedAt },
      providerState: "not_required",
    })
  }

  if (wantsHuman(input.content)) {
    await createOrReuseHandoff(input.tenantId, conversation.id, "Customer requested human support", inbound.id)
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { automationPaused: true, status: "handoff" },
    })
    const reply = /[\u0600-\u06FF]/.test(input.content)
      ? "تم تحويل المحادثة لفريق الدعم. سيقوم أحد الأعضاء بالرد عليك."
      : "I have moved this conversation to the support team. A team member will reply."
    const outbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        role: "model",
        content: reply,
        handoffRequired: true,
        deliveryStatus: "queued",
      },
    })
    return withContract(input, {
      conversationId: conversation.id,
      inboundMessageId: inbound.id,
      outboundMessageId: outbound.id,
      reply,
      intent: "human_handoff",
      knowledgeGap: false,
      groundingAccepted: true,
      handoffRequired: true,
      handoffReason: "customer_requested_human",
      timings: { total_ms: Date.now() - startedAt },
      providerState: "not_required",
    })
  }

  if (isPromptInjection(input.content)) {
    const reply = securityRejection(input.content)
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        action: "security.prompt_injection_rejected",
        resource: "Message",
        details: { conversationId: conversation.id, triggerMessageId: inbound.id },
      },
    })
    const outbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        role: "model",
        content: reply,
        actionState: "security_rejected",
        deliveryStatus: "queued",
      },
    })
    return withContract(input, {
      conversationId: conversation.id,
      inboundMessageId: inbound.id,
      outboundMessageId: outbound.id,
      reply,
      intent: "prompt_injection",
      knowledgeGap: true,
      groundingAccepted: false,
      timings: { total_ms: Date.now() - startedAt },
      providerState: "not_required",
    })
  }

  if (isApprovalRequiredDiscount(input.content)) {
    const handoff = await createOrReuseHandoff(input.tenantId, conversation.id, "Discount request requires human approval", inbound.id)
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { automationPaused: true, status: "handoff" },
    })
    const reply = approvalRequiredReply(input.content)
    const outbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        role: "model",
        content: reply,
        handoffRequired: true,
        actionState: "approval_required",
        deliveryStatus: "queued",
      },
    })
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        action: "approval.discount_requested",
        resource: "Handoff",
        details: { handoffId: handoff.id, conversationId: conversation.id, triggerMessageId: inbound.id },
      },
    })
    return withContract(input, {
      conversationId: conversation.id,
      inboundMessageId: inbound.id,
      outboundMessageId: outbound.id,
      reply,
      intent: "discount_request",
      knowledgeGap: false,
      groundingAccepted: true,
      handoffRequired: true,
      handoffReason: "approval_required",
      action: { type: "discount_review", status: "approval_required", requires_approval: true, request_id: handoff.id },
      timings: { total_ms: Date.now() - startedAt },
      providerState: "not_required",
    })
  }

  if (conversation.automationPaused) {
    return withContract(input, {
      conversationId: conversation.id,
      inboundMessageId: inbound.id,
      handoffRequired: true,
      handoffReason: "automation_paused",
      timings: { total_ms: Date.now() - startedAt },
      providerState: "not_required",
    })
  }

  let results: SearchResult[] = []
  let answer = fallbackAnswer(input.content)
  let grounded = false
  let providerState = "not_required"
  let usage: Record<string, unknown> = {}

  const retrievalStartedAt = Date.now()
  results = await hybridSearch(input.tenantId, input.content, 4)
  const retrievalMs = Date.now() - retrievalStartedAt

  if (results.length > 0) {
    try {
      const generationStartedAt = Date.now()
      const generated = await generateResponse(input.content, results)
      grounded = generated.grounded
      answer = generated.grounded ? generated.answer : fallbackAnswer(input.content)
      providerState = "ok"
      usage = generated.usage
      usage.generation_ms = Date.now() - generationStartedAt
    } catch (error) {
      const classified = error instanceof GeminiProviderError
        ? error
        : new GeminiProviderError("unknown_provider_error", error instanceof Error ? error.message : "provider_failure")
      const canUseRetrievalOnly = Number(results[0]?.score ?? 0) >= 0.3
      providerState = classified.kind
      grounded = canUseRetrievalOnly
      answer = canUseRetrievalOnly ? retrievalOnlyAnswer(input.content, results[0]) : temporaryErrorAnswer(input.content)
      usage = { provider_error: classified.kind, retry_after_seconds: classified.retryAfterSeconds }
      await prisma.deadLetterEvent.create({
        data: {
          tenantId: input.tenantId,
          source: "channel-runtime",
          eventType: "provider_failure",
          payload: { conversationId: conversation.id, inboundMessageId: inbound.id, provider_error: classified.kind },
          errorMessage: `Gemini ${classified.kind}`,
          status: "open",
        },
      })
      await prisma.systemEvent.create({
        data: {
          type: "gemini.degraded",
          message: `Gemini provider degraded: ${classified.kind}`,
        },
      })
    }
  }

  const confidence = Number(results[0]?.score ?? 0)
  const outbound = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "outbound",
      role: "model",
      content: answer,
      confidence,
      knowledgeGap: !grounded,
      sourcesUsed: sourceContract(results),
      actionState: providerState === "ok" || providerState === "not_required" ? undefined : "provider_failure",
      deliveryStatus: "queued",
    },
  })
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } })
  await persistUsage(input.tenantId, {
    "runtime.inbound": 1,
    "runtime.knowledge_gap": grounded ? 0 : 1,
    "runtime.confidence": confidence,
    "runtime.ai_response_ms": Number(usage.generation_ms ?? 0),
  })

  return withContract(input, {
    conversationId: conversation.id,
    inboundMessageId: inbound.id,
    outboundMessageId: outbound.id,
    reply: answer,
    confidence,
    knowledgeGap: !grounded,
    groundingAccepted: grounded,
    sources: sourceContract(results),
    usage,
    timings: { retrieval_ms: retrievalMs, total_ms: Date.now() - startedAt },
    providerState,
  })
}

export async function markOutboundDelivered(messageId: string, providerPayload: unknown) {
  await prisma.message.update({
    where: { id: messageId },
    data: { deliveryStatus: "delivered", providerPayload: providerPayload as any },
  })
}

export async function markOutboundFailed(messageId: string, errorMessage: string, tenantId: string, payload: unknown) {
  await prisma.message.update({ where: { id: messageId }, data: { deliveryStatus: "failed" } })
  await prisma.deadLetterEvent.create({
    data: {
      tenantId,
      source: "channel-runtime",
      eventType: "outbound_delivery_failed",
      payload: payload as any,
      errorMessage,
      status: "open",
    },
  })
}

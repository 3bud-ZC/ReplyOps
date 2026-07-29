import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("Web Chat external embed source covers allowed and blocked origin acceptance primitives", async () => {
  const embed = await readFile(path.join(root, "src", "app", "api", "webchat", "[connectionId]", "embed.js", "route.ts"), "utf8")
  const config = await readFile(path.join(root, "src", "app", "api", "webchat", "[connectionId]", "config", "route.ts"), "utf8")
  const message = await readFile(path.join(root, "src", "app", "api", "webchat", "[connectionId]", "message", "route.ts"), "utf8")
  const cors = await readFile(path.join(root, "src", "app", "api", "webchat", "[connectionId]", "cors.ts"), "utf8")

  for (const token of [
    "access-control-allow-origin",
    "blockedCorsHeaders",
    "origin_not_allowed",
    "role=\"dialog\"",
    "data-close",
    "data-typing",
    "aria-label=\"Customer name\"",
    "aria-label=\"Customer email\"",
    "customer_email",
    "invalid_customer_email",
    "deduplicated",
    "rate_limited",
  ]) {
    assert.match(`${embed}\n${config}\n${message}\n${cors}`, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("WhatsApp mock-provider contract has policy, compliance, callback, and redaction primitives", async () => {
  const whatsapp = await readFile(path.join(root, "src", "lib", "channels", "whatsapp.ts"), "utf8")
  const route = await readFile(path.join(root, "src", "app", "api", "webhooks", "whatsapp", "[connectionId]", "route.ts"), "utf8")

  for (const token of [
    "verifyWhatsAppSignature",
    "normalizeWhatsAppInbound",
    "normalizeWhatsAppDeliveryStatus",
    "sendWhatsAppWithPolicy",
    "customer_opted_out",
    "customer_opt_in_required",
    "quiet_hours_delay",
    "customer_limit_exceeded",
    "tenant_limit_exceeded",
    "template_required_outside_24h_window",
    "template_not_approved",
    "whatsapp.delivery_status",
    "markOutboundFailed",
    "redactWhatsAppCredential",
  ]) {
    assert.match(`${whatsapp}\n${route}`, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("Actions and SSRF matrix has lifecycle, approval evidence, retry hooks, and final-host validation", async () => {
  const actions = await readFile(path.join(root, "src", "app", "actions", "actions.ts"), "utf8")
  const safeHttp = await readFile(path.join(root, "src", "lib", "security", "safe-http.ts"), "utf8")

  for (const token of [
    "missing_required_field",
    "approvedBy",
    "approvedAt",
    "rejectionReason",
    "rejectedBy",
    "duplicate_action_execution_prevented",
    "action_unsafe_redirect",
    "action_redirect_limit_exceeded",
    "action_private_network_blocked",
    "metadata.google.internal",
    "redactActionHeaders",
    "action_response_too_large",
  ]) {
    assert.match(`${actions}\n${safeHttp}`, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("Follow-up engine covers DB-owned scheduling controls and restart-safe claim semantics", async () => {
  const engine = await readFile(path.join(root, "src", "lib", "follow-ups", "engine.ts"), "utf8")
  const actions = await readFile(path.join(root, "src", "app", "actions", "follow-ups.ts"), "utf8")

  for (const token of [
    "followup_rule_disabled",
    "customer_consent_required",
    "customer_opted_out",
    "handoff_open",
    "conversation_resolved",
    "duplicate_followup_prevented",
    "quiet_hours_deferral",
    "customer_limit_exceeded",
    "tenant_limit_exceeded",
    "nextFollowupRetry",
    "canClaimFollowupJob",
    "followupJob.create",
  ]) {
    assert.match(`${engine}\n${actions}`, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("Analytics calculator covers controlled calculation matrix outputs", async () => {
  const calculator = await readFile(path.join(root, "src", "lib", "analytics", "calculator.ts"), "utf8")
  const page = await readFile(path.join(root, "src", "app", "dashboard", "analytics", "page.tsx"), "utf8")

  for (const token of [
    "totalConversations",
    "activeConversations",
    "resolvedConversations",
    "automationResolutionRate",
    "handoffRate",
    "knowledgeGapRate",
    "averageFirstResponseTime",
    "averageAiResponseTime",
    "averageHumanResponseTime",
    "averageResolutionTime",
    "topIntents",
    "sentimentDistribution",
    "messagesPerChannel",
    "conversationsPerChannel",
    "channelDeliveryFailureRate",
    "geminiRequestCount",
    "totalTokenUsage",
    "providerIncidentCount",
    "deadLetterCount",
    "searchParams",
  ]) {
    assert.match(`${calculator}\n${page}`, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("Onboarding route persists tenant-scoped progress and supports validation, resume, skip, and replay", async () => {
  const page = await readFile(path.join(root, "src", "app", "dashboard", "onboarding", "page.tsx"), "utf8")
  const actions = await readFile(path.join(root, "src", "app", "actions", "onboarding.ts"), "utf8")

  for (const token of [
    "business_profile_required",
    "assistant_name_required",
    "knowledge_document_required",
    "required_step_cannot_be_skipped",
    "contactData",
    "completedSteps",
    "currentStep",
    "replayTourAvailable",
    "skipOnboardingForExperiencedUser",
    "Previous",
    "Next",
    "Skip",
  ]) {
    assert.match(`${page}\n${actions}`, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

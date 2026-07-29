import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("WhatsApp software source covers mock-provider matrix primitives", async () => {
  const route = await readFile(path.join(root, "src", "app", "api", "webhooks", "whatsapp", "[connectionId]", "route.ts"), "utf8")
  const whatsapp = await readFile(path.join(root, "src", "lib", "channels", "whatsapp.ts"), "utf8")
  const channelsPage = await readFile(path.join(root, "src", "app", "dashboard", "channels", "page.tsx"), "utf8")

  for (const token of [
    "hub.challenge",
    "invalid_verify_token",
    "verifyWhatsAppSignature",
    "invalid_signature",
    "normalizeWhatsAppInbound",
    "status_received",
    "whatsapp.delivery_status",
    "error_code",
    "sendWhatsAppText",
    "sendWhatsAppTemplate",
    "invalid_template",
    "isInsideWhatsAppServiceWindow",
    "markOutboundFailed",
  ]) {
    assert.match(`${route}\n${whatsapp}`, new RegExp(token.replaceAll(".", "\\.")))
  }

  for (const field of [
    "App ID",
    "App Secret",
    "Access Token",
    "Phone Number ID",
    "Business Account ID",
    "Verify Token",
    "graphApiVersion",
    "Disconnect",
  ]) {
    assert.match(channelsPage, new RegExp(field))
  }

  for (const inboundType of ["text", "image", "video", "audio", "document", "location", "contacts"]) {
    assert.match(whatsapp, new RegExp(inboundType))
  }
})

test("Telegram software source covers final server-side acceptance primitives", async () => {
  const route = await readFile(path.join(root, "src", "app", "api", "webhooks", "telegram", "[connectionId]", "route.ts"), "utf8")
  const runtime = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")

  for (const token of [
    "x-telegram-bot-api-secret-token",
    "connectionId",
    "handleRuntimeInbound",
    "sendTelegramTyping",
    "sendTelegramMessage",
    "markOutboundDelivered",
    "markOutboundFailed",
    "deduplicated",
    "/start",
    "/help",
    "/human",
    "prompt_injection",
    "discount_request",
    "telegram:",
  ]) {
    assert.match(`${route}\n${runtime}`, new RegExp(token.replaceAll("/", "\\/")))
  }
})

test("Actions source enforces lifecycle, encrypted auth, SSRF, and bounded responses", async () => {
  const actions = await readFile(path.join(root, "src", "app", "actions", "actions.ts"), "utf8")
  const safeHttp = await readFile(path.join(root, "src", "lib", "security", "safe-http.ts"), "utf8")

  for (const token of [
    "requiresApproval",
    "pending",
    "approved",
    "rejected",
    "executing",
    "completed",
    "failed",
    "encryptSecret",
    "decryptSecret",
    "safeJsonFetch",
    "allowedDomains",
    "redirect: \"manual\"",
    "action_unsafe_redirect",
    "action_response_too_large",
    "action_private_network_blocked",
    "metadata.google.internal",
    "localhost",
    "redactActionHeaders",
    "duplicate_action_execution_prevented",
  ]) {
    assert.match(`${actions}\n${safeHttp}`, new RegExp(token.replaceAll(".", "\\.")))
  }
})

test("Follow-up source owns jobs in ReplyOps DB and blocks unsafe scheduling", async () => {
  const followups = await readFile(path.join(root, "src", "app", "actions", "follow-ups.ts"), "utf8")
  const engine = await readFile(path.join(root, "src", "lib", "follow-ups", "engine.ts"), "utf8")
  const schema = await readFile(path.join(root, "prisma", "schema.prisma"), "utf8")

  for (const token of [
    "FollowupRule",
    "FollowupJob",
    "consentRequired",
    "customer_consent_required",
    "customer_opted_out",
    "handoff_open",
    "minimumDelay",
    "maximumAttempts",
    "customerDailyCap",
    "tenantDailyCap",
    "followup_job.cancel",
    "evaluateFollowupSchedule",
    "duplicate_followup_prevented",
    "quiet_hours_deferral",
  ]) {
    assert.match(`${followups}\n${engine}\n${schema}`, new RegExp(token))
  }
})

test("Analytics source exposes persisted tenant-scoped usage metrics and empty state", async () => {
  const analytics = await readFile(path.join(root, "src", "app", "dashboard", "analytics", "page.tsx"), "utf8")
  const runtime = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")

  for (const token of [
    "usageMetric.findMany",
    "No usage metrics recorded.",
    "runtime.inbound",
    "runtime.knowledge_gap",
    "runtime.confidence",
    "runtime.ai_response_ms",
  ]) {
    assert.match(`${analytics}\n${runtime}`, new RegExp(token.replaceAll(".", "\\.")))
  }
  assert.match(analytics, /tenantId:\s*\{\s*in:\s*tenantIds\s*\}/)
})

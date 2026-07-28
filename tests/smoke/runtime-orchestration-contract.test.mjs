import test from "node:test"
import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const workspaceRoot = path.resolve(root, "..")

test("runtime returns final stable orchestration contract", async () => {
  const source = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")

  for (const field of [
    "success",
    "request_id",
    "tenant_id",
    "conversation_id",
    "reply",
    "intent",
    "language",
    "sentiment",
    "confidence",
    "knowledge_gap",
    "grounding_accepted",
    "handoff_required",
    "handoff_reason",
    "action",
    "followup",
    "sources",
    "usage",
    "timings",
  ]) {
    assert.match(source, new RegExp(`${field}:`))
  }

  assert.match(source, /function withContract/)
  assert.match(source, /deduplicated: true/)
  assert.match(source, /sourceContract\(results\)/)
  assert.match(source, /persistUsage/)
})

test("runtime classifies policy decisions before generation", async () => {
  const source = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")
  const injectionIndex = source.indexOf("if (isPromptInjection(input.content))")
  const discountIndex = source.indexOf("if (isApprovalRequiredDiscount(input.content))")
  const retrievalIndex = source.indexOf("results = await hybridSearch")

  assert.ok(injectionIndex > -1)
  assert.ok(discountIndex > -1)
  assert.ok(retrievalIndex > -1)
  assert.ok(injectionIndex < retrievalIndex)
  assert.ok(discountIndex < retrievalIndex)
  assert.match(source, /intent: "prompt_injection"/)
  assert.match(source, /intent: "discount_request"/)
  assert.match(source, /action: \{ type: "discount_review", status: "approval_required"/)
})

test("Gemini provider errors are mapped without leaking credentials", async () => {
  const generator = await readFile(path.join(root, "src", "lib", "knowledge", "generator.ts"), "utf8")
  const runtime = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")
  const health = await readFile(path.join(root, "src", "app", "dashboard", "system-health", "page.tsx"), "utf8")

  for (const kind of [
    "quota_exhausted",
    "rate_limited",
    "daily_limit",
    "model_unavailable",
    "invalid_credentials",
    "provider_timeout",
    "provider_unavailable",
    "malformed_request",
  ]) {
    assert.match(generator, new RegExp(kind))
  }

  assert.match(generator, /retry-after/)
  assert.match(runtime, /retrievalOnlyAnswer/)
  assert.match(runtime, /eventType: "provider_failure"/)
  assert.match(runtime, /Gemini provider degraded/)
  assert.match(health, /Credential presence only; no secret exposed\./)
})

test("n8n v4 workflow validates envelopes and delegates to ReplyOps source of truth", async () => {
  const workflowCandidates = [
    path.join(root, "n8n", "ReplyOps_AI_Dashboard_Backed_v4.json"),
    path.join(workspaceRoot, "n8n", "ReplyOps_AI_Dashboard_Backed_v4.json"),
  ]
  let workflowPath = workflowCandidates[0]
  for (const candidate of workflowCandidates) {
    try {
      await access(candidate)
      workflowPath = candidate
      break
    } catch {
      // Try next known layout.
    }
  }
  const workflow = JSON.parse(await readFile(workflowPath, "utf8"))
  const nodeNames = workflow.nodes.map((node) => node.name)
  const workflowText = JSON.stringify(workflow)

  for (const name of [
    "Receive Normalized Channel Envelope",
    "Validate Envelope And Required IDs",
    "Sign ReplyOps HMAC",
    "ReplyOps Runtime Orchestrator",
    "Normalize Stable Response Contract",
    "Stable Response",
  ]) {
    assert.ok(nodeNames.includes(name), `${name} node missing`)
  }

  for (const stage of [
    "load_recent_memory",
    "detect_prompt_injection",
    "classify_intent",
    "retrieve_tenant_knowledge",
    "independent_grounding_judge",
    "determine_handoff",
    "determine_action",
    "bounded_retry_dead_letter_incident",
    "stable_response_contract",
  ]) {
    assert.match(workflowText, new RegExp(stage))
  }

  assert.doesNotMatch(workflowText, /TELEGRAM_TENANT_ID/)
  assert.doesNotMatch(workflowText, /botToken|accessToken|GEMINI_API_KEY/)
  assert.match(workflowText, /x-replyops-signature/)
  assert.match(workflowText, /idempotency_key/)
})

import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const workflowPath = path.join(process.cwd(), "n8n", "ReplyOps_AI_Dashboard_Backed_v4.json")
const require = createRequire(import.meta.url)

async function loadNormalizer() {
  const workflow = JSON.parse(await readFile(workflowPath, "utf8"))
  const node = workflow.nodes.find((candidate) => candidate.name === "Normalize Stable Response Contract")
  assert.ok(node, "Normalize Stable Response Contract node missing")
  return node.parameters.jsCode
}

async function normalize(input) {
  const jsCode = await loadNormalizer()
  const sandbox = {
    require,
    $input: {
      first() {
        return { json: input }
      },
    },
  }
  const result = vm.runInNewContext(`(() => {\n${jsCode}\n})()`, sandbox, { timeout: 1000 })
  return result[0].json
}

test("n8n normalizer preserves structured invalid tenant errors", async () => {
  const response = await normalize({
    request_id: "req_invalid_tenant",
    tenant_id: "tenant_missing",
    error: {
      type: "invalid_tenant",
      code: "INVALID_TENANT",
      message: "Tenant was not found or is unavailable.",
      retryable: false,
      details: {},
    },
  })

  assert.equal(response.success, false)
  assert.equal(response.request_id, "req_invalid_tenant")
  assert.equal(response.tenant_id, "tenant_missing")
  assert.equal(response.error.type, "invalid_tenant")
  assert.equal(response.error.code, "INVALID_TENANT")
  assert.equal(response.error.retryable, false)
  assert.ok(!JSON.stringify(response).includes("[object Object]"))
})

test("n8n normalizer unwraps HTTP node response bodies", async () => {
  const success = await normalize({
    statusCode: 200,
    body: {
      success: true,
      request_id: "req_ok",
      tenant_id: "tenant_1",
      conversation_id: "conversation_1",
    },
  })
  assert.equal(success.success, true)
  assert.equal(success.request_id, "req_ok")
  assert.equal(success.conversation_id, "conversation_1")

  const failure = await normalize({
    statusCode: 404,
    body: {
      request_id: "req_invalid_tenant",
      tenant_id: "tenant_missing",
      error: {
        type: "invalid_tenant",
        code: "INVALID_TENANT",
        message: "Tenant was not found or is unavailable.",
        retryable: false,
      },
    },
  })
  assert.equal(failure.success, false)
  assert.equal(failure.request_id, "req_invalid_tenant")
  assert.equal(failure.error.type, "invalid_tenant")
  assert.equal(failure.error.retryable, false)
})

test("n8n normalizer maps string and missing errors without object stringification", async () => {
  const stringError = await normalize({ request_id: "req_string", error: "missing_scope" })
  assert.equal(stringError.request_id, "req_string")
  assert.equal(stringError.error.type, "missing_scope")
  assert.equal(stringError.error.code, "MISSING_SCOPE")
  assert.equal(stringError.error.retryable, false)

  const missingError = await normalize({})
  assert.match(missingError.request_id, /^[0-9a-f-]{36}$/i)
  assert.equal(missingError.error.type, "replyops_api_failure")
  assert.equal(missingError.error.retryable, true)
})

test("n8n normalizer maps HTTP and provider failure classes", async () => {
  const cases = [
    [{ statusCode: 408, code: "ETIMEDOUT" }, "replyops_api_timeout", true],
    [{ request_id: "req401", error: "invalid_signature", statusCode: 401 }, "invalid_signature", false],
    [{ request_id: "req403", error: "missing_scope", statusCode: 403 }, "missing_scope", false],
    [{ request_id: "req404", error: "invalid_conversation", statusCode: 404 }, "invalid_conversation", false],
    [{ request_id: "req409", error: "replayed_nonce", statusCode: 409 }, "replayed_nonce", false],
    [{ request_id: "req429", error: "rate_limited", statusCode: 429 }, "rate_limited", true],
    [{ request_id: "req500", error: "replyops_api_failure", statusCode: 500 }, "replyops_api_failure", true],
    [{ request_id: "req_provider", error: "provider_failure" }, "provider_failure", true],
  ]

  for (const [input, type, retryable] of cases) {
    const response = await normalize(input)
    assert.equal(response.error.type, type)
    assert.equal(response.error.retryable, retryable)
    assert.ok(!/\[object Object\]|stack|secret|token/i.test(JSON.stringify(response)))
  }
})

test("n8n signed matrix harness covers all required launch cases without secret output", async () => {
  const harness = await readFile(path.join(process.cwd(), "scripts", "n8n-v4-signed-matrix.mjs"), "utf8")
  for (const name of [
    "invalid payload",
    "valid English grounded request",
    "valid Arabic grounded request",
    "duplicate idempotency key",
    "replayed nonce",
    "invalid HMAC signature",
    "missing HMAC scope",
    "revoked key",
    "expired key",
    "invalid tenant",
    "invalid conversation",
    "unsupported product",
    "unsupported price",
    "prompt injection",
    "Human Handoff",
    "Action without Approval",
    "Action requiring Approval",
    "Approval pending",
    "Approval accepted",
    "Approval rejected",
    "Follow-up allowed",
    "Follow-up blocked by no consent",
    "Follow-up blocked by opt-out",
    "Follow-up delayed by quiet hours",
    "Gemini timeout",
    "Gemini quota/degraded error",
    "ReplyOps internal API timeout",
    "retry success",
    "retry exhaustion",
    "Dead Letter creation",
    "System Incident creation",
    "usage persistence",
    "analytics persistence",
  ]) {
    assert.match(harness, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
  assert.match(harness, /signInternal/)
  assert.match(harness, /secret_or_object_leak/)
  assert.match(harness, /grounded_request_failed/)
  assert.match(harness, /duplicate_replay_not_deduplicated/)
  assert.match(harness, /invalid_tenant_contract_failed/)
  assert.ok(!/console\.log\(.*signature|console\.log\(.*secret/i.test(harness))
})

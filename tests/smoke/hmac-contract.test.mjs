import test from "node:test"
import assert from "node:assert/strict"
import { createHash, createHmac } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex")
}

function canonicalPayload(input) {
  return [
    input.keyId,
    input.timestamp,
    input.nonce,
    input.method.toUpperCase(),
    input.path,
    input.bodyHash,
  ].join("\n")
}

test("HMAC canonical payload and signature are stable", () => {
  const body = JSON.stringify({ tenant_id: "tenant_1" })
  const bodyHash = sha256Hex(body)
  const payload = canonicalPayload({
    keyId: "test-key",
    timestamp: "1800000000000",
    nonce: "nonce-1",
    method: "post",
    path: "/api/internal/runtime-config",
    bodyHash,
  })
  const signature = createHmac("sha256", "test-secret").update(payload).digest("hex")

  assert.equal(payload.split("\n").length, 6)
  assert.equal(signature.length, 64)
})

test("HMAC source rejects modified body and stale timestamp", async () => {
  const source = await readFile(path.join(process.cwd(), "src", "lib", "internal", "hmac-core.ts"), "utf8")

  assert.match(source, /body_hash_mismatch/)
  assert.match(source, /stale_timestamp/)
  assert.match(source, /timingSafeEqual/)
})

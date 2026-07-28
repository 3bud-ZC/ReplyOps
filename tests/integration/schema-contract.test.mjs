import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

test("schema contains persistent internal API support models", async () => {
  const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8")

  for (const model of ["InternalNonce", "RateLimitBucket", "DeadLetterEvent", "InternalNote"]) {
    assert.match(schema, new RegExp(`model ${model} \\{`))
  }
})

test("schema contains tenant settings and HMAC key lifecycle fields", async () => {
  const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8")

  for (const field of ["industry", "timezone", "supportedLanguages", "dataRetentionDays"]) {
    assert.match(schema, new RegExp(`${field}\\s+`))
  }

  for (const field of ["encryptedSecret", "iv", "authTag", "enabled", "revokedAt", "expiresAt"]) {
    assert.match(schema, new RegExp(`${field}\\s+`))
  }
})

test("internal API route helper enforces nonce and structured errors", async () => {
  const helper = await readFile(path.join(process.cwd(), "src", "lib", "internal", "request.ts"), "utf8")

  for (const token of ["verifyStoredInternalRequest", "persistInternalNonce", "replayed_nonce", "request_id"]) {
    assert.match(helper, new RegExp(token))
  }
})

test("schema contains owner session revocation field", async () => {
  const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8")

  assert.match(schema, /sessionVersion\s+Int\s+@default\(0\)/)
})

test("URL ingestion code blocks SSRF-sensitive targets", async () => {
  const parser = await readFile(path.join(process.cwd(), "src", "lib", "knowledge", "parser.ts"), "utf8")

  for (const token of ["169.254.169.254", "127", "isBlockedIp", "redirect: 'manual'", "AbortSignal.timeout", "MAX_URL_BYTES"]) {
    assert.match(parser, new RegExp(token.replaceAll(".", "\\.")))
  }
})

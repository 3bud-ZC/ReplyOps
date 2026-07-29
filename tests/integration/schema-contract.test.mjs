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
  const errorContract = await readFile(path.join(process.cwd(), "src", "lib", "internal", "error-contract.ts"), "utf8")

  for (const token of ["verifyStoredInternalRequest", "persistInternalNonce", "replayed_nonce", "request_id"]) {
    assert.match(`${helper}\n${errorContract}`, new RegExp(token))
  }
  assert.match(errorContract, /INVALID_TENANT/)
  assert.match(errorContract, /retryable/)
})

test("schema contains owner session revocation field", async () => {
  const schema = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8")

  assert.match(schema, /sessionVersion\s+Int\s+@default\(0\)/)
})

test("fresh install and production migrations use explicit Prisma configs", async () => {
  const defaultConfig = await readFile(path.join(process.cwd(), "prisma.config.ts"), "utf8")
  const productionConfig = await readFile(path.join(process.cwd(), "prisma.production.config.ts"), "utf8")
  const ciWorkflow = await readFile(path.join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8")
  const deployScript = await readFile(path.join(process.cwd(), "scripts", "deploy-release.sh"), "utf8")

  assert.match(defaultConfig, /path:\s+"prisma\/migrations_clean"/)
  assert.match(productionConfig, /path:\s+"prisma\/migrations"/)
  assert.match(ciWorkflow, /npx prisma migrate deploy/)
  assert.match(ciWorkflow, /npx prisma migrate status/)
  assert.doesNotMatch(ciWorkflow, /prisma db push/)
  assert.match(deployScript, /prisma migrate deploy --config prisma\.production\.config\.ts/)
  assert.match(deployScript, /prisma migrate status --config prisma\.production\.config\.ts/)
})

test("URL ingestion code blocks SSRF-sensitive targets", async () => {
  const parser = await readFile(path.join(process.cwd(), "src", "lib", "knowledge", "parser.ts"), "utf8")

  for (const token of ["169.254.169.254", "127", "isBlockedIp", "redirect: 'manual'", "AbortSignal.timeout", "MAX_URL_BYTES"]) {
    assert.match(parser, new RegExp(token.replaceAll(".", "\\.")))
  }
})

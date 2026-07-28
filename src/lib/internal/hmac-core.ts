import { createHash, createHmac, timingSafeEqual } from "crypto"

const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000

export type InternalRequestVerification = {
  ok: boolean
  keyId?: string
  nonce?: string
  timestamp?: number
  error?: string
}

type HeaderReader = {
  get(name: string): string | null
}

type VerifyInput = {
  method: string
  path: string
  body: string
  headers: HeaderReader
  now?: number
  maxSkewMs?: number
  resolveSecret?: (keyId: string) => string | undefined
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

export function canonicalInternalPayload(input: {
  keyId: string
  timestamp: string
  nonce: string
  method: string
  path: string
  bodyHash: string
}): string {
  return [
    input.keyId,
    input.timestamp,
    input.nonce,
    input.method.toUpperCase(),
    input.path,
    input.bodyHash,
  ].join("\n")
}

export function signInternalPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

function readSignature(value: string | null): string | null {
  if (!value) return null
  return value.startsWith("sha256=") ? value.slice("sha256=".length) : value
}

function defaultResolveSecret(keyId: string): string | undefined {
  const configuredKeyId = process.env.REPLYOPS_INTERNAL_HMAC_KEY_ID || "default"
  if (keyId !== configuredKeyId) return undefined
  return process.env.REPLYOPS_INTERNAL_HMAC_SECRET
}

export function verifyInternalRequest(input: VerifyInput): InternalRequestVerification {
  const keyId = input.headers.get("x-replyops-key-id")
  const timestamp = input.headers.get("x-replyops-timestamp")
  const nonce = input.headers.get("x-replyops-nonce")
  const bodyHash = input.headers.get("x-replyops-body-sha256")
  const signature = readSignature(input.headers.get("x-replyops-signature"))

  if (!keyId || !timestamp || !nonce || !bodyHash || !signature) {
    return { ok: false, error: "missing_signature_headers" }
  }

  const parsedTimestamp = Number(timestamp)
  if (!Number.isFinite(parsedTimestamp)) {
    return { ok: false, error: "invalid_timestamp" }
  }

  const now = input.now ?? Date.now()
  const maxSkewMs = input.maxSkewMs ?? DEFAULT_MAX_SKEW_MS
  if (Math.abs(now - parsedTimestamp) > maxSkewMs) {
    return { ok: false, error: "stale_timestamp" }
  }

  const expectedBodyHash = sha256Hex(input.body)
  if (bodyHash !== expectedBodyHash) {
    return { ok: false, error: "body_hash_mismatch" }
  }

  const secret = (input.resolveSecret ?? defaultResolveSecret)(keyId)
  if (!secret) {
    return { ok: false, error: "unknown_key" }
  }

  const payload = canonicalInternalPayload({
    keyId,
    timestamp,
    nonce,
    method: input.method,
    path: input.path,
    bodyHash,
  })
  const expectedSignature = signInternalPayload(payload, secret)
  const expected = Buffer.from(expectedSignature, "hex")
  const actual = Buffer.from(signature, "hex")

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, error: "invalid_signature" }
  }

  return { ok: true, keyId, nonce, timestamp: parsedTimestamp }
}

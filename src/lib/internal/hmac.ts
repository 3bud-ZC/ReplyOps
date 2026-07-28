import { randomUUID } from "crypto"
import prisma from "@/lib/prisma"
import { decryptSecret } from "@/lib/crypto/encryption"
import { verifyInternalRequest } from "./hmac-core"
export {
  canonicalInternalPayload,
  sha256Hex,
  signInternalPayload,
} from "./hmac-core"

const NONCE_TTL_MS = 10 * 60 * 1000

type HeaderReader = {
  get(name: string): string | null
}

export async function verifyStoredInternalRequest(input: {
  method: string
  path: string
  body: string
  headers: HeaderReader
  requiredScope: string
}) {
  const keyId = input.headers.get("x-replyops-key-id")
  if (!keyId) {
    return { ok: false, error: "missing_signature_headers" as const }
  }

  const key = await prisma.apiKey.findUnique({ where: { keyId } })
  if (!key || key.deletedAt) {
    return { ok: false, error: "unknown_key" as const }
  }

  if (!key.enabled || key.revokedAt) {
    return { ok: false, error: "revoked_key" as const }
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return { ok: false, error: "expired_key" as const }
  }

  if (!key.scopes.includes(input.requiredScope)) {
    return { ok: false, error: "missing_scope" as const }
  }

  if (!key.encryptedSecret || !key.iv || !key.authTag) {
    return { ok: false, error: "key_secret_unavailable" as const }
  }

  const secret = decryptSecret({
    encryptedPayload: key.encryptedSecret,
    iv: key.iv,
    authTag: key.authTag,
  })

  const result = verifyInternalRequest({
    method: input.method,
    path: input.path,
    body: input.body,
    headers: input.headers,
    resolveSecret: (candidateKeyId) => candidateKeyId === key.keyId ? secret : undefined,
  })

  if (!result.ok) return result

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  })

  return result
}

export async function persistInternalNonce(nonce: string, timestamp: number): Promise<boolean> {
  await prisma.internalNonce.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })

  try {
    await prisma.internalNonce.create({
      data: {
        id: randomUUID(),
        nonce,
        expiresAt: new Date(timestamp + NONCE_TTL_MS),
      },
    })
    return true
  } catch {
    return false
  }
}

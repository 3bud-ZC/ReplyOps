import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

type EncryptedPayload = {
  encryptedPayload: string
  iv: string
  authTag: string
}

function getEncryptionKey(): Buffer {
  const raw = process.env.REPLYOPS_CREDENTIALS_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("REPLYOPS_CREDENTIALS_ENCRYPTION_KEY is required")
  }

  const trimmed = raw.trim()
  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex")
  }

  try {
    const decoded = Buffer.from(trimmed, "base64")
    if (decoded.length === 32) return decoded
  } catch {
    // Fall through to deterministic derivation for legacy secrets.
  }

  return createHash("sha256").update(trimmed).digest()
}

export function encryptSecret(plainText: string): EncryptedPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encryptedPayload: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  }
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64"),
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedPayload, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

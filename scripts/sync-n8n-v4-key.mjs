import crypto from "node:crypto"
import fs from "node:fs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

function loadEnv(filePath) {
  const vars = {}
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (match) vars[match[1]] = match[2].replace(/^['"]|['"]$/g, "")
  }
  return vars
}

function keyBuffer(raw) {
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex")
  const base64 = Buffer.from(raw, "base64")
  if (base64.length === 32) return base64
  return crypto.createHash("sha256").update(raw).digest()
}

function encryptSecret(plainText, rawKey) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer(rawKey), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  return {
    encryptedPayload: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  }
}

function setEnv(text, key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, "m")
  if (pattern.test(text)) return text.replace(pattern, line)
  return text.replace(/\s*$/, "") + `\n${line}\n`
}

async function main() {
  const sharedEnvPath = process.argv[2] || "/var/www/replyops/shared/.env"
  const n8nEnvPath = process.argv[3] || "/opt/n8n/.env"
  const vars = loadEnv(sharedEnvPath)
  if (!vars.DATABASE_URL) throw new Error("DATABASE_URL missing")
  if (!vars.REPLYOPS_CREDENTIALS_ENCRYPTION_KEY) throw new Error("REPLYOPS_CREDENTIALS_ENCRYPTION_KEY missing")

  const pool = new pg.Pool({ connectionString: vars.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: "abud-fun" } })
    if (!tenant) throw new Error("abud_fun_tenant_missing")

    const secret = `rosec_${crypto.randomBytes(32).toString("base64url")}`
    const keyId = `n8n_v4_${crypto.randomBytes(10).toString("hex")}`
    const encrypted = encryptSecret(secret, vars.REPLYOPS_CREDENTIALS_ENCRYPTION_KEY)

    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        keyId,
        keyHash: crypto.createHash("sha256").update(secret).digest("hex"),
        name: "n8n v4 runtime",
        scopes: ["messages:write"],
        encryptedSecret: encrypted.encryptedPayload,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        enabled: true,
      },
    })
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "api_key.create.n8n_v4",
        resource: "ApiKey",
        details: { keyId, scopes: ["messages:write"] },
      },
    })

    let n8nEnv = fs.existsSync(n8nEnvPath) ? fs.readFileSync(n8nEnvPath, "utf8") : ""
    n8nEnv = setEnv(n8nEnv, "REPLYOPS_INTERNAL_KEY_ID", keyId)
    n8nEnv = setEnv(n8nEnv, "REPLYOPS_INTERNAL_KEY_SECRET", secret)
    n8nEnv = setEnv(n8nEnv, "REPLYOPS_BASE_URL", "https://replyops.abud.fun")
    n8nEnv = setEnv(n8nEnv, "NODE_FUNCTION_ALLOW_BUILTIN", "crypto")
    fs.writeFileSync(n8nEnvPath, n8nEnv, { mode: 0o600 })
    fs.chmodSync(n8nEnvPath, 0o600)
    process.stdout.write(`N8N_V4_KEY_CREATED=${keyId}\n`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exit(1)
})

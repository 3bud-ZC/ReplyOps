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

async function telegram(method, token, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  })
  const json = await response.json()
  if (!response.ok || !json.ok) throw new Error(`telegram_${method}_failed`)
  return json
}

async function main() {
  const envPath = process.argv[2] || "/var/www/replyops/shared/.env"
  const vars = loadEnv(envPath)
  const tokenName = Object.keys(vars).find((key) => /TELEGRAM/i.test(key) && /TOKEN/i.test(key))
  const token = tokenName ? vars[tokenName] : ""
  if (!token) throw new Error("telegram_token_missing")
  if (!vars.DATABASE_URL) throw new Error("DATABASE_URL missing")
  if (!vars.REPLYOPS_CREDENTIALS_ENCRYPTION_KEY) throw new Error("REPLYOPS_CREDENTIALS_ENCRYPTION_KEY missing")

  const me = await telegram("getMe", token)
  const botId = String(me.result.id)
  const username = me.result.username ?? ""
  const pool = new pg.Pool({ connectionString: vars.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: "abud-fun" } })
    if (!tenant) throw new Error("abud_fun_tenant_missing")
    const webhookSecret = crypto.randomBytes(32).toString("base64url")
    const existing = await prisma.channelConnection.findFirst({
      where: { tenantId: tenant.id, type: "telegram", externalAccountId: botId, deletedAt: null },
    })
    const connection = existing
      ? await prisma.channelConnection.update({
          where: { id: existing.id },
          data: {
            status: "connected",
            enabled: true,
            displayName: username ? `@${username}` : me.result.first_name ?? "Telegram bot",
            webhookSecret,
            lastVerifiedTime: new Date(),
            lastError: null,
          },
        })
      : await prisma.channelConnection.create({
          data: {
            tenantId: tenant.id,
            type: "telegram",
            connectionId: `telegram_${crypto.randomUUID()}`,
            status: "connected",
            displayName: username ? `@${username}` : me.result.first_name ?? "Telegram bot",
            webhookSecret,
            externalAccountId: botId,
            enabled: true,
            lastVerifiedTime: new Date(),
          },
        })

    const encrypted = encryptSecret(JSON.stringify({ botToken: token, botId, username, firstName: me.result.first_name }), vars.REPLYOPS_CREDENTIALS_ENCRYPTION_KEY)
    await prisma.channelCredential.upsert({
      where: { channelConnectionId: connection.id },
      update: {
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        credentialVersion: { increment: 1 },
      },
      create: {
        channelConnectionId: connection.id,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    })
    const url = `https://replyops.abud.fun/api/webhooks/telegram/${connection.connectionId}`
    await telegram("setWebhook", token, { url, secret_token: webhookSecret, allowed_updates: ["message", "callback_query"], drop_pending_updates: false })
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "channel.telegram.migrate_to_replyops",
        resource: "ChannelConnection",
        details: { connectionId: connection.connectionId, botId, username },
      },
    })
    const info = await telegram("getWebhookInfo", token)
    process.stdout.write(`TELEGRAM_CONNECTION_ID=${connection.connectionId}\n`)
    process.stdout.write(`TELEGRAM_WEBHOOK_URL=${info.result?.url ?? ""}\n`)
    process.stdout.write(`TELEGRAM_PENDING_UPDATES=${info.result?.pending_update_count ?? 0}\n`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exit(1)
})

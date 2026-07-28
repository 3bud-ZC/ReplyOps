import argon2 from "argon2"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { PrismaClient, Role } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import dotenv from "dotenv"

const OWNER_EMAIL = "abudfun@gmail.com"
const PASSWORD_VARIABLE = "REPLYOPS_OWNER_BOOTSTRAP_PASSWORD"
const forcePasswordChange = process.env.REPLYOPS_OWNER_FORCE_PASSWORD_CHANGE !== "false"

const dashboardRoot = process.cwd()
const repoRoot = path.resolve(dashboardRoot, "..")
const localSecretsPath = path.join(repoRoot, "SECRETS.local.env")
const dashboardEnvPath = path.join(dashboardRoot, ".env")

dotenv.config({ path: dashboardEnvPath })

function parseEnv(text) {
  const values = new Map()
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (!match) continue
    values.set(match[1], match[2].replace(/^['"]|['"]$/g, ""))
  }
  return values
}

function setEnvValue(text, key, value) {
  const escaped = `${key}=${value}`
  if (new RegExp(`^${key}=.*$`, "m").test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, "m"), escaped)
  }
  const suffix = text.endsWith("\n") || text.length === 0 ? "" : "\n"
  return `${text}${suffix}${escaped}\n`
}

function ensureLocalOwnerPassword() {
  if (process.env[PASSWORD_VARIABLE]) {
    return process.env[PASSWORD_VARIABLE]
  }

  const current = fs.existsSync(localSecretsPath) ? fs.readFileSync(localSecretsPath, "utf8") : ""
  const values = parseEnv(current)
  const existing = values.get(PASSWORD_VARIABLE)
  if (existing) return existing

  const generated = crypto.randomBytes(24).toString("base64url")
  fs.writeFileSync(localSecretsPath, setEnvValue(current, PASSWORD_VARIABLE, generated), { mode: 0o600 })
  try {
    fs.chmodSync(localSecretsPath, 0o600)
  } catch {}
  return generated
}

async function main() {
  const password = ensureLocalOwnerPassword()
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL missing")

  const pool = new pg.Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const tenant = await prisma.tenant.upsert({
      where: { slug: "abud-fun" },
      update: { enabled: true, deletedAt: null },
      create: {
        name: "ABUD FUN",
        slug: "abud-fun",
        timezone: "Africa/Cairo",
        primaryLanguage: "ar",
        supportedLanguages: ["ar", "en"],
        defaultCurrency: "EGP",
        enabled: true,
        assistantConfiguration: { create: {} },
      },
    })

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
    const user = await prisma.user.upsert({
      where: { email: OWNER_EMAIL },
      update: {
        passwordHash,
        forcePasswordChange,
        sessionVersion: { increment: 1 },
      },
      create: {
        email: OWNER_EMAIL,
        name: "Abud",
        passwordHash,
        forcePasswordChange,
      },
    })

    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: Role.platform_owner },
      create: { userId: user.id, tenantId: tenant.id, role: Role.platform_owner },
    })

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        action: "auth.owner_bootstrap",
        resource: "User",
        details: { email: OWNER_EMAIL },
      },
    })

    process.stdout.write(`owner_bootstrap_ok ${OWNER_EMAIL}\n`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exit(1)
})

import fs from "node:fs"
import argon2 from "argon2"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

function loadEnv(filePath) {
  const vars = {}
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (!match) continue
    vars[match[1]] = match[2].replace(/^['"]|['"]$/g, "")
  }
  return vars
}

const vars = loadEnv(process.argv[2] || "/var/www/replyops/shared/.env")
const email = vars.REPLYOPS_OWNER_EMAIL || "abudfun@gmail.com"
const passwordNames = ["REPLYOPS_OWNER_CURRENT_PASSWORD", "REPLYOPS_OWNER_BOOTSTRAP_PASSWORD"].filter((name) => vars[name])
const pool = new pg.Pool({ connectionString: vars.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

try {
  const user = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true, forcePasswordChange: true, active: true } })
  console.log(`OWNER_USER_FOUND=${Boolean(user)}`)
  console.log(`OWNER_ACTIVE=${user?.active === true}`)
  console.log(`OWNER_FORCE_PASSWORD_CHANGE=${user?.forcePasswordChange === true}`)
  for (const name of passwordNames) {
    console.log(`${name}_MATCH=${user ? await argon2.verify(user.passwordHash, vars[name]) : false}`)
  }
} finally {
  await prisma.$disconnect()
  await pool.end()
}

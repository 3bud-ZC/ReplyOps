import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const VARIABLE = "REPLYOPS_CREDENTIALS_ENCRYPTION_KEY"
const localSecretsPath = path.join(path.resolve(process.cwd(), ".."), "SECRETS.local.env")

function setEnvValue(text, key, value) {
  const line = `${key}=${value}`
  if (new RegExp(`^${key}=.*$`, "m").test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, "m"), line)
  }
  return `${text}${text.endsWith("\n") || text.length === 0 ? "" : "\n"}${line}\n`
}

const current = fs.existsSync(localSecretsPath) ? fs.readFileSync(localSecretsPath, "utf8") : ""
const existing = current.match(new RegExp(`^${VARIABLE}=(.*)$`, "m"))?.[1]?.trim()
const value = existing || crypto.randomBytes(32).toString("hex")
fs.writeFileSync(localSecretsPath, setEnvValue(current, VARIABLE, value), { mode: 0o600 })
try {
  fs.chmodSync(localSecretsPath, 0o600)
} catch {}
process.stdout.write("credentials_encryption_key_ready\n")

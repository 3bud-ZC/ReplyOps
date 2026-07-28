import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const VARIABLE = "REPLYOPS_OWNER_CURRENT_PASSWORD"
const localSecretsPath = path.join(path.resolve(process.cwd(), ".."), "SECRETS.local.env")

function setEnvValue(text, key, value) {
  const line = `${key}=${value}`
  if (new RegExp(`^${key}=.*$`, "m").test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, "m"), line)
  }
  return `${text}${text.endsWith("\n") || text.length === 0 ? "" : "\n"}${line}\n`
}

const current = fs.existsSync(localSecretsPath) ? fs.readFileSync(localSecretsPath, "utf8") : ""
const generated = crypto.randomBytes(24).toString("base64url")
fs.writeFileSync(localSecretsPath, setEnvValue(current, VARIABLE, generated), { mode: 0o600 })
try {
  fs.chmodSync(localSecretsPath, 0o600)
} catch {}
process.stdout.write("owner_current_password_ready\n")

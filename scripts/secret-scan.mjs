import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const ignoredBasenames = new Set(["package-lock.json", "skills-lock.json"])
const ignoredExtensions = new Set([".ico", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".zip", ".gz", ".dump"])
const blockedPathPatterns = [
  /(^|[\\/])\.env($|[\\/])/,
  /(^|[\\/])\.env\.(?!example$)/,
  /SECRETS\.local\.env/i,
  /\.(dump|tar\.gz|zip|log)$/i,
  /(^|[\\/])uploads($|[\\/])/i,
]

const secretPatterns = [
  /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /sk-proj-[A-Za-z0-9_-]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /^\s*(?:export\s+)?(DATABASE_URL|NEXTAUTH_SECRET|GEMINI_API_KEY|TELEGRAM_BOT_TOKEN|WHATSAPP_ACCESS_TOKEN|N8N_ENCRYPTION_KEY|REPLYOPS_INTERNAL_HMAC_SECRET)\s*=\s*(?!["']?(change-me|placeholder|example|your-|local-|ci-|<|$))/i,
  /(password|secret|token|api[_-]?key)\s*[:=]\s*["'][^"']{16,}["']/i,
]

function gitFiles(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((file) => file.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

const candidates = new Set([
  ...gitFiles(["ls-files", "--cached"]),
  ...gitFiles(["ls-files", "--others", "--exclude-standard"]),
])

const findings = []

for (const file of candidates) {
  const normalized = file.replaceAll("\\", "/")
  const basename = path.basename(normalized)
  const ext = path.extname(normalized).toLowerCase()
  if (ignoredBasenames.has(basename) || ignoredExtensions.has(ext)) continue
  if (basename === ".env.example") continue
  if (blockedPathPatterns.some((pattern) => pattern.test(normalized))) {
    findings.push(`${file}: blocked publication path`)
    continue
  }

  let text = ""
  try {
    text = readFileSync(path.join(root, file), "utf8")
  } catch {
    continue
  }
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (line.includes("[REDACTED_SECRET]")) return
    if (secretPatterns.some((pattern) => pattern.test(line))) {
      findings.push(`${file}:${index + 1}: possible secret`)
    }
  })
}

if (findings.length) {
  console.error("Secret scan failed:")
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Secret scan passed: ${candidates.size} git-visible files checked.`)

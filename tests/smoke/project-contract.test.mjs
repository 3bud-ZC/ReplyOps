import test from "node:test"
import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

async function collectFiles(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, files)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

test("dashboard has no visible under-construction pages", async () => {
  const files = await collectFiles(path.join(root, "src", "app", "dashboard"))
  const pageFiles = files.filter((file) => file.endsWith(`${path.sep}page.tsx`))
  const banned = [/under construction/i, /coming soon/i, /fake metrics/i, /static demo/i]
  const offenders = []

  for (const file of pageFiles) {
    const text = await readFile(file, "utf8")
    if (banned.some((pattern) => pattern.test(text))) {
      offenders.push(path.relative(root, file))
    }
  }

  assert.deepEqual(offenders, [])
})

test("required dashboard product routes exist", async () => {
  const routes = [
    "products",
    "onboarding",
    "services",
    "policies-faqs",
    "channels",
    "conversations",
    "handoff",
    "actions",
    "follow-ups",
    "analytics",
    "team",
    "internal-api-keys",
    "audit-logs",
    "system-health",
    "account",
  ]

  for (const route of routes) {
    const file = path.join(root, "src", "app", "dashboard", route, "page.tsx")
    const text = await readFile(file, "utf8")
    assert.match(text, /export default/)
  }
})

test("internal API key dashboard lifecycle controls exist", async () => {
  const page = await readFile(path.join(root, "src", "app", "dashboard", "internal-api-keys", "page.tsx"), "utf8")
  const forms = await readFile(path.join(root, "src", "app", "dashboard", "internal-api-keys", "ApiKeyForms.tsx"), "utf8")
  const actions = await readFile(path.join(root, "src", "app", "actions", "api-keys.ts"), "utf8")

  for (const token of ["createInternalApiKey", "revokeInternalApiKey", "activateInternalApiKey", "rotateInternalApiKey"]) {
    assert.match(actions, new RegExp(token))
  }
  assert.match(actions, /encryptSecret/)
  assert.match(forms, /Shown once/)
  assert.match(page, /Audit history/)
})

test("required HMAC internal API routes exist", async () => {
  const routes = [
    ["assistant-config", "runtime:read"],
    ["memory", "memory:read"],
    ["knowledge-search", "knowledge:read"],
    [path.join("messages", "incoming"), "messages:write"],
    [path.join("messages", "outgoing"), "messages:write"],
    ["handoff", "handoff:write"],
    ["actions", "actions:write"],
    ["channel-send", "channel:send"],
    ["usage", "usage:write"],
    ["errors", "errors:write"],
  ]

  for (const [route, scope] of routes) {
    const text = await readFile(path.join(root, "src", "app", "api", "internal", route, "route.ts"), "utf8")
    assert.match(text, /runInternalHandler/)
    assert.match(text, new RegExp(scope.replace(":", ":")))
  }
})

test("internal runtime-config route enforces HMAC verification", async () => {
  const routeFile = path.join(root, "src", "app", "api", "internal", "runtime-config", "route.ts")
  const text = await readFile(routeFile, "utf8")
  const helper = await readFile(path.join(root, "src", "lib", "internal", "request.ts"), "utf8")

  assert.match(text, /runInternalHandler/)
  assert.match(helper, /verifyStoredInternalRequest/)
  assert.match(helper, /persistInternalNonce/)
  assert.match(text, /runtime:read/)
})

test("dashboard mutation actions exist for tenant assistant and knowledge workflows", async () => {
  const files = [
    ["src/app/actions/tenants.ts", ["createTenant", "updateTenant", "archiveTenant", "restoreTenant"]],
    ["src/app/actions/onboarding.ts", ["saveOnboardingProgress", "skipOnboardingForExperiencedUser"]],
    ["src/app/actions/assistant.ts", ["saveAssistantConfiguration"]],
    ["src/app/actions/knowledge.ts", ["uploadKnowledgeDocument", "updateKnowledgeDocument", "reindexKnowledgeDocument", "archiveKnowledgeDocument", "restoreKnowledgeDocument"]],
  ]

  for (const [file, exports] of files) {
    const text = await readFile(path.join(root, file), "utf8")
    for (const exportName of exports) {
      assert.match(text, new RegExp(`export async function ${exportName}`))
    }
  }
})

test("owner credential bootstrap and reset controls exist", async () => {
  const bootstrap = await readFile(path.join(root, "scripts", "bootstrap-owner.mjs"), "utf8")
  const sync = await readFile(path.join(root, "scripts", "sync-owner-secret-to-vps.mjs"), "utf8")
  const encryptionKey = await readFile(path.join(root, "scripts", "generate-credentials-encryption-key.mjs"), "utf8")
  const encryptionKeySync = await readFile(path.join(root, "scripts", "sync-credentials-encryption-key-to-vps.mjs"), "utf8")
  const accountActions = await readFile(path.join(root, "src", "app", "actions", "account.ts"), "utf8")
  const accountPage = await readFile(path.join(root, "src", "app", "dashboard", "account", "page.tsx"), "utf8")

  assert.match(bootstrap, /REPLYOPS_OWNER_BOOTSTRAP_PASSWORD/)
  assert.match(sync, /REPLYOPS_OWNER_CURRENT_PASSWORD/)
  assert.match(encryptionKey, /REPLYOPS_CREDENTIALS_ENCRYPTION_KEY/)
  assert.match(encryptionKeySync, /REPLYOPS_CREDENTIALS_ENCRYPTION_KEY/)
  assert.match(bootstrap, /REPLYOPS_OWNER_FORCE_PASSWORD_CHANGE/)
  assert.match(bootstrap, /process\.env\.REPLYOPS_OWNER_FORCE_PASSWORD_CHANGE !== "false"/)
  assert.match(bootstrap, /forcePasswordChange,/)
  assert.match(sync, /\/var\/www\/replyops\/shared\/\.env/)
  assert.match(accountActions, /resetUserCredential/)
  assert.match(accountActions, /sessionVersion:\s*\{\s*increment:\s*1\s*\}/)
  assert.match(accountPage, /ResetCredentialForm/)
})

test("password change route requires explicit CSRF header", async () => {
  const route = await readFile(path.join(root, "src", "app", "api", "auth", "change-password", "route.ts"), "utf8")
  const form = await readFile(path.join(root, "src", "app", "change-password", "ChangePasswordForm.tsx"), "utf8")

  assert.match(route, /verifyCsrf/)
  assert.match(route, /x-csrf-token/)
  assert.match(route, /Invalid CSRF token/)
  assert.match(form, /\/api\/auth\/csrf/)
  assert.match(form, /x-csrf-token/)
})

test("public repository safety files exist", async () => {
  const required = [
    "README.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "CODE_OF_CONDUCT.md",
    ".env.example",
    ".gitattributes",
    path.join(".github", "workflows", "ci.yml"),
    path.join(".github", "dependabot.yml"),
    path.join(".github", "pull_request_template.md"),
    path.join(".github", "ISSUE_TEMPLATE", "bug_report.md"),
    path.join(".github", "ISSUE_TEMPLATE", "security_report.md"),
    path.join("scripts", "secret-scan.mjs"),
  ]

  for (const file of required) {
    const text = await readFile(path.join(root, file), "utf8")
    assert.ok(text.trim().length > 0, `${file} should not be empty`)
  }
})

test("README describes ReplyOps instead of starter template", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8")
  assert.match(readme, /ReplyOps AI/)
  assert.match(readme, /Knowledge\/RAG/)
  assert.match(readme, /n8n v4/)
  assert.match(readme, /STATUS\.md/)
  assert.doesNotMatch(readme, /create-next-app/i)
  assert.doesNotMatch(readme, /Deploy on Vercel/i)
})

test("safe env example uses placeholders only", async () => {
  const envExample = await readFile(path.join(root, ".env.example"), "utf8")
  assert.match(envExample, /DATABASE_URL=postgresql:\/\/replyops_user:change-me@localhost:5433\/replyops_app/)
  assert.doesNotMatch(envExample, /167\.99\.157\.6/)
  assert.doesNotMatch(envExample, /replyops\.abud\.fun/)
  assert.doesNotMatch(envExample, /botn8n\.abud\.fun/)
})

test("CI runs required launch gates", async () => {
  const ci = await readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf8")
  for (const token of [
    "npm ci",
    "npx playwright install --with-deps chromium",
    "npx prisma validate",
    "npx prisma generate",
    "npx prisma migrate deploy",
    "npx prisma migrate status",
    "npm run typecheck",
    "npm run lint",
    "npm test",
    "npm run test:integration",
    "npm run test:e2e",
    "npm run build",
    "npm run secret-scan",
    "npm audit --omit=dev",
  ]) {
    assert.match(ci, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
  assert.doesNotMatch(ci, /prisma db push/)
})

test("Arabic and English dictionaries have matching keys", async () => {
  const i18n = await readFile(path.join(root, "src", "lib", "i18n.ts"), "utf8")
  const arBlock = i18n.match(/ar:\s*\{([\s\S]*?)\n\s*\},\n\s*en:/)?.[1] ?? ""
  const enBlock = i18n.match(/en:\s*\{([\s\S]*?)\n\s*\},\n\} as const/)?.[1] ?? ""
  const keyPattern = /^\s*([A-Za-z][A-Za-z0-9]*):/gm
  const arKeys = [...arBlock.matchAll(keyPattern)].map((match) => match[1]).sort()
  const enKeys = [...enBlock.matchAll(keyPattern)].map((match) => match[1]).sort()
  assert.deepEqual(arKeys, enKeys)
})

test("dashboard shell uses localized labels for navigation and role text", async () => {
  const header = await readFile(path.join(root, "src", "components", "dashboard", "Header.tsx"), "utf8")
  const sidebar = await readFile(path.join(root, "src", "components", "dashboard", "Sidebar.tsx"), "utf8")
  assert.match(header, /t\.openNavigation/)
  assert.match(header, /t\.closeNavigation/)
  assert.match(header, /t\.accountFallback/)
  assert.match(header, /t\.user/)
  assert.match(sidebar, /t\.primaryNavigation/)
})

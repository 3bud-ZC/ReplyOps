import test from "node:test"
import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const dashboardRoot = path.join(root, "src", "app", "dashboard")
const componentRoot = path.join(root, "src", "components", "dashboard")

async function collectFiles(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, files)
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

function extractObjectKeys(text, objectName) {
  const block = text.match(new RegExp(`${objectName}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, "m"))?.[1] ?? ""
  return [...block.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gm)].map((match) => match[1]).sort()
}

function extractKnownEnglishStrings(...texts) {
  const values = new Set()
  for (const text of texts) {
    for (const match of text.matchAll(/:\s*"([^"\n]*[A-Za-z][^"\n]*)"/g)) values.add(match[1])
    for (const match of text.matchAll(/title: "([^"\n]*[A-Za-z][^"\n]*)"/g)) values.add(match[1])
    for (const match of text.matchAll(/purpose: "([^"\n]*[A-Za-z][^"\n]*)"/g)) values.add(match[1])
    for (const match of text.matchAll(/action: "([^"\n]*[A-Za-z][^"\n]*)"/g)) values.add(match[1])
    for (const match of text.matchAll(/definition: "([^"\n]*[A-Za-z][^"\n]*)"/g)) values.add(match[1])
    for (const match of text.matchAll(/label: "([^"\n]*[A-Za-z][^"\n]*)"/g)) values.add(match[1])
  }
  return values
}

function extractVisibleCandidates(text) {
  const candidates = new Set()
  for (const match of text.matchAll(/>\s*([^<>{}\n]*[A-Za-z][^<>{}\n]*)\s*</g)) {
    candidates.add(match[1].replace(/\s+/g, " ").trim())
  }
  for (const match of text.matchAll(/\b(?:title|description|unavailableAction|placeholder|aria-label|defaultValue)=["']([^"']*[A-Za-z][^"']*)["']/g)) {
    candidates.add(match[1].replace(/\s+/g, " ").trim())
  }
  return [...candidates].filter(Boolean)
}

function allowedTechnical(value) {
  if (value.includes("normalized.includes(")) return true
  return (
    /^(ReplyOps AI|ABUD FUN|Telegram|Web Chat|WhatsApp|Gemini|PostgreSQL|n8n HTTPS|ReplyOps HTTPS|Dead Letter queue|HTTP method|Headers JSON|Request template JSON|Action input JSON|API key to rotate)$/.test(value)
    || /\b(API|HMAC|HTTP|HTTPS|JSON|SSRF|URL|ID|SKU|Meta|Telegram|WhatsApp|Web Chat|ReplyOps|n8n|Gemini)\b/.test(value)
    || /^[A-Z0-9_:-]+$/.test(value)
    || /^[a-z0-9_,-]+$/.test(value)
    || /^#[0-9A-F]{6}$/i.test(value)
    || /^[A-Za-z]+\/[A-Za-z_]+$/.test(value)
    || /^https?:\/\//.test(value)
    || /^[a-z0-9_.:-]+@[a-z0-9_.:-]+$/i.test(value)
    || /\{|\}|\$\{|=>|^\w+\.\w+/.test(value)
  )
}

test("localized UI dictionaries have exact Arabic and English key parity", async () => {
  const text = await readFile(path.join(root, "src", "lib", "localized-ui.ts"), "utf8")
  assert.deepEqual(extractObjectKeys(text, "ar"), extractObjectKeys(text, "en"))
})

test("strict dashboard source localization audit covers visible English strings", async () => {
  const [i18n, localizedUi, pageGuides] = await Promise.all([
    readFile(path.join(root, "src", "lib", "i18n.ts"), "utf8"),
    readFile(path.join(root, "src", "lib", "localized-ui.ts"), "utf8"),
    readFile(path.join(root, "src", "lib", "page-guides.ts"), "utf8"),
  ])
  const known = extractKnownEnglishStrings(i18n, localizedUi, pageGuides)
  const files = [...await collectFiles(dashboardRoot), ...await collectFiles(componentRoot)]
  const offenders = []

  for (const file of files) {
    const text = await readFile(file, "utf8")
    for (const candidate of extractVisibleCandidates(text)) {
      if (known.has(candidate) || allowedTechnical(candidate)) continue
      offenders.push(`${path.relative(root, file)}: ${candidate}`)
    }
  }

  assert.deepEqual(offenders, [])
})

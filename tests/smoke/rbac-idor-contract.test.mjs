import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("knowledge page rejects non-owner tenantId override", async () => {
  const source = await readFile(path.join(root, "src", "app", "dashboard", "knowledge", "page.tsx"), "utf8")

  assert.match(source, /const tenantIds = user\.memberships\.map/)
  assert.match(source, /await Promise\.resolve\(searchParams\)/)
  assert.match(source, /!isPlatformOwner && !tenantIds\.includes\(tenantId\)/)
  assert.match(source, /Please create or select a business first/)
})

test("dashboard data pages scope non-owner queries to membership tenants", async () => {
  const pages = [
    "actions",
    "analytics",
    "audit-logs",
    "channels",
    "conversations",
    "follow-ups",
    "handoff",
  ]

  for (const page of pages) {
    const source = await readFile(path.join(root, "src", "app", "dashboard", page, "page.tsx"), "utf8")
    assert.match(source, /isPlatformOwner/)
    assert.match(source, /tenantIds/)
  }
})

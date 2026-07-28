import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

test("sidebar exposes operational dashboard routes", async () => {
  const sidebar = await readFile(path.join(process.cwd(), "src", "components", "dashboard", "Sidebar.tsx"), "utf8")

  for (const route of [
    "/dashboard/products",
    "/dashboard/services",
    "/dashboard/policies-faqs",
    "/dashboard/actions",
    "/dashboard/follow-ups",
    "/dashboard/analytics",
    "/dashboard/audit-logs",
    "/dashboard/system-health",
  ]) {
    assert.match(sidebar, new RegExp(route.replaceAll("/", "\\/")))
  }
})

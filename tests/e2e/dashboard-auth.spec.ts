import { expect, test } from "@playwright/test"
import { spawnSync } from "node:child_process"

const ownerEmail = process.env.REPLYOPS_OWNER_EMAIL ?? "abudfun@gmail.com"
const bootstrapPassword = process.env.REPLYOPS_OWNER_BOOTSTRAP_PASSWORD ?? "ReplyOps-e2e-bootstrap-password-2026"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`

test.beforeAll(() => {
  const result = spawnSync("node", ["scripts/bootstrap-owner.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      REPLYOPS_OWNER_BOOTSTRAP_PASSWORD: bootstrapPassword,
      REPLYOPS_OWNER_FORCE_PASSWORD_CHANGE: "false",
    },
    encoding: "utf8",
  })

  expect(result.status, result.stderr || result.stdout).toBe(0)
})

test("owner signs in through the browser and reaches dashboard content", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "replyops_locale",
      value: "en",
      url: baseURL,
    },
  ])
  await page.goto("/login")
  await page.getByLabel("Email").fill(ownerEmail)
  await page.getByLabel("Password").fill(bootstrapPassword)
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.waitForURL(/\/dashboard/)

  await expect(page.locator("#dashboard-content")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible()
})

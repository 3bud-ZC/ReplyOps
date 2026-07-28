import { expect, test } from "@playwright/test"
import { spawnSync } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const ownerEmail = process.env.REPLYOPS_OWNER_EMAIL ?? "abudfun@gmail.com"
const ownerPassword = process.env.REPLYOPS_OWNER_CURRENT_PASSWORD
  ?? process.env.REPLYOPS_OWNER_BOOTSTRAP_PASSWORD
  ?? "ReplyOps-e2e-bootstrap-password-2026"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`

const routes = [
  "/dashboard",
  "/dashboard/businesses",
  "/dashboard/assistant",
  "/dashboard/knowledge",
  "/dashboard/products",
  "/dashboard/services",
  "/dashboard/policies-faqs",
  "/dashboard/channels",
  "/dashboard/conversations",
  "/dashboard/handoff",
  "/dashboard/actions",
  "/dashboard/follow-ups",
  "/dashboard/test-lab",
  "/dashboard/analytics",
  "/dashboard/team",
  "/dashboard/internal-api-keys",
  "/dashboard/audit-logs",
  "/dashboard/system-health",
  "/dashboard/account",
]

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
]

const modes = [
  { locale: "en", theme: "dark" },
  { locale: "en", theme: "light" },
  { locale: "ar", theme: "dark" },
  { locale: "ar", theme: "light" },
] as const

const bannedArabicVisibleText = [
  "Businesses",
  "AI Assistant Settings",
  "Knowledge Base",
  "No products stored.",
  "No services stored.",
  "No channel connections",
  "No conversations yet",
  "No handoffs",
  "Create HTTP action",
  "Create rule",
  "Simulation Session",
  "Decision Trace",
  "No usage metrics recorded.",
  "Invite member",
  "Create internal API key",
  "No audit events recorded.",
  "Recent runtime events",
  "Account Settings",
]

test.beforeAll(() => {
  const result = spawnSync("node", ["scripts/bootstrap-owner.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      REPLYOPS_OWNER_BOOTSTRAP_PASSWORD: ownerPassword,
      REPLYOPS_OWNER_FORCE_PASSWORD_CHANGE: "false",
    },
    encoding: "utf8",
  })
  expect(result.status, result.stderr || result.stdout).toBe(0)
})

async function login(page: import("@playwright/test").Page) {
  await page.context().addCookies([{ name: "replyops_locale", value: "en", url: baseURL }])
  await page.goto("/login")
  await page.getByLabel("Email").fill(ownerEmail)
  await page.getByLabel("Password").fill(ownerPassword)
  await page.getByRole("button", { name: /Sign In/i }).click()
  await page.waitForURL(/\/dashboard/)
  await expect(page.locator("#dashboard-content")).toBeVisible()
}

test("authenticated dashboard visual route matrix", async ({ page }, testInfo) => {
  test.setTimeout(20 * 60_000)
  await login(page)
  const outputDir = path.join(process.cwd(), "scratch", "visual-qa")
  await mkdir(outputDir, { recursive: true })
  const results: unknown[] = []

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const mode of modes) {
      await page.context().addCookies([{ name: "replyops_locale", value: mode.locale, url: baseURL }])
      await page.evaluate((theme) => {
        window.localStorage.setItem("theme", theme)
        document.documentElement.classList.toggle("dark", theme === "dark")
      }, mode.theme)

      for (const route of routes) {
        const consoleErrors: string[] = []
        page.removeAllListeners("console")
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text())
        })

        await page.goto(route, { waitUntil: "networkidle" })
        await page.waitForTimeout(150)
        await expect(page.locator("#dashboard-content")).toBeVisible()

        const checks = await page.evaluate(({ locale, banned }) => {
          const root = document.documentElement
          const bodyText = document.body.innerText
          const main = document.querySelector("#dashboard-content") as HTMLElement | null
          const sidebar = document.querySelector("aside") as HTMLElement | null
          const buttons = [...document.querySelectorAll("button")]
          const unlabeledButtons = buttons.filter((button) => !button.textContent?.trim() && !button.getAttribute("aria-label") && !button.querySelector(".sr-only")).length
          const ltrTargets = [...document.querySelectorAll("code, .font-mono, input[type='email'], input[type='password'], input[name*='url' i], input[name*='token' i], input[name*='secret' i]")]
          return {
            htmlDir: root.dir,
            bodyDir: document.body.dir,
            mainTextAlign: main ? getComputedStyle(main).textAlign : "",
            sidebarSide: sidebar ? Math.round(sidebar.getBoundingClientRect().left) : null,
            viewportWidth: window.innerWidth,
            overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
            translation: locale === "ar" ? !banned.some((term: string) => bodyText.includes(term)) : true,
            accessibility: unlabeledButtons === 0,
            unlabeledButtons,
            ltrStable: ltrTargets.every((element) => getComputedStyle(element).direction === "ltr"),
          }
        }, { locale: mode.locale, banned: bannedArabicVisibleText })

        const expectedDir = mode.locale === "ar" ? "rtl" : "ltr"
        const dirOk = checks.htmlDir === expectedDir && checks.bodyDir === expectedDir
        const sidebarOk = checks.sidebarSide == null
          || viewport.width < 1024
          || (mode.locale === "ar" ? checks.sidebarSide > checks.viewportWidth / 2 : checks.sidebarSide < 8)
        const pass = dirOk && sidebarOk && checks.overflow && checks.translation && checks.accessibility && checks.ltrStable && consoleErrors.length === 0
        const screenshotName = `${route.replaceAll("/", "_").replace(/^_/, "") || "dashboard"}-${viewport.width}x${viewport.height}-${mode.locale}-${mode.theme}.png`
        const screenshotPath = path.join(outputDir, screenshotName)
        await page.screenshot({ path: screenshotPath, fullPage: false })

        results.push({
          route,
          viewport: `${viewport.width}x${viewport.height}`,
          locale: mode.locale,
          theme: mode.theme,
          consoleErrorCount: consoleErrors.length,
          overflow: checks.overflow,
          translation: checks.translation,
          accessibility: checks.accessibility,
          dir: dirOk,
          sidebar: sidebarOk,
          ltrStable: checks.ltrStable,
          screenshotPath,
          pass,
        })

        expect(pass, JSON.stringify(results.at(-1), null, 2)).toBe(true)
      }
    }
  }

  const resultPath = path.join(outputDir, "dashboard-route-matrix.json")
  await writeFile(resultPath, JSON.stringify(results, null, 2))
  await testInfo.attach("dashboard-route-matrix", { path: resultPath, contentType: "application/json" })
})

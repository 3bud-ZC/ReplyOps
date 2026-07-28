import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("runtime rejects prompt injection before retrieval or generation", async () => {
  const source = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")
  const injectionIndex = source.indexOf("if (isPromptInjection(input.content))")
  const retrievalIndex = source.indexOf("results = await hybridSearch")

  assert.ok(injectionIndex > -1)
  assert.ok(retrievalIndex > -1)
  assert.ok(injectionIndex < retrievalIndex)
  assert.match(source, /security\.prompt_injection_rejected/)
  assert.match(source, /actionState: "security_rejected"/)
})

test("runtime routes discount requests to human approval without granting them", async () => {
  const source = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")

  assert.match(source, /isApprovalRequiredDiscount/)
  assert.match(source, /approval\.discount_requested/)
  assert.match(source, /actionState: "approval_required"/)
  assert.match(source, /I cannot approve a discount automatically/)
})

test("handoff actions prevent duplicates and require explicit AI resume", async () => {
  const actions = await readFile(path.join(root, "src", "app", "actions", "handoff.ts"), "utf8")
  const page = await readFile(path.join(root, "src", "app", "dashboard", "handoff", "page.tsx"), "utf8")

  assert.match(actions, /handoffAssignment\.findFirst/)
  assert.match(actions, /handoff\.reply_duplicate_ignored/)
  assert.match(actions, /status: "resolved", automationPaused: true/)
  assert.match(actions, /export async function resumeConversationAutomation/)
  assert.match(page, /Resolve/)
  assert.match(page, /Resume AI/)
  assert.doesNotMatch(page, /Resolve and resume AI/)
})

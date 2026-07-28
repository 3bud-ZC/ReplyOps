import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

const runtimePath = path.join(process.cwd(), "src", "lib", "channels", "runtime.ts")

test("runtime handles Telegram slash commands before retrieval or generation", async () => {
  const source = await readFile(runtimePath, "utf8")

  const commandBranchIndex = source.indexOf("const slashCommand = getSlashCommand(input.content)")
  const retrievalIndex = source.indexOf("results = await hybridSearch")
  const generationIndex = source.indexOf("await generateResponse")

  assert.ok(commandBranchIndex > -1)
  assert.ok(retrievalIndex > -1)
  assert.ok(generationIndex > -1)
  assert.ok(commandBranchIndex < retrievalIndex)
  assert.ok(commandBranchIndex < generationIndex)
})

test("runtime command copy covers start, help, human, and unknown slash commands", async () => {
  const source = await readFile(runtimePath, "utf8")

  for (const token of [
    'command === "/start"',
    'command === "/help"',
    '/human - Request a human agent',
    "Unknown command. Send /help to see available commands.",
    'slashCommand !== "/human"',
  ]) {
    assert.ok(source.includes(token), `missing ${token}`)
  }
})

test("runtime preserves existing handoff state when conversation already exists", async () => {
  const source = await readFile(runtimePath, "utf8")

  assert.match(source, /update:\s*\{\s*lastMessageAt:\s*new Date\(\)\s*\}/)
  assert.doesNotMatch(source, /update:\s*\{\s*status:\s*"active"/)
})

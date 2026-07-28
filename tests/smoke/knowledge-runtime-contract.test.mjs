import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("knowledge retriever keeps keyword fallback when vector provider fails", async () => {
  const source = await readFile(path.join(root, "src", "lib", "knowledge", "retriever.ts"), "utf8")

  assert.match(source, /async function keywordSearch/)
  assert.match(source, /MIN_VECTOR_RELEVANCE/)
  assert.match(source, /Number\(result\.vector_score\) >= MIN_VECTOR_RELEVANCE/)
  assert.match(source, /Knowledge vector search unavailable/)
  assert.match(source, /d\."deletedAt" IS NULL/)
  assert.match(source, /c\.embedding IS NOT NULL/)
})

test("knowledge indexing preserves keyword-searchable chunks when embeddings fail", async () => {
  const source = await readFile(path.join(root, "src", "lib", "knowledge", "service.ts"), "utf8")

  assert.match(source, /embedding_provider_failed_for_/)
  assert.match(source, /embeddingStatus: 'FAILED'/)
  assert.match(source, /knowledgeChunk\.create/)
})

test("runtime returns temporary response for provider failures", async () => {
  const source = await readFile(path.join(root, "src", "lib", "channels", "runtime.ts"), "utf8")

  assert.match(source, /temporaryErrorAnswer/)
  assert.match(source, /eventType: "provider_failure"/)
  assert.match(source, /providerState = classified\.kind/)
  assert.match(source, /actionState: providerState === "ok" \|\| providerState === "not_required" \? undefined : "provider_failure"/)
})

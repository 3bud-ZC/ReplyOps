import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("webchat preflight validates configured origin", async () => {
  const cors = await readFile(path.join(root, "src", "app", "api", "webchat", "[connectionId]", "cors.ts"), "utf8")
  const config = await readFile(path.join(root, "src", "app", "api", "webchat", "[connectionId]", "config", "route.ts"), "utf8")
  const message = await readFile(path.join(root, "src", "app", "api", "webchat", "[connectionId]", "message", "route.ts"), "utf8")

  assert.match(cors, /webChatOptionsResponse/)
  assert.match(cors, /getWebChatConnection\(connectionId, origin\)/)
  assert.match(config, /webChatOptionsResponse/)
  assert.match(message, /webChatOptionsResponse/)
})

test("whatsapp webhook handles delivery status callbacks", async () => {
  const source = await readFile(path.join(root, "src", "app", "api", "webhooks", "whatsapp", "[connectionId]", "route.ts"), "utf8")

  assert.match(source, /change\?\.statuses\?\.\[0\]/)
  assert.match(source, /whatsapp\.delivery_status/)
  assert.match(source, /status_received/)
  assert.match(source, /error_code/)
})

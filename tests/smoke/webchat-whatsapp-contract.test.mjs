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
  assert.match(cors, /blockedCorsHeaders/)
  assert.match(config, /webChatOptionsResponse/)
  assert.match(config, /session_fields/)
  assert.match(message, /webChatOptionsResponse/)
  assert.match(message, /customer_email/)
  assert.match(message, /invalid_customer_email/)
})

test("whatsapp webhook handles delivery status callbacks", async () => {
  const source = await readFile(path.join(root, "src", "app", "api", "webhooks", "whatsapp", "[connectionId]", "route.ts"), "utf8")
  const whatsapp = await readFile(path.join(root, "src", "lib", "channels", "whatsapp.ts"), "utf8")

  assert.match(source, /change\?\.statuses\?\.\[0\]/)
  assert.match(source, /whatsapp\.delivery_status/)
  assert.match(source, /status_received/)
  assert.match(source, /error_code/)
  assert.match(source, /normalizeWhatsAppDeliveryStatus/)
  assert.match(whatsapp, /evaluateWhatsAppSendPolicy/)
  assert.match(whatsapp, /template_required_outside_24h_window/)
  assert.match(whatsapp, /redactWhatsAppCredential/)
})

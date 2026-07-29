import { timingSafeEqual, createHmac } from "crypto"
import { WhatsAppCredential } from "./credentials"

type WhatsAppInboundMessage = {
  id?: string
  from?: string
  type?: string
  text?: { body?: string }
  image?: { id?: string; mime_type?: string; sha256?: string; caption?: string }
  video?: { id?: string; mime_type?: string; sha256?: string; caption?: string }
  audio?: { id?: string; mime_type?: string; sha256?: string; voice?: boolean }
  document?: { id?: string; filename?: string; mime_type?: string; sha256?: string; caption?: string }
  location?: { latitude?: number; longitude?: number; name?: string; address?: string }
  contacts?: Array<Record<string, unknown>>
}

export function graphBase(version: string) {
  if (!/^v\d+\.\d+$/.test(version)) throw new Error("invalid_graph_version")
  return `https://graph.facebook.com/${version}`
}

export async function validateWhatsAppCredential(credential: WhatsAppCredential) {
  const url = `${graphBase(credential.graphApiVersion)}/${encodeURIComponent(credential.phoneNumberId)}?fields=id,display_phone_number,verified_name`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${credential.accessToken}` },
    cache: "no-store",
  })
  if (!response.ok) throw new Error("whatsapp_validation_failed")
  return response.json()
}

export function verifyWhatsAppSignature(appSecret: string, bodyText: string, signatureHeader: string | null) {
  if (!signatureHeader?.startsWith("sha256=")) return false
  const supplied = Buffer.from(signatureHeader.slice("sha256=".length), "hex")
  const expected = Buffer.from(createHmac("sha256", appSecret).update(bodyText).digest("hex"), "hex")
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export function normalizeWhatsAppInbound(message: WhatsAppInboundMessage) {
  const type = String(message.type ?? "text")
  const media = (message as Record<string, any>)[type]
  if (type === "text") {
    return {
      content: String(message.text?.body ?? "").trim(),
      metadata: { type },
    }
  }
  if (["image", "video", "audio", "document"].includes(type) && media) {
    const label = type === "document" ? media.filename || "document" : type
    return {
      content: String(media.caption ?? `[${type}: ${label}]`).trim(),
      metadata: {
        type,
        media_id: media.id,
        mime_type: media.mime_type,
        sha256: media.sha256,
        filename: media.filename,
        voice: media.voice,
      },
    }
  }
  if (type === "location" && message.location) {
    return {
      content: `[location: ${message.location.latitude},${message.location.longitude}]`,
      metadata: { type, ...message.location },
    }
  }
  if (type === "contacts" && message.contacts?.length) {
    return {
      content: `[contacts: ${message.contacts.length}]`,
      metadata: { type, contacts: message.contacts },
    }
  }
  return { content: "", metadata: { type, unsupported: true } }
}

export function isInsideWhatsAppServiceWindow(lastInboundAt: Date | null, now: Date = new Date()) {
  if (!lastInboundAt) return false
  return now.getTime() - lastInboundAt.getTime() <= 24 * 60 * 60 * 1000
}

export async function sendWhatsAppText(credential: WhatsAppCredential, to: string, text: string) {
  const response = await fetch(`${graphBase(credential.graphApiVersion)}/${encodeURIComponent(credential.phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error("whatsapp_send_failed")
  return data
}

export async function sendWhatsAppTemplate(
  credential: WhatsAppCredential,
  to: string,
  template: { name: string; language: string; parameters?: string[] },
) {
  if (!/^[a-z0-9_]+$/i.test(template.name)) throw new Error("invalid_template")
  if (!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(template.language)) throw new Error("invalid_template_language")
  const response = await fetch(`${graphBase(credential.graphApiVersion)}/${encodeURIComponent(credential.phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: template.parameters?.length
          ? [{ type: "body", parameters: template.parameters.map((text) => ({ type: "text", text })) }]
          : undefined,
      },
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error("whatsapp_template_send_failed")
  return data
}

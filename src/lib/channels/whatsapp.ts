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

export type WhatsAppSendPolicy = {
  optedOut?: boolean
  optInRequired?: boolean
  optedIn?: boolean
  quietHoursActive?: boolean
  customerDailyCount?: number
  customerDailyLimit?: number
  tenantDailyCount?: number
  tenantDailyLimit?: number
  lastInboundAt?: Date | null
  now?: Date
  approvedTemplates?: string[]
}

export type WhatsAppOutboundRequest =
  | { type: "text"; text: string; contextMessageId?: string }
  | { type: "template"; template: { name: string; language: string; parameters?: string[] }; contextMessageId?: string }

export function redactWhatsAppCredential(credential: WhatsAppCredential) {
  return {
    appId: credential.appId,
    phoneNumberId: credential.phoneNumberId,
    businessAccountId: credential.businessAccountId,
    graphApiVersion: credential.graphApiVersion,
    appSecret: "[redacted]",
    accessToken: "[redacted]",
    verifyToken: "[redacted]",
  }
}

export function normalizeWhatsAppDeliveryStatus(status: string) {
  if (status === "read") return "read"
  if (status === "delivered") return "delivered"
  if (status === "sent") return "sent"
  if (status === "failed") return "failed"
  return "stored"
}

export function evaluateWhatsAppSendPolicy(request: WhatsAppOutboundRequest, policy: WhatsAppSendPolicy) {
  if (policy.optedOut) return { allowed: false, reason: "customer_opted_out" }
  if (policy.optInRequired && !policy.optedIn) return { allowed: false, reason: "customer_opt_in_required" }
  if (policy.quietHoursActive) return { allowed: false, reason: "quiet_hours_delay" }
  if ((policy.customerDailyCount ?? 0) >= (policy.customerDailyLimit ?? Number.POSITIVE_INFINITY)) {
    return { allowed: false, reason: "customer_limit_exceeded" }
  }
  if ((policy.tenantDailyCount ?? 0) >= (policy.tenantDailyLimit ?? Number.POSITIVE_INFINITY)) {
    return { allowed: false, reason: "tenant_limit_exceeded" }
  }
  const insideServiceWindow = isInsideWhatsAppServiceWindow(policy.lastInboundAt ?? null, policy.now)
  if (request.type === "text" && !insideServiceWindow) return { allowed: false, reason: "template_required_outside_24h_window" }
  if (request.type === "template" && policy.approvedTemplates && !policy.approvedTemplates.includes(request.template.name)) {
    return { allowed: false, reason: "template_not_approved" }
  }
  return { allowed: true, reason: "allowed" }
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

export async function sendWhatsAppWithPolicy(
  credential: WhatsAppCredential,
  to: string,
  request: WhatsAppOutboundRequest,
  policy: WhatsAppSendPolicy,
) {
  const decision = evaluateWhatsAppSendPolicy(request, policy)
  if (!decision.allowed) throw new Error(decision.reason)
  if (request.type === "template") return sendWhatsAppTemplate(credential, to, request.template)
  return sendWhatsAppText(credential, to, request.text)
}

import { timingSafeEqual, createHmac } from "crypto"
import { WhatsAppCredential } from "./credentials"

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

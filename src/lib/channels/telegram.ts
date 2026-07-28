import { TelegramCredential } from "./credentials"

type TelegramMe = {
  ok: boolean
  result?: {
    id: number
    is_bot: boolean
    first_name?: string
    username?: string
  }
  description?: string
}

export async function validateTelegramToken(botToken: string): Promise<TelegramCredential> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { cache: "no-store" })
  const data = (await response.json()) as TelegramMe
  if (!response.ok || !data.ok || !data.result?.id || !data.result.is_bot) {
    throw new Error("telegram_validation_failed")
  }
  return {
    botToken,
    botId: String(data.result.id),
    username: data.result.username ?? "",
    firstName: data.result.first_name,
  }
}

export async function setTelegramWebhook(botToken: string, webhookUrl: string, secretToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    }),
  })
  const data = await response.json()
  if (!response.ok || !data.ok) throw new Error("telegram_webhook_registration_failed")
  return data
}

export async function deleteTelegramWebhook(botToken: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ drop_pending_updates: false }),
  })
}

export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  const data = await response.json()
  if (!response.ok || !data.ok) throw new Error("telegram_send_failed")
  return data
}

export async function sendTelegramTyping(botToken: string, chatId: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  })
}

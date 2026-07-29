import dns from "dns/promises"
import net from "net"

function isPrivateAddress(address: string) {
  if (net.isIP(address) === 4) {
    const parts = address.split(".").map(Number)
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    )
  }
  if (net.isIP(address) === 6) {
    const lower = address.toLowerCase()
    return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")
  }
  return true
}

export async function assertSafeHttpUrl(rawUrl: string, allowedDomains: string[] = []) {
  const url = new URL(rawUrl)
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported_action_url_scheme")
  if (url.username || url.password) throw new Error("action_url_credentials_blocked")
  if (allowedDomains.length > 0 && !allowedDomains.includes(url.hostname)) throw new Error("action_domain_not_allowed")
  if (["localhost", "metadata.google.internal"].includes(url.hostname.toLowerCase())) throw new Error("action_host_blocked")
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("action_private_network_blocked")
  }
  return url
}

export async function safeJsonFetch(rawUrl: string, init: RequestInit & { timeoutMs?: number; allowedDomains?: string[] }) {
  const url = await assertSafeHttpUrl(rawUrl, init.allowedDomains ?? [])
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 5000)
  const maxResponseBytes = 256 * 1024
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: "error" })
    const text = await response.text()
    if (Buffer.byteLength(text, "utf8") > maxResponseBytes) throw new Error("action_response_too_large")
    return {
      ok: response.ok,
      status: response.status,
      body: text ? JSON.parse(text) : null,
    }
  } finally {
    clearTimeout(timer)
  }
}

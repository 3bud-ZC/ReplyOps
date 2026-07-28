import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { persistInternalNonce, verifyStoredInternalRequest } from "@/lib/internal/hmac"

export type InternalContext = {
  bodyText: string
  json: any
  requestId: string
}

export function internalError(error: string, status: number, requestId: string = randomUUID()) {
  return NextResponse.json({ success: false, request_id: requestId, error }, { status })
}

export async function verifyInternalJson(
  request: NextRequest,
  requiredScope: string,
): Promise<{ ok: true; context: InternalContext } | { ok: false; response: NextResponse }> {
  const requestId = request.headers.get("x-request-id") ?? randomUUID()
  const bodyText = await request.text()
  const verification = await verifyStoredInternalRequest({
    method: request.method,
    path: request.nextUrl.pathname,
    body: bodyText,
    headers: request.headers,
    requiredScope,
  })

  if (!verification.ok || !verification.nonce || !verification.timestamp) {
    return { ok: false, response: internalError(verification.error ?? "invalid_signature", 401, requestId) }
  }

  const nonceAccepted = await persistInternalNonce(verification.nonce, verification.timestamp)
  if (!nonceAccepted) {
    return { ok: false, response: internalError("replayed_nonce", 409, requestId) }
  }

  try {
    return { ok: true, context: { bodyText, json: JSON.parse(bodyText || "{}"), requestId } }
  } catch {
    return { ok: false, response: internalError("invalid_json", 400, requestId) }
  }
}

export function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field}_required`)
  }
  return value.trim()
}

export async function runInternalHandler(
  request: NextRequest,
  scope: string,
  handler: (context: InternalContext) => Promise<NextResponse>,
) {
  const verified = await verifyInternalJson(request, scope)
  if (!verified.ok) return verified.response
  try {
    return await handler(verified.context)
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error"
    const status = message.endsWith("_required") || message === "invalid_payload" ? 400 : 500
    return internalError(message, status, verified.context.requestId)
  }
}

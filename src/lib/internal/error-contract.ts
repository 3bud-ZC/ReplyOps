import { randomUUID } from "crypto"

type ReplyOpsErrorOptions = {
  requestId?: string | null
  status?: number
  details?: Record<string, unknown>
  message?: string
  retryable?: boolean
}

const ERROR_MESSAGES: Record<string, { code: string; message: string; retryable: boolean }> = {
  invalid_tenant: {
    code: "INVALID_TENANT",
    message: "Tenant was not found or is unavailable.",
    retryable: false,
  },
  invalid_conversation: {
    code: "INVALID_CONVERSATION",
    message: "Conversation was not found or is unavailable.",
    retryable: false,
  },
  invalid_payload: {
    code: "INVALID_PAYLOAD",
    message: "The request payload is missing required fields or is malformed.",
    retryable: false,
  },
  invalid_json: {
    code: "INVALID_JSON",
    message: "The request body is not valid JSON.",
    retryable: false,
  },
  missing_signature_headers: {
    code: "MISSING_SIGNATURE_HEADERS",
    message: "Required signature headers are missing.",
    retryable: false,
  },
  invalid_signature: {
    code: "INVALID_SIGNATURE",
    message: "The request signature is invalid.",
    retryable: false,
  },
  missing_scope: {
    code: "MISSING_SCOPE",
    message: "The API key is missing the required scope.",
    retryable: false,
  },
  revoked_key: {
    code: "REVOKED_KEY",
    message: "The API key has been revoked.",
    retryable: false,
  },
  expired_key: {
    code: "EXPIRED_KEY",
    message: "The API key has expired.",
    retryable: false,
  },
  replayed_nonce: {
    code: "REPLAYED_NONCE",
    message: "The request nonce has already been used.",
    retryable: false,
  },
  rate_limited: {
    code: "RATE_LIMITED",
    message: "Too many requests were received. Retry later.",
    retryable: true,
  },
  replyops_api_timeout: {
    code: "REPLYOPS_API_TIMEOUT",
    message: "ReplyOps did not respond before the timeout.",
    retryable: true,
  },
  provider_failure: {
    code: "PROVIDER_FAILURE",
    message: "The upstream provider failed to complete the request.",
    retryable: true,
  },
  replyops_api_failure: {
    code: "REPLYOPS_API_FAILURE",
    message: "ReplyOps could not complete the request.",
    retryable: true,
  },
}

function sanitizeType(type: string) {
  const cleaned = type.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "")
  return cleaned || "replyops_api_failure"
}

export function normalizeReplyOpsError(input: unknown, options: ReplyOpsErrorOptions = {}) {
  const requestId = String(options.requestId || randomUUID())
  const raw =
    typeof input === "object" && input !== null && "type" in input
      ? String((input as { type?: unknown }).type ?? "replyops_api_failure")
      : String(input || "replyops_api_failure")
  const type = sanitizeType(raw)
  const known = ERROR_MESSAGES[type]
  const status = Number(options.status ?? 500)
  const retryable = options.retryable ?? known?.retryable ?? (status === 408 || status === 429 || status >= 500)
  const code = known?.code ?? type.toUpperCase()
  const message = options.message ?? (known?.message || "ReplyOps could not complete the request.")

  return {
    success: false,
    request_id: requestId,
    error: {
      type,
      code,
      message,
      retryable,
      details: options.details ?? {},
    },
  }
}

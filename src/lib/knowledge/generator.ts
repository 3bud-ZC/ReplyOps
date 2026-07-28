import { GoogleGenAI } from '@google/genai';
import { SearchResult } from './retriever';

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export type GeminiFailureKind =
  | "quota_exhausted"
  | "rate_limited"
  | "daily_limit"
  | "model_unavailable"
  | "invalid_credentials"
  | "provider_timeout"
  | "provider_unavailable"
  | "malformed_request"
  | "unknown_provider_error"

export class GeminiProviderError extends Error {
  kind: GeminiFailureKind
  retryAfterSeconds: number | null

  constructor(kind: GeminiFailureKind, message: string, retryAfterSeconds: number | null = null) {
    super(message)
    this.name = "GeminiProviderError"
    this.kind = kind
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function retryAfterFromError(error: unknown) {
  const maybeHeaders = (error as { response?: { headers?: { get?: (name: string) => string | null } } })?.response?.headers
  const header = maybeHeaders?.get?.("retry-after")
  const parsed = Number(header)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function classifyGeminiError(error: unknown): GeminiProviderError {
  const status = Number((error as { status?: number; code?: number })?.status ?? (error as { status?: number; code?: number })?.code)
  const rawMessage = error instanceof Error ? error.message : String(error ?? "unknown_provider_error")
  const message = rawMessage.slice(0, 240)
  const normalized = rawMessage.toLowerCase()
  const retryAfterSeconds = retryAfterFromError(error)

  if (status === 429 || /resource[_\s-]?exhausted|quota|too many requests/.test(normalized)) {
    if (/daily|per day/.test(normalized)) return new GeminiProviderError("daily_limit", message, retryAfterSeconds)
    if (/minute|per minute|rpm/.test(normalized)) return new GeminiProviderError("rate_limited", message, retryAfterSeconds)
    return new GeminiProviderError("quota_exhausted", message, retryAfterSeconds)
  }
  if (status === 401 || status === 403 || /api key|permission denied|unauthenticated|invalid credential/.test(normalized)) {
    return new GeminiProviderError("invalid_credentials", message, retryAfterSeconds)
  }
  if (status === 404 || /model.*not found|not found.*model|unavailable model/.test(normalized)) {
    return new GeminiProviderError("model_unavailable", message, retryAfterSeconds)
  }
  if (/timeout|deadline|aborted|etimedout/.test(normalized)) {
    return new GeminiProviderError("provider_timeout", message, retryAfterSeconds)
  }
  if (status >= 500 || /unavailable|overloaded|temporarily unavailable/.test(normalized)) {
    return new GeminiProviderError("provider_unavailable", message, retryAfterSeconds)
  }
  if (status === 400 || /invalid argument|bad request|malformed/.test(normalized)) {
    return new GeminiProviderError("malformed_request", message, retryAfterSeconds)
  }
  return new GeminiProviderError("unknown_provider_error", message, retryAfterSeconds)
}

async function generateGroundedContent(prompt: string, temperature: number) {
  try {
    return await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature,
      }
    });
  } catch (error) {
    throw classifyGeminiError(error)
  }
}

export async function generateResponse(query: string, context: SearchResult[]): Promise<{ answer: string; grounded: boolean; usage: Record<string, number | string | null> }> {
  if (context.length === 0) {
    return { answer: "I don't have enough information to answer that.", grounded: false, usage: {} };
  }

  const contextText = context.map((c, i) => `[Source ${i + 1}]:\n${c.content}`).join('\n\n');
  
  const prompt = `You are a helpful assistant. Use ONLY the provided context to answer the user's question. If the answer is not in the context, say "I don't know".
  
Context:
${contextText}

Question: ${query}

Answer:`;

  const response = await generateGroundedContent(prompt, 0.2);

  const answer = response.text || "I don't know";

  // Independent Judge
  const judgePrompt = `Evaluate if the Answer is fully supported by the Context.
Context:
${contextText}

Answer: ${answer}

Is the Answer strictly based on the Context? Answer YES or NO.`;

  const judgeResponse = await generateGroundedContent(judgePrompt, 0);

  const isGrounded = judgeResponse.text?.trim().toUpperCase().includes('YES') || false;

  return {
    answer,
    grounded: isGrounded,
    usage: {
      model: "gemini-2.5-flash",
      prompt_tokens: response.usageMetadata?.promptTokenCount ?? null,
      answer_tokens: response.usageMetadata?.candidatesTokenCount ?? null,
      judge_prompt_tokens: judgeResponse.usageMetadata?.promptTokenCount ?? null,
      judge_answer_tokens: judgeResponse.usageMetadata?.candidatesTokenCount ?? null,
    },
  };
}

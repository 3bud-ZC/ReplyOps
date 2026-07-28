import { NextRequest, NextResponse } from "next/server"
import { hybridSearch } from "@/lib/knowledge/retriever"
import { requireString, runInternalHandler } from "@/lib/internal/request"

export async function POST(request: NextRequest) {
  return runInternalHandler(request, "knowledge:read", async ({ json, requestId }) => {
    const tenantId = requireString(json.tenant_id, "tenant_id")
    const query = requireString(json.query, "query")
    const topK = Math.min(Number(json.top_k ?? 5) || 5, 10)
    const results = await hybridSearch(tenantId, query, topK)
    return NextResponse.json({
      success: true,
      request_id: requestId,
      results: results.map((result) => ({
        content: result.content,
        metadata: result.metadata,
        score: result.score,
      })),
    })
  })
}

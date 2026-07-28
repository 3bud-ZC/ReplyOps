import prisma from '@/lib/prisma';
import { generateEmbedding } from './embedder';
import { normalizeArabicText } from './parser';

export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
}

const STOPWORDS = new Set([
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'how',
  'is',
  'are',
  'the',
  'this',
  'that',
  'does',
  'do',
  'can',
  'you',
  'me',
  'my',
  'your',
  'please',
  'time',
])
const MIN_VECTOR_RELEVANCE = 0.7

function keywordTerms(query: string) {
  const terms = normalizeArabicText(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !STOPWORDS.has(term))
  return [...new Set(terms)].slice(0, 8)
}

async function keywordSearch(tenantId: string, query: string, topK: number): Promise<SearchResult[]> {
  const terms = keywordTerms(query)
  if (terms.length === 0) return []

  const results = await prisma.$queryRaw<any[]>`
    WITH query_terms AS (
      SELECT unnest(${terms}::text[]) AS term
    )
    SELECT
      c.id,
      c.content,
      c.metadata,
      count(DISTINCT qt.term)::float / ${terms.length}::float AS keyword_score
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeDocument" d ON c."knowledgeDocumentId" = d.id
    JOIN query_terms qt ON lower(c.content) LIKE '%' || qt.term || '%'
    WHERE c."tenantId" = ${tenantId}
      AND c.status = 'ACTIVE'
      AND d."indexingStatus" = 'READY'
      AND d."deletedAt" IS NULL
    GROUP BY c.id, c.content, c.metadata
    ORDER BY keyword_score DESC, c."updatedAt" DESC
    LIMIT ${topK}
  `

  return results.map((result) => ({
    id: result.id,
    content: result.content,
    metadata: result.metadata,
    score: Number(result.keyword_score),
  }))
}

export async function hybridSearch(tenantId: string, query: string, topK: number = 5): Promise<SearchResult[]> {
  const normalizedQuery = normalizeArabicText(query);
  let vectorResults: SearchResult[] = []

  try {
    const embedding = await generateEmbedding(normalizedQuery);
    const embeddingString = `[${embedding.join(',')}]`;

    const results = await prisma.$queryRaw<any[]>`
      SELECT
        c.id,
        c.content,
        c.metadata,
        1 - (c.embedding <=> ${embeddingString}::vector) AS vector_score
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDocument" d ON c."knowledgeDocumentId" = d.id
      WHERE c."tenantId" = ${tenantId}
        AND c.status = 'ACTIVE'
        AND c.embedding IS NOT NULL
        AND d."indexingStatus" = 'READY'
        AND d."deletedAt" IS NULL
      ORDER BY c.embedding <=> ${embeddingString}::vector
      LIMIT ${topK * 2}
    `;

    vectorResults = results
      .filter((result) => Number(result.vector_score) >= MIN_VECTOR_RELEVANCE)
      .map((result) => ({
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        score: Number(result.vector_score) * 0.7,
      }))
  } catch (error) {
    console.error('Knowledge vector search unavailable:', error)
  }

  const keywordResults = await keywordSearch(tenantId, normalizedQuery, topK * 2)
  const merged = new Map<string, SearchResult>()

  for (const result of vectorResults) {
    merged.set(result.id, result)
  }
  for (const result of keywordResults) {
    const existing = merged.get(result.id)
    if (existing) {
      existing.score += result.score * 0.3
    } else {
      merged.set(result.id, { ...result, score: result.score * 0.3 })
    }
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, topK)
}

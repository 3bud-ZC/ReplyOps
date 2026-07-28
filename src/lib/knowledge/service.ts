import prisma from '@/lib/prisma';
import { fetchUrlSafely, normalizeArabicText } from './parser';
import { chunkText } from './chunker';
import { generateEmbedding } from './embedder';

export async function processDocument(documentId: string, tenantId: string) {
  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id: documentId, tenantId },
    include: { sources: true }
  });

  if (!doc) throw new Error('Document not found');

  try {
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { indexingStatus: 'PROCESSING' }
    });

    let fullText = '';
    
    if (doc.content) {
      fullText = doc.content;
    } else if (doc.sources && doc.sources.length > 0) {
      // In a real app we'd fetch from GCS/S3 using doc.sources[0].sourceFilePath
      // Here we handle URL if it's a URL type
      if (doc.type === 'URL' && doc.sources[0].sourceUrl) {
        fullText = await fetchUrlSafely(doc.sources[0].sourceUrl);
      }
    }

    if (!fullText) {
      throw new Error('No content to process');
    }

    fullText = normalizeArabicText(fullText);
    const chunks = chunkText(fullText);

    // Mark old chunks as STALE
    await prisma.$executeRaw`
      UPDATE "KnowledgeChunk" 
      SET status = 'STALE' 
      WHERE "knowledgeDocumentId" = ${documentId} AND "tenantId" = ${tenantId}
    `;

    // Process chunks sequentially to respect rate limits.
    let chunkCount = 0;
    let embeddingFailures = 0;
    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.content);
        const embeddingString = `[${embedding.join(',')}]`;
        await prisma.$executeRaw`
          INSERT INTO "KnowledgeChunk" (
            id, "tenantId", "knowledgeDocumentId", content, metadata, embedding, status, "updatedAt"
          ) VALUES (
            gen_random_uuid()::text,
            ${tenantId},
            ${documentId},
            ${chunk.content},
            ${JSON.stringify({ ...chunk.metadata, embeddingStatus: 'READY' })}::jsonb,
            ${embeddingString}::vector,
            'ACTIVE',
            now()
          )
        `;
      } catch (error) {
        embeddingFailures++;
        console.error('Knowledge embedding unavailable:', error);
        await prisma.knowledgeChunk.create({
          data: {
            tenantId,
            knowledgeDocumentId: documentId,
            content: chunk.content,
            metadata: { ...chunk.metadata, embeddingStatus: 'FAILED' },
            status: 'ACTIVE',
          },
        });
      }
      chunkCount++;
    }

    // Delete stale chunks
    await prisma.knowledgeChunk.deleteMany({
      where: { knowledgeDocumentId: documentId, tenantId, status: 'STALE' }
    });

    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { 
        indexingStatus: 'READY',
        chunkCount,
        lastIndexedTime: new Date(),
        errorReason: embeddingFailures > 0 ? `embedding_provider_failed_for_${embeddingFailures}_chunks_keyword_only` : null,
      }
    });

  } catch (error: any) {
    console.error('Error processing document:', error);
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { 
        indexingStatus: 'FAILED',
        errorReason: error.message
      }
    });
  }
}

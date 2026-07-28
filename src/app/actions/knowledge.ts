'use server'

import { checkTenantAccess, getTenantScopedPrisma } from '@/lib/auth-utils';
import { auditLog, getAuthenticatedUser } from '@/lib/auth-utils';
import { processDocument } from '@/lib/knowledge/service';
import { revalidatePath } from 'next/cache';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

export async function uploadKnowledgeDocument(formData: FormData) {
  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const content = formData.get('content') as string;
  const tenantId = formData.get('tenantId') as string;
  const url = formData.get('url') as string;
  
  if (!tenantId) throw new Error('Tenant ID is required');
  
  await checkTenantAccess(tenantId, ['tenant_owner', 'tenant_admin']);
  const user = await getAuthenticatedUser();
  const prisma = getTenantScopedPrisma(tenantId);
  
  if (!title || !type) {
    throw new Error('Title and Type are required');
  }

  const doc = await prisma.knowledgeDocument.create({
    data: {
      tenantId,
      title,
      type,
      content: content || null,
      indexingStatus: 'QUEUED',
      sources: {
        create: {
          tenantId,
          sourceType: type,
          sourceUrl: url || null,
        }
      }
    }
  });

  // Fire and forget processing
  processDocument(doc.id, tenantId).catch(console.error);
  await auditLog(tenantId, user?.id ?? null, 'knowledge.create', 'KnowledgeDocument', { documentId: doc.id });

  revalidatePath('/dashboard/knowledge');
}

export async function updateKnowledgeDocument(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const documentId = text(formData, 'documentId')
  const title = text(formData, 'title')
  const content = text(formData, 'content')
  if (!tenantId || !documentId || !title) throw new Error('Tenant, document, and title are required')

  const { user } = await checkTenantAccess(tenantId, ['tenant_owner', 'tenant_admin']);
  const prisma = getTenantScopedPrisma(tenantId);

  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: {
      title,
      content: content || null,
      indexingStatus: 'QUEUED',
      errorReason: null,
    }
  });

  await prisma.knowledgeChunk.updateMany({
    where: { tenantId, knowledgeDocumentId: documentId },
    data: { status: 'STALE' }
  });

  processDocument(documentId, tenantId).catch(console.error);
  await auditLog(tenantId, user.id, 'knowledge.update', 'KnowledgeDocument', { documentId });
  revalidatePath('/dashboard/knowledge');
}

export async function reindexKnowledgeDocument(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const documentId = text(formData, 'documentId')
  const { user } = await checkTenantAccess(tenantId, ['tenant_owner', 'tenant_admin']);
  await processDocument(documentId, tenantId);
  await auditLog(tenantId, user.id, 'knowledge.reindex', 'KnowledgeDocument', { documentId });
  revalidatePath('/dashboard/knowledge');
}

export async function archiveKnowledgeDocument(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const documentId = text(formData, 'documentId')
  await checkTenantAccess(tenantId, ['tenant_owner', 'tenant_admin']);
  const user = await getAuthenticatedUser();
  const prisma = getTenantScopedPrisma(tenantId);

  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { deletedAt: new Date(), indexingStatus: 'ARCHIVED' }
  });

  await auditLog(tenantId, user?.id ?? null, 'knowledge.archive', 'KnowledgeDocument', { documentId });
  revalidatePath('/dashboard/knowledge');
}

export async function restoreKnowledgeDocument(formData: FormData) {
  const tenantId = text(formData, 'tenantId')
  const documentId = text(formData, 'documentId')
  const { user } = await checkTenantAccess(tenantId, ['tenant_owner', 'tenant_admin']);
  const prisma = getTenantScopedPrisma(tenantId);

  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { deletedAt: null, indexingStatus: 'QUEUED' }
  });

  processDocument(documentId, tenantId).catch(console.error);
  await auditLog(tenantId, user.id, 'knowledge.restore', 'KnowledgeDocument', { documentId });
  revalidatePath('/dashboard/knowledge');
}

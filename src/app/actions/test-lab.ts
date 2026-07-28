'use server'

import { checkTenantAccess } from '@/lib/auth-utils';
import { hybridSearch } from '@/lib/knowledge/retriever';
import { generateResponse } from '@/lib/knowledge/generator';

export async function testRAG(tenantId: string, query: string) {
  // Ensure the user has access to this tenant
  await checkTenantAccess(tenantId);
  
  const results = await hybridSearch(tenantId, query, 3);
  const response = await generateResponse(query, results);
  
  return {
    answer: response.answer,
    grounded: response.grounded,
    results
  };
}

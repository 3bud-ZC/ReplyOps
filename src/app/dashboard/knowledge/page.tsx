import {
  archiveKnowledgeDocument,
  reindexKnowledgeDocument,
  restoreKnowledgeDocument,
  updateKnowledgeDocument,
  uploadKnowledgeDocument,
} from "@/app/actions/knowledge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { FileText, RefreshCw, Upload } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }> | { tenantId?: string }
}) {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const resolvedSearchParams = await Promise.resolve(searchParams)
  let tenantId = resolvedSearchParams.tenantId

  if (!tenantId) {
    tenantId = isPlatformOwner
      ? (await prisma.tenant.findFirst({ where: { deletedAt: null } }))?.id
      : user.memberships[0]?.tenantId
  }

  if (!tenantId || (!isPlatformOwner && !tenantIds.includes(tenantId))) {
    return <div className="p-8 text-sm text-muted-foreground">Please create or select a business first.</div>
  }

  const documents = await prisma.knowledgeDocument.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create, edit, archive, restore, and re-index tenant-scoped knowledge.</p>
      </div>

      <form action={uploadKnowledgeDocument} className="rounded-lg border bg-card p-5">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="type" value="MANUAL_TEXT" />
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Add manual text</h2>
        </div>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-title">Title</Label>
            <Input id="new-title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-content">Content</Label>
            <textarea id="new-content" name="content" required className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <Button type="submit" className="mt-4">Create and index</Button>
      </form>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <form key={doc.id} action={updateKnowledgeDocument} className="rounded-lg border bg-card p-5">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="documentId" value={doc.id} />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{doc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.type} · {doc.indexingStatus} · {doc.chunkCount} chunks
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save and re-index</Button>
                <Button formAction={reindexKnowledgeDocument} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Re-index
                </Button>
                {doc.deletedAt ? (
                  <Button formAction={restoreKnowledgeDocument} variant="outline">Restore</Button>
                ) : (
                  <Button formAction={archiveKnowledgeDocument} variant="outline">Archive</Button>
                )}
              </div>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" defaultValue={doc.title} required />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <textarea name="content" aria-label="Knowledge content" defaultValue={doc.content ?? ""} className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              {doc.errorReason && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{doc.errorReason}</p>
              )}
            </div>
          </form>
        ))}

        {documents.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <h2 className="font-semibold">No documents found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add manual text to create the first searchable source.</p>
          </div>
        )}
      </div>
    </div>
  )
}

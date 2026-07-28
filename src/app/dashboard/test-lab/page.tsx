import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import TestLabClient from "./client"

export default async function TestLabPage({
  searchParams,
}: {
  searchParams: { tenantId?: string }
}) {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some(m => m.role === 'platform_owner')
  let tenantId = searchParams.tenantId
  
  if (!tenantId) {
    tenantId = isPlatformOwner ? (await prisma.tenant.findFirst())?.id : user.memberships[0]?.tenantId
  }

  if (!tenantId) {
    return <div className="p-8">Please select a business first.</div>
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Lab</h1>
          <p className="text-muted-foreground mt-1">Simulate conversations and analyze AI decision making.</p>
        </div>
      </div>

      <TestLabClient tenantId={tenantId} />
    </div>
  )
}
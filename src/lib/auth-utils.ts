import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  if ((session.user as any).sessionRevoked) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { memberships: { where: { active: true } } }
  })
  if (!user?.active) return null
  return user
}

export async function getMembership(userId: string, tenantId: string) {
  return await prisma.membership.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId
      }
    }
  })
}

export async function hasRole(userId: string, tenantId: string, allowedRoles: Role[]) {
  const membership = await getMembership(userId, tenantId)
  if (!membership) return false
  
  if (membership.role === 'platform_owner') return true // Platform owner can do anything
  return allowedRoles.includes(membership.role)
}

export async function checkTenantAccess(tenantId: string, allowedRoles: Role[] = ['tenant_owner', 'tenant_admin', 'agent', 'viewer']) {
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("Unauthorized")

  const isPlatformOwner = user.memberships.some(m => m.role === 'platform_owner')
  if (isPlatformOwner) return { user, membership: null, isPlatformOwner: true }

  const membership = await getMembership(user.id, tenantId)
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error("Forbidden")
  }

  return { user, membership, isPlatformOwner: false }
}

export async function auditLog(tenantId: string | null, userId: string | null, action: string, resource: string, details?: any) {
  return await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      resource,
      details: details || {}
    }
  })
}

// Higher-order function or utility to scope Prisma queries to a tenant.
// For Next.js Server Actions or API routes, you can pass tenantId to this helper.
export function getTenantScopedPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, model, operation }) {
          // A list of models that belong to a tenant
          const tenantModels = [
            'Customer', 'Conversation', 'KnowledgeDocument', 'Product',
            'Service', 'Policy', 'FAQ', 'Handoff', 'ActionDefinition',
            'FollowupRule', 'UsageMetric', 'ApiKey', 'WebhookEvent',
            'ChannelConnection', 'AssistantConfiguration', 'InternalNote',
            'DeadLetterEvent'
          ]
          
          if (tenantModels.includes(model as string)) {
            const anyArgs = args as any

            if (!["create", "createMany"].includes(operation)) {
              anyArgs.where = { ...anyArgs.where, tenantId }
            }

            if (anyArgs.data && typeof anyArgs.data === 'object' && !Array.isArray(anyArgs.data)) {
              // Automatically inject tenantId into creates/updates
              anyArgs.data.tenantId = tenantId
            }
          }
          
          return query(args)
        }
      }
    }
  })
}

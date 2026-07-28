import Link from "next/link"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { Role } from "@prisma/client"
import { ResetCredentialForm } from "./ResetCredentialForm"

export default async function AccountPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>
  const isPlatformOwner = user.memberships.some((membership) => membership.role === Role.platform_owner)

  return (
    <OperationalPage
      title="Account Settings"
      description="Signed-in user identity and security controls."
    >
      <div className="rounded-lg border bg-card p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="mt-1 font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd className="mt-1 font-medium">{user.name ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Password change required</dt>
            <dd className="mt-1 font-medium">{user.forcePasswordChange ? "Yes" : "No"}</dd>
          </div>
        </dl>
        <Button asChild className="mt-6">
          <Link href="/change-password">Change password</Link>
        </Button>
      </div>
      {isPlatformOwner && <ResetCredentialForm defaultEmail={user.email} />}
    </OperationalPage>
  )
}

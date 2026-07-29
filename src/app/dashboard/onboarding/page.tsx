import { saveOnboardingProgress, skipOnboardingForExperiencedUser } from "@/app/actions/onboarding"
import { OperationalPage } from "@/components/dashboard/OperationalPage"
import { StatusBadge } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const steps = [
  ["business_profile", "Business profile"],
  ["assistant_name", "Assistant name"],
  ["language", "Language"],
  ["tone", "Tone"],
  ["business_hours", "Business hours"],
  ["knowledge_document", "First Knowledge document"],
  ["test_lab_ready", "Grounded Test Lab question"],
  ["safe_channel", "Web Chat or safe QA channel"],
  ["human_handoff", "Human Handoff"],
  ["launch_checklist", "Launch checklist"],
] as const

function onboardingState(contactData: unknown) {
  if (!contactData || typeof contactData !== "object" || Array.isArray(contactData)) return { completedSteps: [] as string[], currentStep: "business_profile" }
  const onboarding = (contactData as Record<string, unknown>).onboarding
  if (!onboarding || typeof onboarding !== "object" || Array.isArray(onboarding)) return { completedSteps: [] as string[], currentStep: "business_profile" }
  return {
    completedSteps: Array.isArray((onboarding as any).completedSteps) ? (onboarding as any).completedSteps.map(String) : [],
    currentStep: String((onboarding as any).currentStep ?? "business_profile"),
  }
}

export default async function OnboardingPage() {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>
  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  const tenantIds = user.memberships.map((membership) => membership.tenantId)
  const tenants = await prisma.tenant.findMany({
    where: isPlatformOwner ? { deletedAt: null } : { id: { in: tenantIds }, deletedAt: null },
    include: { assistantConfiguration: true, knowledgeDocuments: { where: { deletedAt: null }, take: 1 }, channelConnections: { where: { deletedAt: null }, take: 1 } },
    orderBy: { name: "asc" },
  })

  return (
    <OperationalPage title="Onboarding" description="Tenant-scoped launch progress with validation, persistence, resume, skip, and replay state.">
      <section className="space-y-4">
        {tenants.map((tenant) => {
          const state = onboardingState(tenant.contactData)
          const completed = new Set(state.completedSteps)
          return (
            <article key={tenant.id} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">{tenant.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{tenant.industry ?? "No industry"} · {tenant.primaryLanguage.toUpperCase()} · {tenant.timezone}</p>
                </div>
                <StatusBadge status={state.currentStep === "completed" ? "completed" : "in progress"} />
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {steps.map(([step, label]) => (
                  <form key={step} action={saveOnboardingProgress} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input type="hidden" name="step" value={step} />
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{completed.has(step) ? "Saved" : state.currentStep === step ? "Current" : "Pending"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" name="direction" value="previous" size="sm" variant="outline">Previous</Button>
                      <Button type="submit" name="direction" value="skip" size="sm" variant="outline">Skip</Button>
                      <Button type="submit" name="direction" value="next" size="sm">Next</Button>
                    </div>
                  </form>
                ))}
              </div>
              <form action={skipOnboardingForExperiencedUser} className="mt-4">
                <input type="hidden" name="tenantId" value={tenant.id} />
                <Button type="submit" variant="outline">Experienced user skip</Button>
              </form>
            </article>
          )
        })}
      </section>
    </OperationalPage>
  )
}

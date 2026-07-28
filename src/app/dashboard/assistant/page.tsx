import type { InputHTMLAttributes } from "react"
import { saveAssistantConfiguration } from "@/app/actions/assistant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { Save } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: { tenantId?: string }
}) {
  const user = await getAuthenticatedUser()
  if (!user) return <div>Unauthorized</div>

  const isPlatformOwner = user.memberships.some((membership) => membership.role === "platform_owner")
  let tenantId = searchParams.tenantId

  if (!tenantId) {
    tenantId = isPlatformOwner
      ? (await prisma.tenant.findFirst({ where: { deletedAt: null } }))?.id
      : user.memberships[0]?.tenantId
  }

  if (!tenantId) {
    return <div className="p-8 text-sm text-muted-foreground">Please create or select a business first.</div>
  }

  const config = await prisma.assistantConfiguration.findUnique({ where: { tenantId } })
  const value = {
    assistantName: config?.assistantName ?? "Assistant",
    language: config?.language ?? "ar",
    dialect: config?.dialect ?? "egyptian",
    tone: config?.tone ?? "professional",
    responseLength: config?.responseLength ?? "concise",
    emojiPolicy: config?.emojiPolicy ?? "allowed",
    greeting: config?.greeting ?? "",
    helpMessage: config?.helpMessage ?? "",
    apologyStyle: config?.apologyStyle ?? "",
    escalationStyle: config?.escalationStyle ?? "",
    systemRules: config?.systemRules ?? "",
    prohibitedTopics: config?.prohibitedTopics ?? "",
    confidenceThreshold: config?.confidenceThreshold ?? 0.7,
    groundingThreshold: config?.groundingThreshold ?? 0.7,
    memoryLength: config?.memoryLength ?? 10,
    maxResponseLength: config?.maxResponseLength ?? 1200,
    enabledActions: config?.enabledActions.join(",") ?? "",
    approvalRequiredActions: config?.approvalRequiredActions.join(",") ?? "",
    businessHoursBehavior: config?.businessHoursBehavior ?? "answer_with_offline_notice",
    offlineResponseBehavior: config?.offlineResponseBehavior ?? "answer_with_handoff_option",
  }

  return (
    <form action={saveAssistantConfiguration} className="mx-auto flex max-w-5xl flex-col gap-6">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Database-backed runtime configuration for Test Lab and live channels.</p>
        </div>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">Profile</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Assistant name" name="assistantName" defaultValue={value.assistantName} />
          <Field label="Primary language" name="language" defaultValue={value.language} />
          <Field label="Dialect" name="dialect" defaultValue={value.dialect} />
          <Field label="Tone" name="tone" defaultValue={value.tone} />
          <Field label="Reply length" name="responseLength" defaultValue={value.responseLength} />
          <Field label="Emoji policy" name="emojiPolicy" defaultValue={value.emojiPolicy} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">Customer Messages</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Greeting" name="greeting" defaultValue={value.greeting} />
          <Field label="Help message" name="helpMessage" defaultValue={value.helpMessage} />
          <Field label="Apology style" name="apologyStyle" defaultValue={value.apologyStyle} />
          <Field label="Escalation style" name="escalationStyle" defaultValue={value.escalationStyle} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">Guardrails</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Confidence threshold" name="confidenceThreshold" type="number" step="0.05" min="0" max="1" defaultValue={String(value.confidenceThreshold)} />
          <Field label="Grounding threshold" name="groundingThreshold" type="number" step="0.05" min="0" max="1" defaultValue={String(value.groundingThreshold)} />
          <Field label="Memory length" name="memoryLength" type="number" min="0" max="50" defaultValue={String(value.memoryLength)} />
          <Field label="Max reply chars" name="maxResponseLength" type="number" min="100" max="4000" defaultValue={String(value.maxResponseLength)} />
          <Field label="Enabled actions" name="enabledActions" defaultValue={value.enabledActions} />
          <Field label="Approval-required actions" name="approvalRequiredActions" defaultValue={value.approvalRequiredActions} />
          <Field label="Business-hours behavior" name="businessHoursBehavior" defaultValue={value.businessHoursBehavior} />
          <Field label="Offline response behavior" name="offlineResponseBehavior" defaultValue={value.offlineResponseBehavior} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextArea label="System rules" name="systemRules" defaultValue={value.systemRules} />
          <TextArea label="Prohibited topics" name="prohibitedTopics" defaultValue={value.prohibitedTopics} />
        </div>
      </section>
    </form>
  )
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...inputProps } = props
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...inputProps} />
    </div>
  )
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        defaultValue={defaultValue}
      />
    </div>
  )
}

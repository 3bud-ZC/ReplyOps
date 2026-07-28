"use client"

import { useActionState } from "react"
import { createInternalApiKey, rotateInternalApiKey } from "@/app/actions/api-keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type TenantOption = {
  id: string
  name: string
}

type KeyOption = {
  id: string
  name: string
}

type ApiKeyActionState = {
  ok: boolean
  message: string
  plaintextSecret?: string
  keyId?: string
}

const scopes = [
  "runtime:read",
  "memory:read",
  "knowledge:read",
  "messages:write",
  "handoff:write",
  "actions:write",
  "channel:send",
  "usage:write",
  "errors:write",
]

const emptyState: ApiKeyActionState = { ok: false, message: "", plaintextSecret: undefined, keyId: undefined }

function SecretResult({ state }: { state: typeof emptyState }) {
  if (!state.message) return null
  return (
    <div className={`mt-4 rounded-md border p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" : "bg-destructive/10 text-destructive"}`}>
      <p>{state.message}</p>
      {state.keyId && <p className="mt-2 font-mono text-xs">Key ID: {state.keyId}</p>}
      {state.plaintextSecret && (
        <div className="mt-2 rounded bg-background p-2">
          <p className="text-xs uppercase text-muted-foreground">Shown once</p>
          <code className="break-all text-xs">{state.plaintextSecret}</code>
        </div>
      )}
    </div>
  )
}

export function CreateApiKeyForm({ tenants }: { tenants: TenantOption[] }) {
  const [state, formAction, pending] = useActionState(createInternalApiKey, emptyState)

  return (
    <form action={formAction} className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold">Create internal API key</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant</Label>
          <select id="tenantId" name="tenantId" className="h-10 rounded-md border bg-background px-3 text-sm" required>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expires at</Label>
          <Input id="expiresAt" name="expiresAt" type="datetime-local" />
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {scopes.map((scope) => (
          <label key={scope} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <input name="scopes" type="checkbox" value={scope} defaultChecked={scope === "runtime:read" || scope === "knowledge:read"} />
            {scope}
          </label>
        ))}
      </div>
      <Button className="mt-4" type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create key"}
      </Button>
      <SecretResult state={state} />
    </form>
  )
}

export function RotateApiKeyForm({ keys }: { keys: KeyOption[] }) {
  const [state, formAction, pending] = useActionState(rotateInternalApiKey, emptyState)
  if (keys.length === 0) return null

  return (
    <form action={formAction} className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold">Rotate key</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <select name="id" aria-label="API key to rotate" className="h-10 rounded-md border bg-background px-3 text-sm" required>
          {keys.map((key) => (
            <option key={key.id} value={key.id}>{key.name}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>{pending ? "Rotating..." : "Rotate and revoke old key"}</Button>
      </div>
      <SecretResult state={state} />
    </form>
  )
}

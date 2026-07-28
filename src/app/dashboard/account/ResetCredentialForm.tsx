"use client"

import { useActionState } from "react"
import { resetUserCredential } from "@/app/actions/account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState = {
  ok: false,
  message: "",
  temporaryPassword: undefined,
}

export function ResetCredentialForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState(resetUserCredential, initialState)

  return (
    <form action={formAction} className="rounded-lg border bg-card p-6">
      <h2 className="font-semibold">Platform credential reset</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate a temporary password and force password change at next login.
      </p>
      <div className="mt-4 space-y-2">
        <Label htmlFor="reset-email">User email</Label>
        <Input id="reset-email" name="email" type="email" defaultValue={defaultEmail} required />
      </div>
      <Button className="mt-4" type="submit" disabled={pending}>
        {pending ? "Generating..." : "Generate temporary password"}
      </Button>
      {state.message && (
        <p className={`mt-4 text-sm ${state.ok ? "text-emerald-600" : "text-destructive"}`}>
          {state.message}
        </p>
      )}
      {state.temporaryPassword && (
        <div className="mt-4 rounded-md border bg-muted p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Shown once</p>
          <code className="mt-1 block break-all text-sm">{state.temporaryPassword}</code>
        </div>
      )}
    </form>
  )
}

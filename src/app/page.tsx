import Link from "next/link"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const user = await getAuthenticatedUser()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground font-heading text-lg font-bold">
            R
          </div>
          <div>
            <p className="font-heading text-xl font-bold">ReplyOps AI</p>
            <p className="text-sm text-muted-foreground">ABUD FUN customer operations</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-8 shadow-card">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Production dashboard</p>
          <h1 className="max-w-2xl font-heading text-4xl font-bold tracking-tight">
            Multi-tenant AI support operations, governed from one secure dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Manage businesses, Knowledge, channels, handoffs, approvals, follow-ups, audit logs, and health signals from the ReplyOps application database.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={user ? "/dashboard" : "/login"}>{user ? "Open dashboard" : "Sign in"}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="https://abud.fun">ABUD FUN</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

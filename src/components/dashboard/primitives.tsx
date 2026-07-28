import * as React from "react"
import { AlertCircle, CheckCircle2, Clock3, Loader2, Search, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string
  value: string | number
  detail?: string
  tone?: "neutral" | "good" | "warning" | "danger"
}) {
  const toneClass = {
    neutral: "text-foreground",
    good: "text-emerald-700 dark:text-emerald-300",
    warning: "text-amber-700 dark:text-amber-300",
    danger: "text-red-700 dark:text-red-300",
  }[tone]

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-3 text-3xl font-semibold tracking-tight", toneClass)}>{value}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>}
    </section>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const icon =
    normalized.includes("healthy") || normalized.includes("ready") || normalized.includes("active") ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : normalized.includes("pending") || normalized.includes("queued") ? (
      <Clock3 className="h-3.5 w-3.5" />
    ) : normalized.includes("failed") || normalized.includes("error") || normalized.includes("unavailable") ? (
      <XCircle className="h-3.5 w-3.5" />
    ) : (
      <AlertCircle className="h-3.5 w-3.5" />
    )
  const color =
    normalized.includes("healthy") || normalized.includes("ready") || normalized.includes("active")
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      : normalized.includes("failed") || normalized.includes("error") || normalized.includes("unavailable")
        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        : normalized.includes("pending") || normalized.includes("queued")
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-border bg-muted text-muted-foreground"

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium", color)}>
      {icon}
      {status}
    </span>
  )
}

export function StatusCard({
  title,
  status,
  detail,
}: {
  title: string
  status: string
  detail?: string
}) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <StatusBadge status={status} />
      </div>
      {detail && <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>}
    </section>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/70 px-6 py-12 text-center">
      {icon && <div className="text-muted-foreground/60">{icon}</div>}
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <h2 className="font-medium">{title}</h2>
          {description && <p className="mt-1 text-sm leading-6">{description}</p>}
        </div>
      </div>
    </div>
  )
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} aria-hidden="true" />
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="relative block">
      <span className="sr-only">{props["aria-label"] ?? "Search"}</span>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        className={cn(
          "h-10 w-full rounded-md border bg-background ps-9 pe-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
          props.className,
        )}
      />
    </label>
  )
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: React.ReactNode[][]
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/70 text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-start font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, index) => (
              <tr key={index} className="align-top">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">{children}</div>
}

export function FormField({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  )
}

export const Select = "select"
export const MultiSelect = "select"
export const DateRangePicker = "input"
export const ConfirmationDialog = "dialog"
export const Drawer = "aside"
export const Modal = "dialog"
export const Toast = "output"
export const Tabs = "div"
export const Badge = StatusBadge
export const Timeline = "ol"
export const MessageBubble = "div"
export const ConversationPanel = "section"
export const HandoffQueueCard = StatusCard
export const SourceCitationCard = StatusCard
export const AITracePanel = StatusCard
export const HealthIndicator = StatusBadge
export const AuditEventRow = "li"
export const ChannelConnectionCard = StatusCard
export const SecretOneTimeReveal = "output"
export const ResponsiveChartContainer = "div"

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "Loading"}
    </span>
  )
}

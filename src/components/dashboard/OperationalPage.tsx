import { ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { PageHeader } from "./primitives"

type OperationalPageProps = {
  title: string
  description: string
  children?: ReactNode
  unavailableAction?: string
}

export function OperationalPage({
  title,
  description,
  children,
  unavailableAction,
}: OperationalPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader title={title} description={description} />

      {children}

      {unavailableAction && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{unavailableAction}</p>
        </div>
      )}
    </div>
  )
}

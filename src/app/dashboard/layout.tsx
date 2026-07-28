import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { LocaleRuntime } from "@/components/dashboard/LocaleRuntime"
import { PageContext } from "@/components/dashboard/PageContext"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { dictionary, localeDirection, normalizeLocale } from "@/lib/i18n"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/login")
  const cookieStore = await cookies()
  const locale = normalizeLocale(cookieStore.get("replyops_locale")?.value)
  const roles = user.memberships.map((membership) => membership.role)
  const t = dictionary[locale]

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={localeDirection(locale)} lang={locale}>
      <LocaleRuntime locale={locale} />
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t.skipToContent}
      </a>
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar locale={locale} roles={roles} />
      </div>
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Header locale={locale} roles={roles} userName={user.name ?? user.email} />
        <PageContext locale={locale} />
        <main id="dashboard-content" className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

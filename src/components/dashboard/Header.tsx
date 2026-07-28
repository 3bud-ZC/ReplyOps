"use client"

import { useState, useTransition } from "react"
import { useTheme } from "next-themes"
import { Role } from "@prisma/client"
import { Menu, Moon, Sun, Globe, X } from "lucide-react"
import { setLocalePreference } from "@/app/actions/preferences"
import { dictionary, Locale, type TranslationKey } from "@/lib/i18n"
import { Sidebar } from "./Sidebar"

export function Header({ locale, roles, userName }: { locale: Locale; roles: Role[]; userName?: string | null }) {
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [, startTransition] = useTransition()
  const t = dictionary[locale]
  const roleLabelKey = roles[0] ? (`role${roles[0].split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")}` as TranslationKey) : undefined

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const toggleLocale = () => {
    const formData = new FormData()
    formData.set("locale", locale === "ar" ? "en" : "ar")
    startTransition(async () => {
      await setLocalePreference(formData)
      window.location.reload()
    })
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center gap-x-4 border-b bg-card/95 px-4 shadow-sm backdrop-blur sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <span className="sr-only">{t.openNavigation}</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/30"
            aria-label={t.closeNavigation}
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-[min(22rem,88vw)] bg-card">
            <button
              type="button"
              className="absolute end-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <span className="sr-only">{t.closeNavigation}</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <Sidebar locale={locale} roles={roles} />
          </div>
        </div>
      )}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <span className="font-heading text-sm font-semibold text-muted-foreground">ABUD FUN</span>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button
            type="button"
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={toggleLocale}
            title={t.changeLanguage}
          >
            <span className="sr-only">{t.changeLanguage}</span>
            <Globe className="h-5 w-5" aria-hidden="true" />
            <span className="ms-2 hidden sm:inline">{locale === "ar" ? "AR" : "EN"}</span>
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={toggleTheme}
            title={t.changeTheme}
          >
            <span className="sr-only">{t.changeTheme}</span>
            <Sun className="h-5 w-5 hidden dark:block" aria-hidden="true" />
            <Moon className="h-5 w-5 block dark:hidden" aria-hidden="true" />
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          <div className="flex items-center gap-x-4">
            <div className="hidden text-end sm:block">
              <p className="text-sm font-medium">{userName ?? t.accountFallback}</p>
              <p className="text-xs text-muted-foreground">{roleLabelKey && roleLabelKey in t ? t[roleLabelKey] : t.user}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {(userName ?? "A").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Beaker,
  BookOpen,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat2,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react"
import { Role } from "@prisma/client"
import { dictionary, type Locale, type TranslationKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type NavItem = {
  labelKey: TranslationKey
  href: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  roles?: Role[]
  search?: string
}

type NavChildGroup = {
  labelKey: TranslationKey
  icon: NavItem["icon"]
  children: NavItem[]
}

type NavEntry = NavItem | NavChildGroup

type NavGroup = {
  labelKey: TranslationKey
  items: NavEntry[]
}

const setupRoles = [Role.platform_owner, Role.tenant_owner, Role.tenant_admin]

const navGroups: NavGroup[] = [
  {
    labelKey: "home",
    items: [{ labelKey: "overview", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    labelKey: "workspace",
    items: [
      { labelKey: "businesses", href: "/dashboard/businesses", icon: Building2, roles: setupRoles },
      { labelKey: "assistant", href: "/dashboard/assistant", icon: Bot, roles: setupRoles },
      { labelKey: "knowledge", href: "/dashboard/knowledge", icon: BookOpen, roles: setupRoles },
      {
        labelKey: "catalog",
        icon: Boxes,
        children: [
          { labelKey: "products", href: "/dashboard/products", icon: Boxes, roles: setupRoles },
          { labelKey: "services", href: "/dashboard/services", icon: BriefcaseBusiness, roles: setupRoles },
          { labelKey: "policiesFaqs", href: "/dashboard/policies-faqs", icon: ClipboardList, roles: setupRoles },
        ],
      },
      { labelKey: "channels", href: "/dashboard/channels", icon: MessageSquare, roles: setupRoles },
    ],
  },
  {
    labelKey: "operations",
    items: [
      { labelKey: "conversations", href: "/dashboard/conversations", icon: MessagesSquare },
      { labelKey: "handoff", href: "/dashboard/handoff", icon: UserCircle },
      { labelKey: "actions", href: "/dashboard/actions", icon: ShieldCheck, roles: setupRoles },
      { labelKey: "followups", href: "/dashboard/follow-ups", icon: Repeat2, roles: setupRoles },
    ],
  },
  {
    labelKey: "insights",
    items: [
      { labelKey: "testLab", href: "/dashboard/test-lab", icon: Beaker, roles: setupRoles },
      { labelKey: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { labelKey: "auditLogs", href: "/dashboard/audit-logs", icon: ClipboardList, roles: setupRoles },
      { labelKey: "systemHealth", href: "/dashboard/system-health", icon: HeartPulse, roles: [Role.platform_owner] },
    ],
  },
  {
    labelKey: "administration",
    items: [
      { labelKey: "team", href: "/dashboard/team", icon: Users, roles: setupRoles },
      { labelKey: "apiKeys", href: "/dashboard/internal-api-keys", icon: KeyRound, roles: [Role.platform_owner] },
      { labelKey: "account", href: "/dashboard/account", icon: Settings },
    ],
  },
]

function isNavItem(item: NavEntry): item is NavItem {
  return "href" in item
}

function canSee(item: NavItem, roles: Role[]) {
  return !item.roles || item.roles.some((role) => roles.includes(role))
}

export function Sidebar({
  locale,
  roles,
  mobile = false,
  onNavigate,
}: {
  locale: Locale
  roles: Role[]
  mobile?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const t = dictionary[locale]
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState("")
  const [catalogOpen, setCatalogOpen] = useState(pathname.startsWith("/dashboard/products") || pathname.startsWith("/dashboard/services") || pathname.startsWith("/dashboard/policies"))

  useEffect(() => {
    if (mobile) return
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem("replyops_sidebar_collapsed") === "true")
    })
    return () => window.cancelAnimationFrame(frame)
  }, [mobile])

  const changeCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    window.localStorage.setItem("replyops_sidebar_collapsed", String(next))
  }

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale === "ar" ? "ar" : "en")
    return navGroups.map((group) => {
      const items: NavEntry[] = []
      for (const item of group.items) {
        if (isNavItem(item)) {
          if (canSee(item, roles) && (!normalizedQuery || t[item.labelKey].toLocaleLowerCase().includes(normalizedQuery))) {
            items.push(item)
          }
          continue
        }
        const children = item.children.filter((child) => canSee(child, roles) && (!normalizedQuery || t[child.labelKey].toLocaleLowerCase().includes(normalizedQuery)))
        if (children.length) items.push({ ...item, children })
      }
      return { ...group, items }
    }).filter((group) => group.items.length)
  }, [locale, query, roles, t])

  const compact = collapsed && !mobile

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-e border-border/80 bg-card/92 shadow-card backdrop-blur-xl transition-[width] duration-200",
        compact ? "w-[5.25rem]" : "w-72",
        mobile && "w-full",
      )}
      aria-label={t.primaryNavigation}
    >
      <div className={cn("flex h-[4.5rem] shrink-0 items-center border-b border-border/70 px-4", compact ? "justify-center" : "gap-3")}>
        <Link href="/dashboard" onClick={onNavigate} className="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-foreground" aria-label={t.product}>
          R
        </Link>
        {!compact && (
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-bold tracking-tight">{t.product}</p>
            <p className="technical-kicker mt-0.5">ABUD FUN</p>
          </div>
        )}
      </div>

      {!compact && (
        <label className="relative mx-3 mt-3 block">
          <span className="sr-only">{t.searchNavigation}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchNavigation}
            className="h-10 w-full rounded-xl border bg-background/70 ps-9 pe-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
          />
        </label>
      )}

      <nav className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4", compact ? "space-y-4" : "space-y-5")}>
        {visibleGroups.map((group) => (
          <section key={group.labelKey}>
            {!compact && <p className="px-3 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">{t[group.labelKey]}</p>}
            {compact && <div className="mx-auto mb-2 h-px w-8 bg-border first:hidden" />}
            <div className="space-y-1">
              {group.items.map((item) => {
                if (!isNavItem(item)) {
                  const active = item.children.some((child) => pathname.startsWith(child.href))
                  if (compact) {
                    return item.children.map((child) => (
                      <NavLink key={child.href} item={child} label={t[child.labelKey]} active={pathname.startsWith(child.href)} compact onNavigate={onNavigate} />
                    ))
                  }
                  return (
                    <div key={`nested-${item.labelKey}`}>
                      <button
                        type="button"
                        onClick={() => setCatalogOpen((value) => !value)}
                        className={cn("flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition", active ? "text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
                        aria-expanded={catalogOpen}
                      >
                        <item.icon className="me-3 h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1 text-start">{t[item.labelKey]}</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", catalogOpen && "rotate-180")} aria-hidden />
                      </button>
                      {catalogOpen && (
                        <div className="ms-5 mt-1 space-y-1 border-s border-border ps-2">
                          {item.children.map((child) => (
                            <NavLink key={child.href} item={child} label={t[child.labelKey]} active={pathname.startsWith(child.href)} onNavigate={onNavigate} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return <NavLink key={item.href} item={item} label={t[item.labelKey]} active={active} compact={compact} onNavigate={onNavigate} />
              })}
            </div>
          </section>
        ))}
      </nav>

      {!mobile && (
        <div className="shrink-0 border-t border-border/70 p-3">
          <button
            type="button"
            onClick={changeCollapsed}
            className={cn("flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground", !compact && "justify-start gap-3 px-3")}
            title={compact ? t.expandNavigation : t.collapseNavigation}
            aria-label={compact ? t.expandNavigation : t.collapseNavigation}
          >
            {compact ? <PanelLeftOpen className="h-5 w-5" aria-hidden /> : <><PanelLeftClose className="h-5 w-5" aria-hidden /><span>{t.collapseNavigation}</span></>}
          </button>
        </div>
      )}
    </aside>
  )
}

function NavLink({
  item,
  label,
  active,
  compact = false,
  onNavigate,
}: {
  item: NavItem
  label: string
  active: boolean
  compact?: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={compact ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-lg py-2.5 text-sm font-semibold transition duration-150",
        compact ? "justify-center px-2" : "px-3",
        active ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_20%,transparent)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {active && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary" aria-hidden />}
      <item.icon className={cn("h-[1.1rem] w-[1.1rem] shrink-0", !compact && "me-3")} aria-hidden />
      {!compact && <span className="truncate">{label}</span>}
      {!compact && <ChevronRight className="ms-auto h-3.5 w-3.5 opacity-0 transition group-hover:opacity-50 rtl:rotate-180" aria-hidden />}
    </Link>
  )
}

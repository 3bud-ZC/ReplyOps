export type Locale = "ar" | "en"

export const supportedLocales: Locale[] = ["ar", "en"]

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "ar"
}

export function localeDirection(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr"
}

export const dictionary = {
  ar: {
    product: "ReplyOps AI",
    home: "الرئيسية",
    workspace: "الإعداد",
    operations: "عمليات العملاء",
    insights: "الرؤى",
    administration: "الإدارة",
    overview: "نظرة عامة",
    businesses: "الأعمال",
    assistant: "المساعد الذكي",
    knowledge: "المعرفة",
    catalog: "الكتالوج",
    products: "المنتجات",
    services: "الخدمات",
    policiesFaqs: "السياسات والأسئلة",
    channels: "القنوات",
    conversations: "صندوق الوارد",
    handoff: "التسليم البشري",
    actions: "الإجراءات والموافقات",
    followups: "المتابعات",
    testLab: "مختبر الاختبار",
    analytics: "التحليلات",
    auditLogs: "سجل التدقيق",
    systemHealth: "صحة النظام",
    team: "الفريق",
    apiKeys: "مفاتيح API الداخلية",
    account: "الحساب",
    command: "بحث سريع",
    commandHint: "انتقل إلى أي صفحة…",
    notifications: "الإشعارات",
    noNotifications: "لا توجد تنبيهات جديدة",
    help: "المساعدة",
    tenant: "مساحة العمل",
    allWorkspaces: "كل مساحات العمل",
    openNavigation: "فتح التنقل",
    closeNavigation: "إغلاق التنقل",
    collapseNavigation: "طي التنقل",
    expandNavigation: "توسيع التنقل",
    searchNavigation: "البحث في الصفحات",
    accountFallback: "الحساب",
    rolePlatformOwner: "مالك المنصة",
    roleTenantOwner: "مالك العمل",
    roleTenantAdmin: "مسؤول العمل",
    roleAgent: "وكيل دعم",
    roleViewer: "مشاهد",
    close: "إغلاق",
    ready: "جاهز",
    active: "نشط",
    connected: "متصل",
    healthy: "سليم",
    degraded: "متراجع",
    unavailable: "غير متاح",
    notConfigured: "غير مُعد",
    pending: "قيد الانتظار",
    queued: "في قائمة الانتظار",
    failed: "فشل",
    archived: "مؤرشف",
    open: "مفتوح",
    claimed: "تم الاستلام",
    resolved: "تم الحل",
    paused: "متوقف مؤقتاً",
    unknown: "غير معروف",
    changeLanguage: "تغيير اللغة",
    changeTheme: "تغيير النمط",
    skipToContent: "تخطي إلى المحتوى",
    primaryNavigation: "التنقل الرئيسي",
    userMenu: "قائمة المستخدم",
    user: "مستخدم",
  },
  en: {
    product: "ReplyOps AI",
    home: "Home",
    workspace: "Setup",
    operations: "Customer operations",
    insights: "Insights",
    administration: "Administration",
    overview: "Overview",
    businesses: "Businesses",
    assistant: "AI Assistant",
    knowledge: "Knowledge",
    catalog: "Catalog",
    products: "Products",
    services: "Services",
    policiesFaqs: "Policies and FAQs",
    channels: "Channels",
    conversations: "Inbox",
    handoff: "Human Handoff",
    actions: "Actions and Approvals",
    followups: "Follow-ups",
    testLab: "Test Lab",
    analytics: "Analytics",
    auditLogs: "Audit Logs",
    systemHealth: "System Health",
    team: "Team",
    apiKeys: "Internal API Keys",
    account: "Account Settings",
    command: "Quick search",
    commandHint: "Go to any page…",
    notifications: "Notifications",
    noNotifications: "No new alerts",
    help: "Help",
    tenant: "Workspace",
    allWorkspaces: "All workspaces",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    collapseNavigation: "Collapse navigation",
    expandNavigation: "Expand navigation",
    searchNavigation: "Search pages",
    accountFallback: "Account",
    rolePlatformOwner: "Platform owner",
    roleTenantOwner: "Business owner",
    roleTenantAdmin: "Business admin",
    roleAgent: "Support agent",
    roleViewer: "Viewer",
    close: "Close",
    ready: "Ready",
    active: "Active",
    connected: "Connected",
    healthy: "Healthy",
    degraded: "Degraded",
    unavailable: "Unavailable",
    notConfigured: "Not configured",
    pending: "Pending",
    queued: "Queued",
    failed: "Failed",
    archived: "Archived",
    open: "Open",
    claimed: "Claimed",
    resolved: "Resolved",
    paused: "Paused",
    unknown: "Unknown",
    changeLanguage: "Change language",
    changeTheme: "Change theme",
    skipToContent: "Skip to content",
    primaryNavigation: "Primary navigation",
    userMenu: "User menu",
    user: "User",
  },
} as const

export type TranslationKey = keyof typeof dictionary.en

export function translateStatus(status: string, locale: Locale) {
  const normalized = status.toLowerCase().replaceAll("_", " ").trim()
  const keys: Record<string, TranslationKey> = {
    ready: "ready",
    active: "active",
    connected: "connected",
    healthy: "healthy",
    degraded: "degraded",
    unavailable: "unavailable",
    "not configured": "notConfigured",
    pending: "pending",
    queued: "queued",
    failed: "failed",
    archived: "archived",
    open: "open",
    claimed: "claimed",
    resolved: "resolved",
    paused: "paused",
    unknown: "unknown",
  }
  return dictionary[locale][keys[normalized] ?? "unknown"]
}

export function localeTag(locale: Locale) {
  return locale === "ar" ? "ar-EG" : "en-US"
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeTag(locale), options).format(value)
}

export function formatDate(value: Date | string, locale: Locale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(localeTag(locale), options ?? { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function formatRelativeTime(value: Date | string, locale: Locale, now = new Date()) {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: "auto" })
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second")
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour")
  return formatter.format(Math.round(hours / 24), "day")
}

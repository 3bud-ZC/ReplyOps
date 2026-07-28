import type { Locale } from "@/lib/i18n"

type PageGuide = {
  title: string
  purpose: string
  action: string
  how: string[]
  terms: { term: string; definition: string }[]
  warning?: string
  related?: { label: string; href: string }[]
}

const en: Record<string, PageGuide> = {
  "/dashboard": {
    title: "Overview",
    purpose: "See what needs attention now and whether your customer operations are ready.",
    action: "Resolve urgent handoffs, failed channels, knowledge gaps, and overdue work first.",
    how: ["Today summarizes current activity.", "Needs Attention shows work that can affect customers.", "Readiness cards explain what to configure next."],
    terms: [{ term: "Knowledge gap", definition: "A question the AI could not answer from an approved source." }, { term: "Handoff", definition: "A conversation paused for a human teammate." }],
    related: [{ label: "Open Inbox", href: "/dashboard/conversations" }, { label: "Run a safe test", href: "/dashboard/test-lab" }],
  },
  "/dashboard/businesses": {
    title: "Businesses",
    purpose: "Manage the customer-facing identity, locale, and operating defaults for each workspace.",
    action: "Complete the business profile before connecting live channels.",
    how: ["Each business is isolated from every other tenant.", "Language, timezone, and currency control customer-facing behavior.", "Archiving disables live use without deleting history."],
    terms: [{ term: "Tenant", definition: "A protected workspace containing one business and its data." }],
    warning: "Changes here can affect live customer replies.",
  },
  "/dashboard/assistant": {
    title: "AI Assistant",
    purpose: "Control how the assistant speaks, retrieves approved knowledge, and escalates risk.",
    action: "Preview changes in Test Lab before saving live behavior.",
    how: ["The system prompt defines boundaries and tone.", "Confidence settings determine when answers should be withheld.", "Human escalation protects sensitive requests."],
    terms: [{ term: "Grounding", definition: "Answering only from approved business sources." }, { term: "Confidence", definition: "The system's estimate that an answer is supported." }],
    warning: "Saving assistant settings changes live automated replies.",
    related: [{ label: "Manage Knowledge", href: "/dashboard/knowledge" }, { label: "Open Test Lab", href: "/dashboard/test-lab" }],
  },
  "/dashboard/knowledge": {
    title: "Knowledge",
    purpose: "Manage the approved facts used to ground AI answers.",
    action: "Add a source, wait for READY, then confirm retrieval in Test Lab.",
    how: ["Indexing extracts and divides content into searchable chunks.", "READY means the source can be retrieved.", "Re-index after changing source content."],
    terms: [{ term: "Chunk", definition: "A small searchable section of a source." }, { term: "Indexing", definition: "Preparing content for semantic search." }, { term: "Retrieval", definition: "Finding relevant source chunks for a customer question." }],
    related: [{ label: "Test an answer", href: "/dashboard/test-lab" }],
  },
  "/dashboard/products": {
    title: "Products",
    purpose: "Maintain product facts that can be used in grounded customer answers.",
    action: "Add complete price, stock, and shipping information for each product.",
    how: ["Products remain tenant-scoped.", "Archived products stop appearing in active catalog results.", "Edits are recorded in Audit Logs."],
    terms: [{ term: "Variant", definition: "A sellable option such as size, color, or package." }],
    warning: "Catalog changes can affect live customer answers.",
  },
  "/dashboard/services": {
    title: "Services",
    purpose: "Maintain service descriptions, availability, duration, and booking requirements.",
    action: "Keep availability and booking requirements current.",
    how: ["Services are available to grounded AI answers.", "Archive services that are no longer offered.", "All mutations are tenant-scoped and audited."],
    terms: [{ term: "Availability", definition: "When or under what conditions a service can be booked." }],
    warning: "Catalog changes can affect live customer answers.",
  },
  "/dashboard/policies-faqs": {
    title: "Policies & FAQs",
    purpose: "Govern standard customer answers for shipping, returns, privacy, discounts, and frequent questions.",
    action: "Add exact policy language before relying on automated answers.",
    how: ["Policies define business rules.", "FAQs give direct answers to recurring questions.", "Archive outdated entries instead of silently changing historical meaning."],
    terms: [{ term: "Governed answer", definition: "A response constrained by an approved business rule." }],
    warning: "Policy edits can change live customer replies.",
  },
  "/dashboard/channels": {
    title: "Channels",
    purpose: "Connect and monitor Telegram, Web Chat, and WhatsApp entry points.",
    action: "Configure one channel, verify its health, then send a real test message.",
    how: ["Credentials are encrypted at rest.", "A connected state means software configuration is present.", "Provider acceptance still requires a real external message."],
    terms: [{ term: "Webhook", definition: "A protected URL that receives provider events." }, { term: "Origin", definition: "A website domain allowed to embed Web Chat." }],
    warning: "Activating or replacing credentials affects live customer traffic.",
  },
  "/dashboard/conversations": {
    title: "Inbox",
    purpose: "Handle live customer conversations while keeping AI context and operational state visible.",
    action: "Claim urgent handoffs, reply, add internal context, then resolve completed work.",
    how: ["The list shows the newest customer threads.", "The timeline contains persisted messages and delivery state.", "AI details are secondary and collapsible."],
    terms: [{ term: "Internal note", definition: "Private context visible only to your team." }, { term: "Resume AI", definition: "Return a paused conversation to automation." }],
  },
  "/dashboard/handoff": {
    title: "Human Handoff",
    purpose: "Manage conversations the AI paused for a person.",
    action: "Claim the highest-priority open request and record the resolution.",
    how: ["Open requests need an owner.", "Claimed requests are being handled.", "Resolving closes the human queue item and can resume automation."],
    terms: [{ term: "Escalation", definition: "Moving a conversation from automation to a person." }],
  },
  "/dashboard/actions": {
    title: "Actions & Approvals",
    purpose: "Safely connect AI requests to approved business operations.",
    action: "Use allowlisted HTTPS endpoints, test the connector, and require approval for sensitive actions.",
    how: ["An Action describes a remote operation.", "An Approval pauses execution for human review.", "Retries are limited and recorded."],
    terms: [{ term: "Connector", definition: "A configured outbound HTTPS request." }, { term: "Allowlist", definition: "Domains explicitly permitted for outgoing requests." }],
    warning: "Enabled actions can change external systems. Test before activation.",
  },
  "/dashboard/follow-ups": {
    title: "Follow-ups",
    purpose: "Schedule respectful customer reminders with consent and quiet-hour controls.",
    action: "Confirm consent rules and local quiet hours before enabling a rule.",
    how: ["Jobs are stored before delivery.", "Attempts stop at the configured limit.", "Opt-out logic prevents unwanted contact."],
    terms: [{ term: "Quiet hours", definition: "A local time window when messages must not be sent." }],
    warning: "Enabling a rule can send customer messages.",
  },
  "/dashboard/test-lab": {
    title: "Test Lab",
    purpose: "Preview grounded assistant behavior without contacting a real customer.",
    action: "Test supported, unsupported, risky, and multilingual questions before launch.",
    how: ["Tests use the selected tenant configuration.", "Sources reveal which knowledge supported an answer.", "A handoff result shows that safety policy took precedence."],
    terms: [{ term: "Trace", definition: "Technical evidence describing how the response was produced." }],
  },
  "/dashboard/analytics": {
    title: "Analytics",
    purpose: "Understand real conversation, automation, handoff, and knowledge outcomes.",
    action: "Investigate changes in handoffs, failures, and knowledge gaps before optimizing volume.",
    how: ["Metrics are calculated from persisted events.", "Empty charts explain which activity creates data.", "Filters never invent missing observations."],
    terms: [{ term: "Resolution rate", definition: "The share of eligible conversations completed without human escalation." }],
  },
  "/dashboard/audit-logs": {
    title: "Audit Logs",
    purpose: "Review who changed protected business configuration and when.",
    action: "Use filters to investigate an unexpected configuration or access change.",
    how: ["Events are immutable operational evidence.", "Details exclude secrets.", "Tenant users can only see their workspace events."],
    terms: [{ term: "Audit event", definition: "A timestamped record of a protected action." }],
  },
  "/dashboard/system-health": {
    title: "System Health",
    purpose: "See whether core services and providers are healthy, degraded, unavailable, or not configured.",
    action: "Resolve degraded internal services first; configure only the providers you intend to use.",
    how: ["Healthy means a recent check succeeded.", "Degraded means service exists but needs attention.", "Not configured is an honest setup state, not an outage."],
    terms: [{ term: "Dead Letter", definition: "A failed event retained for safe review or retry." }],
    warning: "This platform-owner page exposes operational metadata, never credential values.",
  },
  "/dashboard/team": {
    title: "Team",
    purpose: "Control who can view, operate, and administer a workspace.",
    action: "Grant the least powerful role each person needs.",
    how: ["Owners control business settings.", "Admins configure operations.", "Agents handle conversations.", "Viewers have read-only access."],
    terms: [{ term: "Role", definition: "A permission level applied inside one workspace." }],
    warning: "Role changes affect access immediately.",
  },
  "/dashboard/internal-api-keys": {
    title: "Internal API Keys",
    purpose: "Manage expiring, scoped credentials for protected system-to-system traffic.",
    action: "Create the narrowest scope and shortest useful expiry, then store the one-time secret safely.",
    how: ["Secrets are shown only once.", "Revocation stops future requests.", "Every request is signed and replay-protected."],
    terms: [{ term: "Scope", definition: "A specific API capability granted to a key." }, { term: "HMAC", definition: "A signature proving request authenticity and integrity." }],
    warning: "Advanced platform infrastructure. Never paste credentials into chat, logs, or documentation.",
  },
  "/dashboard/account": {
    title: "Account Settings",
    purpose: "Manage your own sign-in security and interface preferences.",
    action: "Use a unique password and review language and theme preferences.",
    how: ["Password changes revoke older sessions.", "Theme and language persist across visits.", "Credential values are never displayed after saving."],
    terms: [{ term: "Session", definition: "A time-limited authenticated browser visit." }],
  },
}

const ar: Record<string, PageGuide> = Object.fromEntries(
  Object.entries(en).map(([path, guide]) => [path, { ...guide }]),
) as Record<string, PageGuide>

Object.assign(ar, {
  "/dashboard": {
    title: "نظرة عامة",
    purpose: "اعرف ما يحتاج إلى انتباه الآن وما إذا كانت عمليات خدمة العملاء جاهزة.",
    action: "ابدأ بطلبات التسليم العاجلة والقنوات المتعثرة وفجوات المعرفة والأعمال المتأخرة.",
    how: ["يلخص قسم اليوم النشاط الحالي.", "يعرض قسم يحتاج إلى انتباه الأعمال التي قد تؤثر في العملاء.", "توضح بطاقات الجاهزية ما ينبغي إعداده تالياً."],
    terms: [{ term: "فجوة المعرفة", definition: "سؤال لم يتمكن المساعد من إجابته من مصدر معتمد." }, { term: "التسليم البشري", definition: "محادثة أوقفت مؤقتاً ليتولاها أحد أعضاء الفريق." }],
    related: [{ label: "فتح صندوق الوارد", href: "/dashboard/conversations" }, { label: "إجراء اختبار آمن", href: "/dashboard/test-lab" }],
  },
  "/dashboard/knowledge": {
    title: "المعرفة",
    purpose: "إدارة الحقائق المعتمدة التي يستند إليها المساعد في الإجابات.",
    action: "أضف مصدراً وانتظر حالة جاهز ثم تحقق من الاسترجاع في مختبر الاختبار.",
    how: ["تستخرج الفهرسة المحتوى وتقسمه إلى أجزاء قابلة للبحث.", "تعني حالة جاهز أن المصدر أصبح قابلاً للاسترجاع.", "أعد الفهرسة بعد تعديل محتوى المصدر."],
    terms: [{ term: "جزء", definition: "مقطع صغير من المصدر يمكن البحث فيه." }, { term: "الفهرسة", definition: "تهيئة المحتوى للبحث الدلالي." }, { term: "الاسترجاع", definition: "العثور على المقاطع المناسبة لسؤال العميل." }],
    related: [{ label: "اختبار إجابة", href: "/dashboard/test-lab" }],
  },
  "/dashboard/conversations": {
    title: "صندوق الوارد",
    purpose: "معالجة محادثات العملاء مع إبقاء سياق المساعد والحالة التشغيلية واضحة.",
    action: "استلم طلبات التسليم العاجلة ثم أجب وأضف سياقاً داخلياً وأغلق العمل المكتمل.",
    how: ["تعرض القائمة أحدث المحادثات.", "يحتوي الخط الزمني على الرسائل المحفوظة وحالة التسليم.", "تفاصيل الذكاء الاصطناعي ثانوية وقابلة للطي."],
    terms: [{ term: "ملاحظة داخلية", definition: "سياق خاص لا يراه إلا فريقك." }, { term: "استئناف المساعد", definition: "إعادة المحادثة المتوقفة إلى التشغيل الآلي." }],
  },
})

const fallbackAr = (guide: PageGuide): PageGuide => ({
  ...guide,
  purpose: `هذه الصفحة مخصصة لـ ${guide.title}. استخدم المساعدة السياقية لفهم الإعداد الآمن والخطوة التالية.`,
  action: "راجع الحالة الحالية ثم نفّذ الإجراء الأساسي الظاهر في الصفحة.",
  how: ["تُعرض الإجراءات الأساسية أولاً.", "تظهر الإعدادات المتقدمة عند الحاجة.", "تُسجل التغييرات المحمية في سجل التدقيق."],
  terms: [{ term: "مساحة العمل", definition: "بيانات وإعدادات عمل معزولة وآمنة." }],
})

for (const [path, guide] of Object.entries(ar)) {
  if (guide.purpose === en[path]?.purpose) ar[path] = fallbackAr(guide)
}

export function getPageGuide(pathname: string, locale: Locale): PageGuide {
  const normalized = pathname.replace(/\/$/, "") || "/dashboard"
  const guide = (locale === "ar" ? ar : en)[normalized]
  return guide ?? (locale === "ar" ? {
    title: "مساعدة الصفحة",
    purpose: "توضح هذه الصفحة الحالة الحالية والإجراءات المتاحة.",
    action: "راجع المعلومات قبل تنفيذ أي تغيير يؤثر في العملاء.",
    how: ["ابدأ بالإجراء الأساسي ثم افتح الإعدادات المتقدمة عند الحاجة."],
    terms: [],
  } : {
    title: "Page help",
    purpose: "This page explains its current state and available operations.",
    action: "Review the current information before changing customer-facing behavior.",
    how: ["Start with the primary action and open advanced settings only when needed."],
    terms: [],
  })
}


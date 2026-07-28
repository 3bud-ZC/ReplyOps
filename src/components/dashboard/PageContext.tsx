"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleHelp, ExternalLink, Sparkles, TriangleAlert } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Locale } from "@/lib/i18n"
import { getPageGuide } from "@/lib/page-guides"

export function PageContext({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const guide = getPageGuide(pathname, locale)
  const isArabic = locale === "ar"

  return (
    <div className="border-b border-border/70 bg-card/45 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-sm">{guide.purpose}</p>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/50 hover:text-primary">
              <CircleHelp className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{isArabic ? "كيف تستخدم هذه الصفحة؟" : "How to use this page"}</span>
              <span className="sm:hidden">{isArabic ? "مساعدة" : "Help"}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[min(760px,90vh)] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <p className="technical-kicker">{isArabic ? "دليل سياقي" : "Context guide"}</p>
              <DialogTitle className="text-2xl">{guide.title}</DialogTitle>
              <DialogDescription className="text-start leading-6">{guide.purpose}</DialogDescription>
            </DialogHeader>
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-semibold">{isArabic ? "الخطوة التالية" : "Next action"}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{guide.action}</p>
                </div>
              </div>
            </section>
            <section>
              <h3 className="font-semibold">{isArabic ? "طريقة العمل" : "How this page works"}</h3>
              <ol className="mt-3 space-y-2">
                {guide.how.map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-primary">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>
            {guide.terms.length > 0 && (
              <section>
                <h3 className="font-semibold">{isArabic ? "مصطلحات" : "Terms"}</h3>
                <dl className="mt-3 grid gap-3">
                  {guide.terms.map((item) => (
                    <div key={item.term} className="rounded-lg bg-muted p-3">
                      <dt className="text-sm font-semibold">{item.term}</dt>
                      <dd className="mt-1 text-sm leading-6 text-muted-foreground">{item.definition}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {guide.warning && (
              <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm leading-6">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                <p>{guide.warning}</p>
              </div>
            )}
            {guide.related && (
              <nav aria-label={isArabic ? "صفحات مرتبطة" : "Related pages"} className="flex flex-wrap gap-2">
                {guide.related.map((item) => (
                  <Link key={item.href} href={item.href} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:border-primary/50 hover:text-primary">
                    {item.label}<ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ))}
              </nav>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

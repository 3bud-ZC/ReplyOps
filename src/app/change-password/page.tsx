import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { dictionary, localeDirection, normalizeLocale } from "@/lib/i18n"
import ChangePasswordForm from "./ChangePasswordForm"

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }
  const locale = normalizeLocale((await cookies()).get("replyops_locale")?.value)
  const t = dictionary[locale]

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30" dir={localeDirection(locale)} lang={locale}>
      <div className="w-full max-w-md p-8 bg-card border rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{t.changePassword}</h1>
          <p className="text-muted-foreground mt-2">
            {(session.user as any).forcePasswordChange 
              ? t.forcePasswordChangeNotice
              : t.updateAccountPassword}
          </p>
        </div>
        <ChangePasswordForm labels={{
          currentPassword: t.currentPassword,
          newPassword: t.newPassword,
          changePassword: t.changePassword,
          changing: t.changing,
        }} />
      </div>
    </div>
  )
}

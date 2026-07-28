import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { dictionary, localeDirection, normalizeLocale } from "@/lib/i18n"
import LoginForm from "./LoginForm"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect("/dashboard")
  }
  const locale = normalizeLocale((await cookies()).get("replyops_locale")?.value)
  const t = dictionary[locale]

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10" dir={localeDirection(locale)} lang={locale}>
      <div className="w-full max-w-md p-8 bg-card border rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{t.product}</h1>
          <p className="text-muted-foreground mt-2">{t.signInToAccount}</p>
        </div>
        <LoginForm labels={{
          email: t.email,
          password: t.password,
          invalidEmailOrPassword: t.invalidEmailOrPassword,
          signIn: t.signIn,
        }} />
      </div>
    </div>
  )
}

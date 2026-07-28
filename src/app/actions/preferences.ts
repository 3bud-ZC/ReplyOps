"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { normalizeLocale } from "@/lib/i18n"

export async function setLocalePreference(formData: FormData) {
  const locale = normalizeLocale(String(formData.get("locale") ?? "ar"))
  const cookieStore = await cookies()
  cookieStore.set("replyops_locale", locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath("/dashboard")
}

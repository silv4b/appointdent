"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { loginSchema, signupSchema } from "@/lib/schemas"
import { err } from "@/lib/utils/action-response"
import { translateMessage } from "@/lib/utils/translate-error"
import { checkEmailRateLimit } from "@/lib/utils/rate-limit"

export async function login(formData: FormData) {
  const raw = Object.fromEntries(formData)
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(", "))
  }

  const email = parsed.data.email

  const allowed = await checkEmailRateLimit(email, "login")
  if (!allowed) {
    return err("Muitas tentativas de login para este email. Tente novamente em 15 minutos.")
  }

  const supabase = await createClient()

  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

  const { data: allowedByIp } = await supabase.rpc("check_login_rate_limit", {
    ip_address: ip,
  })

  if (allowedByIp === false) {
    return err("Muitas tentativas de login. Tente novamente em 1 minuto.")
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })

  if (error) return err(translateMessage(error.message))

  revalidatePath("/", "layout")
  redirect("/")
}

export async function signup(_formData: FormData) {
  return err("Cadastro desabilitado. Contate o administrador.")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

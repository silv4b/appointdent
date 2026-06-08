"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { encrypt, decrypt } from "@/lib/crypto"
import { ok, err } from "@/lib/utils/action-response"
import { z } from "zod"

const emailConfigSchema = z.object({
  gmailUser: z.string().email("Email inválido").or(z.literal("")).default(""),
  gmailAppPassword: z.string().default(""),
})

export interface EmailConfig {
  gmailUser: string
  gmailAppPassword: string
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const { supabase, user } = await requireAuth()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") return null

    const { data: rows, error } = await supabase
      .from("app_config")
      .select("key, value")

    if (error) {
      console.error("getEmailConfig: query error", error)
      return null
    }

    const map = Object.fromEntries(
      (rows ?? []).map((r) => [r.key, r.value])
    )

    const gmailUser = map.gmail_user ?? ""
    const encrypted = map.gmail_app_password ?? ""

    if (!gmailUser || !encrypted) {
      console.error("getEmailConfig: missing config values")
      return null
    }

    let gmailAppPassword = ""
    try {
      const parsed = JSON.parse(encrypted)
      if (parsed.iv && parsed.encrypted && parsed.tag) {
        gmailAppPassword = decrypt(parsed)
      }
    } catch (e) {
      console.error("getEmailConfig: decrypt failed", e)
      return null
    }

    return { gmailUser, gmailAppPassword }
  } catch (e) {
    console.error("getEmailConfig: unexpected error", e)
    return null
  }
}

export async function updateEmailConfig(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") return err("Acesso negado")

    const raw = Object.fromEntries(formData)
    const parsed = emailConfigSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { data: existing } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "gmail_app_password")
      .single()

    const passwordValue = parsed.data.gmailAppPassword
      ? JSON.stringify(encrypt(parsed.data.gmailAppPassword))
      : (existing?.value ?? "")

    const updates = [
      { key: "gmail_user", value: parsed.data.gmailUser },
      { key: "gmail_app_password", value: passwordValue },
    ]

    for (const u of updates) {
      await supabase.from("app_config").upsert(u, { onConflict: "key" })
    }

    return ok()
  } catch {
    return err("Erro ao salvar configuração de email")
  }
}

"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { ok, err } from "@/lib/utils/action-response"
import { translateMessage } from "@/lib/utils/translate-error"
import { z } from "zod"

const ALLOWED_LOGO_FORMATS = /^data:image\/(jpeg|jpg|png);base64,/
const MAX_LOGO_SIZE = 500_000 // 500KB

const clinicSettingsSchema = z.object({
  name: z.string().max(200),
  street: z.string().max(200),
  number: z.string().max(20),
  neighborhood: z.string().max(100),
  city: z.string().max(100),
  state: z.string().max(2),
  email: z.string().max(200),
  phone1: z.string().max(20),
  phone2: z.string().max(20),
  cnpj: z.string().max(20),
  logo: z.string().nullable().optional().refine((val) => {
    if (!val) return true
    if (!ALLOWED_LOGO_FORMATS.test(val)) return false
    if (val.length > MAX_LOGO_SIZE) return false
    return true
  }, "Formato inválido. Permitido apenas JPG, JPEG e PNG (máx. 500KB)"),
})

export async function getClinicSettings() {
  try {
    const { supabase } = await requireAuth()

    const { data, error } = await supabase
      .from("clinic_settings")
      .select("id, name, street, number, neighborhood, city, state, email, phone1, phone2, cnpj, logo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return err(translateMessage(error.message))
    return ok(data)
  } catch {
    return err("Erro ao buscar dados da clínica")
  }
}

export async function saveClinicSettings(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") return err("Apenas administradores podem alterar os dados da clínica")

    const raw = Object.fromEntries(formData)
    // Strip masks from phone and CNPJ
    if (raw.phone1) raw.phone1 = (raw.phone1 as string).replace(/\D/g, "")
    if (raw.phone2) raw.phone2 = (raw.phone2 as string).replace(/\D/g, "")
    if (raw.cnpj) raw.cnpj = (raw.cnpj as string).replace(/\D/g, "")
    const parsed = clinicSettingsSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const existingId = formData.get("id") as string | null

    if (existingId) {
      const { error } = await supabase
        .from("clinic_settings")
        .update(parsed.data)
        .eq("id", existingId)
      if (error) return err(translateMessage(error.message))
    } else {
      const { error } = await supabase
        .from("clinic_settings")
        .insert(parsed.data)
      if (error) return err(translateMessage(error.message))
    }

    revalidatePath("/perfil")
    return ok()
  } catch {
    return err("Erro ao salvar dados da clínica")
  }
}

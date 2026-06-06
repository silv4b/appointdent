"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { dentistSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { getUserDentistFilter } from "@/lib/utils/access-filter"
import { z } from "zod"

export async function getDentists() {
  try {
    const { supabase } = await requireAuth()

    let query = supabase.from("dentists").select("id, name, specialty, cro, phone, email, active, created_at").order("name")

    const dentistFilter = await getUserDentistFilter()
    if (dentistFilter !== null) {
      if (dentistFilter.length > 0) {
        query = query.in("id", dentistFilter)
      } else {
        query = query.in("id", [])
      }
    }

    const { data } = await query
    return data ?? []
  } catch {
    return []
  }
}

export async function updateDentist(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") return err("Acesso negado")

    const raw = Object.fromEntries(formData)
    const parsed = dentistSchema.extend({ id: z.string().uuid() }).safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { id, ...fields } = parsed.data

    const { error } = await supabase
      .from("dentists")
      .update({
        name: fields.name,
        specialty: fields.specialty || null,
        cro: fields.cro || null,
        phone: fields.phone || null,
        email: fields.email || null,
        active: fields.active ?? true,
      })
      .eq("id", id)

    if (error) return err(error.message)
    revalidatePath("/dentistas")
    return ok()
  } catch {
    return err("Erro ao atualizar dentista")
  }
}

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

    let query = supabase.from("dentists").select("*").order("name")

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

export async function createDentist(formData: FormData) {
  const { supabase } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = dentistSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("dentists").insert({
    name: parsed.data.name,
    specialty: parsed.data.specialty || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
  })

  if (error) return err(error.message)
  revalidatePath("/dentistas")
  return ok()
}

export async function updateDentist(formData: FormData) {
  const { supabase } = await requireAuth()
  const raw = Object.fromEntries(formData)
  const parsed = dentistSchema.extend({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { id, ...fields } = parsed.data

  const { error } = await supabase
    .from("dentists")
    .update({
      name: fields.name,
      specialty: fields.specialty || null,
      phone: fields.phone || null,
      email: fields.email || null,
      active: fields.active ?? true,
    })
    .eq("id", id)

  if (error) return err(error.message)
  revalidatePath("/dentistas")
  return ok()
}

export async function deleteDentist(formData: FormData) {
  const { supabase } = await requireAuth()
  const raw = Object.fromEntries(formData)
  const parsed = z.object({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("dentists").delete().eq("id", parsed.data.id)
  if (error) return err(error.message)
  revalidatePath("/dentistas")
  return ok()
}

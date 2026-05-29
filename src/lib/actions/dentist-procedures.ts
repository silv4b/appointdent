"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { dentistProcedureSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { z } from "zod"

export async function getDentistProcedures(dentistId: string) {
  try {
    const { supabase } = await requireAuth()
    const { data } = await supabase
      .from("dentist_procedures")
      .select("*, procedures(name, duration_minutes, price)")
      .eq("dentist_id", dentistId)
    return data ?? []
  } catch {
    return []
  }
}

export async function upsertDentistProcedure(formData: FormData) {
  const { supabase } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = dentistProcedureSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("dentist_procedures").upsert(
    {
      dentist_id: parsed.data.dentist_id,
      procedure_id: parsed.data.procedure_id,
      price: parsed.data.price ?? null,
      duration_minutes: parsed.data.duration_minutes ?? null,
      active: parsed.data.active,
    },
    { onConflict: "dentist_id, procedure_id" },
  )

  if (error) return err(error.message)
  revalidatePath("/perfil")
  return ok()
}

export async function deleteDentistProcedure(formData: FormData) {
  const { supabase } = await requireAuth()
  const raw = Object.fromEntries(formData)
  const parsed = z.object({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("dentist_procedures").delete().eq("id", parsed.data.id)
  if (error) return err(error.message)
  revalidatePath("/perfil")
  return ok()
}

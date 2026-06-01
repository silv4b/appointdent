"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { clinicHoursSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"

export async function getClinicHours() {
  try {
    const { supabase } = await requireAuth()

    const { data } = await supabase
      .from("clinic_hours")
      .select("*")
      .order("day_of_week")

    return data ?? []
  } catch {
    return []
  }
}

export async function updateClinicHours(formData: FormData) {
  const { supabase } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const dayOfWeek = parseInt(raw.day_of_week as string, 10)
  const parsed = clinicHoursSchema.safeParse({ ...raw, day_of_week: dayOfWeek })
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { open_time, close_time, is_open } = parsed.data

  const { error } = await supabase
    .from("clinic_hours")
    .upsert(
      { day_of_week: dayOfWeek, open_time, close_time, is_open },
      { onConflict: "day_of_week" },
    )

  if (error) return err(error.message)
  revalidatePath("/horarios")
  return ok()
}

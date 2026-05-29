"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { availabilitySlotSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { z } from "zod"

export async function getAvailabilitySlots() {
  try {
    const { supabase } = await requireAuth()
    const { data } = await supabase
      .from("availability_slots")
      .select("*, dentists(name)")
      .order("day_of_week")
      .order("start_time")
    return data ?? []
  } catch {
    return []
  }
}

export async function createAvailabilitySlot(formData: FormData) {
  const { supabase } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = availabilitySlotSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("availability_slots").insert({
    dentist_id: parsed.data.dentist_id,
    day_of_week: parsed.data.day_of_week,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    slot_type: parsed.data.slot_type,
  })

  if (error) return err(error.message)
  revalidatePath("/horarios")
  return ok()
}

export async function updateAvailabilitySlot(formData: FormData) {
  const { supabase } = await requireAuth()
  const raw = Object.fromEntries(formData)
  const parsed = availabilitySlotSchema.extend({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { id, ...fields } = parsed.data

  const { error } = await supabase
    .from("availability_slots")
    .update({
      dentist_id: fields.dentist_id,
      day_of_week: fields.day_of_week,
      start_time: fields.start_time,
      end_time: fields.end_time,
      slot_type: fields.slot_type,
    })
    .eq("id", id)

  if (error) return err(error.message)
  revalidatePath("/horarios")
  return ok()
}

export async function deleteAvailabilitySlot(formData: FormData) {
  const { supabase } = await requireAuth()
  const raw = Object.fromEntries(formData)
  const parsed = z.object({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("availability_slots").delete().eq("id", parsed.data.id)
  if (error) return err(error.message)
  revalidatePath("/horarios")
  return ok()
}

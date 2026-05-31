"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { patientSchema, quickPatientSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { z } from "zod"

export async function getPatients() {
  try {
    const { supabase } = await requireAuth()
    const { data } = await supabase.from("patients").select("*").order("name")
    return data ?? []
  } catch {
    return []
  }
}

export async function createPatient(formData: FormData) {
  const { supabase } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = patientSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { data, error } = await supabase
    .from("patients")
    .insert({
      name: parsed.data.name,
      cpf: parsed.data.cpf || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      birth_date: parsed.data.birth_date || null,
      notes: parsed.data.notes || null,
      active: parsed.data.active ?? true,
    })
    .select("id, name")
    .single()

  if (error) return err(error.message)
  revalidatePath("/pacientes")
  return ok({ data })
}

export async function quickCreatePatient(formData: FormData) {
  const { supabase } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = quickPatientSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { data, error } = await supabase
    .from("patients")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    })
    .select("id, name, email")
    .single()

  if (error) return err(error.message)
  revalidatePath("/pacientes")
  return ok(data)
}

export async function updatePatient(formData: FormData) {
  const { supabase } = await requireAuth()
  const raw = Object.fromEntries(formData)
  const parsed = patientSchema.extend({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { id, ...fields } = parsed.data

  const { error } = await supabase.from("patients").update({
    name: fields.name,
    cpf: fields.cpf || null,
    phone: fields.phone || null,
    email: fields.email || null,
    birth_date: fields.birth_date || null,
    notes: fields.notes || null,
    active: fields.active,
  }).eq("id", id)

  if (error) return err(error.message)
  revalidatePath("/pacientes")
  return ok()
}

export async function deletePatient(formData: FormData) {
  const { supabase } = await requireAuth()
  const raw = Object.fromEntries(formData)
  const parsed = z.object({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("patients").delete().eq("id", parsed.data.id)
  if (error) return err(error.message)
  revalidatePath("/pacientes")
  return ok()
}

"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { anamneseSessionSchema, anamneseSessionUpdateSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { getUserDentistFilter } from "@/lib/utils/access-filter"
import { NULL_UUID } from "@/lib/utils/constants"

export async function saveAnamneseSession(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = anamneseSessionSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) return err("Perfil de usuário não encontrado")

    let dentistId: string

    if (profile.role === "dentist") {
      const { data: dentist } = await supabase
        .from("dentists")
        .select("id")
        .eq("profile_id", user.id)
        .single()

      if (!dentist) return err("Perfil de dentista não encontrado")
      dentistId = dentist.id
    } else {
      if (!parsed.data.dentist_id) return err("Selecione um dentista")
      dentistId = parsed.data.dentist_id
    }

    const { error } = await supabase.from("anamnese_sessions").insert({
      title: parsed.data.title,
      appointment_id: parsed.data.appointment_id || null,
      dentist_id: dentistId,
      patient_id: parsed.data.patient_id,
      notes: parsed.data.notes || null,
      fields: parsed.data.fields,
    })

    if (error) return err(error.message)
    revalidatePath("/anamnese")
    return ok()
  } catch {
    return err("Erro ao salvar sessão de anamnese")
  }
}

export async function updateAnamneseSession(formData: FormData) {
  try {
    const { supabase } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = anamneseSessionUpdateSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { error } = await supabase
      .from("anamnese_sessions")
      .update({
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.fields !== undefined && { fields: parsed.data.fields }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      })
      .eq("id", parsed.data.id)

    if (error) return err(error.message)
    revalidatePath("/anamnese")
    return ok()
  } catch {
    return err("Erro ao atualizar sessão de anamnese")
  }
}

export async function deleteAnamneseSession(sessionId: string) {
  try {
    const { supabase } = await requireAuth()

    const { error } = await supabase
      .from("anamnese_sessions")
      .delete()
      .eq("id", sessionId)

    if (error) return err(error.message)
    revalidatePath("/anamnese")
    return ok()
  } catch {
    return err("Erro ao excluir sessão de anamnese")
  }
}

export async function searchPatients(query: string) {
  try {
    const { supabase } = await requireAuth()

    let baseQuery = supabase
      .from("patients")
      .select("id, name, phone")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(20)

    const dentistFilter = await getUserDentistFilter()
    if (dentistFilter !== null) {
      const { data: patientsWithAccess } = await supabase
        .from("appointments")
        .select("patient_id")
        .in("dentist_id", dentistFilter.length > 0 ? dentistFilter : [NULL_UUID])

      const patientIds = [...new Set(patientsWithAccess?.map((a) => a.patient_id) ?? [])]

      if (patientIds.length > 0) {
        baseQuery = baseQuery.in("id", patientIds)
      } else {
        baseQuery = baseQuery.in("id", [])
      }
    }

    const { data } = await baseQuery
    return data ?? []
  } catch {
    return []
  }
}

export async function getAnamneseForExport(sessionId: string) {
  try {
    const { supabase } = await requireAuth()

    const { data: session } = await supabase
      .from("anamnese_sessions")
      .select("*, patients(name, phone), dentists(name)")
      .eq("id", sessionId)
      .single()

    if (!session) return err("Sessão não encontrada")

    const patient = session.patients as { name: string; phone: string | null } | null
    const dentist = session.dentists as { name: string } | null

    return ok({
      patientName: patient?.name ?? "Paciente",
      patientPhone: patient?.phone ?? null,
      dentistName: dentist?.name ?? "Dentista",
      sessionTitle: session.title ?? "Sessão de Anamnese",
      createdAt: session.created_at,
      fields: session.fields as { label: string; content: string }[],
    })
  } catch {
    return err("Erro ao buscar dados da sessão")
  }
}

"use server"

import { requireAuth, AuthError } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { anamneseSessionSchema, anamneseSessionUpdateSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { getUserDentistFilter } from "@/lib/utils/access-filter"
import { z } from "zod"

export async function getProfile() {
  const { supabase, user } = await requireAuth()

  const { data } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single()

  return { role: data?.role ?? "admin", name: data?.name ?? "" }
}

export async function getMyDentistId() {
  const { supabase, user } = await requireAuth()

  const { data } = await supabase
    .from("dentists")
    .select("id")
    .eq("profile_id", user.id)
    .single()

  return data?.id ?? null
}

export async function getMyAppointments(dentistId: string) {
  try {
    const { supabase } = await requireAuth()

    const dentistFilter = await getUserDentistFilter()
    if (dentistFilter !== null) {
      if (!dentistFilter.includes(dentistId)) return []
    }

    const { data } = await supabase
      .from("appointments")
      .select("*, patients(name), procedures(name, color, duration_minutes)")
      .eq("dentist_id", dentistId)
      .order("start_time", { ascending: false })

    return data ?? []
  } catch {
    return []
  }
}

export async function getPatientAppointments(patientId: string) {
  try {
    const { supabase } = await requireAuth()

    let query = supabase
      .from("appointments")
      .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
      .eq("patient_id", patientId)
      .order("start_time", { ascending: false })

    const dentistFilter = await getUserDentistFilter()
    if (dentistFilter !== null) {
      if (dentistFilter.length > 0) {
        query = query.in("dentist_id", dentistFilter)
      } else {
        query = query.eq("dentist_id", "00000000-0000-0000-0000-000000000000")
      }
    }

    const { data } = await query
    return data ?? []
  } catch {
    return []
  }
}

export async function getPatientAnamneseHistory(patientId: string) {
  const { supabase } = await requireAuth()

  const dentistFilter = await getUserDentistFilter()

  const patientRes = supabase.from("patients").select("id, name, phone, birth_date, notes").eq("id", patientId).single()

  let appointmentsQuery = supabase
    .from("appointments")
    .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
    .eq("patient_id", patientId)
    .order("start_time", { ascending: false })

  if (dentistFilter !== null) {
    if (dentistFilter.length > 0) {
      appointmentsQuery = appointmentsQuery.in("dentist_id", dentistFilter)
    } else {
      appointmentsQuery = appointmentsQuery.eq("dentist_id", "00000000-0000-0000-0000-000000000000")
    }
  }

  let sessionsQuery = supabase
    .from("anamnese_sessions")
    .select("*, appointments(patients(name), dentists(name))")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (dentistFilter !== null) {
    if (dentistFilter.length > 0) {
      sessionsQuery = sessionsQuery.in("dentist_id", dentistFilter)
    } else {
      sessionsQuery = sessionsQuery.eq("dentist_id", "00000000-0000-0000-0000-000000000000")
    }
  }

  const [patientResult, appointments, sessions] = await Promise.all([
    patientRes,
    appointmentsQuery,
    sessionsQuery,
  ])

  return {
    patient: patientResult.data ?? null,
    appointments: appointments.data ?? [],
    sessions: sessions.data ?? [],
  }
}

export async function saveAnamneseSession(formData: FormData) {
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
}

export async function updateAnamneseSession(formData: FormData) {
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
}

export async function deleteAnamneseSession(sessionId: string) {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from("anamnese_sessions")
    .delete()
    .eq("id", sessionId)

  if (error) return err(error.message)
  revalidatePath("/anamnese")
  return ok()
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
        .in("dentist_id", dentistFilter.length > 0 ? dentistFilter : ["00000000-0000-0000-0000-000000000000"])

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

export async function getDentistList() {
  try {
    const { supabase } = await requireAuth()

    let query = supabase
      .from("dentists")
      .select("id, name")
      .eq("active", true)
      .order("name")

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

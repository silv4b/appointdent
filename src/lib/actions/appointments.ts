"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { appointmentSchema, appointmentUpdateSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { getUserDentistFilter } from "@/lib/utils/access-filter"
import { NULL_UUID } from "@/lib/utils/constants"
import { z } from "zod"

export async function getAppointments(date: string) {
  try {
    const { supabase } = await requireAuth()
    const dayStart = `${date}T00:00:00Z`
    const dayEnd = `${date}T23:59:59Z`

    const dentistFilter = await getUserDentistFilter()

    let query = supabase
      .from("appointments")
      .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd)
      .order("start_time")

    if (dentistFilter !== null) {
      if (dentistFilter.length > 0) {
        query = query.in("dentist_id", dentistFilter)
      } else {
        query = query.eq("dentist_id", NULL_UUID)
      }
    }

    const { data } = await query

    return data ?? []
  } catch {
    return []
  }
}

export async function getPendingAppointments() {
  try {
    const { supabase } = await requireAuth()

    const dentistFilter = await getUserDentistFilter()

    let query = supabase
      .from("appointments")
      .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
      .eq("status", "pending")
      .order("start_time")

    if (dentistFilter !== null) {
      if (dentistFilter.length > 0) {
        query = query.in("dentist_id", dentistFilter)
      } else {
        query = query.eq("dentist_id", NULL_UUID)
      }
    }

    const { data } = await query

    return ok(data ?? [])
  } catch {
    return err("Erro ao buscar agendamentos pendentes")
  }
}

async function checkOverlap(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/guard").requireAuth>>["supabase"],
  dentistId: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
) {
  let query = supabase
    .from("appointments")
    .select("id, start_time, end_time, patients!inner(name), dentists!inner(name)")
    .eq("dentist_id", dentistId)
    .neq("status", "cancelled")
    .lt("start_time", endTime)
    .gt("end_time", startTime)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data } = await query

  if (data && data.length > 0) {
    const conflict = data[0]
    const patientName = conflict.patients?.name
    const dentistName = conflict.dentists?.name
    return `Conflito de horário: ${dentistName} já possui atendimento com ${patientName} das ${format(new Date(conflict.start_time), "HH:mm")} às ${format(new Date(conflict.end_time), "HH:mm")}`
  }

  return null
}

async function checkBlockedSlot(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/guard").requireAuth>>["supabase"],
  dentistId: string,
  startTime: string,
  endTime: string,
) {
  const date = new Date(startTime)
  const dayOfWeek = date.getUTCDay()

  const { data } = await supabase
    .from("availability_slots")
    .select("start_time, end_time")
    .eq("dentist_id", dentistId)
    .eq("day_of_week", dayOfWeek)
    .eq("slot_type", "blocked")
    .lt("start_time", endTime)
    .gt("end_time", startTime)

  if (data && data.length > 0) {
    const block = data[0]
    return `Horário bloqueado: o dentista possui um bloqueio das ${block.start_time.slice(0, 5)} às ${block.end_time.slice(0, 5)} neste dia`
  }

  return null
}

function extractTime(raw: string): string {
  // raw pode ser "2026-06-04T16:30" (local) ou "2026-06-04T19:30:00.000Z" (ISO)
  return raw.slice(11, 16)
}

async function checkClinicHours(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/guard").requireAuth>>["supabase"],
  startTime: string,
  endTime: string,
  startLocal?: string,
  endLocal?: string,
) {
  const date = new Date(startTime)
  const dayOfWeek = date.getUTCDay()

  const { data } = await supabase
    .from("clinic_hours")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .single()

  if (!data) return "Horário de funcionamento não configurado para este dia"

  if (!data.is_open) return "A clínica está fechada neste dia"

  // Usa as strings locais originais do formulário para comparar horários,
  // pois estão no mesmo fuso horário que clinic_hours (local da clínica).
  // Fallback para a string ISO caso não tenha sido informada.
  const startTimeOnly = extractTime(startLocal ?? startTime)
  const endTimeOnly = extractTime(endLocal ?? endTime)

  if (startTimeOnly < data.open_time.slice(0, 5)) {
    return `A clínica abre às ${data.open_time.slice(0, 5)} neste dia`
  }

  if (endTimeOnly > data.close_time.slice(0, 5)) {
    return `A clínica fecha às ${data.close_time.slice(0, 5)} neste dia`
  }

  return null
}

export async function searchAppointmentsForReturn(params: {
  patient_id?: string
  dentist_id?: string
  month: string
}) {
  try {
    const { supabase } = await requireAuth()

    const { patient_id, dentist_id, month } = params
    const startOfMonth = `${month}-01T00:00:00Z`
    const endDate = new Date(new Date(month + "-01").getFullYear(), new Date(month + "-01").getMonth() + 1, 0).getDate()
    const endOfMonth = `${month}-${String(endDate).padStart(2, "0")}T23:59:59Z`

    let query = supabase
      .from("appointments")
      .select("*, patients!inner(name), dentists!inner(name), procedures(name, color, duration_minutes)")
      .gte("start_time", startOfMonth)
      .lte("start_time", endOfMonth)
      .order("start_time")

    if (patient_id) query = query.eq("patient_id", patient_id)
    if (dentist_id) query = query.eq("dentist_id", dentist_id)

    const { data } = await query

    return ok(data ?? [])
  } catch {
    return err("Erro ao buscar agendamentos")
  }
}

export async function createAppointment(formData: FormData) {
  try {
    const { supabase } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = appointmentSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { patient_id, dentist_id, procedure_id, start_time: startTimeLocal, end_time: endTimeLocal, notes, return_to_id } = parsed.data

    const startTime = new Date(startTimeLocal).toISOString()
    let endTime: string

    if (endTimeLocal) {
      endTime = new Date(endTimeLocal).toISOString()
    } else if (procedure_id) {
      let durationMinutes: number | null = null

      const { data: dentistProc } = await supabase
        .from("dentist_procedures")
        .select("duration_minutes")
        .eq("dentist_id", dentist_id)
        .eq("procedure_id", procedure_id)
        .single()

      if (dentistProc?.duration_minutes) {
        durationMinutes = dentistProc.duration_minutes
      } else {
        const { data: procedure } = await supabase
          .from("procedures")
          .select("duration_minutes")
          .eq("id", procedure_id)
          .single()
        durationMinutes = procedure?.duration_minutes ?? null
      }

      if (durationMinutes) {
        const start = new Date(startTimeLocal)
        endTime = new Date(start.getTime() + durationMinutes * 60000).toISOString()
      } else {
        endTime = startTime
      }
    } else {
      endTime = startTime
    }

    const conflict = await checkOverlap(supabase, dentist_id, startTime, endTime)
    if (conflict) return err(conflict)

    const blocked = await checkBlockedSlot(supabase, dentist_id, startTime, endTime)
    if (blocked) return err(blocked)

    let endLocal = endTimeLocal
    if (!endLocal) {
      const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime()
      if (durationMs > 0) {
        const [d, t] = startTimeLocal.split("T")
        const [h, m] = t.split(":").map(Number)
        const totalMin = h * 60 + m + Math.round(durationMs / 60000)
        endLocal = `${d}T${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`
      } else {
        endLocal = startTimeLocal
      }
    }
    const clinicError = await checkClinicHours(supabase, startTime, endTime, parsed.data.start_time, endLocal)
    if (clinicError) return err(clinicError)

    const { error } = await supabase.from("appointments").insert({
      patient_id,
      dentist_id,
      procedure_id: procedure_id || null,
      start_time: startTime,
      end_time: endTime,
      notes: notes || null,
      status: "pending",
      return_to_id: return_to_id || null,
    })

    if (error) return err(error.message)
    revalidatePath("/agenda")
    return ok()
  } catch {
    return err("Erro ao criar agendamento")
  }
}

export async function confirmAppointment(id: string) {
  try {
    const { supabase } = await requireAuth()

    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", id)

    if (error) return err(error.message)
    revalidatePath("/agenda")
    revalidatePath("/confirmacao")
    return ok()
  } catch {
    return err("Erro ao confirmar agendamento")
  }
}

export async function rejectAppointment(id: string) {
  try {
    const { supabase } = await requireAuth()

    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)

    if (error) return err(error.message)
    revalidatePath("/agenda")
    revalidatePath("/confirmacao")
    return ok()
  } catch {
    return err("Erro ao rejeitar agendamento")
  }
}

export async function updateAppointment(formData: FormData) {
  try {
    const { supabase } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = appointmentUpdateSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { id, patient_id, dentist_id, procedure_id, start_time: startTimeLocal, end_time: endTimeLocal, notes, status, return_to_id } = parsed.data

    const startTime = new Date(startTimeLocal).toISOString()
    const endTime = endTimeLocal ? new Date(endTimeLocal).toISOString() : startTime

    const conflict = await checkOverlap(supabase, dentist_id, startTime, endTime, id)
    if (conflict) return err(conflict)

    const blocked = await checkBlockedSlot(supabase, dentist_id, startTime, endTime)
    if (blocked) return err(blocked)

    const clinicError = await checkClinicHours(supabase, startTime, endTime, parsed.data.start_time, parsed.data.end_time || parsed.data.start_time)
    if (clinicError) return err(clinicError)

    const { error } = await supabase
      .from("appointments")
      .update({
        patient_id,
        dentist_id,
        procedure_id: procedure_id || null,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        status: status || "pending",
        return_to_id: return_to_id || null,
      })
      .eq("id", id)

    if (error) return err(error.message)
    revalidatePath("/agenda")
    return ok()
  } catch {
    return err("Erro ao atualizar agendamento")
  }
}

export async function deleteAppointment(formData: FormData) {
  try {
    const { supabase } = await requireAuth()
    const raw = Object.fromEntries(formData)
    const parsed = z.object({ id: z.string().uuid() }).safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { error } = await supabase.from("appointments").delete().eq("id", parsed.data.id)
    if (error) return err(error.message)
    revalidatePath("/agenda")
    return ok()
  } catch {
    return err("Erro ao excluir agendamento")
  }
}

"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { certificateSchema, certificateUpdateSchema } from "@/lib/schemas/certificates"
import { ok, err } from "@/lib/utils/action-response"
import { getUserDentistFilter } from "@/lib/utils/access-filter"
import { NULL_UUID } from "@/lib/utils/constants"

export async function getCertificates(page: number, pageSize: number, search?: string) {
  try {
    const { supabase } = await requireAuth()

    const dentistFilter = await getUserDentistFilter()

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("certificates")
      .select("id, title, created_at, patients(name), dentists(name)", { count: "exact" })
      .order("created_at", { ascending: false })

    if (dentistFilter !== null) {
      if (dentistFilter.length > 0) {
        query = query.in("dentist_id", dentistFilter)
      } else {
        query = query.in("dentist_id", [NULL_UUID])
      }
    }

    if (search) {
      query = query.or(`patients.name.ilike.%${search}%,title.ilike.%${search}%`)
    }

    const { data, count, error } = await query.range(from, to)

    if (error) return err(error.message)
    return ok({ data: data ?? [], total: count ?? 0 })
  } catch {
    return err("Erro ao buscar atestados")
  }
}

export async function getCertificate(id: string) {
  try {
    const { supabase } = await requireAuth()

    const { data, error } = await supabase
      .from("certificates")
      .select("id, title, patient_id, dentist_id, appointment_id, content, general_observations, created_at, updated_at, patients(name, phone), dentists(name, specialty, cro)")
      .eq("id", id)
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch {
    return err("Atestado não encontrado")
  }
}

export async function saveCertificate(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = certificateSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) return err("Perfil não encontrado")

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
      dentistId = parsed.data.dentist_id
    }

    const { data: inserted, error } = await supabase.from("certificates").insert({
      title: parsed.data.title,
      patient_id: parsed.data.patient_id,
      dentist_id: dentistId,
      appointment_id: parsed.data.appointment_id || null,
      content: parsed.data.content || "",
      general_observations: parsed.data.general_observations || "",
    }).select("id")

    if (error) return err(error.message)
    revalidatePath("/atestados")
    return ok(inserted?.[0] ?? null)
  } catch {
    return err("Erro ao salvar atestado")
  }
}

export async function updateCertificate(formData: FormData) {
  try {
    const { supabase } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = certificateUpdateSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { error } = await supabase
      .from("certificates")
      .update({
        title: parsed.data.title,
        patient_id: parsed.data.patient_id,
        dentist_id: parsed.data.dentist_id,
        appointment_id: parsed.data.appointment_id || null,
        content: parsed.data.content || "",
        general_observations: parsed.data.general_observations || "",
      })
      .eq("id", parsed.data.id)

    if (error) return err(error.message)
    revalidatePath("/atestados")
    return ok()
  } catch {
    return err("Erro ao atualizar atestado")
  }
}

export async function deleteCertificate(id: string) {
  try {
    const { supabase } = await requireAuth()

    const { error } = await supabase
      .from("certificates")
      .delete()
      .eq("id", id)

    if (error) return err(error.message)
    revalidatePath("/atestados")
    return ok()
  } catch {
    return err("Erro ao excluir atestado")
  }
}

export async function getCertificateDentistList() {
  try {
    const { supabase } = await requireAuth()

    let query = supabase
      .from("dentists")
      .select("id, name, cro")
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
    return ok(data ?? [])
  } catch {
    return err("Erro ao buscar dentistas")
  }
}

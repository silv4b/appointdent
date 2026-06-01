"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { ok, err } from "@/lib/utils/action-response"

export async function getReceptionistDentists(receptionistProfileId: string) {
  try {
    const { supabase } = await requireAuth()

    const { data } = await supabase
      .from("receptionist_dentists")
      .select("dentist_id")
      .eq("receptionist_id", receptionistProfileId)

    return ok(data?.map((r) => r.dentist_id) ?? [])
  } catch {
    return err("Erro ao buscar vínculos da secretária")
  }
}

export async function setReceptionistDentists(formData: FormData) {
  try {
    const { supabase } = await requireAuth()

    const receptionistId = formData.get("receptionist_id") as string
    const dentistIdsRaw = formData.get("dentist_ids") as string

    if (!receptionistId) return err("ID da secretária é obrigatório")

    const dentistIds: string[] = dentistIdsRaw ? JSON.parse(dentistIdsRaw) : []

    await supabase.from("receptionist_dentists").delete().eq("receptionist_id", receptionistId)

    if (dentistIds.length > 0) {
      const inserts = dentistIds.map((dentist_id) => ({
        receptionist_id: receptionistId,
        dentist_id,
      }))
      const { error } = await supabase.from("receptionist_dentists").insert(inserts)
      if (error) return err(error.message)
    }

    revalidatePath("/admin/usuarios")
    return ok()
  } catch {
    return err("Erro ao vincular secretária aos dentistas")
  }
}

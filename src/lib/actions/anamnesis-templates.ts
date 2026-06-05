"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { ok, err } from "@/lib/utils/action-response"
import { z } from "zod"

export async function getMyAnamnesisTemplates() {
  try {
    const { supabase, user } = await requireAuth()

    const { data: dentist } = await supabase
      .from("dentists")
      .select("id")
      .eq("profile_id", user.id)
      .single()

    if (!dentist) return err("Perfil de dentista não encontrado")

    const { data } = await supabase
      .from("anamnesis_templates")
      .select("*")
      .eq("dentist_id", dentist.id)
      .order("created_at", { ascending: false })

    return ok(data ?? [])
  } catch {
    return err("Erro ao buscar modelos")
  }
}

export async function createAnamnesisTemplate(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = z.object({
      name: z.string().min(1, "Informe um nome para o modelo"),
      fields: z.string().min(1),
    }).safeParse(raw)

    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const fields = JSON.parse(parsed.data.fields) as { label: string; description?: string; defaultContent?: string }[]
    if (fields.length === 0) return err("Adicione pelo menos um campo")

    const { data: dentist } = await supabase
      .from("dentists")
      .select("id")
      .eq("profile_id", user.id)
      .single()

    if (!dentist) return err("Perfil de dentista não encontrado")

    const { error } = await supabase.from("anamnesis_templates").insert({
      dentist_id: dentist.id,
      name: parsed.data.name,
      fields,
    })

    if (error) return err(error.message)
    revalidatePath("/minhas-anamneses")
    return ok()
  } catch {
    return err("Erro ao criar modelo")
  }
}

export async function deleteAnamnesisTemplate(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = z.object({
      id: z.string().uuid(),
    }).safeParse(raw)

    if (!parsed.success) return err("ID inválido")

    const { data: dentist } = await supabase
      .from("dentists")
      .select("id")
      .eq("profile_id", user.id)
      .single()

    if (!dentist) return err("Perfil de dentista não encontrado")

    const { error } = await supabase
      .from("anamnesis_templates")
      .delete()
      .eq("id", parsed.data.id)
      .eq("dentist_id", dentist.id)

    if (error) return err(error.message)
    revalidatePath("/minhas-anamnesis")
    return ok()
  } catch {
    return err("Erro ao excluir modelo")
  }
}

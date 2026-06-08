"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { ok, err } from "@/lib/utils/action-response"

export async function updateProfileName(name: string) {
  try {
    const { supabase, user } = await requireAuth()

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id)

    if (profileError) return err("Erro ao atualizar nome")

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { name },
    })

    if (metadataError) return err("Erro ao atualizar nome no auth")

    return ok()
  } catch (e) {
    if (e instanceof Error && e.name === "AuthError") return err("Não autenticado")
    return err("Erro ao atualizar perfil")
  }
}

export async function updateProfileEmail(email: string) {
  try {
    const { supabase } = await requireAuth()

    const { error } = await supabase.auth.updateUser({ email })

    if (error) return err("Erro ao atualizar email")

    return ok()
  } catch (e) {
    if (e instanceof Error && e.name === "AuthError") return err("Não autenticado")
    return err("Erro ao atualizar email")
  }
}

export async function updateProfilePassword(password: string) {
  try {
    const { supabase, user } = await requireAuth()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      if (error.message?.includes("same")) return err("A nova senha deve ser diferente da atual")
      return err("Erro ao atualizar senha")
    }

    await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id)

    return ok()
  } catch (e) {
    if (e instanceof Error && e.name === "AuthError") return err("Não autenticado")
    return err("Erro ao atualizar senha")
  }
}

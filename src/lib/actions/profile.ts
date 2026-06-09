"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { ok, err } from "@/lib/utils/action-response"
import { checkEmailRateLimit } from "@/lib/utils/rate-limit"
import { sendPasswordChangedEmail } from "@/lib/email"
import { getEmailConfig } from "@/lib/actions/config"

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

export async function updateAutoConfirm(value: boolean) {
  try {
    const { supabase, user } = await requireAuth()

    const { data: dentist } = await supabase
      .from("dentists")
      .select("id")
      .eq("profile_id", user.id)
      .single()

    if (!dentist) return err("Perfil de dentista não encontrado")

    const { error } = await supabase
      .from("dentists")
      .update({ auto_confirm: value })
      .eq("id", dentist.id)

    if (error) return err(error.message)
    return ok()
  } catch (e) {
    if (e instanceof Error && e.name === "AuthError") return err("Não autenticado")
    return err("Erro ao atualizar configuração")
  }
}

export async function updateProfilePassword(password: string) {
  try {
    const { supabase, user } = await requireAuth()

    const allowed = await checkEmailRateLimit(user.email ?? user.id, "password_change")
    if (!allowed) {
      return err("Muitas tentativas de alteração de senha. Tente novamente em 15 minutos.")
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      if (error.message?.includes("same")) return err("A nova senha deve ser diferente da atual")
      return err("Erro ao atualizar senha")
    }

    await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id)

    try {
      const emailConfig = await getEmailConfig()
      if (emailConfig) {
        const name = user.user_metadata?.name as string | undefined
        await sendPasswordChangedEmail({
          to: user.email!,
          name: name ?? "Usuário",
          ...emailConfig,
        })
      }
    } catch (e) {
      console.error("Failed to send password changed email:", e)
    }

    return ok()
  } catch (e) {
    if (e instanceof Error && e.name === "AuthError") return err("Não autenticado")
    return err("Erro ao atualizar senha")
  }
}

"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { createUserSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { z } from "zod"

export async function getUsers(page = 1, pageSize = 20) {
  try {
    const { supabase, user } = await requireAuth()

    const { data: profile, error: roleError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (roleError || profile?.role !== "admin") {
      return { data: [], total: 0, error: "Acesso negado" }
    }

    const { data: rpcData, error: rpcError } = await (supabase as any).rpc("listar_usuarios", {
      page_size: pageSize,
      page_num: page,
      caller_id: user.id,
    })

    if (!rpcError && rpcData) {
      const rows = rpcData as Array<{
        id: string
        name: string
        email: string
        role: string
        dentist_id: string | null
        created_at: string
        total: number
      }>
      return { data: rows, total: rows[0]?.total ?? 0 }
    }

    console.error("RPC listar_usuarios fallback:", rpcError)

    const offset = (page - 1) * pageSize

    const countResult = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    const { data: rows, error: rowsError } = await supabase
      .from("profiles")
      .select("id, name, role, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (rowsError) {
      return { data: [], total: 0, error: rowsError.message }
    }

    const data = (rows ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: "" as string,
      role: p.role,
      dentist_id: null as string | null,
      created_at: p.created_at,
    }))

    return { data, total: countResult.count ?? 0 }
  } catch (e) {
    console.error("getUsers exception:", e)
    return { data: [], total: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteUser(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = z.object({ userId: z.string().uuid() }).safeParse(raw)
    if (!parsed.success) return err("ID de usuário inválido")

    const { error } = await (supabase as any).rpc("excluir_usuario", {
      usuario_id: parsed.data.userId,
      caller_id: user.id,
    })

    if (error) return err(error.message)
    revalidatePath("/admin/usuarios")
    return ok()
  } catch {
    return err("Erro ao excluir usuário")
  }
}

export async function updateUser(formData: FormData) {
  try {
    const { supabase, user } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = z.object({
      userId: z.string().uuid(),
      name: z.string().min(1).max(200),
      email: z.string().email("Email inválido"),
      role: z.enum(["admin", "dentist", "receptionist"]),
      specialty: z.string().optional().nullable(),
      password: z.string().optional().nullable(),
      confirmPassword: z.string().optional().nullable(),
    }).refine((data) => {
      if (data.password && data.password !== data.confirmPassword) {
        return false
      }
      return true
    }, { message: "Senhas não conferem" }).safeParse(raw)

    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { error } = await (supabase as any).rpc("atualizar_usuario", {
      usuario_id: parsed.data.userId,
      caller_id: user.id,
      usuario_nome: parsed.data.name,
      usuario_role: parsed.data.role,
      nova_senha: parsed.data.password || null,
      especialidade: parsed.data.specialty || null,
      novo_email: parsed.data.email,
    })

    if (error) return err(error.message)
    revalidatePath("/admin/usuarios")
    return ok()
  } catch {
    return err("Erro ao editar usuário")
  }
}

export async function createUser(formData: FormData) {
  try {
    const { supabase } = await requireAuth()

    const raw = Object.fromEntries(formData)
    const parsed = createUserSchema.safeParse(raw)
    if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

    const { error } = await (supabase as any).rpc("criar_usuario", {
      usuario_email: parsed.data.email,
      usuario_senha: parsed.data.password,
      usuario_nome: parsed.data.name,
      usuario_role: parsed.data.role,
      especialidade: parsed.data.role === "dentist" ? (parsed.data.specialty ?? "") : null,
    })

    if (error) return err(error.message)
    revalidatePath("/admin/usuarios")
    return ok()
  } catch {
    return err("Erro ao criar usuário")
  }
}



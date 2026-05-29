"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { procedureRequestSchema } from "@/lib/schemas"
import { ok, err } from "@/lib/utils/action-response"
import { z } from "zod"

export async function createProcedureRequest(formData: FormData) {
  const { supabase } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = procedureRequestSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase.from("procedure_requests").insert({
    dentist_id: parsed.data.dentist_id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    duration_minutes: parsed.data.duration_minutes,
    price: parsed.data.price ?? null,
  })

  if (error) return err(error.message)
  revalidatePath("/meus-procedimentos")
  return ok()
}

export async function getPendingProcedureRequests() {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from("procedure_requests")
    .select(`
      *,
      dentist:dentist_id (
        id,
        name
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getMyProcedureRequests(dentistId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from("procedure_requests")
    .select("*")
    .eq("dentist_id", dentistId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function approveProcedureRequest(formData: FormData) {
  const { supabase, user } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().optional(),
    duration_minutes: z.coerce.number().int().min(1),
    price: z.coerce.number().min(0).nullable().optional(),
  }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { id, name, description, duration_minutes, price } = parsed.data

  const { data: approvalData } = await supabase
    .from("procedure_requests")
    .update({ status: "approved", admin_id: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("dentist_id")

  const req = approvalData?.[0]
  if (!req) return err("Solicitação não encontrada")

  const { data: procData, error: procError } = await supabase.from("procedures").insert({
    name,
    description: description || null,
    duration_minutes,
    price: price ?? null,
  }).select("id")

  if (procError) return err(procError.message)

  const newProcId = procData?.[0]?.id
  if (newProcId) {
    await supabase
      .from("procedure_requests")
      .update({ created_procedure_id: newProcId })
      .eq("id", id)

    await supabase.from("dentist_procedures").insert({
      dentist_id: req.dentist_id,
      procedure_id: newProcId,
      active: true,
      duration_minutes,
      price: price ?? null,
    })
  }

  revalidatePath("/admin/solicitacoes")
  revalidatePath("/meus-procedimentos")
  return ok()
}

export async function getAllProcedureRequests() {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from("procedure_requests")
    .select(`
      *,
      dentist:dentist_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false })

  const requests = data ?? []

  const adminIds = requests
    .map((r: any) => r.admin_id)
    .filter((id: string | null): id is string => id !== null)

  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", adminIds)

    const adminMap = new Map(admins?.map((a) => [a.id, a.name]) ?? [])

    return (requests as any[]).map((r) => ({
      ...r,
      admin: r.admin_id ? { id: r.admin_id, name: adminMap.get(r.admin_id) ?? null } : null,
    }))
  }

  return requests
}

export async function rejectProcedureRequest(formData: FormData) {
  const { supabase, user } = await requireAuth()

  const raw = Object.fromEntries(formData)
  const parsed = z.object({
    id: z.string().uuid(),
    rejection_reason: z.string().optional(),
  }).safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(", "))

  const { error } = await supabase
    .from("procedure_requests")
    .update({
      status: "rejected",
      admin_id: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.rejection_reason || null,
    })
    .eq("id", parsed.data.id)

  if (error) return err(error.message)
  revalidatePath("/admin/solicitacoes")
  revalidatePath("/meus-procedimentos")
  return ok()
}

"use server"

import { requireAuth } from "@/lib/supabase/guard"
import { revalidatePath } from "next/cache"
import { ok, err } from "@/lib/utils/action-response"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const n = (supabase: any) => supabase.from("notifications")

export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}) {
  const { supabase } = await requireAuth()

  const { error } = await n(supabase).insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data ?? {},
  })

  if (error) return err(error.message)
  return ok()
}

export async function getUnreadCount() {
  const { supabase, user } = await requireAuth()

  const { count } = await n(supabase)
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false)

  return count ?? 0
}

export async function getNotifications(page = 1, pageSize = 20) {
  const { supabase, user } = await requireAuth()

  const { data, count } = await n(supabase)
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  return { data: data ?? [], total: count ?? 0 }
}

export async function markAsRead(notificationId: string) {
  const { supabase } = await requireAuth()

  const { error } = await n(supabase)
    .update({ read: true })
    .eq("id", notificationId)

  if (error) return err(error.message)
  revalidatePath("/agenda")
  return ok()
}

export async function markAllAsRead() {
  const { supabase, user } = await requireAuth()

  const { error } = await n(supabase)
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false)

  if (error) return err(error.message)
  revalidatePath("/agenda")
  return ok()
}

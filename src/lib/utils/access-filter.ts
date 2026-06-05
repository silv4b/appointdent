import { requireAuth } from "@/lib/supabase/guard"

export async function getUserDentistFilter(): Promise<string[] | null> {
  try {
    const { supabase, user } = await requireAuth()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) return null

    if (profile.role === "admin") return null

    if (profile.role === "dentist") {
      const { data: dent } = await supabase
        .from("dentists")
        .select("id")
        .eq("profile_id", user.id)
        .single()

      return dent ? [dent.id] : []
    }

    if (profile.role === "receptionist") {
      const { data: links } = await supabase
        .from("receptionist_dentists")
        .select("dentist_id")
        .eq("receptionist_id", user.id)

      return links?.map((l) => l.dentist_id) ?? []
    }

    return null
  } catch {
    return null
  }
}


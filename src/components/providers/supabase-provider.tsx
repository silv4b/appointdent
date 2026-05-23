"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

type SupabaseContext = {
  user: User | null
  isLoading: boolean
}

const Context = createContext<SupabaseContext>({ user: null, isLoading: true })

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
      router.refresh()
    })

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return <Context.Provider value={{ user, isLoading }}>{children}</Context.Provider>
}

export const useSupabase = () => useContext(Context)

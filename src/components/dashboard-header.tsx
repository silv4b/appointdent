"use client"

import { Button } from "@/components/ui/button"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Bell, Menu, Moon, Plus, Search, Sun } from "lucide-react"
import { useEffect, useState } from "react"

interface DashboardHeaderProps {
  onMenuToggle?: () => void
}

export function DashboardHeader({ onMenuToggle }: DashboardHeaderProps) {
  const { user } = useSupabase()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const userName = user?.user_metadata?.name as string | undefined
  const userEmail = user?.email

  const initials = userName
    ? userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : userEmail
      ? userEmail[0].toUpperCase()
      : "?"

  return (
    <header className="sticky top-0 z-30">
      <div className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            onClick={() => onMenuToggle?.()}
          >
            <Menu className="h-4 w-4" />
          </button>
          {/* <div className="relative hidden h-9 w-72 items-center rounded-lg border border-input bg-muted/40 pl-9 pr-4 text-sm text-muted-foreground/50 sm:flex">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <span>Buscar...</span>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              Ctrl K
            </span>
          </div> */}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* <Link href="/agenda">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </Link> */}

          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <Bell className="h-4 w-4" />
            <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          </button>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}

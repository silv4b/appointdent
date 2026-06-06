"use client"

import { useSupabase } from "@/components/providers/supabase-provider"
import { useTheme } from "next-themes"
import { Bell, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react"

interface DashboardHeaderProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function DashboardHeader({ collapsed, onToggleCollapse }: DashboardHeaderProps) {
  const { user } = useSupabase()
  const { theme, setTheme } = useTheme()

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
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onToggleCollapse?.()}
            title={collapsed ? "Expandir sidebar" : "Retrair sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
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
            {theme === "dark" ? (
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

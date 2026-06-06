"use client"

import { useEffect, useState } from "react"
import { logout } from "@/lib/supabase/actions"
import { cn } from "@/lib/utils"
import { useSupabase } from "@/components/providers/supabase-provider"
import { getUserSessionData } from "@/lib/actions/session"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  PlaySquare,
  Shield,
  Stethoscope,
  Syringe,
  Users,
  X,
  Menu,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

type NavSection = {
  label: string
  items: NavItem[]
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return "U"
}

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useSupabase()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  useEffect(() => {
    getUserSessionData().then((result) => {
      if ("data" in result) setRole(result.data.role)
      else setRole(null)
    })
  }, [user])

  const userName = user?.user_metadata?.name as string | undefined
  const userEmail = user?.email ?? null
  const initials = getInitials(userName, userEmail)

  const isDentist = role === "dentist"
  const isReceptionist = role === "receptionist"
  const isAdmin = role === "admin"

  const navSections: NavSection[] = [
    {
      label: "Principal",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard as typeof LayoutDashboard },
        ...(isDentist || isAdmin
          ? [{ href: "/minha-agenda", label: "Minha Agenda", icon: Calendar as typeof LayoutDashboard }]
          : []
        ),
        { href: "/agenda", label: "Agenda Geral", icon: Calendar as typeof LayoutDashboard },
        ...(isDentist || isAdmin
          ? [{ href: "/atendimentos", label: "Atendimentos", icon: PlaySquare as typeof LayoutDashboard }]
          : []
        ),
      ],
    },
    {
      label: "Clínico",
      items: [
        { href: "/confirmacao", label: "Confirmação", icon: CheckCircle as typeof LayoutDashboard },
        { href: "/historico", label: "Histórico de Agendamentos", icon: Clock as typeof LayoutDashboard },
        { href: "/prescricao", label: "Receituário", icon: FileText as typeof LayoutDashboard },
        ...(isReceptionist && !isAdmin ? [] : [{ href: "/anamnese", label: "Anamnese", icon: BookOpen as typeof LayoutDashboard }]),
        ...(isDentist || isAdmin ? [
          { href: "/minhas-anamneses", label: "Minhas Anamneses", icon: FileText as typeof LayoutDashboard },
          { href: "/meus-procedimentos", label: "Meus Procedimentos", icon: Syringe as typeof LayoutDashboard },
        ] : []),
      ],
    },
    {
      label: "Financeiro",
      items: [
        { href: "/financeiro", label: "Financeiro", icon: DollarSign as typeof LayoutDashboard },
      ],
    },
    ...(isDentist && !isAdmin ? [] : [{
      label: "Cadastros",
      items: [
        { href: "/pacientes", label: "Pacientes", icon: Users as typeof LayoutDashboard },
        { href: "/dentistas", label: "Dentistas", icon: Stethoscope as typeof LayoutDashboard },
        ...(isReceptionist && !isAdmin ? [] : [{ href: "/procedimentos", label: "Procedimentos", icon: Syringe as typeof LayoutDashboard }]),
      ],
    }] as NavSection[]),
    ...(isDentist && !isAdmin ? [] : [{
      label: "Configurações",
      items: [
        { href: "/horarios", label: "Grade de Horários", icon: Clock as typeof LayoutDashboard },
        ...(isReceptionist && !isAdmin ? [] : [
          { href: "/admin/usuarios", label: "Usuários", icon: Shield as typeof LayoutDashboard },
          { href: "/admin/solicitacoes", label: "Solicitações", icon: ClipboardList as typeof LayoutDashboard },
        ]),
      ],
    }] as NavSection[]),
  ]

  function NavItem({ href, label, icon: Icon }: NavItem) {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className={cn(
          "truncate transition-all duration-300",
          collapsed && !mobileOpen ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100",
        )}>{label}</span>
      </Link>
    )
  }

  const sidebarContent = (
    <>
      <Link href="/" className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4 no-underline">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <Image src="/assets/tooth-icon.png" alt="Ícone" width={24} height={24} />
        </div>
        <span className={cn(
          "truncate font-bold tracking-tight transition-all duration-300",
          collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100",
        )}>
          <span className="text-sidebar-foreground/60">APPOINT</span>
          <span className="text-sidebar-primary">DENT</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {role === null ? (
          <div className="space-y-2 px-3">
            <div className={cn("h-3 w-20 animate-pulse rounded bg-sidebar-foreground/10", collapsed && "hidden")} />
            <div className={cn("h-8 w-full animate-pulse rounded bg-sidebar-foreground/10", collapsed && "hidden")} />
            <div className={cn("h-8 w-full animate-pulse rounded bg-sidebar-foreground/10", collapsed && "hidden")} />
            <div className={cn("mt-6 h-3 w-16 animate-pulse rounded bg-sidebar-foreground/10", collapsed && "hidden")} />
            <div className={cn("h-8 w-full animate-pulse rounded bg-sidebar-foreground/10", collapsed && "hidden")} />
          </div>
        ) : (
          navSections.map((section, idx) => (
            <div key={section.label}>
              {idx > 0 && (
                <div className={cn(
                  "mb-2 mt-2 border-t border-sidebar-border transition-opacity duration-300",
                  collapsed ? "opacity-40" : "opacity-0",
                )} />
              )}
              <div className={cn(
                "px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 transition-all duration-300",
                collapsed ? "h-0 opacity-0 overflow-hidden py-0" : "h-auto opacity-100",
              )}>
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem key={item.href} {...item} />
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/perfil"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg transition-colors hover:bg-sidebar-accent/50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
            {initials}
          </div>
          <div className={cn(
            "min-w-0 flex-1 transition-all duration-300",
            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100",
          )}>
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {userName ?? userEmail ?? "Usuário"}
            </p>
            {userEmail && (
              <p className="truncate text-xs text-sidebar-foreground/60">
                {userEmail}
              </p>
            )}
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={cn(
            "transition-all duration-300 truncate",
            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100",
          )}>Sair</span>
        </button>
      </div>

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair</DialogTitle>
            <DialogDescription>Tem certeza que deseja sair do sistema?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              Cancelar
            </Button>
            <form action={logout}>
              <Button type="submit" variant="destructive" onClick={() => setLogoutConfirmOpen(false)}>
                Sair
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-3 z-50 flex size-9 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground transition-colors hover:bg-sidebar-accent lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed && !mobileOpen ? "w-16" : "w-[17rem]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {mobileOpen && (
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
                <Syringe className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Odonto</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">Schedule</span>
            </div>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {mobileOpen ? (
          <>
            <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {navSections.map((section) => (
                <div key={section.label}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                    {section.label}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavItem key={item.href} {...item} />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-sidebar-border p-3">
              <Link
                href="/perfil"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg transition-colors hover:bg-sidebar-accent/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {userName ?? userEmail ?? "Usuário"}
                  </p>
                  {userEmail && (
                    <p className="truncate text-xs text-sidebar-foreground/60">{userEmail}</p>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => { setMobileOpen(false); setLogoutConfirmOpen(true) }}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </>
        ) : (
          sidebarContent
        )}
      </aside>
    </>
  )
}

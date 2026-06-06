"use client"

import { useSupabase } from "@/components/providers/supabase-provider"
import { getUserSessionData } from "@/lib/actions/session"
import { getDashboardStats } from "@/lib/actions/queries"
import { CalendarDays, DollarSign, Eye, Stethoscope, Syringe, Users } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"

import { format } from "date-fns"

type Stat = {
  label: string
  value: string
  change: string
  trend: "up" | "down"
  icon: typeof DollarSign
  chartColor: string
}

const quickLinks = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays, color: "bg-chart-1/10 text-chart-1" },
  { href: "/pacientes", label: "Pacientes", icon: Users, color: "bg-chart-2/10 text-chart-2" },
  { href: "/dentistas", label: "Dentistas", icon: Stethoscope, color: "bg-chart-3/10 text-chart-3" },
  { href: "/procedimentos", label: "Procedimentos", icon: Syringe, color: "bg-chart-4/10 text-chart-4" },
]

type RecentAppointment = {
  id: string
  patients: { name: string } | null
  dentists: { name: string } | null
  procedures: { name: string; color: string | null } | null
  start_time: string
  end_time: string
  status: string
}

export function DashboardClient() {
  const { user } = useSupabase()
  const [stats, setStats] = useState<Stat[]>([
    { label: "Agendamentos Hoje", value: "-", change: "", trend: "up", icon: CalendarDays, chartColor: "chart-1" },
    { label: "Pacientes Ativos", value: "-", change: "", trend: "up", icon: Users, chartColor: "chart-2" },
    { label: "Dentistas", value: "-", change: "", trend: "up", icon: Stethoscope, chartColor: "chart-3" },
    { label: "Procedimentos", value: "-", change: "", trend: "up", icon: Eye, chartColor: "chart-4" },
  ])
  const [appointments, setAppointments] = useState<RecentAppointment[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [dentistId, setDentistId] = useState<string | null>(null)
  const [receptionistDentistIds, setReceptionistDentistIds] = useState<string[]>([])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  useEffect(() => {
    getUserSessionData().then((result) => {
      if (!("data" in result)) return
      const { role, dentistId, receptionistDentistIds } = result.data
      setUserRole(role)
      if (role === "dentist" && dentistId) setDentistId(dentistId)
      else if (role === "receptionist") setReceptionistDentistIds(receptionistDentistIds)
    })
  }, [user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user || (userRole === "dentist" && !dentistId)) return
      const result = await getDashboardStats()
      if (cancelled) return
      if (!("data" in result)) return
      const { appointmentsToday, activePatients, activeDentists, activeProcedures, recentAppointments } = result.data
      setStats([
        { label: "Agendamentos Hoje", value: String(appointmentsToday), change: "", trend: "up", icon: CalendarDays, chartColor: "chart-1" },
        { label: "Pacientes Ativos", value: String(activePatients), change: "", trend: "up", icon: Users, chartColor: "chart-2" },
        { label: "Dentistas", value: String(activeDentists), change: "", trend: "up", icon: Stethoscope, chartColor: "chart-3" },
        { label: "Procedimentos", value: String(activeProcedures), change: "", trend: "up", icon: Syringe, chartColor: "chart-4" },
      ])
      setAppointments(recentAppointments as RecentAppointment[])
    })()
    return () => { cancelled = true }
  }, [user, userRole, dentistId, receptionistDentistIds])

  const userName = user?.user_metadata?.name as string | undefined

  const statusLabel: Record<string, string> = {
    pending: "Pendente",
    scheduled: "Agendado",
    confirmed: "Confirmado",
    in_progress: "Em Andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
  }

  const statusVariant: Record<string, string> = {
    pending: "bg-purple-100 text-purple-800",
    scheduled: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}{userName ? `, ${userName.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o resumo da clínica hoje.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const bgMap: Record<string, string> = {
            "chart-1": "bg-chart-1/10",
            "chart-2": "bg-chart-2/10",
            "chart-3": "bg-chart-3/10",
            "chart-4": "bg-chart-4/10",
          }
          const textMap: Record<string, string> = {
            "chart-1": "text-chart-1",
            "chart-2": "text-chart-2",
            "chart-3": "text-chart-3",
            "chart-4": "text-chart-4",
          }
          return (
            <div
              key={stat.label}
              className="group rounded-2xl border bg-card text-card-foreground transition-all duration-300 hover:border-primary/20"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <span className="text-3xl font-bold tracking-tight">
                      {stat.value}
                    </span>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${bgMap[stat.chartColor]}`}>
                    <Icon className={`h-6 w-6 ${textMap[stat.chartColor]}`} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href}>
              <div className="group cursor-pointer rounded-2xl border bg-card text-card-foreground transition-all duration-300 hover:border-primary/20">
                <div className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${link.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-base font-medium">{link.label}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border bg-card text-card-foreground col-span-full xl:col-span-8">
          <div className="flex items-center justify-between p-6 pb-3">
            <h3 className="text-base font-semibold tracking-tight">
              Agendamentos de Hoje
            </h3>
            <Link
              href="/agenda"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pl-6 text-start text-xs font-medium text-muted-foreground">
                    Paciente
                  </th>
                  <th className="pb-3 text-start text-xs font-medium text-muted-foreground">
                    Dentista
                  </th>
                  <th className="pb-3 text-start text-xs font-medium text-muted-foreground">
                    Procedimento
                  </th>
                  <th className="pb-3 text-start text-xs font-medium text-muted-foreground">
                    Horário
                  </th>
                  <th className="pb-3 pr-6 text-end text-xs font-medium text-muted-foreground">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Nenhum agendamento para hoje.
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr
                      key={a.id}
                      className="group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 pl-6">
                        <p className="text-sm font-medium">
                          {a.patients?.name ?? "-"}
                        </p>
                      </td>
                      <td className="py-4">
                        <p className="text-sm text-muted-foreground">
                          {a.dentists?.name ?? "-"}
                        </p>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {a.procedures?.color && (
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: a.procedures.color }}
                            />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {a.procedures?.name ?? "-"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(a.start_time), "HH:mm")} -{" "}
                          {format(new Date(a.end_time), "HH:mm")}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-end">
                        <span
                          className={`inline-flex items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium capitalize min-w-[7.5rem] ${statusVariant[a.status] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {statusLabel[a.status] ?? a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card text-card-foreground col-span-full xl:col-span-4">
          <div className="p-6 pb-3">
            <h3 className="text-base font-semibold tracking-tight">
              Acesso Rápido
            </h3>
          </div>
          <div className="space-y-1 px-4 pb-5">
            {(userRole === "dentist" ? [
              { href: "/minha-agenda", label: "Minha Agenda", desc: "Meus agendamentos" },
              { href: "/agenda", label: "Agenda Geral", desc: "Todos os agendamentos" },
              { href: "/meus-procedimentos", label: "Meus Procedimentos", desc: "Personalizar preços" },
              { href: "/pacientes", label: "Ver Pacientes", desc: "Lista de pacientes" },
            ] : [
              { href: "/agenda", label: "Ver Agenda do Dia", desc: "Agendamentos de hoje" },
              { href: "/pacientes", label: "Cadastrar Paciente", desc: "Novo paciente" },
              { href: "/dentistas", label: "Gerenciar Dentistas", desc: "Profissionais" },
              { href: "/horarios", label: "Grade de Horários", desc: "Disponibilidade" },
            ]).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

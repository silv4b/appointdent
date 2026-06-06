"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/data-table-pagination"
import { getMinhaAgendaAppointments } from "@/lib/actions/queries"
import { getUserSessionData } from "@/lib/actions/session"
import { Database } from "@/types/database"
import { format } from "date-fns"
import { Calendar, Clock, Loader2, Search, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: { name: string } | null
  procedures: { name: string; color: string | null; duration_minutes: number } | null
}

type Tab = "future" | "current" | "past"

const TAB_LABEL: Record<Tab, string> = {
  future: "Próximos",
  current: "Em Andamento",
  past: "Passados",
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Agendado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
]

export function MinhaAgendaClient() {
  const [dentistId, setDentistId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("future")
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const [patientSearch, setPatientSearch] = useState("")
  const [procedureSearch, setProcedureSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetch = useCallback(
    async (t?: Tab, p?: number, ps?: number) => {
      const activeTab = t ?? tab
      const pageNum = p ?? page
      const pageSizeNum = ps ?? pageSize

      setLoading(true)

      const result = await getMinhaAgendaAppointments({
        tab: activeTab,
        page: pageNum,
        pageSize: pageSizeNum,
        patientSearch: patientSearch || undefined,
        procedureSearch: procedureSearch || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        statusFilter: statusFilter !== "all" ? statusFilter : undefined,
      })

      if ("data" in result) {
        setAppointments(result.data.data as Appointment[])
        setTotal(result.data.total)
      } else {
        setAppointments([])
        setTotal(0)
      }
      setLoading(false)
    },
    [tab, page, pageSize, patientSearch, procedureSearch, dateFrom, dateTo, statusFilter],
  )

  useEffect(() => {
    getUserSessionData().then((result) => {
      if ("data" in result && result.data.dentistId) {
        setDentistId(result.data.dentistId)
      } else {
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    if (dentistId) {
      setLoading(true)
      ;(async () => {
        const result = await getMinhaAgendaAppointments({
          tab,
          page: 1,
          pageSize,
          patientSearch: patientSearch || undefined,
          procedureSearch: procedureSearch || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          statusFilter: statusFilter !== "all" ? statusFilter : undefined,
        })
        if ("data" in result) {
          setAppointments(result.data.data as Appointment[])
          setTotal(result.data.total)
        } else {
          setAppointments([])
          setTotal(0)
        }
        setLoading(false)
      })()
    }
  }, [tab, patientSearch, procedureSearch, dateFrom, dateTo, statusFilter, dentistId, pageSize])

  useEffect(() => {
    if (tab !== "current") {
      setLoading(true)
      ;(async () => {
        const result = await getMinhaAgendaAppointments({
          tab,
          page,
          pageSize,
          patientSearch: patientSearch || undefined,
          procedureSearch: procedureSearch || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          statusFilter: statusFilter !== "all" ? statusFilter : undefined,
        })
        if ("data" in result) {
          setAppointments(result.data.data as Appointment[])
          setTotal(result.data.total)
        } else {
          setAppointments([])
          setTotal(0)
        }
        setLoading(false)
      })()
    }
  }, [page, pageSize, tab, patientSearch, procedureSearch, dateFrom, dateTo, statusFilter])

  const handleTabChange = (newTab: Tab) => {
    if (newTab !== tab) {
      setTab(newTab)
      setPage(1)
    }
  }

  const handleFilterChange = () => {
    setPage(1)
  }

  const clearFilters = () => {
    setPatientSearch("")
    setProcedureSearch("")
    setDateFrom("")
    setDateTo("")
    setStatusFilter("all")
  }

  const hasActiveFilters = patientSearch || procedureSearch || dateFrom || dateTo || statusFilter !== "all"

  if (!dentistId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Calendar className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Perfil de dentista não encontrado</p>
        <p className="text-sm text-muted-foreground">Seu usuário não está vinculado a um dentista.</p>
      </div>
    )
  }

  const statusLabel: Record<string, string> = {
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Minha Agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos os seus agendamentos organizados por período.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex-1 min-w-45">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Paciente</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar paciente..."
              value={patientSearch}
              onChange={(e) => { setPatientSearch(e.target.value); handleFilterChange() }}
              className="pl-8 h-9"
            />
            {patientSearch && (
              <button
                onClick={() => setPatientSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-45">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Procedimento</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar procedimento..."
              value={procedureSearch}
              onChange={(e) => { setProcedureSearch(e.target.value); handleFilterChange() }}
              className="pl-8 h-9"
            />
            {procedureSearch && (
              <button
                onClick={() => setProcedureSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="w-45">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">De</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); handleFilterChange() }}
            className="h-9"
          />
        </div>
        <div className="w-45">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Até</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); handleFilterChange() }}
            className="h-9"
          />
        </div>
        <div className="w-45">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Situação</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v ?? "all"); handleFilterChange() }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos">
                {statusFilter === "all" ? "Todos" : STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 self-end"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border bg-muted/20 p-1 w-fit">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange(t)}
            className="px-4"
          >
            {TAB_LABEL[t]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          {hasActiveFilters ? (
            <>
              <Search className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">Nenhum resultado encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros para encontrar agendamentos.</p>
            </>
          ) : (
            <>
              {tab === "current" ? (
                <Clock className="h-12 w-12 text-muted-foreground" />
              ) : (
                <Calendar className="h-12 w-12 text-muted-foreground" />
              )}
              <p className="mt-4 text-lg font-medium">
                {tab === "future" && "Nenhum agendamento futuro"}
                {tab === "current" && "Nenhum agendamento em andamento"}
                {tab === "past" && "Nenhum agendamento passado"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "future" && "Você não possui agendamentos futuros."}
                {tab === "current" && "Você não possui agendamentos acontecendo agora."}
                {tab === "past" && "Você não possui agendamentos passados."}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            {tab === "future" && <Calendar className="h-4 w-4 text-muted-foreground" />}
            {tab === "current" && <Clock className="h-4 w-4 text-muted-foreground" />}
            {tab === "past" && <Clock className="h-4 w-4 text-muted-foreground" />}
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {TAB_LABEL[tab]}
            </h2>
            <span className="text-xs text-muted-foreground">({total})</span>
          </div>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.patients?.name ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.procedures?.color && (
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: a.procedures.color }} />
                        )}
                        <span className="text-sm text-muted-foreground">{a.procedures?.name ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(a.start_time), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      {format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium capitalize min-w-[7.5rem] ${statusVariant[a.status] ?? "bg-muted text-muted-foreground"}`}>
                        {statusLabel[a.status] ?? a.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/anamnese/${a.patient_id}?appointmentId=${a.id}`}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        Anamnese
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tab !== "current" && (
              <DataTablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => {
                  setPage(p)
                  fetch(tab, p, pageSize)
                }}
                onPageSizeChange={(s) => {
                  setPageSize(s)
                  setPage(1)
                  fetch(tab, 1, s)
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createAppointment,
  deleteAppointment,
  searchAppointmentsForReturn,
  updateAppointment,
} from "@/lib/actions/appointments"
import { quickCreatePatient } from "@/lib/actions/patients"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Database } from "@/types/database"
import { cn } from "@/lib/utils"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Trash2,
  UserPlus,
  List,
  Columns2,
  Grid2x2,
  CalendarRange,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react"
import {
  Calendar,
  dateFnsLocalizer,
  type CalendarProps,
  type SlotInfo,
  type EventPropGetter,
} from "react-big-calendar"
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop"
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop"
import "react-big-calendar/lib/addons/dragAndDrop/styles.css"
import "@/components/shadcn-big-calendar.css"

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: { name: string } | null
  dentists: { name: string } | null
  procedures: { name: string; color: string | null; duration_minutes: number } | null
}

type Dentist = Database["public"]["Tables"]["dentists"]["Row"]
type Patient = Database["public"]["Tables"]["patients"]["Row"]
type Procedure = Database["public"]["Tables"]["procedures"]["Row"]

interface CalendarEvent {
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: string
  appointment: Appointment
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  scheduled: "default",
  confirmed: "secondary",
  in_progress: "outline",
  completed: "outline",
  cancelled: "destructive",
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

type ViewType = "day" | "week" | "month" | "agenda"

const views: { type: ViewType; label: string; icon: typeof List }[] = [
  { type: "day", label: "Dia", icon: List },
  { type: "week", label: "Semana", icon: Columns2 },
  { type: "month", label: "Mês", icon: Grid2x2 },
  { type: "agenda", label: "Lista", icon: CalendarRange },
]

const localizer = dateFnsLocalizer({
  format,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay: (date: Date) => getDay(date),
  locales: { "pt-BR": ptBR },
})

const DnDCalendar = withDragAndDrop<CalendarEvent>(
  Calendar as ComponentType<CalendarProps<CalendarEvent>>
)

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function toDateTimeLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day}T${hh}:${mm}`
}

// ============================================================
// Appointment Dialog
// ============================================================
function QuickPatientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (patient: { id: string; name: string }) => void
}) {
  const [saving, setSaving] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
          <DialogDescription>Cadastro rápido para agendamento</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            const form = new FormData(e.currentTarget)
            const result = await quickCreatePatient(form)
            if ("error" in result) {
              toast.error(result.error)
            } else {
              onCreated(result.data)
              onOpenChange(false)
            }
            setSaving(false)
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-name">Nome</Label>
            <Input id="quick-name" name="name" placeholder="Nome completo" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-phone">Telefone</Label>
            <Input id="quick-phone" name="phone" type="tel" placeholder="(00) 00000-0000" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Return Appointment Dialog
// ============================================================
function ReturnDialog({
  open,
  onOpenChange,
  patients,
  dentists,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patients: { id: string; name: string }[]
  dentists: { id: string; name: string }[]
  onSelect: (appointment: Appointment) => void
}) {
  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`)
  const [patientId, setPatientId] = useState("")
  const [dentistId, setDentistId] = useState("")
  const [results, setResults] = useState<Appointment[]>([])
  const [searching, setSearching] = useState(false)

  const search = useCallback(async (pat?: string, dent?: string, m?: string) => {
    setSearching(true)
    const result = await searchAppointmentsForReturn({
      patient_id: pat || undefined,
      dentist_id: dent || undefined,
      month: m ?? month,
    })
    if ("data" in result && result.data) setResults(result.data)
    setSearching(false)
  }, [month])

  useEffect(() => {
    if (open) {
      setPatientId("")
      setDentistId("")
      setMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`)
      setResults([])
    }
  }, [open])

  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const monthLabel = (() => {
    const [y, m] = month.split("-").map(Number)
    return format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Marcar Retorno</DialogTitle>
          <DialogDescription>
            Selecione o agendamento original ao qual este retorno será vinculado
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Mês</Label>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-32 text-center text-sm font-medium capitalize">{monthLabel}</span>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" htmlFor="return-patient">Paciente</Label>
            <Select value={patientId} onValueChange={(v) => setPatientId(v ?? "")}>
              <SelectTrigger id="return-patient" className="h-8 w-44">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pacientes</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" htmlFor="return-dentist">Dentista</Label>
            <Select value={dentistId} onValueChange={(v) => setDentistId(v ?? "")}>
              <SelectTrigger id="return-dentist" className="h-8 w-44">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os dentistas</SelectItem>
                {dentists.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" onClick={() => search(patientId === "all" ? "" : patientId, dentistId === "all" ? "" : dentistId)}>
            Buscar
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Dentista</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead className="w-20 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searching ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Buscando...</TableCell>
                </TableRow>
              ) : results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Nenhum agendamento encontrado</TableCell>
                </TableRow>
              ) : (
                results.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(a.start_time), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="whitespace-nowrap">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</TableCell>
                    <TableCell>{a.patients?.name ?? "-"}</TableCell>
                    <TableCell>{a.dentists?.name ?? "-"}</TableCell>
                    <TableCell>{a.procedures?.name ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { onSelect(a); onOpenChange(false) }}>
                        Selecionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultHour,
  dentists,
  patients,
  procedures,
  onSave,
  onDelete,
  createdPatientId,
  onPatientCreated,
  returnToId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  defaultDate: string
  defaultHour: number
  dentists: Dentist[]
  patients: Patient[]
  procedures: Procedure[]
  onSave: (formData: FormData) => Promise<{ error?: string } | null | undefined>
  onDelete?: (id: string) => void
  createdPatientId?: string | null
  onPatientCreated?: (patient: { id: string; name: string }) => void
  returnToId?: string | null
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProcedure, setSelectedProcedure] = useState(appointment?.procedure_id ?? "")
  const [quickPatientOpen, setQuickPatientOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [patientSearch, setPatientSearch] = useState("")
  const [dentistSearch, setDentistSearch] = useState("")
  const [procedureSearch, setProcedureSearch] = useState("")
  const patientSearchRef = useRef<HTMLInputElement>(null)
  const dentistSearchRef = useRef<HTMLInputElement>(null)
  const procedureSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPatientSearch("")
      setDentistSearch("")
      setProcedureSearch("")
    }
  }, [open])

  const defaultStart = appointment
    ? toDateTimeLocal(new Date(appointment.start_time))
    : `${defaultDate}T${String(defaultHour).padStart(2, "0")}:00`

  const getDefaultEnd = () => {
    if (appointment) return toDateTimeLocal(new Date(appointment.end_time))
    return `${defaultDate}T${String(defaultHour + 1).padStart(2, "0")}:00`
  }

  useEffect(() => {
    setSelectedProcedure(appointment?.procedure_id ?? "")
  }, [appointment])

  const selectedProc = procedures.find((p) => p.id === selectedProcedure)
  const filteredPatients = patients.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
  const filteredDentists = dentists.filter((d) => d.name.toLowerCase().includes(dentistSearch.toLowerCase()))
  const filteredProcedures = procedures.filter((p) => p.name.toLowerCase().includes(procedureSearch.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={(v) => { setError(null); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          <DialogDescription>
            {appointment ? "Atualize os dados do agendamento" : "Preencha os dados para agendar"}
          </DialogDescription>
        </DialogHeader>
        <form
          key={appointment?.id ?? `new-${createdPatientId ?? ""}`}
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            setError(null)
            const form = new FormData(e.currentTarget)
            const result = await onSave(form)
            if (result?.error) setError(result.error)
            else onOpenChange(false)
            setSaving(false)
          }}
          className="flex flex-col gap-4"
        >
          {appointment && <input type="hidden" name="id" value={appointment.id} />}
          {returnToId && <input type="hidden" name="return_to_id" value={returnToId} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="patient_id">Paciente</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    name="patient_id"
                    defaultValue={appointment?.patient_id ?? createdPatientId ?? ""}
                    required
                    itemToStringLabel={(value) => patients.find((p) => p.id === value)?.name ?? String(value)}
                    onOpenChangeComplete={(open) => {
                      if (open) setTimeout(() => patientSearchRef.current?.focus(), 30)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <div onPointerDown={(e) => e.stopPropagation()} className="px-1 pb-1 pt-0.5">
                        <Input
                          ref={patientSearchRef}
                          placeholder="Pesquisar paciente..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return
                            e.stopPropagation()
                          }}
                          autoFocus
                          className="h-7 text-xs"
                        />
                      </div>
                      {filteredPatients.length > 0 ? filteredPatients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      )) : (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">Nenhum paciente encontrado</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {!appointment && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setQuickPatientOpen(true)} title="Cadastrar novo paciente">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dentist_id">Dentista</Label>
              <Select
                name="dentist_id"
                defaultValue={appointment?.dentist_id ?? ""}
                required
                itemToStringLabel={(value) => dentists.find((d) => d.id === value)?.name ?? String(value)}
                onOpenChangeComplete={(open) => {
                  if (open) setTimeout(() => dentistSearchRef.current?.focus(), 30)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                    <div onPointerDown={(e) => e.stopPropagation()} className="px-1 pb-1 pt-0.5">
                      <Input
                        ref={dentistSearchRef}
                        placeholder="Pesquisar dentista..."
                        value={dentistSearch}
                        onChange={(e) => setDentistSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return
                          e.stopPropagation()
                        }}
                        autoFocus
                        className="h-7 text-xs"
                      />
                    </div>
                  {filteredDentists.length > 0 ? filteredDentists.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  )) : (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">Nenhum dentista encontrado</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="procedure_id">Procedimento</Label>
            <Select
              name="procedure_id"
              value={selectedProcedure}
              onValueChange={(v) => setSelectedProcedure(v ?? "")}
              itemToStringLabel={(value) => procedures.find((p) => p.id === value)?.name ?? String(value)}
              onOpenChangeComplete={(open) => {
                if (open) setTimeout(() => procedureSearchRef.current?.focus(), 30)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                  <div onPointerDown={(e) => e.stopPropagation()} className="px-1 pb-1 pt-0.5">
                    <Input
                      ref={procedureSearchRef}
                      placeholder="Pesquisar procedimento..."
                      value={procedureSearch}
                      onChange={(e) => setProcedureSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return
                        e.stopPropagation()
                      }}
                      autoFocus
                      className="h-7 text-xs"
                    />
                  </div>
                {filteredProcedures.length > 0 ? filteredProcedures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.duration_minutes}min)
                  </SelectItem>
                )) : (
                  <div className="px-2 py-3 text-center text-xs text-muted-foreground">Nenhum procedimento encontrado</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_time">Início</Label>
              <Input id="start_time" name="start_time" type="datetime-local" defaultValue={defaultStart} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input id="end_time" name="end_time" type="datetime-local" defaultValue={getDefaultEnd()} />
              {selectedProc && (
                <p className="text-xs text-muted-foreground">~{selectedProc.duration_minutes}min</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" placeholder="Observações" defaultValue={appointment?.notes ?? ""} className="resize-none" rows={2} />
          </div>

          {appointment && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={appointment.status}
                itemToStringLabel={(value) => STATUS_LABELS[value as string] ?? String(value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <DialogFooter className="gap-2">
            {appointment && (
              <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="mr-1 h-3 w-3" />
                Excluir
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : appointment ? "Atualizar" : "Agendar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Excluir Agendamento"
        description="Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (appointment) { onDelete?.(appointment.id); onOpenChange(false) } }}
      />

      <QuickPatientDialog
        open={quickPatientOpen}
        onOpenChange={setQuickPatientOpen}
        onCreated={(patient) => {
          onPatientCreated?.(patient)
        }}
      />
    </Dialog>
  )
}

// ============================================================
// Mini Calendar (sidebar)
// ============================================================
function MiniCalendar({ currentDate, onSelect }: { currentDate: Date; onSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(currentDate))

  useEffect(() => {
    setViewMonth(startOfMonth(currentDate))
  }, [currentDate])

  const days = eachDayOfInterval({
    start: startOfWeek(viewMonth),
    end: endOfWeek(endOfMonth(viewMonth)),
  })

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{format(viewMonth, "MMMM yyyy", { locale: ptBR })}</span>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center">
        {dayNames.map((name) => (
          <div key={name} className="py-1 text-[11px] font-medium text-muted-foreground">
            {name}
          </div>
        ))}
        {days.map((day, i) => {
          const isSelected = isSameDay(day, currentDate)
          const isCurrentMonth = isSameMonth(day, viewMonth)
          const isCurrentDay = isToday(day)
          return (
            <button
              key={i}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isCurrentDay && isCurrentMonth
                    ? "border border-primary text-primary"
                    : isCurrentMonth
                      ? "text-foreground hover:bg-accent"
                      : "text-muted-foreground/30",
              )}
              onClick={() => { onSelect(day); setViewMonth(startOfMonth(day)) }}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Main Agenda Client
// ============================================================
export function AgendaClient() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDentist, setSelectedDentist] = useState<string>("all")
  const [view, setView] = useLocalStorage<ViewType>("agenda:view", "day")
  const [loading, setLoading] = useState(true)

  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnToId, setReturnToId] = useState<string | null>(null)
  const [clickedHour, setClickedHour] = useState(8)
  const [clickedDate, setClickedDate] = useState(toDateInput(new Date()))
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage("agenda:sidebarCollapsed", false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data: profile }) => {
        if (profile?.role === "dentist") {
          supabase.from("dentists").select("id").eq("profile_id", user.id).single().then(({ data: dentist }) => {
            if (dentist) setSelectedDentist(dentist.id)
          })
        }
      })
    })
  }, [])

  const fetchRange = useCallback(async (start: Date, end: Date) => {
    const supabase = createClient()
    const startStr = toDateInput(start)
    const endStr = toDateInput(end)

    const [appointmentsData, dentistsData, patientsData, proceduresData] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
        .gte("start_time", `${startStr}T00:00:00Z`)
        .lte("start_time", `${endStr}T23:59:59Z`)
        .order("start_time")
        .then((r) => r.data as Appointment[] ?? []),
      supabase.from("dentists").select("*").order("name").then((r) => r.data ?? []),
      supabase.from("patients").select("*").order("name").then((r) => r.data ?? []),
      supabase.from("procedures").select("*").order("name").then((r) => r.data ?? []),
    ])

    setAppointments(appointmentsData)
    setDentists(dentistsData)
    setPatients(patientsData)
    setProcedures(proceduresData)
    setLoading(false)
  }, [])

  const getVisibleRange = useCallback((date: Date, v: string) => {
    if (v === "month") {
      return {
        start: startOfWeek(startOfMonth(date)),
        end: endOfWeek(endOfMonth(date)),
      }
    }
    if (v === "week") {
      return {
        start: startOfWeek(date, { weekStartsOn: 0 }),
        end: endOfWeek(date, { weekStartsOn: 0 }),
      }
    }
    return { start: date, end: date }
  }, [])

  const refreshData = useCallback(() => {
    const range = getVisibleRange(currentDate, view)
    fetchRange(range.start, range.end)
  }, [currentDate, view, fetchRange, getVisibleRange])

  useEffect(() => {
    setLoading(true)
    refreshData()
  }, [refreshData])

  const events = useMemo(() => {
    const eventList = selectedDentist === "all"
      ? appointments
      : appointments.filter((a) => a.dentist_id === selectedDentist)

    return eventList.map((a) => ({
      title: a.patients?.name ?? "Sem nome",
      start: new Date(a.start_time),
      end: new Date(a.end_time),
      resource: a.dentist_id,
      appointment: a,
    }))
  }, [appointments, selectedDentist])

  const handleCreate = (hour: number) => {
    setEditAppointment(null)
    setCreatedPatientId(null)
    setReturnToId(null)
    setClickedHour(hour)
    setClickedDate(toDateInput(currentDate))
    setDialogOpen(true)
  }

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setEditAppointment(null)
    setCreatedPatientId(null)
    setReturnToId(null)
    setClickedDate(toDateInput(slotInfo.start))
    setClickedHour(slotInfo.start.getHours())
    setDialogOpen(true)
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    const a = event.appointment
    setEditAppointment(a)
    setCreatedPatientId(null)
    setReturnToId(null)
    setClickedHour(new Date(a.start_time).getHours())
    setClickedDate(toDateInput(new Date(a.start_time)))
    setDialogOpen(true)
  }, [])

  const handleSave = async (formData: FormData) => {
    const result = editAppointment
      ? await updateAppointment(formData)
      : await createAppointment(formData)
    if (!result?.error) {
      toast.success(editAppointment ? "Agendamento atualizado" : "Agendamento criado")
      setReturnToId(null)
      setDialogOpen(false)
      refreshData()
    } else {
      toast.error(result.error)
    }
    return result
  }

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    const result = await deleteAppointment(form)
    if (result?.error) toast.error(result.error)
    else toast.success("Agendamento excluído")
    refreshData()
  }

  const buildFormData = (appt: Appointment, start: string | Date, end: string | Date): FormData => {
    const form = new FormData()
    form.set("id", appt.id)
    form.set("patient_id", appt.patient_id)
    form.set("dentist_id", appt.dentist_id)
    form.set("procedure_id", appt.procedure_id ?? "")
    form.set("start_time", toDateTimeLocal(new Date(start)))
    form.set("end_time", toDateTimeLocal(new Date(end)))
    form.set("notes", appt.notes ?? "")
    form.set("status", appt.status)
    return form
  }

  const handleEventDrop = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
    const form = buildFormData(event.appointment, start, end)
    const result = await updateAppointment(form)
    if (!result?.error) {
      toast.success("Agendamento movido")
      refreshData()
    } else {
      toast.error(result.error)
    }
  }, [refreshData])

  const handleEventResize = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
    const form = buildFormData(event.appointment, start, end)
    const result = await updateAppointment(form)
    if (!result?.error) {
      toast.success("Agendamento redimensionado")
      refreshData()
    } else {
      toast.error(result.error)
    }
  }, [refreshData])

  const defaultColor = "#3b82f6"

  function hexToRgba(hex: string, alpha: number) {
    const c = hex.replace("#", "")
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const eventPropGetter: EventPropGetter<CalendarEvent> = useCallback((event) => {
    const color = event.appointment.procedures?.color ?? defaultColor
    return {
      style: {
        backgroundColor: hexToRgba(color, 0.25),
        border: `1px solid ${color}`,
        borderLeft: `3px solid ${color}`,
      } as React.CSSProperties,
    }
  }, [])

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: string) => {
    setView(newView as ViewType)
  }, [])

  const goToday = () => setCurrentDate(new Date())
  const goPrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1))
    else if (view === "week") setCurrentDate(subDays(currentDate, 7))
    else setCurrentDate(subDays(currentDate, 1))
  }
  const goNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1))
    else if (view === "week") setCurrentDate(addDays(currentDate, 7))
    else setCurrentDate(addDays(currentDate, 1))
  }

  const dateDisplay = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR })
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = addDays(start, 6)
      return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`
    }
    return format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }, [currentDate, view])

  const handleDateSelect = (d: Date) => {
    setCurrentDate(d)
    setView("day")
  }

  const dayAppointments = useMemo(() => {
    const dayStr = toDateInput(currentDate)
    const filtered = selectedDentist === "all"
      ? appointments
      : appointments.filter((a) => a.dentist_id === selectedDentist)
    const dayAppts = filtered.filter((a) => a.start_time.startsWith(dayStr))
    const current = new Date()

    return {
      past: dayAppts.filter((a) => new Date(a.end_time) < current),
      current: dayAppts.filter((a) => {
        const start = new Date(a.start_time)
        const end = new Date(a.end_time)
        return start <= current && end >= current
      }),
      future: dayAppts.filter((a) => new Date(a.start_time) > current),
    }
  }, [appointments, currentDate, selectedDentist])

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-stretch justify-between gap-3">
          <div className="inline-flex rounded-lg border bg-background p-0.5 shadow-sm">
            {views.map((v) => {
              const Icon = v.icon
              const isActive = view === v.type
              return (
                <button
                  key={v.type}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setView(v.type)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-stretch gap-2">
            <Button className="h-full" onClick={() => handleCreate(8)}>
              <Plus className="h-4 w-4" />
              Adicionar Evento
            </Button>
            <Button className="h-full" variant="outline" onClick={() => setReturnDialogOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Marcar Retorno
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="min-w-20">
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium capitalize" suppressHydrationWarning>{dateDisplay}</span>

          <Select value={selectedDentist} onValueChange={(v) => setSelectedDentist(v ?? "all")} itemToStringLabel={(value) => value === "all" ? "Todos os dentistas" : dentists.find((d) => d.id === value)?.name ?? String(value)}>
            <SelectTrigger className="ml-auto h-8 w-44">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dentistas</SelectItem>
              {dentists.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex h-96 flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex gap-2">
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              <div className="ml-auto h-8 w-32 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="flex-1 rounded-lg bg-muted/50" />
            <div className="flex gap-3">
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : (
          <>
            <DnDCalendar
              localizer={localizer}
              events={events}
              view={view as "day" | "week" | "month" | "agenda"}
              date={currentDate}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              selectable
              resizable
              draggableAccessor={() => true}
              resizableAccessor={() => true}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventPropGetter}
              views={["month", "week", "day", "agenda"]}
              step={15}
              timeslots={4}
              scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
              className="rounded-xl border bg-card"
              style={{ height: 750 }}
              messages={{
                today: "Hoje",
                previous: "Anterior",
                next: "Próximo",
                month: "Mês",
                week: "Semana",
                day: "Dia",
                agenda: "Lista",
                date: "Data",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Nenhum agendamento neste período.",
                showMore: (total) => `+${total} mais`,
              }}
              formats={{
                monthHeaderFormat: "MMMM 'de' yyyy",
                dayHeaderFormat: "dd 'de' MMMM 'de' yyyy",
                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`,
                timeGutterFormat: "HH:mm",
                agendaDateFormat: "dd 'de' MMMM",
                agendaTimeFormat: "HH:mm",
                eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
              }}
              components={{
                event: ({ event }) => (
                  <div className="overflow-hidden p-0.5">
                    <div className="truncate text-xs font-medium leading-tight">
                      {event.appointment.patients?.name}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {format(new Date(event.start), "HH:mm")}
                    </div>
                  </div>
                ),
              }}
            />
          </>
        )}

        <AppointmentDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o)
            if (!o) { setEditAppointment(null); setCreatedPatientId(null); setReturnToId(null) }
          }}
          appointment={editAppointment}
          defaultDate={clickedDate}
          defaultHour={clickedHour}
          dentists={dentists}
          patients={patients}
          procedures={procedures}
          onSave={handleSave}
          onDelete={handleDelete}
          createdPatientId={createdPatientId}
          onPatientCreated={({ id, name }) => {
            setPatients((prev) => [...prev, { id, name, cpf: null, phone: null, birth_date: null, notes: null, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Patient])
            setCreatedPatientId(id)
          }}
          returnToId={returnToId}
        />

        <ReturnDialog
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
          patients={patients}
          dentists={dentists}
          onSelect={(appt) => {
            setEditAppointment(null)
            setCreatedPatientId(null)
            setReturnToId(appt.id)
            setClickedDate(toDateInput(new Date(appt.start_time)))
            setClickedHour(new Date(appt.start_time).getHours())
            setDialogOpen(true)
          }}
        />
      </div>

      <aside className={cn("hidden shrink-0 transition-all duration-200 md:block", sidebarCollapsed ? "w-12" : "w-64")}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-3">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              onClick={() => setSidebarCollapsed(false)}
              title="Expandir sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div className="h-px w-6 bg-border" />
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              onClick={() => handleDateSelect(currentDate)}
              title="Calendário"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
            <div className="h-px w-6 bg-border" />
            {dayAppointments.current.length > 0 && (
              <span className="relative flex h-2.5 w-2.5" title="Evento acontecendo agora">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            )}
          </div>
        ) : (
            <div className="divide-y rounded-xl border bg-card">
            <div className="flex items-center justify-end p-2">
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                onClick={() => setSidebarCollapsed(true)}
                title="Retrair sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <MiniCalendar currentDate={currentDate} onSelect={handleDateSelect} />
            <div className="divide-y p-4">
              {dayAppointments.past.length > 0 && (
                <div className="pb-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Passados</p>
                  {dayAppointments.past.map((a) => (
                    <div key={a.id} className="py-1.5">
                      <p className="text-sm font-medium">{a.patients?.name}</p>
                      <p className="text-xs text-muted-foreground">{a.dentists?.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className={cn(dayAppointments.past.length > 0 && "pt-3", dayAppointments.future.length > 0 && "pb-3")}>
                <div className="flex items-center gap-2 mb-2">
                  {dayAppointments.current.length > 0 ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                      </span>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Acontecendo Agora</p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atual</p>
                  )}
                </div>
                {dayAppointments.current.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum evento no momento</p>
                ) : (
                  dayAppointments.current.map((a) => (
                    <div key={a.id} className="py-1.5">
                      <p className="text-sm font-medium">{a.patients?.name}</p>
                      <p className="text-xs text-muted-foreground">{a.dentists?.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                    </div>
                  ))
                )}
              </div>
              {dayAppointments.future.length > 0 && (
                <div className="pt-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Futuros</p>
                  {dayAppointments.future.map((a) => (
                    <div key={a.id} className="py-1.5">
                      <p className="text-sm font-medium">{a.patients?.name}</p>
                      <p className="text-xs text-muted-foreground">{a.dentists?.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                    </div>
                  ))}
                </div>
              )}
              {dayAppointments.past.length === 0 && dayAppointments.current.length === 0 && dayAppointments.future.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum agendamento para este dia</p>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

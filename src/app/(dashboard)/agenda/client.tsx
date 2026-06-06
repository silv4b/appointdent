"use client"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EventTooltip } from "@/components/event-tooltip"
import { MiniCalendar } from "@/components/mini-calendar"
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
  getAgendaData,
  searchAppointmentsForReturn,
  updateAppointment,
} from "@/lib/actions/appointments"
import { quickCreatePatient } from "@/lib/actions/patients"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { getUserSessionData } from "@/lib/actions/session"
import { getClinicHours } from "@/lib/actions/queries"
import { toast } from "sonner"
import { Database } from "@/types/database"
import { cn } from "@/lib/utils"
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
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
import TimeGrid from "react-big-calendar/lib/TimeGrid"

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: { name: string } | null
  dentists: { name: string } | null
  procedures: { name: string; color: string | null; duration_minutes: number } | null
}

type Dentist = { id: string; name: string }
type Patient = { id: string; name: string }
type Procedure = { id: string; name: string; color: string | null; duration_minutes: number }

interface CalendarEvent {
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: string
  appointment: Appointment
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
}

type ViewType = "day" | "week" | "month" | "agenda" | "threeDay"

const views: { type: ViewType; label: string; icon: typeof List }[] = [
  { type: "day", label: "Dia", icon: List },
  { type: "threeDay", label: "3 Dias", icon: Columns2 },
  { type: "week", label: "Semana", icon: Grid2x2 },
  { type: "month", label: "Mês", icon: CalendarDays },
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

function appendTimezone(val: string): string {
  const offset = -new Date().getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const tz = `${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`
  return `${val}${tz}`
}

// ============================================================
// ThreeDay View (custom view for react-big-calendar)
// ============================================================
type LocalizerType = ReturnType<typeof dateFnsLocalizer>

function ThreeDayView({ date, localizer: loc, min, max, scrollToTime, enableAutoScroll, ...props }: {
  date: Date
  localizer: LocalizerType
  min?: Date
  max?: Date
  scrollToTime?: Date
  enableAutoScroll?: boolean
  [key: string]: unknown
}) {
  const range = ThreeDayView.range(date, { localizer: loc })
  return (
    <TimeGrid
      {...props}
      range={range}
      eventOffset={15}
      localizer={loc}
      min={min ?? loc.startOf(new Date(), 'day')}
      max={max ?? loc.endOf(new Date(), 'day')}
      scrollToTime={scrollToTime ?? loc.startOf(new Date(), 'day')}
      enableAutoScroll={enableAutoScroll ?? true}
    />
  )
}

ThreeDayView.range = (date: Date, { localizer: loc }: { localizer: LocalizerType }) => {
  const start = loc.add(date, -1, 'day')
  const end = loc.add(date, 1, 'day')
  return loc.range(start, end)
}

ThreeDayView.navigate = (date: Date, action: string, { localizer: loc }: { localizer: LocalizerType }) => {
  switch (action) {
    case 'PREV':
      return loc.add(date, -3, 'day')
    case 'NEXT':
      return loc.add(date, 3, 'day')
    default:
      return date
  }
}

ThreeDayView.title = (date: Date, { localizer: loc }: { localizer: LocalizerType }) => {
  const range = ThreeDayView.range(date, { localizer: loc })
  const start = range[0]
  const end = range[range.length - 1]
  return `${loc.format(start, 'dd/MM')} - ${loc.format(end, 'dd/MM')}`
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
  onCreated: (patient: { id: string; name: string; email: string | null }) => void
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-email">Email</Label>
            <Input id="quick-email" name="email" type="email" placeholder="paciente@exemplo.com" />
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
      const d = new Date()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPatientId("")
      setDentistId("")
      setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
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
  dentistProcedureMap,
  onSave,
  onDelete,
  onCreateReturn,
  createdPatientId,
  onPatientCreated,
  returnToId,
  userRole,
  currentDentistId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  defaultDate: string
  defaultHour: number
  dentists: Dentist[]
  patients: Patient[]
  procedures: Procedure[]
  dentistProcedureMap: Record<string, string[]>
  onSave: (formData: FormData) => Promise<{ error?: string } | null | undefined>
  onDelete?: (id: string) => void
  onCreateReturn?: (appointment: Appointment) => void
  createdPatientId?: string | null
  onPatientCreated?: (patient: { id: string; name: string; email: string | null }) => void
  returnToId?: string | null
  userRole?: string | null
  currentDentistId?: string | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProcedure, setSelectedProcedure] = useState(appointment?.procedure_id ?? "")
  const [selectedDentistId, setSelectedDentistId] = useState(appointment?.dentist_id ?? "")
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPatientSearch("")
      setDentistSearch("")
      setProcedureSearch("")
    }
  }, [open])

  const initStart = appointment
    ? toDateTimeLocal(new Date(appointment.start_time))
    : `${defaultDate}T${String(defaultHour).padStart(2, "0")}:00`

  const initEnd = appointment
    ? toDateTimeLocal(new Date(appointment.end_time))
    : `${defaultDate}T${String(defaultHour + 1).padStart(2, "0")}:00`

  const [startTime, setStartTime] = useState(initStart)
  const [endTime, setEndTime] = useState(initEnd)

  useEffect(() => {
    const compStart = appointment
      ? toDateTimeLocal(new Date(appointment.start_time))
      : `${defaultDate}T${String(defaultHour).padStart(2, "0")}:00`
    const compEnd = appointment
      ? toDateTimeLocal(new Date(appointment.end_time))
      : `${defaultDate}T${String(defaultHour + 1).padStart(2, "0")}:00`
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedProcedure(appointment?.procedure_id ?? "")
    setSelectedDentistId(appointment?.dentist_id ?? "")
    setStartTime(compStart)
    setEndTime(compEnd)
  }, [appointment, defaultDate, defaultHour])

  const effectiveDentistId = userRole === "dentist" && currentDentistId ? currentDentistId : selectedDentistId
  const availableProcIds = useMemo(
    () => effectiveDentistId ? (dentistProcedureMap[effectiveDentistId] ?? []) : null,
    [effectiveDentistId, dentistProcedureMap],
  )

  useEffect(() => {
    if (availableProcIds && selectedProcedure && !availableProcIds.includes(selectedProcedure)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProcedure("")
    }
  }, [effectiveDentistId, availableProcIds, selectedProcedure])

  const selectedProc = procedures.find((p) => p.id === selectedProcedure)

  useEffect(() => {
    if (!selectedProc) return
    const start = new Date(startTime)
    if (isNaN(start.getTime())) return
    const end = new Date(start.getTime() + selectedProc.duration_minutes * 60000)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndTime(toDateTimeLocal(end))
  }, [selectedProcedure, startTime, selectedProc])
  const filteredPatients = patients.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
  const filteredDentists = dentists.filter((d) => d.name.toLowerCase().includes(dentistSearch.toLowerCase()))
  const filteredProcedures = procedures.filter((p) => {
    if (availableProcIds && !availableProcIds.includes(p.id)) return false
    return p.name.toLowerCase().includes(procedureSearch.toLowerCase())
  })

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
            ;["start_time", "end_time"].forEach((name) => {
              const val = form.get(name) as string | null
              if (val && !val.includes("+") && !val.includes("-")) {
                const offset = -new Date().getTimezoneOffset()
                const sign = offset >= 0 ? "+" : "-"
                const tz = `${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`
                form.set(name, `${val}${tz}`)
              }
            })
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
              {userRole === "dentist" && currentDentistId ? (
                <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                  <input type="hidden" name="dentist_id" value={currentDentistId} />
                  {dentists.find((d) => d.id === currentDentistId)?.name ?? "Carregando..."}
                </div>
              ) : (
                <Select
                  name="dentist_id"
                  defaultValue={appointment?.dentist_id ?? ""}
                  required
                  itemToStringLabel={(value) => dentists.find((d) => d.id === value)?.name ?? String(value)}
                  onValueChange={(v) => setSelectedDentistId(v ?? "")}
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
              )}
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
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input
                id="end_time"
                name="end_time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
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
              <Label htmlFor="status">Situação</Label>
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
              <>
                <Button type="button" variant="outline" onClick={() => router.push(`/anamnese/${appointment.patient_id}?appointmentId=${appointment.id}`)}>
                  <FileText className="mr-1 h-3 w-3" />
                  Anamnese
                </Button>
                <Button type="button" variant="outline" onClick={() => onCreateReturn?.(appointment)}>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Criar Retorno
                </Button>
                <Button type="button" variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
                  <Trash2 className="mr-1 h-3 w-3" />
                  Excluir
                </Button>
              </>
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
  const [calendarCollapsed, setCalendarCollapsed] = useLocalStorage("agenda:calendarCollapsed", false)
  const [pastCollapsed, setPastCollapsed] = useLocalStorage("agenda:pastCollapsed", false)
  const [currentCollapsed, setCurrentCollapsed] = useLocalStorage("agenda:currentCollapsed", false)
  const [futureCollapsed, setFutureCollapsed] = useLocalStorage("agenda:futureCollapsed", false)

  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentDentistId, setCurrentDentistId] = useState<string | null>(null)
  const [receptionistDentistIds, setReceptionistDentistIds] = useState<string[]>([])
  const [isReady, setIsReady] = useState(false)
  const [dentistProcedureMap, setDentistProcedureMap] = useState<Record<string, string[]>>({})
  const [clinicHours, setClinicHours] = useState<Database["public"]["Tables"]["clinic_hours"]["Row"][]>([])

  useEffect(() => {
    (async () => {
      const sessionResult = await getUserSessionData()
      if (!("data" in sessionResult)) return

      const { role, dentistId, receptionistDentistIds } = sessionResult.data
      setUserRole(role)

      if (role === "dentist" && dentistId) {
        setCurrentDentistId(dentistId)
        setSelectedDentist(dentistId)
      } else if (role === "receptionist") {
        setReceptionistDentistIds(receptionistDentistIds)
      }

      const hoursResult = await getClinicHours()
      if ("data" in hoursResult) setClinicHours(hoursResult.data as Database["public"]["Tables"]["clinic_hours"]["Row"][])

      setIsReady(true)
    })()
  }, [])

  const fetchRange = useCallback(async (start: Date, end: Date) => {
    const startStr = toDateInput(start)
    const endStr = toDateInput(end)

    const result = await getAgendaData(`${startStr}T00:00:00Z`, `${endStr}T23:59:59Z`)
    if (!("data" in result)) return

    const { appointments, dentists, patients, procedures, dentistProcs, approvedReqs } = result.data

    setAppointments(appointments as Appointment[])
    setDentists(dentists)
    setPatients(patients)
    setProcedures(procedures)

    const dpMap: Record<string, string[]> = {}
    for (const d of dentists) dpMap[d.id] = []
    for (const dp of dentistProcs) {
      if (!dpMap[dp.dentist_id]) dpMap[dp.dentist_id] = []
      if (!dpMap[dp.dentist_id].includes(dp.procedure_id)) dpMap[dp.dentist_id].push(dp.procedure_id)
    }
    for (const req of approvedReqs) {
      if (req.created_procedure_id) {
        if (!dpMap[req.dentist_id]) dpMap[req.dentist_id] = []
        if (!dpMap[req.dentist_id].includes(req.created_procedure_id)) dpMap[req.dentist_id].push(req.created_procedure_id)
      }
    }
    setDentistProcedureMap(dpMap)
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
    if (v === "threeDay") {
      return {
        start: subDays(date, 1),
        end: addDays(date, 1),
      }
    }
    return { start: date, end: date }
  }, [])

  const refreshData = useCallback(() => {
    const range = getVisibleRange(currentDate, view)
    fetchRange(range.start, range.end)
  }, [currentDate, view, fetchRange, getVisibleRange])

  useEffect(() => {
    if (!isReady) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const range = getVisibleRange(currentDate, view)
    fetchRange(range.start, range.end)
  }, [currentDate, view, isReady, fetchRange, getVisibleRange])

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

  const checkSlotInHours = useCallback((date: Date) => {
    const dayOfWeek = date.getDay()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const dayHours = clinicHours.find((h) => h.day_of_week === dayOfWeek)
    if (!dayHours || !dayHours.is_open) return "Clínica fechada neste dia da semana."
    const slotMinutes = hour * 60 + minute
    const openParts = dayHours.open_time.split(":").map(Number)
    const closeParts = dayHours.close_time.split(":").map(Number)
    const openMinutes = openParts[0] * 60 + openParts[1]
    const closeMinutes = closeParts[0] * 60 + closeParts[1]
    if (slotMinutes < openMinutes || slotMinutes >= closeMinutes)
      return `Clínica aberta apenas das ${dayHours.open_time} às ${dayHours.close_time}.`
    return null
  }, [clinicHours])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const msg = checkSlotInHours(slotInfo.start)
    if (msg) {
      toast.error(msg)
      return
    }
    setEditAppointment(null)
    setCreatedPatientId(null)
    setReturnToId(null)
    setClickedDate(toDateInput(slotInfo.start))
    setClickedHour(slotInfo.start.getHours())
    setDialogOpen(true)
  }, [checkSlotInHours])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    const a = event.appointment
    setEditAppointment(a)
    setCreatedPatientId(null)
    setReturnToId(null)
    setClickedHour(new Date(a.start_time).getHours())
    setClickedDate(toDateInput(new Date(a.start_time)))
    setDialogOpen(true)
  }, [])

  const handleSidebarSelect = useCallback((a: Appointment) => {
    setEditAppointment(a)
    setCreatedPatientId(null)
    setReturnToId(null)
    setClickedHour(new Date(a.start_time).getHours())
    setClickedDate(toDateInput(new Date(a.start_time)))
    setDialogOpen(true)
  }, [])

  const handleSave = async (formData: FormData) => {
    const startRaw = formData.get("start_time") as string
    const endRaw = formData.get("end_time") as string
    const msg = (startRaw ? checkSlotInHours(new Date(startRaw)) : null)
      ?? (endRaw ? checkSlotInHours(new Date(endRaw)) : null)
    if (msg) {
      toast.error(msg)
      return
    }
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
    form.set("start_time", appendTimezone(toDateTimeLocal(new Date(start))))
    form.set("end_time", appendTimezone(toDateTimeLocal(new Date(end))))
    form.set("notes", appt.notes ?? "")
    form.set("status", appt.status)
    return form
  }

  const handleEventDrop = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
    const msg = checkSlotInHours(new Date(start as Date)) || checkSlotInHours(new Date(end as Date))
    if (msg) {
      toast.error(msg)
      return
    }
    const prev = [...appointments]
    setAppointments((current) =>
      current.map((a) =>
        a.id === event.appointment.id
          ? { ...a, start_time: toDateTimeLocal(new Date(start as Date)), end_time: toDateTimeLocal(new Date(end as Date)) }
          : a,
      ),
    )
    const form = buildFormData(event.appointment, start, end)
    const result = await updateAppointment(form)
    if (result?.error) {
      setAppointments(prev)
      toast.error(result.error)
    } else {
      toast.success("Agendamento movido")
    }
  }, [appointments, checkSlotInHours])

  const handleEventResize = useCallback(async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
    const msg = checkSlotInHours(new Date(start as Date)) || checkSlotInHours(new Date(end as Date))
    if (msg) {
      toast.error(msg)
      return
    }
    const prev = [...appointments]
    setAppointments((current) =>
      current.map((a) =>
        a.id === event.appointment.id
          ? { ...a, start_time: toDateTimeLocal(new Date(start as Date)), end_time: toDateTimeLocal(new Date(end as Date)) }
          : a,
      ),
    )
    const form = buildFormData(event.appointment, start, end)
    const result = await updateAppointment(form)
    if (result?.error) {
      setAppointments(prev)
      toast.error(result.error)
    } else {
      toast.success("Agendamento redimensionado")
    }
  }, [appointments, checkSlotInHours])

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

  const slotPropGetter = useCallback((date: Date) => {
    const dayOfWeek = date.getDay()
    const hour = date.getHours()
    const minute = date.getMinutes()

    const dayHours = clinicHours.find((h) => h.day_of_week === dayOfWeek)
    if (!dayHours || !dayHours.is_open) {
      return { style: { backgroundColor: "var(--muted)" } as React.CSSProperties }
    }

    const slotMinutes = hour * 60 + minute
    const openParts = dayHours.open_time.split(":").map(Number)
    const closeParts = dayHours.close_time.split(":").map(Number)
    const openMinutes = openParts[0] * 60 + openParts[1]
    const closeMinutes = closeParts[0] * 60 + closeParts[1]

    if (slotMinutes < openMinutes || slotMinutes >= closeMinutes) {
      return { style: { backgroundColor: "var(--muted)" } as React.CSSProperties }
    }

    return {}
  }, [clinicHours])

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: string) => {
    setView(newView as ViewType)
  }, [setView])

  const goToday = () => setCurrentDate(new Date())
  const goPrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1))
    else if (view === "week") setCurrentDate(subDays(currentDate, 7))
    else if (view === "threeDay") setCurrentDate(subDays(currentDate, 3))
    else setCurrentDate(subDays(currentDate, 1))
  }
  const goNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1))
    else if (view === "week") setCurrentDate(addDays(currentDate, 7))
    else if (view === "threeDay") setCurrentDate(addDays(currentDate, 3))
    else setCurrentDate(addDays(currentDate, 1))
  }

  const dateDisplay = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR })
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = addDays(start, 6)
      return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`
    }
    if (view === "threeDay") {
      const start = subDays(currentDate, 1)
      const end = addDays(currentDate, 1)
      return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`
    }
    return format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }, [currentDate, view])

  const handleDateSelect = (d: Date) => {
    setCurrentDate(d)
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
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-stretch justify-between gap-3">
          <div className="inline-flex rounded-lg border bg-background p-0.5">
            {views.map((v) => {
              const Icon = v.icon
              const isActive = view === v.type
              return (
                <button
                  key={v.type}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
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

          {userRole === "dentist" && currentDentistId ? (
            <div className="ml-auto flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {dentists.find((d) => d.id === currentDentistId)?.name ?? "Minha Agenda"}
            </div>
          ) : (
            <Select value={selectedDentist} onValueChange={(v) => setSelectedDentist(v ?? "all")} itemToStringLabel={(value) => value === "all" ? "Todos os dentistas" : dentists.find((d) => d.id === value)?.name ?? String(value)}>
              <SelectTrigger className="ml-auto h-8 w-44">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os dentistas</SelectItem>
                {(userRole === "receptionist" && receptionistDentistIds.length > 0
                  ? dentists.filter((d) => receptionistDentistIds.includes(d.id))
                  : dentists
                ).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
              culture="pt-BR"
              events={events}
              view={view as CalendarProps<CalendarEvent>["view"]}
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
              slotPropGetter={slotPropGetter}
              views={{ month: true, week: true, day: true, agenda: true, threeDay: ThreeDayView } as Record<string, boolean | typeof ThreeDayView>}
              step={15}
              timeslots={2}
              scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
              className="rounded-xl border bg-card"
              style={{ height: 900 }}
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
                weekdayFormat: (date: Date) => format(date, "cccc", { locale: ptBR }).toUpperCase(),
                dayFormat: (date: Date) => `${format(date, "dd")} ${format(date, "cccc", { locale: ptBR }).toUpperCase()}`,
              }}
              components={{
                event: ({ event }) => {
                  const a = event.appointment
                  const statusLabel = STATUS_LABELS[a.status] ?? a.status
                  const statusColorMap: Record<string, string> = {
                    pending: "bg-purple-100 text-purple-800",
                    scheduled: "bg-amber-100 text-amber-800",
                    confirmed: "bg-blue-100 text-blue-800",
                    in_progress: "bg-orange-100 text-orange-800",
                    completed: "bg-green-100 text-green-800",
                    cancelled: "bg-red-100 text-red-800",
                  }
                  return (
                    <EventTooltip
                      content={
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold leading-tight">{a.patients?.name ?? "Sem nome"}</p>
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            {a.procedures?.name && (
                              <p className="flex items-center gap-1.5">
                                {a.procedures.color && (
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.procedures.color }} />
                                )}
                                {a.procedures.name}
                              </p>
                            )}
                            {a.dentists?.name && <p>{a.dentists.name}</p>}
                            <p>{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-md border border-transparent px-1.5 py-0.5 text-[10px] font-medium ${statusColorMap[a.status] ?? "bg-muted text-muted-foreground"}`}>
                              {statusLabel}
                            </span>
                          </div>
                          {a.notes && (
                            <p className="text-xs text-muted-foreground border-t pt-1.5 leading-relaxed line-clamp-2">
                              {a.notes}
                            </p>
                          )}
                        </div>
                      }
                    >
                      <div className="truncate px-0.5 text-[11px] leading-tight">
                        <span className="font-medium">{event.appointment.patients?.name}</span>
                        <span className="ml-1 text-muted-foreground">
                          {format(new Date(event.start), "HH:mm")}
                        </span>
                      </div>
                    </EventTooltip>
                  )
                },
                showMore: ({ count }) => (
                  <div className="cursor-pointer px-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    +{count} mais
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
          dentists={userRole === "receptionist" && receptionistDentistIds.length > 0
            ? dentists.filter((d) => receptionistDentistIds.includes(d.id))
            : dentists}
          patients={patients}
          procedures={procedures}
          dentistProcedureMap={dentistProcedureMap}
          onSave={handleSave}
          onDelete={handleDelete}
          onCreateReturn={(appt) => {
            setEditAppointment(null)
            setReturnToId(appt.id)
            setClickedDate(toDateInput(new Date(appt.start_time)))
            setClickedHour(new Date(appt.start_time).getHours())
            setDialogOpen(false)
            setTimeout(() => setDialogOpen(true), 0)
          }}
          createdPatientId={createdPatientId}
          onPatientCreated={({ id, name, email }) => {
            setPatients((prev) => [...prev, { id, name, cpf: null, phone: null, email, birth_date: null, notes: null, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Patient])
            setCreatedPatientId(id)
          }}
          returnToId={returnToId}
          userRole={userRole}
          currentDentistId={currentDentistId}
        />

        <ReturnDialog
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
          patients={patients}
          dentists={userRole === "receptionist" && receptionistDentistIds.length > 0
            ? dentists.filter((d) => receptionistDentistIds.includes(d.id))
            : dentists}
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

      <aside className={cn("hidden shrink-0 transition-all duration-300 md:block", sidebarCollapsed ? "w-12" : "w-75")}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-3">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
               onClick={() => setSidebarCollapsed(false)}
               title="Expandir sidebar"
             >
               <PanelLeftClose className="h-4 w-4" />
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
            <div className="flex items-center justify-between p-2">
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                onClick={() => setCalendarCollapsed(!calendarCollapsed)}
                title={calendarCollapsed ? "Mostrar calendário" : "Ocultar calendário"}
              >
                {calendarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                onClick={() => setSidebarCollapsed(true)}
                title="Retrair sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
            <div className={cn("overflow-hidden transition-all duration-300", calendarCollapsed ? "max-h-0" : "max-h-[400px]")}>
              <MiniCalendar currentDate={currentDate} onSelect={handleDateSelect} appointments={appointments} />
            </div>
            <div className="divide-y p-4">
              {dayAppointments.past.length > 0 && (
                <div className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Passados ({dayAppointments.past.length})</p>
                    <button
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                      onClick={() => setPastCollapsed(!pastCollapsed)}
                      title={pastCollapsed ? "Mostrar" : "Ocultar"}
                    >
                      {pastCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className={cn("overflow-hidden transition-all duration-300", pastCollapsed ? "max-h-0" : "max-h-[2000px]")}>
                    {dayAppointments.past.map((a) => (
                      <div
                        key={a.id}
                        className="cursor-pointer py-1.5 hover:bg-accent rounded-md px-1 transition-colors"
                        onClick={() => handleSidebarSelect(a)}
                      >
                        <p className="text-sm font-medium">{a.patients?.name}</p>
                        <p className="text-xs text-muted-foreground">{a.dentists?.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className={cn(dayAppointments.past.length > 0 && "pt-3", dayAppointments.future.length > 0 && "pb-3")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {dayAppointments.current.length > 0 ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                        </span>
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Acontecendo Agora ({dayAppointments.current.length})</p>
                      </>
                    ) : (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atual ({dayAppointments.current.length})</p>
                    )}
                  </div>
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                    onClick={() => setCurrentCollapsed(!currentCollapsed)}
                    title={currentCollapsed ? "Mostrar" : "Ocultar"}
                  >
                    {currentCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {dayAppointments.current.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">Nenhum evento no momento</p>
                ) : (
                  <div className={cn("overflow-hidden transition-all duration-300", currentCollapsed ? "max-h-0" : "max-h-[2000px]")}>
                    {dayAppointments.current.map((a) => (
                      <div
                        key={a.id}
                        className="cursor-pointer py-1.5 hover:bg-accent rounded-md px-1 transition-colors"
                        onClick={() => handleSidebarSelect(a)}
                      >
                        <p className="text-sm font-medium">{a.patients?.name}</p>
                        <p className="text-xs text-muted-foreground">{a.dentists?.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {dayAppointments.future.length > 0 && (
                <div className="pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Futuros ({dayAppointments.future.length})</p>
                    <button
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                      onClick={() => setFutureCollapsed(!futureCollapsed)}
                      title={futureCollapsed ? "Mostrar" : "Ocultar"}
                    >
                      {futureCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className={cn("overflow-hidden transition-all duration-300", futureCollapsed ? "max-h-0" : "max-h-[2000px]")}>
                    {dayAppointments.future.map((a) => (
                      <div
                        key={a.id}
                        className="cursor-pointer py-1.5 hover:bg-accent rounded-md px-1 transition-colors"
                        onClick={() => handleSidebarSelect(a)}
                      >
                        <p className="text-sm font-medium">{a.patients?.name}</p>
                        <p className="text-xs text-muted-foreground">{a.dentists?.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dayAppointments.past.length === 0 && dayAppointments.current.length === 0 && dayAppointments.future.length === 0 && (
                <p className="text-xs text-muted-foreground py-4">Nenhum agendamento para este dia</p>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

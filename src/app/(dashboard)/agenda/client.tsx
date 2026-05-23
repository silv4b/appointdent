"use client"

import { Badge } from "@/components/ui/badge"
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
  createAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment,
} from "@/lib/actions/appointments"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { cn } from "@/lib/utils"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
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
  Trash2,
  List,
  Columns2,
  Grid2x2,
  Grid3x3,
  CalendarRange,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: { name: string } | null
  dentists: { name: string } | null
  procedures: { name: string; color: string | null; duration_minutes: number } | null
}

type Dentist = Database["public"]["Tables"]["dentists"]["Row"]
type Patient = Database["public"]["Tables"]["patients"]["Row"]
type Procedure = Database["public"]["Tables"]["procedures"]["Row"]

const HOUR_START = 8
const HOUR_END = 17
const HOUR_HEIGHT = 96
const TOTAL_HOURS = HOUR_END - HOUR_START

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

type ViewType = "day" | "week" | "month" | "year" | "agenda"

const views: { type: ViewType; label: string; icon: typeof List }[] = [
  { type: "day", label: "Dia", icon: List },
  { type: "week", label: "Semana", icon: Columns2 },
  { type: "month", label: "Mês", icon: Grid2x2 },
  { type: "year", label: "Ano", icon: Grid3x3 },
  { type: "agenda", label: "Lista", icon: CalendarRange },
]

function toPixels(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return (h - HOUR_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
}

function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm")
}

function getDayName(date: Date): string {
  return format(date, "EEE", { locale: ptBR }).toLowerCase()
}

function getDayNumber(date: Date): string {
  return format(date, "d")
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toDateTimeLocal(d: Date): string {
  return d.toISOString().slice(0, 16)
}

const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i)

// ============================================================
// Appointment Dialog
// ============================================================
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
}) {
  const [saving, setSaving] = useState(false)
  const [selectedProcedure, setSelectedProcedure] = useState(appointment?.procedure_id ?? "")

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          <DialogDescription>
            {appointment ? "Atualize os dados do agendamento" : "Preencha os dados para agendar"}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            const form = new FormData(e.currentTarget)
            const result = await onSave(form)
            if (!result?.error) onOpenChange(false)
            setSaving(false)
          }}
          className="flex flex-col gap-4"
        >
          {appointment && <input type="hidden" name="id" value={appointment.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="patient_id">Paciente</Label>
              <Select name="patient_id" defaultValue={appointment?.patient_id ?? ""} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dentist_id">Dentista</Label>
              <Select name="dentist_id" defaultValue={appointment?.dentist_id ?? ""} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="procedure_id">Procedimento</Label>
            <Select name="procedure_id" value={selectedProcedure} onValueChange={(v) => setSelectedProcedure(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.duration_minutes}min)
                  </SelectItem>
                ))}
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
              <Select name="status" defaultValue={appointment.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2">
            {appointment && (
              <Button type="button" variant="destructive" size="sm" onClick={() => { onDelete?.(appointment.id); onOpenChange(false) }}>
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
// Day View
// ============================================================
function DayView({
  date,
  appointments,
  dentists,
  selectedDentist,
  onCreate,
  onEdit,
}: {
  date: Date
  appointments: Appointment[]
  dentists: Dentist[]
  selectedDentist: string
  onCreate: (hour: number) => void
  onEdit: (appt: Appointment) => void
}) {
  const filtered = useMemo(() => {
    if (selectedDentist === "all") return appointments
    return appointments.filter((a) => a.dentist_id === selectedDentist)
  }, [appointments, selectedDentist])

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = HOUR_START * 60
  const nowTop = ((nowMinutes - startMinutes) / (TOTAL_HOURS * 60)) * (TOTAL_HOURS * HOUR_HEIGHT)

  const isToday = isSameDay(date, now)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex border-b">
        <div className="w-18 shrink-0" />
        <div className="flex-1 border-l py-2 text-center">
          <p className="text-xs font-medium text-muted-foreground">{getDayName(date)}</p>
          <p className="text-lg font-semibold">{getDayNumber(date)}</p>
        </div>
      </div>
      <div className="relative h-[800px] overflow-y-auto">
        <div className="flex">
          <div className="w-18 shrink-0">
            {hours.map((h) => (
              <div key={h} className="relative border-b" style={{ height: HOUR_HEIGHT }}>
                <div className="absolute -top-3 right-2 flex h-6 items-center">
                  <span className="text-xs text-muted-foreground">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="relative flex-1 border-l">
            {hours.map((h) => (
              <div key={h} className="group relative border-b" style={{ height: HOUR_HEIGHT }}>
                <div className="pointer-events-none absolute inset-x-0 top-0 border-b" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed" />
                {[0, 1, 2, 3].map((quarter) => (
                  <button
                    key={quarter}
                    type="button"
                    className="absolute inset-x-0 h-6 cursor-pointer transition-colors hover:bg-accent"
                    style={{ top: quarter * 24 }}
                    onClick={() => onCreate(h)}
                  />
                ))}
              </div>
            ))}

            {filtered.map((appt) => {
              const top = toPixels(formatTime(appt.start_time))
              const endPixels = toPixels(formatTime(appt.end_time))
              const height = Math.max(endPixels - top, 28)
              const color = appt.procedures?.color ?? "#3b82f6"

              return (
                <div
                  key={appt.id}
                  className="absolute left-0.5 right-0.5 z-20 cursor-pointer overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-xs shadow-sm transition-opacity hover:opacity-90"
                  style={{
                    top,
                    height,
                    borderLeftColor: color,
                    backgroundColor: `${color}15`,
                  }}
                  onClick={() => onEdit(appt)}
                >
                  <p className="truncate font-medium leading-tight">{appt.patients?.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                  </p>
                  {appt.dentists && selectedDentist === "all" && (
                    <p className="truncate text-[10px] text-muted-foreground">{appt.dentists.name}</p>
                  )}
                  {appt.procedures && (
                    <p className="truncate text-[10px] text-muted-foreground">{appt.procedures.name}</p>
                  )}
                </div>
              )
            })}

            {isToday && nowTop >= 0 && nowTop <= TOTAL_HOURS * HOUR_HEIGHT && (
              <div className="pointer-events-none absolute inset-x-0 z-50 border-t border-primary" style={{ top: nowTop }}>
                <div className="absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="absolute -left-20 flex w-16 -translate-y-1/2 justify-end pr-1 text-xs font-medium text-primary">
                  {format(now, "HH:mm")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Week View
// ============================================================
function WeekView({
  date,
  appointments,
  selectedDentist,
  onCreate,
  onEdit,
}: {
  date: Date
  appointments: Appointment[]
  selectedDentist: string
  onCreate: (date: Date, hour: number) => void
  onEdit: (appt: Appointment) => void
}) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [date])

  const filtered = useMemo(() => {
    if (selectedDentist === "all") return appointments
    return appointments.filter((a) => a.dentist_id === selectedDentist)
  }, [appointments, selectedDentist])

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = HOUR_START * 60
  const nowTop = ((nowMinutes - startMinutes) / (TOTAL_HOURS * 60)) * (TOTAL_HOURS * HOUR_HEIGHT)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex border-b">
        <div className="w-18 shrink-0" />
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="flex-1 border-l py-2 text-center">
            <p className="text-xs font-medium text-muted-foreground">{getDayName(day)}</p>
            <p className={cn("text-lg font-semibold", isToday(day) && "text-primary")}>{getDayNumber(day)}</p>
          </div>
        ))}
      </div>
      <div className="relative h-[800px] overflow-y-auto">
        <div className="flex">
          <div className="w-18 shrink-0">
            {hours.map((h) => (
              <div key={h} className="relative border-b" style={{ height: HOUR_HEIGHT }}>
                <div className="absolute -top-3 right-2 flex h-6 items-center">
                  <span className="text-xs text-muted-foreground">{String(h).padStart(2, "0")}:00</span>
                </div>
              </div>
            ))}
          </div>
          {weekDays.map((day) => {
            const dayStr = toDateInput(day)
            const dayAppts = filtered.filter((a) => a.start_time.startsWith(dayStr))
            const isCurrentDay = isToday(day)

            return (
              <div key={dayStr} className="relative flex-1 border-l">
                {hours.map((h) => (
                  <div key={h} className="group relative border-b" style={{ height: HOUR_HEIGHT }}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 border-b" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed" />
                    {[0, 1, 2, 3].map((quarter) => (
                      <button
                        key={quarter}
                        type="button"
                        className="absolute inset-x-0 h-6 cursor-pointer transition-colors hover:bg-accent"
                        style={{ top: quarter * 24 }}
                        onClick={() => onCreate(day, h)}
                      />
                    ))}
                  </div>
                ))}

                {dayAppts.map((appt) => {
                  const top = toPixels(formatTime(appt.start_time))
                  const endPixels = toPixels(formatTime(appt.end_time))
                  const height = Math.max(endPixels - top, 28)
                  const color = appt.procedures?.color ?? "#3b82f6"

                  return (
                    <div
                      key={appt.id}
                      className="absolute left-0.5 right-0.5 z-20 cursor-pointer overflow-hidden rounded-sm border-l-[3px] px-1 py-0.5 text-[10px] shadow-sm hover:opacity-90"
                      style={{
                        top,
                        height,
                        borderLeftColor: color,
                        backgroundColor: `${color}15`,
                      }}
                      onClick={() => onEdit(appt)}
                    >
                      <p className="truncate font-medium leading-tight">{appt.patients?.name}</p>
                      <p className="truncate text-muted-foreground">
                        {formatTime(appt.start_time)}
                      </p>
                    </div>
                  )
                })}

                {isCurrentDay && nowTop >= 0 && nowTop <= TOTAL_HOURS * HOUR_HEIGHT && (
                  <div className="pointer-events-none absolute inset-x-0 z-50 border-t border-primary" style={{ top: nowTop }}>
                    <div className="absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Month View
// ============================================================
function MonthView({
  date,
  appointments,
  onSelectDate,
}: {
  date: Date
  appointments: Appointment[]
  onSelectDate: (d: Date) => void
}) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [date])

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  const apptsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of appointments) {
      const key = a.start_time.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [appointments])

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b">
        {dayNames.map((name) => (
          <div key={name} className="border-r py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0">
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = toDateInput(day)
          const dayAppts = apptsByDate.get(key) ?? []
          const isCurrentMonth = isSameMonth(day, date)
          const isCurrentDay = isToday(day)

          return (
            <button
              key={key}
              className={cn(
                "flex flex-col items-start gap-0.5 border-b border-r p-1.5 text-left transition-colors hover:bg-accent/30",
                !isCurrentMonth && "bg-muted/20",
              )}
              onClick={() => onSelectDate(day)}
            >
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", isCurrentDay && "bg-primary text-primary-foreground", !isCurrentMonth && "text-muted-foreground/30")}>
                {format(day, "d")}
              </span>
              <div className="w-full space-y-0.5">
                {dayAppts.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: `${a.procedures?.color ?? "#3b82f6"}20`, color: a.procedures?.color ?? "#3b82f6" }}
                  >
                    {a.patients?.name}
                  </div>
                ))}
                {dayAppts.length > 2 && (
                  <p className="px-1 text-[10px] text-muted-foreground">+{dayAppts.length - 2} mais</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Agenda View (list)
// ============================================================
function AgendaListView({
  date,
  appointments,
  onEdit,
}: {
  date: Date
  appointments: Appointment[]
  onEdit: (appt: Appointment) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of appointments) {
      const key = format(new Date(a.start_time), "EEEE, dd 'de' MMMM", { locale: ptBR })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [appointments])

  return (
    <div className="rounded-xl border bg-card">
      {appointments.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhum agendamento encontrado.</div>
      ) : (
        Array.from(grouped.entries()).map(([dayLabel, appts]) => (
          <div key={dayLabel}>
            <div className="border-b px-6 py-3">
              <p className="text-sm font-semibold capitalize">{dayLabel}</p>
            </div>
            {appts.map((a) => (
              <div
                key={a.id}
                className="flex cursor-pointer items-center gap-4 border-b px-6 py-3 transition-colors hover:bg-muted/30 last:border-0"
                onClick={() => onEdit(a)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${a.procedures?.color ?? "#3b82f6"}20` }}>
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: a.procedures?.color ?? "#3b82f6" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.patients?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.dentists?.name} &middot; {a.procedures?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatTime(a.start_time)}</p>
                  <Badge variant={STATUS_VARIANTS[a.status] ?? "outline"} className="text-[10px]">
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
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
  const [view, setView] = useState<ViewType>("day")
  const [loading, setLoading] = useState(true)

  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [clickedHour, setClickedHour] = useState(8)
  const [clickedDate, setClickedDate] = useState(toDateInput(new Date()))

  const dateStr = toDateInput(currentDate)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const [appointmentsData, dentistsData, patientsData, proceduresData] = await Promise.all([
      getAppointments(dateStr),
      supabase.from("dentists").select("*").order("name").then((r) => r.data ?? []),
      supabase.from("patients").select("*").order("name").then((r) => r.data ?? []),
      supabase.from("procedures").select("*").order("name").then((r) => r.data ?? []),
    ])
    setAppointments(appointmentsData)
    setDentists(dentistsData)
    setPatients(patientsData)
    setProcedures(proceduresData)
    setLoading(false)
  }, [dateStr])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const fetchWeekAppointments = useCallback(async (start: Date) => {
    const supabase = createClient()
    const end = addDays(start, 6)
    const startStr = toDateInput(start)
    const endStr = toDateInput(end)

    const { data } = await supabase
      .from("appointments")
      .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
      .gte("start_time", `${startStr}T00:00:00Z`)
      .lte("start_time", `${endStr}T23:59:59Z`)
      .order("start_time")

    if (data) setAppointments(data as Appointment[])
    setLoading(false)
  }, [])

  const fetchMonthAppointments = useCallback(async (month: Date) => {
    const supabase = createClient()
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const startStr = toDateInput(start)
    const endStr = toDateInput(end)

    const { data } = await supabase
      .from("appointments")
      .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
      .gte("start_time", `${startStr}T00:00:00Z`)
      .lte("start_time", `${endStr}T23:59:59Z`)
      .order("start_time")

    if (data) setAppointments(data as Appointment[])
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    if (view === "week") {
      fetchWeekAppointments(startOfWeek(currentDate, { weekStartsOn: 0 }))
    } else if (view === "month") {
      fetchMonthAppointments(currentDate)
    } else {
      fetchAll()
    }
  }, [view, currentDate, fetchAll, fetchWeekAppointments, fetchMonthAppointments])

  const handleCreate = (hour: number) => {
    setEditAppointment(null)
    setClickedHour(hour)
    setClickedDate(dateStr)
    setDialogOpen(true)
  }

  const handleCreateWeek = (date: Date, hour: number) => {
    setEditAppointment(null)
    setClickedHour(hour)
    setClickedDate(toDateInput(date))
    setDialogOpen(true)
  }

  const handleEdit = (appt: Appointment) => {
    setEditAppointment(appt)
    setClickedHour(new Date(appt.start_time).getHours())
    setClickedDate(toDateInput(new Date(appt.start_time)))
    setDialogOpen(true)
  }

  const handleSave = async (formData: FormData) => {
    const result = editAppointment
      ? await updateAppointment(formData)
      : await createAppointment(formData)
    if (!result?.error) {
      setDialogOpen(false)
      if (view === "week") fetchWeekAppointments(startOfWeek(currentDate, { weekStartsOn: 0 }))
      else if (view === "month") fetchMonthAppointments(currentDate)
      else fetchAll()
    }
    return result
  }

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    await deleteAppointment(form)
    if (view === "week") fetchWeekAppointments(startOfWeek(currentDate, { weekStartsOn: 0 }))
    else if (view === "month") fetchMonthAppointments(currentDate)
    else fetchAll()
  }

  const goToday = () => setCurrentDate(new Date())
  const goPrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1))
    else setCurrentDate(subDays(currentDate, view === "week" ? 7 : 1))
  }
  const goNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1))
    else setCurrentDate(addDays(currentDate, view === "week" ? 7 : 1))
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

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border bg-background p-0.5 shadow-sm">
            {views.map((v) => {
              const Icon = v.icon
              const isActive = view === v.type
              return (
                <button
                  key={v.type}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
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

          <Button size="sm" onClick={() => handleCreate(8)}>
            <Plus className="h-4 w-4" />
            Adicionar Evento
          </Button>
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
          <span className="ml-2 text-sm font-medium capitalize">{dateDisplay}</span>

          <Select value={selectedDentist} onValueChange={(v) => setSelectedDentist(v ?? "all")}>
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
          <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            {view === "day" && (
              <DayView
                date={currentDate}
                appointments={appointments}
                dentists={dentists}
                selectedDentist={selectedDentist}
                onCreate={handleCreate}
                onEdit={handleEdit}
              />
            )}
            {view === "week" && (
              <WeekView
                date={currentDate}
                appointments={appointments}
                selectedDentist={selectedDentist}
                onCreate={handleCreateWeek}
                onEdit={handleEdit}
              />
            )}
            {view === "month" && (
              <MonthView date={currentDate} appointments={appointments} onSelectDate={handleDateSelect} />
            )}
            {view === "year" && (
              <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
                Selecione um mês para visualizar
              </div>
            )}
            {view === "agenda" && (
              <AgendaListView date={currentDate} appointments={appointments} onEdit={handleEdit} />
            )}
          </>
        )}

        <AppointmentDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o)
            if (!o) { setEditAppointment(null) }
          }}
          appointment={editAppointment}
          defaultDate={clickedDate}
          defaultHour={clickedHour}
          dentists={dentists}
          patients={patients}
          procedures={procedures}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>

      <aside className="hidden w-64 shrink-0 md:block">
        <div className="divide-y rounded-xl border bg-card">
          <MiniCalendar currentDate={currentDate} onSelect={handleDateSelect} />
          <div className="p-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <p className="text-sm font-semibold">Agora</p>
            </div>
            {appointments.filter((a) => {
              const start = new Date(a.start_time)
              const end = new Date(a.end_time)
              const now2 = new Date()
              return start <= now2 && end >= now2
            }).length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nenhum evento agora</p>
            ) : (
              appointments
                .filter((a) => {
                  const start = new Date(a.start_time)
                  const end = new Date(a.end_time)
                  const now2 = new Date()
                  return start <= now2 && end >= now2
                })
                .slice(0, 3)
                .map((a) => (
                  <div key={a.id} className="mt-2 space-y-1">
                    <p className="text-sm font-medium">{a.patients?.name}</p>
                    <p className="text-xs text-muted-foreground">{a.dentists?.name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

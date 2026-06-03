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
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  updateAvailabilitySlot,
} from "@/lib/actions/availability-slots"
import { updateClinicHours } from "@/lib/actions/clinic-hours"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { Building2, ChevronDown, Clock, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useCallback, useEffect, useState } from "react"

type Slot = Database["public"]["Tables"]["availability_slots"]["Row"] & {
  dentists: { name: string } | null
}

type Dentist = Database["public"]["Tables"]["dentists"]["Row"]

type ClinicHour = Database["public"]["Tables"]["clinic_hours"]["Row"]

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const DAY_NAMES_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]

function parseTime(value: string) {
  return value.length === 5 ? value : value.slice(0, 5)
}

function SlotDialog({
  open,
  onOpenChange,
  slot,
  dentistId: fixedDentistId,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: Slot | null
  dentistId?: string
  onSave: (formData: FormData) => Promise<{ error?: string } | null | undefined>
}) {
  const [dayOfWeek, setDayOfWeek] = useState(slot?.day_of_week?.toString() ?? "1")
  const [slotType, setSlotType] = useState(slot?.slot_type ?? "available")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDayOfWeek(slot?.day_of_week?.toString() ?? "1")
    setSlotType(slot?.slot_type ?? "available")
  }, [slot])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{slot ? "Editar Horário" : "Novo Horário"}</DialogTitle>
          <DialogDescription>
            {slot ? "Atualize os dados do horário" : "Defina um horário de atendimento"}
          </DialogDescription>
        </DialogHeader>
        <form
          key={slot?.id ?? "new"}
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
          {slot && <input type="hidden" name="id" value={slot.id} />}
          {fixedDentistId && <input type="hidden" name="dentist_id" value={fixedDentistId} />}

          {slot && !fixedDentistId && (
            <div className="flex flex-col gap-2">
              <Label>Dentista</Label>
              <p className="text-sm text-muted-foreground">{slot.dentists?.name}</p>
              <input type="hidden" name="dentist_id" value={slot.dentist_id} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="day_of_week">Dia da Semana</Label>
            <Select name="day_of_week" value={dayOfWeek} onValueChange={(v) => setDayOfWeek(v ?? "1")} required itemToStringLabel={(value) => DAY_NAMES[parseInt(value as string)] ?? String(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((name, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slot_type">Tipo</Label>
            <Select name="slot_type" value={slotType} onValueChange={(v) => setSlotType(v ?? "available")}>
              <SelectTrigger id="slot_type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Atendimento</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_time">Início</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={slot?.start_time ?? "08:00"}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={slot?.end_time ?? "12:00"}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ClinicHoursSection() {
  const [hours, setHours] = useState<ClinicHour[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("clinic_hours")
      .select("*")
      .order("day_of_week")
    if (data) {
      setHours(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleToggleOpen = async (day: ClinicHour) => {
    const form = new FormData()
    form.set("day_of_week", day.day_of_week.toString())
    form.set("open_time", day.open_time)
    form.set("close_time", day.close_time)
    form.set("is_open", day.is_open ? "" : "on")
    const result = await updateClinicHours(form)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(day.is_open ? "Dia fechado" : "Dia aberto")
      fetch()
    }
  }

  const handleSaveDay = async (day: ClinicHour, openTime: string, closeTime: string) => {
    const form = new FormData()
    form.set("day_of_week", day.day_of_week.toString())
    form.set("open_time", openTime)
    form.set("close_time", closeTime)
    form.set("is_open", day.is_open ? "on" : "")
    const result = await updateClinicHours(form)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${DAY_NAMES_FULL[day.day_of_week]} atualizado`)
      fetch()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Funcionamento da Clínica</h2>
          <p className="text-xs text-muted-foreground">
            Defina os horários de abertura e fechamento da clínica por dia da semana
          </p>
        </div>
      </div>

      <div className="divide-y">
        {hours.map((day) => {
          return (
            <ClinicHourRow
              key={day.day_of_week}
              day={day}
              openTime={parseTime(day.open_time)}
              closeTime={parseTime(day.close_time)}
              onOpenTimeChange={(v) => handleSaveDay(day, v, parseTime(day.close_time))}
              onCloseTimeChange={(v) => handleSaveDay(day, parseTime(day.open_time), v)}
              onToggleOpen={() => handleToggleOpen(day)}
            />
          )
        })}
      </div>
    </div>
  )
}

function ClinicHourRow({
  day,
  openTime,
  closeTime,
  onOpenTimeChange,
  onCloseTimeChange,
  onToggleOpen,
}: {
  day: ClinicHour
  openTime: string
  closeTime: string
  onOpenTimeChange: (v: string) => void
  onCloseTimeChange: (v: string) => void
  onToggleOpen: () => void
}) {

  return (
    <div className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-4">
        <span className={`min-w-[8rem] text-sm font-medium ${!day.is_open ? "text-muted-foreground line-through" : ""}`}>
          {DAY_NAMES_FULL[day.day_of_week]}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={day.is_open}
            onChange={onToggleOpen}
            className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
          />
          <span className="text-muted-foreground">{day.is_open ? "Aberto" : "Fechado"}</span>
        </label>
      </div>

      {day.is_open && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={openTime}
              onChange={(e) => onOpenTimeChange(e.target.value)}
              className="h-8 w-28"
            />
            <span className="text-sm text-muted-foreground">às</span>
            <Input
              type="time"
              value={closeTime}
              onChange={(e) => onCloseTimeChange(e.target.value)}
              className="h-8 w-28"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function HorariosClient() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [edit, setEdit] = useState<Slot | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [receptionistDentistIds, setReceptionistDentistIds] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedDentistId, setSelectedDentistId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()

    let slotsQuery = supabase
      .from("availability_slots")
      .select("*, dentists(name)")
      .order("dentist_id")
      .order("day_of_week")
      .order("start_time")

    if (userRole === "receptionist") {
      if (receptionistDentistIds.length > 0) {
        slotsQuery = slotsQuery.in("dentist_id", receptionistDentistIds)
      } else {
        slotsQuery = slotsQuery.eq("dentist_id", "00000000-0000-0000-0000-000000000000")
      }
    }

    const [slotsResult, dentistsData] = await Promise.all([
      slotsQuery,
      supabase.from("dentists").select("*").order("name").then((r) => r.data ?? []),
    ])
    if (slotsResult.data) setSlots(slotsResult.data as Slot[])
    setDentists(userRole === "receptionist" && receptionistDentistIds.length > 0
      ? dentistsData.filter((d) => receptionistDentistIds.includes(d.id))
      : dentistsData)
    setLoading(false)
  }, [userRole, receptionistDentistIds])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data: profile }) => {
        if (!profile) return
        setUserRole(profile.role)
        if (profile.role === "receptionist") {
          supabase.from("receptionist_dentists").select("dentist_id").eq("receptionist_id", user.id).then(({ data }) => {
            setReceptionistDentistIds(data?.map((r) => r.dentist_id) ?? [])
          })
        }
      })
    })
    fetch()
  }, [fetch])

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    const result = await deleteAvailabilitySlot(form)
    if (result?.error) toast.error(result.error)
    else toast.success("Horário excluído")
    fetch()
  }

  const handleSave = async (formData: FormData) => {
    const result = edit
      ? await updateAvailabilitySlot(formData)
      : await createAvailabilitySlot(formData)
    if (!result?.error) {
      toast.success(edit ? "Horário atualizado" : "Horário cadastrado")
      setOpen(false)
      fetch()
    } else {
      toast.error(result.error)
    }
    return result
  }

  const grouped = dentists
    .filter((d) => d.active)
    .map((dentist) => ({
      dentist,
      slots: slots.filter((s) => s.dentist_id === dentist.id),
    }))
    .filter((g) => g.slots.length > 0)

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
  }

  const dentistsWithoutSlots = dentists.filter(
    (d) => d.active && !slots.some((s) => s.dentist_id === d.id)
  )

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grade de Horários</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie os horários de atendimento dos dentistas
          </p>
        </div>
      </div>

      <div className="mb-8">
        <ClinicHoursSection />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ dentist, slots: dentistSlots }) => {
            const isExpanded = expanded[dentist.id] ?? true
            return (
              <div key={dentist.id} className="rounded-2xl border bg-card transition-shadow">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(dentist.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpanded(dentist.id) } }}
                  className={`flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/20 ${isExpanded ? "border-b" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">{dentist.name}</h2>
                      <p className="text-xs text-muted-foreground">{dentist.specialty ?? "Sem especialidade"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEdit(null)
                        setSelectedDentistId(dentist.id)
                        setOpen(true)
                      }}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Novo Horário
                    </Button>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y">
                    {dentistSlots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/30">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="min-w-[3rem] justify-center">
                            {DAY_NAMES[s.day_of_week]}
                          </Badge>
                          <span className="text-sm font-medium">
                            {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                          </span>
                          <Badge variant={s.slot_type === "blocked" ? "secondary" : "outline"} className="text-xs">
                            {s.slot_type === "blocked" ? "Bloqueado" : "Atendimento"}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEdit(s)
                              setSelectedDentistId(undefined)
                              setOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {dentistsWithoutSlots.length > 0 && (
            <div className="rounded-2xl border border-dashed bg-card/50 p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Dentistas sem horários</h3>
              <div className="flex flex-wrap gap-2">
                {dentistsWithoutSlots.map((d) => (
                  <Button
                    key={d.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEdit(null)
                      setExpanded((prev) => ({ ...prev, [d.id]: true }))
                      setSelectedDentistId(d.id)
                      setOpen(true)
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {d.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {grouped.length === 0 && dentistsWithoutSlots.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-sm text-muted-foreground">
              <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p>Nenhum dentista ativo encontrado.</p>
              <p className="text-xs mt-1">Cadastre dentistas primeiro para gerenciar horários.</p>
            </div>
          )}
        </div>
      )}

      <SlotDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) { setEdit(null); setSelectedDentistId(undefined); fetch() }
        }}
        slot={edit}
        dentistId={selectedDentistId}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Horário"
        description="Tem certeza que deseja excluir este horário? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
      />
    </div>
  )
}

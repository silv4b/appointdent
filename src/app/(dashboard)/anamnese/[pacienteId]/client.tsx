"use client"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/data-table-pagination"
import { deleteAnamneseSession, getAnamneseForExport, saveAnamneseSession, updateAnamneseSession } from "@/lib/actions/anamnese"
import { getMyAnamnesisTemplates } from "@/lib/actions/anamnesis-templates"
import { generateAnamnesePdf } from "@/lib/utils/export-anamnese-pdf"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Database } from "@/types/database"
import { format } from "date-fns"
import { ChevronDown, ChevronUp, Eye, FileDown, FileText, GripVertical, Loader2, Maximize2, Minimize2, MoreVertical, Pen, Plus, Stethoscope, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: { name: string } | null
  dentists: { name: string } | null
  procedures: { name: string; color: string | null; duration_minutes: number } | null
}

type AnamneseSession = Database["public"]["Tables"]["anamnese_sessions"]["Row"] & {
  appointments: { patients: { name: string } | null; dentists: { name: string } | null } | null
  patients: { name: string } | null
  dentists: { name: string } | null
}

interface AnamneseField {
  _id: number
  label: string
  content: string
}

export function PacienteAnamneseClient({ pacienteId, appointmentId, sessionId }: { pacienteId: string; appointmentId?: string; sessionId?: string }) {
  const [patient, setPatient] = useState<{ id: string; name: string; email: string | null; phone: string | null; birth_date: string | null; notes: string | null } | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [sessions, setSessions] = useState<AnamneseSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [dentists, setDentists] = useState<Database["public"]["Tables"]["dentists"]["Row"][]>([])
  const [selectedDentistId, setSelectedDentistId] = useState("")

  const [formTitle, setFormTitle] = useState("")
  const [formFields, setFormFields] = useState<AnamneseField[]>([{ _id: 0, label: "", content: "" }])
  const [formKey, setFormKey] = useState(0)
  const fieldInputsRef = useRef<(HTMLInputElement | null)[]>([])
  const fieldIdCounter = useRef(1)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [viewAppointment, setViewAppointment] = useState<Appointment | null>(null)
  const [viewSession, setViewSession] = useState<AnamneseSession | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [availableTemplates, setAvailableTemplates] = useState<{ id: string; name: string; fields: { label: string }[] }[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [focused, setFocused] = useState(false)
  const [linkedAppointment, setLinkedAppointment] = useState<Appointment | null>(null)

  const statusColorMap: Record<string, string> = {
    scheduled: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }

  const statusLabelMap: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    in_progress: "Em Andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
  }

  // Filtros e ordenação
  const [anamSearch, setAnamSearch] = useState("")
  const [anamDateStart, setAnamDateStart] = useState("")
  const [anamDateEnd, setAnamDateEnd] = useState("")
  const [apptSortCol, setApptSortCol] = useState<"start_time" | "dentists.name" | "procedures.name">("start_time")
  const [apptSortDir, setApptSortDir] = useState<"asc" | "desc">("desc")
  const [anamSortCol, setAnamSortCol] = useState<"created_at" | "title" | "dentists.name">("created_at")
  const [anamSortDir, setAnamSortDir] = useState<"asc" | "desc">("desc")

  const toggleApptSort = (col: typeof apptSortCol) => {
    if (apptSortCol === col) setApptSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setApptSortCol(col); setApptSortDir("asc") }
  }

  const toggleAnamSort = (col: typeof anamSortCol) => {
    if (anamSortCol === col) setAnamSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setAnamSortCol(col); setAnamSortDir("asc") }
  }

  const filteredAppointments = [...appointments]
    .filter((a) => {
      if (anamDateStart && a.start_time < anamDateStart) return false
      if (anamDateEnd && a.start_time > anamDateEnd + "T23:59:59") return false
      return true
    })
    .sort((a, b) => {
      const dir = apptSortDir === "asc" ? 1 : -1
      if (apptSortCol === "start_time") return (new Date(a.start_time).getTime() - new Date(b.start_time).getTime()) * dir
      if (apptSortCol === "dentists.name") return ((a.dentists?.name ?? "").localeCompare(b.dentists?.name ?? "")) * dir
      if (apptSortCol === "procedures.name") return ((a.procedures?.name ?? "").localeCompare(b.procedures?.name ?? "")) * dir
      return 0
    })

  const filteredSessions = [...sessions]
    .filter((s) => {
      if (anamSearch) {
        const q = anamSearch.toLowerCase()
        const titleMatch = (s.title ?? "").toLowerCase().includes(q)
        const dentistMatch = (s.dentists?.name ?? s.appointments?.dentists?.name ?? "").toLowerCase().includes(q)
        if (!titleMatch && !dentistMatch) return false
      }
      if (anamDateStart && s.created_at < anamDateStart) return false
      if (anamDateEnd && s.created_at > anamDateEnd + "T23:59:59") return false
      return true
    })
    .sort((a, b) => {
      const dir = anamSortDir === "asc" ? 1 : -1
      if (anamSortCol === "created_at") return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
      if (anamSortCol === "title") return ((a.title ?? "").localeCompare(b.title ?? "")) * dir
      if (anamSortCol === "dentists.name") return ((a.dentists?.name ?? a.appointments?.dentists?.name ?? "").localeCompare(b.dentists?.name ?? b.appointments?.dentists?.name ?? "")) * dir
      return 0
    })

  // Paginação
  const [anamPage, setAnamPage] = useState(1)
  const [anamPageSize, setAnamPageSize] = useState(20)
  const anamTotal = filteredSessions.length
  const anamTotalPages = Math.ceil(anamTotal / anamPageSize)
  const paginatedSessions = filteredSessions.slice((anamPage - 1) * anamPageSize, anamPage * anamPageSize)

  const [apptPage, setApptPage] = useState(1)
  const [apptPageSize, setApptPageSize] = useState(20)
  const apptTotal = filteredAppointments.length
  const apptTotalPages = Math.ceil(apptTotal / apptPageSize)
  const paginatedAppointments = filteredAppointments.slice((apptPage - 1) * apptPageSize, apptPage * apptPageSize)

  useEffect(() => {
    if (anamSearch || anamDateStart || anamDateEnd) setAnamPage(1)
  }, [anamSearch, anamDateStart, anamDateEnd])

  useEffect(() => {
    if (anamDateStart || anamDateEnd) setApptPage(1)
  }, [anamDateStart, anamDateEnd])

  useEffect(() => {
    if (appointmentId && appointments.length > 0) {
      const found = appointments.find((a) => a.id === appointmentId)
      setLinkedAppointment(found ?? null)
    }
  }, [appointmentId, appointments])

  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      const found = sessions.find((s) => s.id === sessionId)
      if (found) setViewSession(found)
    }
  }, [sessionId, sessions])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

      ; (async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const [patientRes, apptsRes, sessionsRes, profileRes, dentistsRes] = await Promise.all([
          supabase.from("patients").select("*").eq("id", pacienteId).single(),
          supabase
            .from("appointments")
            .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
            .eq("patient_id", pacienteId)
            .order("start_time", { ascending: false }),
          supabase
            .from("anamnese_sessions")
            .select("*, appointments(patients(name), dentists(name)), patients(name), dentists(name)")
            .eq("patient_id", pacienteId)
            .order("created_at", { ascending: false }),
          supabase.from("profiles").select("role").eq("id", user?.id ?? "").single(),
          supabase.from("dentists").select("*").order("name"),
        ])

        if (cancelled) return

        setPatient(patientRes.data ?? null)
        setAppointments(apptsRes.data ?? [])
        setSessions(sessionsRes.data as AnamneseSession[] ?? [])
        setUserRole(profileRes.data?.role ?? null)
        setDentists(dentistsRes.data ?? [])
        setLoading(false)
      })()

    return () => { cancelled = true }
  }, [pacienteId])

  async function refresh() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [patientRes, apptsRes, sessionsRes, profileRes, dentistsRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", pacienteId).single(),
      supabase
        .from("appointments")
        .select("*, patients(name), dentists(name), procedures(name, color, duration_minutes)")
        .eq("patient_id", pacienteId)
        .order("start_time", { ascending: false }),
      supabase
        .from("anamnese_sessions")
        .select("*, appointments(patients(name), dentists(name)), patients(name), dentists(name)")
        .eq("patient_id", pacienteId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("role").eq("id", user?.id ?? "").single(),
      supabase.from("dentists").select("*").order("name"),
    ])

    setPatient(patientRes.data ?? null)
    setAppointments(apptsRes.data ?? [])
    setSessions(sessionsRes.data as AnamneseSession[] ?? [])
    setUserRole(profileRes.data?.role ?? null)
    setDentists(dentistsRes.data ?? [])
    setLoading(false)
  }

  const addField = () => {
    const id = fieldIdCounter.current++
    setFormFields([{ _id: id, label: "", content: "" }, ...formFields])
    setTimeout(() => {
      fieldInputsRef.current[0]?.focus()
    }, 0)
  }

  const openImportDialog = async () => {
    setLoadingTemplates(true)
    const res = await getMyAnamnesisTemplates()
    if ("data" in res) {
      setAvailableTemplates(res.data as unknown as { id: string; name: string; fields: { label: string; description?: string; defaultContent?: string }[] }[])
    }
    setLoadingTemplates(false)
    setImportDialogOpen(true)
  }

  const importTemplate = (template: { name: string; fields: { label: string; description?: string; defaultContent?: string }[] }) => {
    setFormTitle(template.name)
    const nextFields: AnamneseField[] = template.fields.map((f) => ({
      _id: fieldIdCounter.current++,
      label: f.label,
      content: f.defaultContent ?? "",
    }))
    setFormFields(nextFields.length > 0 ? nextFields : [{ _id: fieldIdCounter.current++, label: "", content: "" }])
    setFormKey((k) => k + 1)
    setImportDialogOpen(false)
  }

  const removeField = (index: number) => {
    if (formFields.length <= 1) return
    setFormFields(formFields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, key: keyof AnamneseField, value: string) => {
    const updated = [...formFields]
    updated[index] = { ...updated[index], [key]: value }
    setFormFields(updated)
  }

  const resetForm = () => {
    setFormTitle("")
    setFormFields([{ _id: 0, label: "", content: "" }])
    fieldIdCounter.current = 1
    setFormKey((k) => k + 1)
    setSelectedDentistId("")
    setEditingSessionId(null)
  }

  const handleSaveSession = async () => {
    if (!formTitle.trim()) {
      toast.error("Informe um título para a sessão")
      return
    }
    if (!editingSessionId && userRole !== "dentist" && !selectedDentistId) {
      toast.error("Selecione um dentista")
      return
    }

    const filledFields = formFields.filter((f) => f.label.trim())

    setSaving(true)
    const formData = new FormData()
    formData.set("title", formTitle.trim())
    formData.set("fields", JSON.stringify(filledFields))
    if (selectedDentistId) formData.set("dentist_id", selectedDentistId)
    if (appointmentId) formData.set("appointment_id", appointmentId)

    if (editingSessionId) {
      formData.set("id", editingSessionId)
      const result = await updateAnamneseSession(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Sessão atualizada")
        resetForm()
        refresh()
      }
    } else {
      formData.set("patient_id", pacienteId)
      const result = await saveAnamneseSession(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Sessão salva com sucesso")
        resetForm()
        refresh()
      }
    }
    setSaving(false)
  }

  const openEdit = (s: AnamneseSession) => {
    setFormTitle(s.title ?? "")
    const rawFields = Array.isArray(s.fields) ? (s.fields as unknown as AnamneseField[]) : []
    const fields = rawFields.length > 0
      ? rawFields.map((f) => ({ ...f, _id: fieldIdCounter.current++ }))
      : [{ _id: fieldIdCounter.current++, label: "", content: "" }]
    setFormFields(fields)
    setFormKey((k) => k + 1)
    setSelectedDentistId(s.dentist_id ?? "")
    setEditingSessionId(s.id)
    if (patient) window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEdit = () => {
    resetForm()
  }

  const handleDelete = async () => {
    if (!deleteSessionId) return
    setDeleting(true)
    const result = await deleteAnamneseSession(deleteSessionId)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Sessão removida")
      setDeleteDialogOpen(false)
      setDeleteSessionId(null)
      refresh()
    }
    setDeleting(false)
  }

  const handleExportSession = async (sessionId: string) => {
    const result = await getAnamneseForExport(sessionId)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    generateAnamnesePdf(result.data)
    toast.success("PDF exportado com sucesso")
  }

  const handleExportAll = async () => {
    for (const s of sessions) {
      const result = await getAnamneseForExport(s.id)
      if ("error" in result) {
        toast.error(`Erro ao exportar "${s.title}": ${result.error}`)
        continue
      }
      generateAnamnesePdf(result.data)
      await new Promise((r) => setTimeout(r, 500))
    }
    toast.success("Todas as sessões exportadas")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Stethoscope className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Paciente não encontrado</p>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-8", focused ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-5")}>
      {/* Sidebar — Sessões anteriores */}
      <div className={cn("mt-11 order-2 space-y-6", focused ? "hidden" : "xl:order-1 xl:col-span-2")}>
        {/* Filtros */}
        <div className="space-y-3">
          <Input
            placeholder="Buscar por título ou dentista..."
            value={anamSearch}
            onChange={(e) => setAnamSearch(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground">Data início</Label>
              <Input type="date" value={anamDateStart} onChange={(e) => setAnamDateStart(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground">Data fim</Label>
              <Input type="date" value={anamDateEnd} onChange={(e) => setAnamDateEnd(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
        </div>

        {/* Sessões Anteriores */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Sessões Anteriores ({filteredSessions.length})
            </h2>
            {filteredSessions.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportAll} title="Exportar todas as sessões">
                <FileDown className="mr-1 h-3.5 w-3.5" />
                Exportar Todas
              </Button>
            )}
          </div>
          {filteredSessions.length > 0 ? (
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleAnamSort("title")}>
                      <span className="inline-flex items-center gap-1">
                        Título
                        {anamSortCol === "title" && (anamSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleAnamSort("created_at")}>
                      <span className="inline-flex items-center gap-1">
                        Data
                        {anamSortCol === "created_at" && (anamSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleAnamSort("dentists.name")}>
                      <span className="inline-flex items-center gap-1">
                        Dentista
                        {anamSortCol === "dentists.name" && (anamSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSessions.length > 0 ? paginatedSessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-xs">{s.title ?? "Sessão"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.dentists?.name ?? s.appointments?.dentists?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-36">
                            <DropdownMenuItem onClick={() => setViewSession(s)}>
                              <Eye className="h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportSession(s.id)}>
                              <FileDown className="h-4 w-4" />
                              Exportar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Pen className="h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => { setDeleteSessionId(s.id); setDeleteDialogOpen(true) }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma sessão encontrada com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <DataTablePagination
                page={anamPage}
                pageSize={anamPageSize}
                total={anamTotal}
                onPageChange={setAnamPage}
                onPageSizeChange={(s) => { setAnamPageSize(s); setAnamPage(1) }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Nenhuma sessão anterior</p>
              <p className="text-xs text-muted-foreground">As sessões salvas aparecerão aqui.</p>
            </div>
          )}
        </div>

        {/* Histórico de Atendimentos */}
        {filteredAppointments.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Histórico de Atendimentos ({apptTotal})
            </h2>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleApptSort("dentists.name")}>
                      <span className="inline-flex items-center gap-1">
                        Dentista
                        {apptSortCol === "dentists.name" && (apptSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleApptSort("start_time")}>
                      <span className="inline-flex items-center gap-1">
                        Data
                        {apptSortCol === "start_time" && (apptSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleApptSort("procedures.name")}>
                      <span className="inline-flex items-center gap-1">
                        Procedimento
                        {apptSortCol === "procedures.name" && (apptSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAppointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-xs">{a.dentists?.name ?? "-"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(a.start_time), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.procedures?.name ?? "-"}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-[10px] font-medium capitalize min-w-[7.5rem]", statusColorMap[a.status as keyof typeof statusColorMap] ?? "bg-muted text-muted-foreground")}>
                          {statusLabelMap[a.status as keyof typeof statusLabelMap] ?? a.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewAppointment(a)} title="Ver detalhes">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination
                page={apptPage}
                pageSize={apptPageSize}
                total={apptTotal}
                onPageChange={setApptPage}
                onPageSizeChange={(s) => { setApptPageSize(s); setApptPage(1) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main — Formulário inline */}
      <div className={cn("order-1", focused ? "xl:col-span-1" : "xl:col-span-3")}>
        <div className="rounded-2xl border bg-card mt-11">
          <div className="border-b px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
                {!focused && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {patient.phone && <span className="mr-4">Tel: {patient.phone}</span>}
                    {patient.email && <span className="mr-4">Email: {patient.email}</span>}
                    {patient.birth_date && <span>Nasc: {format(new Date(patient.birth_date), "dd/MM/yyyy")}</span>}
                  </p>
                )}
                {linkedAppointment && (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Vinculado ao agendamento de{" "}
                    <strong>{format(new Date(linkedAppointment.start_time), "dd/MM/yyyy HH:mm")}</strong>
                    {linkedAppointment.dentists?.name && (
                      <>com <strong>{linkedAppointment.dentists.name}</strong></>
                    )}
                    {linkedAppointment.procedures?.name && (
                      <>({linkedAppointment.procedures.name})</>
                    )}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setFocused(!focused)}>
                {focused ? <Minimize2 className="mr-1.5 h-4 w-4" /> : <Maximize2 className="mr-1.5 h-4 w-4" />}
                {focused ? "Sair do modo foco" : "Modo Foco"}
              </Button>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {userRole !== "dentist" && (
                <div>
                  <Label htmlFor="inline-dentist">Dentista responsável</Label>
                  <Select value={selectedDentistId} onValueChange={(v) => setSelectedDentistId(v ?? "")}>
                    <SelectTrigger id="inline-dentist" className="mt-1 w-full">
                      <span className="flex flex-1 text-left">{selectedDentistId ? dentists.find((d) => d.id === selectedDentistId)?.name ?? selectedDentistId : <span className="text-muted-foreground">Selecione um dentista...</span>}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {dentists.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={userRole === "dentist" ? "sm:col-span-2" : ""}>
                <Label htmlFor="inline-title">Título da Sessão</Label>
                <Input
                  id="inline-title"
                  placeholder="Ex: Sessão de saúde bucal"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Campos da Anamnese</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={openImportDialog}>
                    <FileDown className="mr-1 h-3.5 w-3.5" />
                    Usar Modelo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addField}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar Campo
                  </Button>
                </div>
              </div>

              {formFields.map((field, i) => (
                <div key={`${formKey}-${field._id}`} className="rounded-xl border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <span className="text-xs font-medium text-muted-foreground">Campo {formFields.length - i}</span>
                    </div>
                    {formFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemovingIndex(i)}
                        className="h-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Nome do campo</Label>
                      <Input
                        ref={(el) => { fieldInputsRef.current[i] = el }}
                        placeholder="Ex: Saúde bucal, Histórico familiar..."
                        value={field.label}
                        onChange={(e) => updateField(i, "label", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Conteúdo</Label>
                      <RichTextEditor
                        value={field.content}
                        onChange={(v) => updateField(i, "content", v)}
                        className="mt-1"
                        minHeight={focused ? "160px" : "80px"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingSessionId && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Pen className="h-4 w-4 shrink-0" />
                Editando: <strong>{formTitle}</strong>
                <span className="ml-auto text-xs text-muted-foreground">As alterações substituirão a sessão original.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={handleSaveSession}
                disabled={saving || !formTitle.trim() || (!editingSessionId && userRole !== "dentist" && !selectedDentistId)}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSessionId ? "Confirmar Edição" : "Salvar Sessão"}
              </Button>
              {editingSessionId ? (
                <Button variant="outline" size="lg" onClick={cancelEdit} disabled={saving}>
                  Cancelar
                </Button>
              ) : (
                <Button variant="ghost" size="lg" onClick={() => setConfirmClear(true)} disabled={saving}>
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Remove Field */}
      <Dialog open={removingIndex !== null} onOpenChange={(o) => { if (!o) setRemovingIndex(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Campo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este campo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingIndex(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (removingIndex !== null) removeField(removingIndex); setRemovingIndex(null) }}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Clear Form */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar Formulário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja limpar todos os campos? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { resetForm(); setConfirmClear(false) }}>
              Limpar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Sessão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover esta sessão? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Appointment Dialog */}
      <Dialog open={viewAppointment !== null} onOpenChange={(o) => { if (!o) setViewAppointment(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Atendimento</DialogTitle>
          </DialogHeader>
          {viewAppointment && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paciente</span>
                  <span className="font-medium">{viewAppointment.patients?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dentista</span>
                  <span className="font-medium">{viewAppointment.dentists?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Procedimento</span>
                  <span className="font-medium">{viewAppointment.procedures?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Início</span>
                  <span>{format(new Date(viewAppointment.start_time), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Término</span>
                  <span>{format(new Date(viewAppointment.end_time), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Situação</span>
                  <span className="capitalize">{viewAppointment.status}</span>
                </div>
                {viewAppointment.notes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Observações</span>
                    <span className="whitespace-pre-wrap">{viewAppointment.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewAppointment(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Session Dialog */}
      <Dialog open={viewSession !== null} onOpenChange={(o) => { if (!o) setViewSession(null) }}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewSession?.title ?? "Sessão de Anamnese"}</DialogTitle>
          </DialogHeader>
          {viewSession && (
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paciente</span>
                  <span className="font-medium">{patient?.name ?? viewSession.patients?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dentista</span>
                  <span className="font-medium">
                    {viewSession.dentists?.name ?? viewSession.appointments?.dentists?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span>{format(new Date(viewSession.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>

              <div className="space-y-3">
                {Array.isArray(viewSession.fields) && viewSession.fields.length > 0 ? (
                  viewSession.fields.slice().reverse().map((f: any, fi: number) => (
                    <div key={fi} className="rounded-lg border bg-card p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        {f.label}
                      </p>
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: f.content || "—" }}
                      />
                    </div>
                  ))
                ) : viewSession.notes ? (
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Observações
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{viewSession.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum campo preenchido nesta sessão.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSession(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar Modelo</DialogTitle>
            <DialogDescription>Selecione um dos seus modelos de anamnese para preencher os campos.</DialogDescription>
          </DialogHeader>
          {loadingTemplates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : availableTemplates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum modelo disponível. Crie modelos em{" "}
              <a href="/minhas-anamneses" className="underline underline-offset-2 hover:text-foreground">
                Minhas Anamneses
              </a>.
            </p>
          ) : (
            <div className="space-y-2">
              {availableTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => importTemplate(t)}
                  className="w-full rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <div className="mt-1 space-y-0.5">
                    {Array.from(t.fields as any[]).reverse().map((f: any, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium">{f.label}</span>
                        {f.description ? <span> — {f.description}</span> : null}
                        {f.defaultContent ? <span className="text-muted-foreground/50 ml-1">(c/ conteúdo padrão)</span> : null}
                      </p>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

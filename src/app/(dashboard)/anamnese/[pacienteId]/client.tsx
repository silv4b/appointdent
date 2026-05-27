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
import { deleteAnamneseSession, saveAnamneseSession, updateAnamneseSession } from "@/lib/actions/anamnese"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { format } from "date-fns"
import { BookOpen, FileText, GripVertical, Loader2, Pen, Plus, Stethoscope, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: { name: string } | null
  dentists: { name: string } | null
  procedures: { name: string; color: string | null; duration_minutes: number } | null
}

type AnamneseSession = Database["public"]["Tables"]["anamnese_sessions"]["Row"] & {
  appointments: { patients: { name: string } | null; dentists: { name: string } | null } | null
}

interface AnamneseField {
  label: string
  content: string
}

export function PacienteAnamneseClient({ pacienteId }: { pacienteId: string }) {
  const [patient, setPatient] = useState<{ id: string; name: string; phone: string | null; birth_date: string | null; notes: string | null } | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [sessions, setSessions] = useState<AnamneseSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [dentists, setDentists] = useState<Database["public"]["Tables"]["dentists"]["Row"][]>([])
  const [selectedDentistId, setSelectedDentistId] = useState("")

  const [formTitle, setFormTitle] = useState("")
  const [formFields, setFormFields] = useState<AnamneseField[]>([{ label: "", content: "" }])
  const fieldInputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [editSession, setEditSession] = useState<AnamneseSession | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editFields, setEditFields] = useState<AnamneseField[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    ;(async () => {
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
          .select("*, appointments(patients(name), dentists(name))")
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
        .select("*, appointments(patients(name), dentists(name))")
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
    setFormFields([{ label: "", content: "" }, ...formFields])
    setTimeout(() => {
      fieldInputsRef.current[0]?.focus()
    }, 0)
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
    setFormFields([{ label: "", content: "" }])
    setSelectedDentistId("")
  }

  const handleSaveSession = async () => {
    if (!formTitle.trim()) {
      toast.error("Informe um título para a sessão")
      return
    }
    if (userRole !== "dentist" && !selectedDentistId) {
      toast.error("Selecione um dentista")
      return
    }

    const filledFields = formFields.filter((f) => f.label.trim())

    setSaving(true)
    const formData = new FormData()
    formData.set("title", formTitle.trim())
    formData.set("patient_id", pacienteId)
    formData.set("fields", JSON.stringify(filledFields))
    if (selectedDentistId) formData.set("dentist_id", selectedDentistId)
    const result = await saveAnamneseSession(formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Sessão salva com sucesso")
      resetForm()
      refresh()
    }
    setSaving(false)
  }

  const openEdit = (s: AnamneseSession) => {
    setEditSession(s)
    setEditTitle(s.title ?? "")
    setEditFields(Array.isArray(s.fields) ? (s.fields as unknown as AnamneseField[]) : [])
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editSession) return
    setSavingEdit(true)
    const formData = new FormData()
    formData.set("id", editSession.id)
    formData.set("title", editTitle.trim())
    formData.set("fields", JSON.stringify(editFields.filter((f) => f.label.trim())))
    const result = await updateAnamneseSession(formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Sessão atualizada")
      setEditDialogOpen(false)
      setEditSession(null)
      refresh()
    }
    setSavingEdit(false)
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
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
      {/* Sidebar — Sessões anteriores */}
      <div className="order-2 space-y-6 xl:order-1 xl:col-span-2">
        {sessions.length > 0 ? (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Sessões Anteriores ({sessions.length})
            </h2>
            <div className="space-y-4">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-xl border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{s.title ?? "Sessão"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}>
                        <Pen className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => { setDeleteSessionId(s.id); setDeleteDialogOpen(true) }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {Array.isArray(s.fields) && s.fields.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {(s.fields as unknown as AnamneseField[]).map((f, fi) => (
                        <div key={fi} className="rounded-lg bg-muted/30 p-3">
                          <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                          <div
                            className="prose prose-sm dark:prose-invert mt-0.5 max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: f.content || "—" }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : s.notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{s.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Nenhuma sessão anterior</p>
            <p className="text-xs text-muted-foreground">As sessões salvas aparecerão aqui.</p>
          </div>
        )}

        {appointments.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Histórico de Atendimentos
            </h2>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dentista</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-xs">{a.dentists?.name ?? "-"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(a.start_time), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-[10px] font-medium capitalize shadow-sm bg-muted text-muted-foreground">
                          {a.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Main — Formulário inline */}
      <div className="order-1 xl:col-span-3">
        <div className="rounded-2xl border bg-card shadow-sm mt-11">
          <div className="border-b px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {patient.phone && <span className="mr-4">Tel: {patient.phone}</span>}
                  {patient.birth_date && <span>Nasc: {patient.birth_date}</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {userRole !== "dentist" && (
                <div>
                  <Label htmlFor="inline-dentist">Dentista responsável</Label>
                  <Select value={selectedDentistId} onValueChange={(v) => setSelectedDentistId(v ?? "")}>
                    <SelectTrigger id="inline-dentist" className="mt-1">
                      <SelectValue placeholder="Selecione um dentista..." />
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
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Adicionar Campo
                </Button>
              </div>

              {formFields.map((field, i) => (
                <div key={i} className="rounded-xl border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <span className="text-xs font-medium text-muted-foreground">Campo {i + 1}</span>
                    </div>
                    {formFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(i)}
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
                        minHeight="80px"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={handleSaveSession}
                disabled={saving || !formTitle.trim() || (userRole !== "dentist" && !selectedDentistId)}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Sessão
              </Button>
              <Button variant="ghost" size="lg" onClick={resetForm} disabled={saving}>
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            {editFields.map((f, i) => (
              <div key={i} className="rounded-lg border bg-muted/20 p-3">
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do campo"
                    value={f.label}
                    onChange={(e) => {
                      const next = [...editFields]
                      next[i] = { ...next[i], label: e.target.value }
                      setEditFields(next)
                    }}
                  />
                  <RichTextEditor
                    value={f.content}
                    onChange={(v) => {
                      const next = [...editFields]
                      next[i] = { ...next[i], content: v }
                      setEditFields(next)
                    }}
                    minHeight="60px"
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()}>
              {savingEdit && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Salvar
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
    </div>
  )
}

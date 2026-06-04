"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Download, Pencil, Plus, Printer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/rich-text-editor"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  getPrescription,
  savePrescription,
  updatePrescription,
  getDentistList,
} from "@/lib/actions/prescriptions"
import { getClinicSettings } from "@/lib/actions/clinic-settings"
import { generatePrescriptionPdf } from "@/lib/utils/export-prescription-pdf"
import type { Database } from "@/types/database"

type PrescriptionData = Database["public"]["Tables"]["prescriptions"]["Row"] & {
  patients: { name: string; phone: string | null } | null
  dentists: { name: string; specialty: string | null; cro: string | null } | null
}

interface MedicationField {
  _id: number
  medicamento: string
  dosagem: string
  observacao: string
}

export function PrescricaoFormClient({
  prescriptionId,
  editMode,
}: {
  prescriptionId: string
  editMode: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = prescriptionId === "nova"

  const [prescription, setPrescription] = useState<PrescriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [patientId, setPatientId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientSearch, setPatientSearch] = useState("")
  const [patientResults, setPatientResults] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [patientOpen, setPatientOpen] = useState(false)
  const [dentistId, setDentistId] = useState("")
  const [dentists, setDentists] = useState<{ id: string; name: string; cro: string | null }[]>([])
  const [generalObservations, setGeneralObservations] = useState("")
  const [medications, setMedications] = useState<MedicationField[]>([])
  const fieldIdCounter = useRef(0)
  const medicationRefs = useRef<(HTMLInputElement | null)[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const patientSearchRef = useRef<HTMLInputElement>(null)
  const [clinic, setClinic] = useState<Database["public"]["Tables"]["clinic_settings"]["Row"] | null>(null)
  const [removingMedication, setRemovingMedication] = useState<MedicationField | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setUserRole(data.role)
          if (data.role === "dentist") {
            supabase.from("dentists").select("id").eq("profile_id", user.id).single().then(({ data: dent }) => {
              if (dent) setDentistId(dent.id)
            })
          }
        }
      })
    })
  }, [supabase])

  useEffect(() => {
    getDentistList().then(setDentists)
    getClinicSettings().then((result) => {
      if ("data" in result && result.data) setClinic(result.data as Database["public"]["Tables"]["clinic_settings"]["Row"])
    })
  }, [])

  useEffect(() => {
    if (!isNew) {
      getPrescription(prescriptionId).then((result) => {
        if ("error" in result) {
          toast.error(result.error)
          router.push("/prescricao")
          return
        }
        const data = result.data as PrescriptionData
        setPrescription(data)
        setTitle(data.title)
        setPatientId(data.patient_id)
        setPatientName(data.patients?.name ?? "")
        setDentistId(data.dentist_id)
        setGeneralObservations(data.general_observations ?? "")
        const meds = (data.medications as { medicamento: string; dosagem: string; observacao: string }[] ?? []).map((m) => ({
          _id: fieldIdCounter.current++,
          medicamento: m.medicamento,
          dosagem: m.dosagem,
          observacao: m.observacao,
        }))
        setMedications(meds)
        setLoading(false)
      })
    } else {
      const prefillPatientId = searchParams.get("pacienteId")
      if (prefillPatientId) {
        setPatientId(prefillPatientId)
        supabase.from("patients").select("id, name").eq("id", prefillPatientId).single().then(({ data }) => {
          if (data) setPatientName(data.name)
        })
      }
      setLoading(false)
    }
  }, [prescriptionId, isNew, router, searchParams, supabase])

  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientResults([])
      return
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, name, phone")
        .ilike("name", `%${patientSearch}%`)
        .order("name")
        .limit(10)
      setPatientResults(data ?? [])
    }, 300)
    return () => clearTimeout(timeout)
  }, [patientSearch, supabase])

  const selectPatient = (id: string, name: string) => {
    setPatientId(id)
    setPatientName(name)
    setPatientOpen(false)
    setPatientSearch("")
    setPatientResults([])
  }

  const addMedication = () => {
    const id = fieldIdCounter.current++
    setMedications([{ _id: id, medicamento: "", dosagem: "", observacao: "" }, ...medications])
    setTimeout(() => {
      medicationRefs.current[0]?.focus()
    }, 0)
  }

  const removeMedication = (id: number) => {
    setMedications(medications.filter((m) => m._id !== id))
    setRemovingMedication(null)
  }

  const updateMedication = (id: number, field: keyof MedicationField, value: string) => {
    setMedications(medications.map((m) => (m._id === id ? { ...m, [field]: value } : m)))
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Informe um título para a receita"); return }
    if (!patientId) { toast.error("Selecione um paciente"); return }
    if (!dentistId) { toast.error("Selecione um dentista"); return }

    const filtered = medications.filter((m) => m.medicamento.trim())
    if (filtered.length === 0) { toast.error("Adicione pelo menos um medicamento"); return }

    setSaving(true)
    setSaveDialogOpen(false)
    const formData = new FormData()
    formData.set("title", title.trim())
    formData.set("patient_id", patientId)
    formData.set("dentist_id", dentistId)
    // Inverter para salvar no banco com o mais novo primeiro
    formData.set("medications", JSON.stringify(filtered.reverse().map((m) => ({
      medicamento: m.medicamento.trim(),
      dosagem: m.dosagem.trim(),
      observacao: m.observacao.trim(),
    }))))
    formData.set("general_observations", generalObservations)

    if (isNew) {
      const result = await savePrescription(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Receita cadastrada com sucesso!")
        router.push("/prescricao")
      }
    } else {
      formData.set("id", prescriptionId)
      const result = await updatePrescription(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Receita atualizada com sucesso!")
        router.push("/prescricao")
      }
    }
    setSaving(false)
  }

  const pdfData = useCallback(() => {
    if (!prescription) return null
    return {
      patientName: prescription.patients?.name ?? "Paciente",
      dentistName: prescription.dentists?.name ?? "Dentista",
      dentistSpecialty: prescription.dentists?.specialty ?? null,
      dentistCro: prescription.dentists?.cro ?? null,
      title: prescription.title,
      createdAt: prescription.created_at,
      medications: (prescription.medications as { medicamento: string; dosagem: string; observacao: string }[]) ?? [],
      generalObservations: prescription.general_observations ?? "",
      clinic: clinic ? {
        name: clinic.name,
        street: clinic.street,
        number: clinic.number,
        neighborhood: clinic.neighborhood,
        city: clinic.city,
        state: clinic.state,
        email: clinic.email,
        phone1: clinic.phone1,
        phone2: clinic.phone2,
        cnpj: clinic.cnpj,
        logo: clinic.logo,
      } : null,
    }
  }, [prescription, clinic])

  const handleExportPdf = async () => {
    const data = pdfData()
    if (!data) return
    const doc = generatePrescriptionPdf(data)
    const safeTitle = prescription!.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    const safePatient = (prescription!.patients?.name ?? "paciente").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    doc.save(`receita-${safePatient}-${safeTitle}.pdf`)
    toast.success("PDF baixado com sucesso!")
  }

  const handlePrint = () => {
    const data = pdfData()
    if (!data) return
    const doc = generatePrescriptionPdf(data)
    const blobUrl = doc.output("bloburl")
    window.open(blobUrl, "_blank")
    toast.success("PDF aberto para impressão!")
  }

  const isReceptionist = userRole === "receptionist"
  const isEditing = (isNew || editMode) && !isReceptionist

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if ((!isNew && !prescription) || (!isNew && !isEditing && !prescription)) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Receita não encontrada.</p>
      </div>
    )
  }

  if (!isEditing && prescription) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/prescricao")} title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{prescription.title}</h1>
            <p className="text-sm text-muted-foreground">
              {prescription.patients?.name ?? "Paciente"} &mdash; {format(new Date(prescription.created_at), "dd/MM/yyyy")}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {!isReceptionist && (
              <Button variant="outline" onClick={() => router.push(`/prescricao/${prescriptionId}?edit=true`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            <Button variant="outline" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Paciente:</span>
              <p className="font-medium">{prescription.patients?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Dentista:</span>
              <p className="font-medium">
                {prescription.dentists?.name ?? "—"}
                {prescription.dentists?.specialty && ` (${prescription.dentists.specialty})`}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Medicamentos</h3>
            <div className="space-y-3">
              {(prescription.medications as { medicamento: string; dosagem: string; observacao: string }[] ?? []).map((med, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <p className="font-medium">{med.medicamento}</p>
                  {med.dosagem && <p className="text-sm text-muted-foreground mt-1">Dosagem: {med.dosagem}</p>}
                  {med.observacao && <p className="text-sm text-muted-foreground mt-1">{med.observacao}</p>}
                </div>
              ))}
            </div>
          </div>

          {prescription.general_observations && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observações</h3>
              <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: prescription.general_observations }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/prescricao")} title="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? "Nova Receita" : "Editar Receita"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew ? "Preencha os dados da receita." : "Altere os dados da receita."}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Título da Receita</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Prescrição pós-operatória"
          />
        </div>

        <div className="relative">
          <label className="text-sm font-medium mb-1.5 block">Paciente</label>
          {isNew ? (
            <div className="relative">
              <Input
                ref={patientSearchRef}
                value={patientOpen ? patientSearch : patientName}
                onChange={(e) => { setPatientSearch(e.target.value); setPatientOpen(true) }}
                onFocus={() => setPatientOpen(true)}
                placeholder="Buscar paciente..."
              />
              {patientOpen && patientResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => selectPatient(p.id, p.name)}
                    >
                      {p.name}
                      {p.phone && <span className="text-muted-foreground ml-2">{p.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
              {patientOpen && patientSearch && patientResults.length === 0 && (
                <div className="absolute z-10 top-full mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground">
                  Nenhum paciente encontrado.
                </div>
              )}
              {patientName && !patientOpen && (
                <p className="text-xs text-muted-foreground mt-1">{patientId}</p>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium">{prescription?.patients?.name ?? "—"}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Dentista</label>
          {isNew ? (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={dentistId}
              onChange={(e) => setDentistId(e.target.value)}
              disabled={userRole === "dentist"}
            >
              <option value="">Selecione um dentista</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-medium">
              {prescription?.dentists?.name ?? "—"}
              {prescription?.dentists?.specialty && ` (${prescription.dentists.specialty})`}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Medicamentos</label>
            <Button variant="outline" size="sm" onClick={addMedication}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-3">
            {medications.map((med, i) => (
              <div key={med._id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-3">
                    <Input
                      ref={(el) => { medicationRefs.current[i] = el }}
                      value={med.medicamento}
                      onChange={(e) => updateMedication(med._id, "medicamento", e.target.value)}
                      placeholder="Nome do medicamento"
                    />
                    <Input
                      value={med.dosagem}
                      onChange={(e) => updateMedication(med._id, "dosagem", e.target.value)}
                      placeholder="Dosagem (ex: 500mg, 1 comprimido 2x ao dia)"
                    />
                    <Input
                      value={med.observacao}
                      onChange={(e) => updateMedication(med._id, "observacao", e.target.value)}
                      placeholder="Observação (opcional)"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => setRemovingMedication(med)}
                    title="Remover medicamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {medications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum medicamento adicionado.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Observações Gerais</label>
          <RichTextEditor
            value={generalObservations}
            onChange={setGeneralObservations}
            placeholder="Instruções adicionais para o paciente..."
            minHeight="120px"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setCancelDialogOpen(true)}>
            Cancelar
          </Button>
          <Button onClick={() => setSaveDialogOpen(true)} disabled={saving}>
            {saving ? "Salvando..." : isNew ? "Cadastrar Receita" : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </div>

      <ConfirmDialog
        open={!!removingMedication}
        onOpenChange={(open) => { if (!open) setRemovingMedication(null) }}
        title="Remover Medicamento"
        description={`Tem certeza que deseja remover "${removingMedication?.medicamento || "este medicamento"}" da receita?`}
        confirmLabel="Remover"
        onConfirm={() => removingMedication && removeMedication(removingMedication._id)}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Descartar alterações?"
        description="As informações preenchidas serão perdidas."
        confirmLabel="Descartar"
        onConfirm={() => router.push("/prescricao")}
      />

      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Confirmar receita"
        description={`Tem certeza que deseja ${isNew ? "cadastrar" : "salvar as alterações da"} receita?`}
        confirmLabel={isNew ? "Cadastrar" : "Salvar"}
        variant="default"
        onConfirm={handleSave}
      />
    </>
  )
}

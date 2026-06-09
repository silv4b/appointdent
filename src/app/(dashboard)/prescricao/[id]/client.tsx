"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Download, FileText, Pencil, Plus, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DynamicCard } from "@/components/dynamic-card"
import { DynamicField } from "@/components/dynamic-field"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { toast } from "sonner"
import {
  getPrescription,
  savePrescription,
  updatePrescription,
  getDentistList,
} from "@/lib/actions/prescriptions"
import { getClinicSettings } from "@/lib/actions/clinic-settings"
import { getUserSessionData } from "@/lib/actions/session"
import { getAnamneseSessionByAppointment, getPatientName, searchPatientsByName } from "@/lib/actions/queries"
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
  const [patientLocked, setPatientLocked] = useState(false)
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
  const [linkedAnamnese, setLinkedAnamnese] = useState<{ title: string; fields: { label: string; description?: string; defaultContent?: string; content?: string }[]; notes: string | null; created_at: string; dentists: { name: string } | null } | null>(null)
  const [anamneseModalOpen, setAnamneseModalOpen] = useState(false)

  useEffect(() => {
    getUserSessionData().then((result) => {
      if ("data" in result) {
        setUserRole(result.data.role)
        if (result.data.role === "dentist" && result.data.dentistId) {
          setDentistId(result.data.dentistId)
        }
      }
    })
  }, [])

  useEffect(() => {
    getDentistList().then((result) => {
      if ("data" in result) setDentists(result.data ?? [])
    })
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
        if (data.appointment_id) {
          getAnamneseSessionByAppointment(data.appointment_id).then((r) => {
            if ("data" in r && r.data) setLinkedAnamnese(r.data as unknown as { title: string; fields: { label: string; description?: string; defaultContent?: string; content?: string }[]; notes: string | null; created_at: string; dentists: { name: string } | null })
          })
        }
        setLoading(false)
      })
    } else {
      const prefillPatientId = searchParams.get("pacienteId")
      if (prefillPatientId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPatientId(prefillPatientId)
        setPatientLocked(true)
        getPatientName(prefillPatientId).then((r) => {
          if ("data" in r && r.data) setPatientName(r.data.name)
        })
      }
      const appointmentIdParam = searchParams.get("appointmentId")
      setLoading(false)
      if (appointmentIdParam) {
        getAnamneseSessionByAppointment(appointmentIdParam).then((r) => {
          if ("data" in r && r.data) setLinkedAnamnese(r.data as unknown as { title: string; fields: { label: string; description?: string; defaultContent?: string; content?: string }[]; notes: string | null; created_at: string; dentists: { name: string } | null })
        })
      }
    }
  }, [prescriptionId, isNew, router, searchParams])

  useEffect(() => {
    if (!patientSearch.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPatientResults([])
      return
    }
    const timeout = setTimeout(async () => {
      const r = await searchPatientsByName(patientSearch)
      if ("data" in r) setPatientResults(r.data)
    }, 300)
    return () => clearTimeout(timeout)
  }, [patientSearch])

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
    const appointmentIdParam = searchParams.get("appointmentId")
    if (appointmentIdParam) formData.set("appointment_id", appointmentIdParam)
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
        goBack()
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

  const anamneseReturnUrl = (() => {
    const isReturn = searchParams.get("returnTo") === "anamnese"
    const pid = searchParams.get("pacienteId")
    const apptId = searchParams.get("appointmentId")
    if (isReturn && pid) {
      return `/anamnese/${pid}${apptId ? `?appointmentId=${apptId}` : ""}`
    }
    return null
  })()

  const goBack = () => {
    router.push(anamneseReturnUrl ?? "/prescricao")
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
      <>
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

          {linkedAnamnese && (
            <div className="border-t pt-4">
              <button
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                onClick={() => setAnamneseModalOpen(true)}
              >
                <FileText className="h-4 w-4" />
                Anamnese vinculada — {linkedAnamnese.title}
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={anamneseModalOpen} onOpenChange={setAnamneseModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{linkedAnamnese?.title ?? "Anamnese"}</DialogTitle>
            <DialogDescription>
              {linkedAnamnese?.dentists?.name && <>Por {linkedAnamnese.dentists.name} &mdash; </>}
              {linkedAnamnese?.created_at && format(new Date(linkedAnamnese.created_at), "dd/MM/yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pr-4 overflow-y-auto max-h-[60vh]">
              {linkedAnamnese?.fields.map((field, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
                  {field.content || field.defaultContent ? (
                    <div className="text-sm" dangerouslySetInnerHTML={{ __html: field.content || field.defaultContent || "" }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              ))}
              {linkedAnamnese?.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Observações</p>
                  <div className="text-sm" dangerouslySetInnerHTML={{ __html: linkedAnamnese.notes }} />
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>
    </>
    )
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} title="Voltar">
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
        <DynamicField
          type="text"
          label="Título da Receita"
          value={title}
          onChange={setTitle}
          placeholder="Ex: Prescrição pós-operatória"
        />

        <div className="relative">
          <label className="text-sm font-medium mb-1.5 block">Paciente</label>
          {patientLocked ? (
            <p className="text-sm font-medium">{patientName}</p>
          ) : isNew ? (
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
              <DynamicCard
                key={med._id}
                title={`Medicamento ${i + 1}`}
                fields={[
                  { name: "medicamento", label: "Nome do Medicamento", type: "text", placeholder: "Nome do medicamento", required: true },
                  { name: "dosagem", label: "Dosagem", type: "text", placeholder: "Dosagem (ex: 500mg, 1 comprimido 2x ao dia)", required: true },
                  { name: "observacao", label: "Observação", type: "text", placeholder: "Observação (opcional)" },
                ]}
                values={{ medicamento: med.medicamento, dosagem: med.dosagem, observacao: med.observacao }}
                onChange={(name, value) => updateMedication(med._id, name as "medicamento" | "dosagem" | "observacao", value)}
                onRemove={() => setRemovingMedication(med)}
                canRemove={medications.length > 1}
                inputRefs={{ medicamento: (el) => { medicationRefs.current[i] = el } }}
              />
            ))}
            {medications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum medicamento adicionado.
              </p>
            )}
          </div>
        </div>

        <DynamicField
          type="richtext"
          label="Observações Gerais"
          value={generalObservations}
          onChange={setGeneralObservations}
          placeholder="Instruções adicionais para o paciente..."
          minHeight="120px"
        />

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
        onConfirm={goBack}
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

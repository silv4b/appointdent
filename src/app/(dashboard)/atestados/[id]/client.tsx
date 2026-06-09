"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Download, FileText, Pencil, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  getCertificate,
  saveCertificate,
  updateCertificate,
  getCertificateDentistList,
} from "@/lib/actions/certificates"
import { getClinicSettings } from "@/lib/actions/clinic-settings"
import { getUserSessionData } from "@/lib/actions/session"
import { getAnamneseSessionByAppointment, getPatientName, searchPatientsByName } from "@/lib/actions/queries"
import { generateCertificatePdf } from "@/lib/utils/export-certificate-pdf"
import type { Database } from "@/types/database"

type CertificateData = Database["public"]["Tables"]["certificates"]["Row"] & {
  patients: { name: string; phone: string | null } | null
  dentists: { name: string; specialty: string | null; cro: string | null } | null
}

const DEFAULT_CONTENT = `Atesto, para os devidos fins, que o(a) paciente esteve sob meus cuidados odontológicos nesta data de _____/_____/_____, encontrando-se em condições de repouso pelo período de _____ dias, estando apto(a) a retornar às suas atividades normais em _____/_____/_____.`

export function CertificateFormClient({
  certificateId,
  editMode,
}: {
  certificateId: string
  editMode: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = certificateId === "novo"

  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(isNew ? "Atestado para " : "")
  const [patientId, setPatientId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientLocked, setPatientLocked] = useState(false)
  const [patientSearch, setPatientSearch] = useState("")
  const [patientResults, setPatientResults] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [patientOpen, setPatientOpen] = useState(false)
  const [dentistId, setDentistId] = useState("")
  const [dentists, setDentists] = useState<{ id: string; name: string; cro: string | null }[]>([])
  const [content, setContent] = useState(isNew ? DEFAULT_CONTENT : "")
  const [generalObservations, setGeneralObservations] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)
  const patientSearchRef = useRef<HTMLInputElement>(null)
  const [clinic, setClinic] = useState<Database["public"]["Tables"]["clinic_settings"]["Row"] | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const pendingPdfRef = useRef<{
    patientName: string
    dentistName: string
    dentistSpecialty: string | null
    dentistCro: string | null
    title: string
    createdAt: string
    content: string
    generalObservations: string
  } | null>(null)
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
    getCertificateDentistList().then((result) => {
      if ("data" in result) setDentists(result.data ?? [])
    })
    getClinicSettings().then((result) => {
      if ("data" in result && result.data) setClinic(result.data as Database["public"]["Tables"]["clinic_settings"]["Row"])
    })
  }, [])

  useEffect(() => {
    if (!isNew) {
      getCertificate(certificateId).then((result) => {
        if ("error" in result) {
          toast.error(result.error)
          router.push("/atestados")
          return
        }
        const data = result.data as CertificateData
        setCertificate(data)
        setTitle(data.title)
        setPatientId(data.patient_id)
        setPatientName(data.patients?.name ?? "")
        setDentistId(data.dentist_id)
        setContent(data.content)
        setGeneralObservations(data.general_observations ?? "")
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
        setPatientId(prefillPatientId)
        setPatientLocked(true)
        getPatientName(prefillPatientId).then((r) => {
          if ("data" in r && r.data) {
            setPatientName(r.data.name)
            setTitle(`Atestado para ${r.data.name}`)
          }
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
  }, [certificateId, isNew, router, searchParams])

  useEffect(() => {
    if (!patientSearch.trim()) {
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
    router.push(anamneseReturnUrl ?? "/atestados")
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Informe um título para o atestado"); return }
    if (!patientId) { toast.error("Selecione um paciente"); return }
    if (!dentistId) { toast.error("Selecione um dentista"); return }

    setSaving(true)
    setSaveDialogOpen(false)
    const formData = new FormData()
    formData.set("title", title.trim())
    formData.set("patient_id", patientId)
    formData.set("dentist_id", dentistId)
    const appointmentIdParam = searchParams.get("appointmentId")
    if (appointmentIdParam) formData.set("appointment_id", appointmentIdParam)
    formData.set("content", content)
    formData.set("general_observations", generalObservations)

    if (isNew) {
      const result = await saveCertificate(formData)
      if (result?.error) {
        toast.error(result.error)
        setSaving(false)
      } else {
        toast.success("Atestado cadastrado com sucesso!")
        const selectedDentist = dentists.find((d) => d.id === dentistId)
        pendingPdfRef.current = {
          title: title.trim(),
          patientName,
          dentistName: selectedDentist?.name ?? "Dentista",
          dentistSpecialty: null,
          dentistCro: selectedDentist?.cro ?? null,
          createdAt: new Date().toISOString(),
          content,
          generalObservations,
        }
        setPdfDialogOpen(true)
        setSaving(false)
      }
    } else {
      formData.set("id", certificateId)
      const result = await updateCertificate(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Atestado atualizado com sucesso!")
        if (certificate) {
          pendingPdfRef.current = {
            title: certificate.title,
            patientName: certificate.patients?.name ?? "Paciente",
            dentistName: certificate.dentists?.name ?? "Dentista",
            dentistSpecialty: certificate.dentists?.specialty ?? null,
            dentistCro: certificate.dentists?.cro ?? null,
            createdAt: certificate.created_at,
            content: certificate.content,
            generalObservations: certificate.general_observations ?? "",
          }
        }
        setPdfDialogOpen(true)
      }
      setSaving(false)
    }
  }

  const getCertificatePdfData = () => {
    const base = pendingPdfRef.current ?? (certificate ? {
      patientName: certificate.patients?.name ?? "Paciente",
      dentistName: certificate.dentists?.name ?? "Dentista",
      dentistSpecialty: certificate.dentists?.specialty ?? null,
      dentistCro: certificate.dentists?.cro ?? null,
      title: certificate.title,
      createdAt: certificate.created_at,
      content: certificate.content,
      generalObservations: certificate.general_observations ?? "",
    } : null)

    if (!base) return null

    return {
      ...base,
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
  }

  const handleExportPdf = () => {
    const pdfData = getCertificatePdfData()
    if (!pdfData) return

    const doc = generateCertificatePdf(pdfData)
    const blobUrl = doc.output("bloburl")
    window.open(blobUrl, "_blank")
    toast.success("PDF gerado com sucesso!")
  }

  const handlePrint = () => {
    const pdfData = getCertificatePdfData()
    if (!pdfData) return

    const doc = generateCertificatePdf(pdfData)
    doc.autoPrint()
    const blobUrl = doc.output("bloburl")
    window.open(blobUrl, "_blank")
    toast.success("PDF aberto para impressão!")
  }

  const handleSaveAndGoBack = () => {
    setPdfDialogOpen(false)
    router.push(anamneseReturnUrl ?? "/atestados")
  }

  const handleSaveAndPrint = () => {
    handlePrint()
    handleSaveAndGoBack()
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

  if ((!isNew && !certificate) || (!isNew && !isEditing && !certificate)) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Atestado não encontrado.</p>
      </div>
    )
  }

  if (!isEditing && certificate) {
    return (
      <>
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack} title="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{certificate.title}</h1>
              <p className="text-sm text-muted-foreground">
                {certificate.patients?.name ?? "Paciente"} &mdash; {format(new Date(certificate.created_at), "dd/MM/yyyy")}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {!isReceptionist && (
                <Button variant="outline" onClick={() => router.push(`/atestados/${certificateId}?edit=true`)}>
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
                <p className="font-medium">{certificate.patients?.name ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dentista:</span>
                <p className="font-medium">
                  {certificate.dentists?.name ?? "—"}
                  {certificate.dentists?.specialty && ` (${certificate.dentists.specialty})`}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Conteúdo do Atestado</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/40 p-4 text-sm">
                {certificate.content ? (
                  <div dangerouslySetInnerHTML={{ __html: certificate.content }} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {certificate.general_observations && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observações</h3>
                <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: certificate.general_observations }} />
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
              {isNew ? "Novo Atestado" : "Editar Atestado"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? "Preencha os dados do atestado." : "Altere os dados do atestado."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-6">
          <DynamicField
            type="text"
            label="Título do Atestado"
            value={title}
            onChange={setTitle}
            placeholder="Ex: Atestado para procedimento cirúrgico"
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
              <p className="text-sm font-medium">{certificate?.patients?.name ?? "—"}</p>
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
                {certificate?.dentists?.name ?? "—"}
                {certificate?.dentists?.specialty && ` (${certificate.dentists.specialty})`}
              </p>
            )}
          </div>

          <DynamicField
            type="richtext"
            label="Conteúdo do Atestado"
            value={content}
            onChange={setContent}
            placeholder="Digite o conteúdo do atestado..."
            minHeight="200px"
          />

          <DynamicField
            type="richtext"
            label="Observações Gerais"
            value={generalObservations}
            onChange={setGeneralObservations}
            placeholder="Instruções adicionais..."
            minHeight="100px"
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setCancelDialogOpen(true)}>
              Cancelar
            </Button>
            <Button onClick={() => setSaveDialogOpen(true)} disabled={saving}>
              {saving ? "Salvando..." : isNew ? "Cadastrar Atestado" : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>

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
        title="Confirmar atestado"
        description={`Tem certeza que deseja ${isNew ? "cadastrar" : "salvar as alterações do"} atestado?`}
        confirmLabel={isNew ? "Cadastrar" : "Salvar"}
        variant="default"
        onConfirm={handleSave}
      />

      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atestado salvo com sucesso!</DialogTitle>
            <DialogDescription>
              Deseja gerar o PDF para impressão agora?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleSaveAndGoBack}>
              Apenas salvar
            </Button>
            <Button onClick={handleSaveAndPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

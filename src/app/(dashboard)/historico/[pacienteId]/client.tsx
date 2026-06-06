"use client"

import { DataTablePagination } from "@/components/data-table-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPatientHistoryData } from "@/lib/actions/anamnese"
import { Database } from "@/types/database"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Eye, FileText, Clock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

type Patient = { id: string; name: string; cpf: string | null; email: string | null; phone: string | null; birth_date: string | null; active: boolean | null }
type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  dentists: { name: string } | null
  procedures: { name: string | null; color: string | null } | null
}
type Anamnese = Database["public"]["Tables"]["anamnese_sessions"]["Row"] & {
  dentists: { name: string } | null
}
type AnamneseWithAppt = Anamnese & {
  appointment?: { start_time: string; dentists: { name: string } | null; procedures: { name: string | null } | null } | null
}

interface DetailClientProps {
  pacienteId: string
}

export function PacienteDetailClient({ pacienteId }: DetailClientProps) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [anamneses, setAnamneses] = useState<AnamneseWithAppt[]>([])
  const [loading, setLoading] = useState(true)
  const [viewSession, setViewSession] = useState<AnamneseWithAppt | null>(null)

  const statusColorMap: Record<string, string> = {
    realizado: "bg-green-100 text-green-800",
    confirmado: "bg-blue-100 text-blue-800",
    cancelado: "bg-red-100 text-red-800",
    faltou: "bg-orange-100 text-orange-800",
  }

  // Paginação
  const [apptPage, setApptPage] = useState(1)
const [apptPageSize, setApptPageSize] = useState(10)
  const paginatedAppointments = appointments.slice((apptPage - 1) * apptPageSize, apptPage * apptPageSize)

  const [anamPage, setAnamPage] = useState(1)
  const [anamPageSize, setAnamPageSize] = useState(10)
  const paginatedAnamneses = anamneses.slice((anamPage - 1) * anamPageSize, anamPage * anamPageSize)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await getPatientHistoryData(pacienteId)
      if (cancelled) return
      if ("data" in result) {
        setPatient(result.data.patient)
        setAppointments(result.data.appointments as Appointment[])
        setAnamneses(result.data.anamneses as AnamneseWithAppt[])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [pacienteId])

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    setApptPage(1) }, [appointments.length])
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnamPage(1) }, [anamneses.length])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/historico"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao histórico
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">{patient?.name}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {patient?.cpf && <span>CPF: {patient.cpf}</span>}
          {patient?.email && <span>Email: {patient.email}</span>}
          {patient?.phone && <span>Telefone: {patient.phone}</span>}
          {patient?.birth_date && (
            <span>Nascimento: {format(new Date(patient.birth_date), "dd/MM/yyyy", { locale: ptBR })}</span>
          )}
          <span>
            Status:{" "}
            <Badge variant={patient?.active ? "default" : "secondary"} className="ml-1">
              {patient?.active ? "Ativo" : "Inativo"}
            </Badge>
          </span>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Atendimentos Realizados</h2>
          </div>
          <div className="rounded-lg border bg-card">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Dentista</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-28">Anamneses</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Nenhum atendimento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAppointments.map((a) => {
                    const linked = anamneses.filter((s) => s.appointment_id === a.id)
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          {format(new Date(a.start_time), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(a.start_time), "HH:mm")} - {format(new Date(a.end_time), "HH:mm")}
                        </TableCell>
                        <TableCell>{a.dentists?.name ?? "-"}</TableCell>
                        <TableCell>{a.procedures?.name ?? "-"}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center justify-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium min-w-[7.5rem]", statusColorMap[a.status] ?? "bg-muted text-muted-foreground")}>
                            {a.status === "realizado"
                              ? "Realizado"
                              : a.status === "confirmado"
                                ? "Confirmado"
                                : a.status === "cancelado"
                                  ? "Cancelado"
                                  : a.status === "faltou"
                                    ? "Faltou"
                                    : a.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {linked.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              {linked.length} {linked.length === 1 ? "anamnese" : "anamneses"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            {linked.length === 1 ? (
                              <Button variant="outline" size="icon" className="h-8 w-8" title="Ver anamnese" onClick={() => linked[0] && setViewSession(linked[0])}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            <DataTablePagination
              page={apptPage}
              pageSize={apptPageSize}
              total={appointments.length}
              onPageChange={setApptPage}
              onPageSizeChange={(s) => { setApptPageSize(s); setApptPage(1) }}
            />
          </div>
        </section>

        {anamneses.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Anamneses</h2>
            </div>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Dentista</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Vinculada ao Atendimento</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAnamneses.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title ?? "Sem título"}</TableCell>
                      <TableCell>{a.dentists?.name ?? "-"}</TableCell>
                      <TableCell>
                        {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {a.appointment ? (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(a.appointment.start_time), "dd/MM/yyyy HH:mm")}
                            {a.appointment.dentists?.name && <> — {a.appointment.dentists.name}</>}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {a.notes ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Button variant="outline" size="icon" className="h-8 w-8" title="Ver anamnese" onClick={() => setViewSession(a)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination
                page={anamPage}
                pageSize={anamPageSize}
                total={anamneses.length}
                onPageChange={setAnamPage}
                onPageSizeChange={(s) => { setAnamPageSize(s); setAnamPage(1) }}
              />
            </div>
          </section>
        )}
      </div>

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
                  <span className="font-medium">{patient?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dentista</span>
                  <span className="font-medium">{viewSession.dentists?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span>{format(new Date(viewSession.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>

              <div className="space-y-3">
                {Array.isArray(viewSession.fields) && viewSession.fields.length > 0 ? (
                  viewSession.fields.slice().reverse().map((f: unknown, fi: number) => {
                    const field = f as { label: string; content?: string }
                    return (
                      <div key={fi} className="rounded-lg border bg-card p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          {field.label}
                        </p>
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-sm"
                          dangerouslySetInnerHTML={{ __html: field.content || "—" }}
                        />
                      </div>
                    )
                  })
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
    </div>
  )
}

"use client"

import { DataTablePagination } from "@/components/data-table-pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { upsertDentistProcedure } from "@/lib/actions/dentist-procedures"
import { createProcedureRequest, getMyProcedureRequests } from "@/lib/actions/procedure-requests"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { useSupabase } from "@/components/providers/supabase-provider"
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, Plus, Save, CheckCircle, XCircle, Clock } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

type Procedure = Database["public"]["Tables"]["procedures"]["Row"]
type DentistProcedure = Database["public"]["Tables"]["dentist_procedures"]["Row"]
type ProcedureRequest = Database["public"]["Tables"]["procedure_requests"]["Row"]

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
}

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

export function MeusProcedimentosClient() {
  const { user } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [dentistId, setDentistId] = useState<string | null>(null)

  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [dentistProcedures, setDentistProcedures] = useState<DentistProcedure[]>([])
  const [requests, setRequests] = useState<ProcedureRequest[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({})
  const [localDurations, setLocalDurations] = useState<Record<string, string>>({})
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({})

  const [requestOpen, setRequestOpen] = useState(false)
  const [requestName, setRequestName] = useState("")
  const [requestDescription, setRequestDescription] = useState("")
  const [requestDuration, setRequestDuration] = useState("30")
  const [requestPrice, setRequestPrice] = useState("")
  const [requestSubmitting, setRequestSubmitting] = useState(false)

  const [procSort, setProcSort] = useState<{ key: "name" | "description"; dir: "asc" | "desc" }>({ key: "name", dir: "asc" })
  const [procPage, setProcPage] = useState(1)
  const [procPageSize, setProcPageSize] = useState(10)

  const [reqSort, setReqSort] = useState<{ key: "name" | "description"; dir: "asc" | "desc" }>({ key: "name", dir: "asc" })
  const [reqPage, setReqPage] = useState(1)
  const [reqPageSize, setReqPageSize] = useState(10)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const supabase = createClient()
    supabase.from("profiles").select("role").eq("id", user.id).single()
      .then(async ({ data: profile }) => {
        if (!profile || profile.role !== "dentist") { setLoading(false); return }

        const { data: dentist } = await supabase
          .from("dentists")
          .select("id")
          .eq("profile_id", user.id)
          .single()

        if (dentist) {
          setDentistId(dentist.id)

          const [procRes, dpRes] = await Promise.all([
            supabase.from("procedures").select("*").eq("active", true).order("name"),
            supabase.from("dentist_procedures").select("*").eq("dentist_id", dentist.id),
          ])

          setProcedures(procRes.data ?? [])
          const dps = dpRes.data as DentistProcedure[] ?? []
          setDentistProcedures(dps)

          const prices: Record<string, string> = {}
          const durations: Record<string, string> = {}
          const active: Record<string, boolean> = {}
          for (const p of procRes.data ?? []) {
            const dp = dps.find((d) => d.procedure_id === p.id)
            prices[p.id] = dp?.price != null ? String(dp.price) : (p.price != null ? String(p.price) : "")
            durations[p.id] = dp?.duration_minutes != null ? String(dp.duration_minutes) : String(p.duration_minutes)
            active[p.id] = dp?.active ?? false
          }
          setLocalPrices(prices)
          setLocalDurations(durations)
          setLocalActive(active)

          const res = await getMyProcedureRequests(dentist.id)
          if ("data" in res) setRequests(res.data as ProcedureRequest[])
        }

        setLoading(false)
      })
  }, [user])

  const handleToggle = useCallback(async (procedureId: string, checked: boolean) => {
    if (!dentistId) return
    setLocalActive((prev) => ({ ...prev, [procedureId]: checked }))
    setSaving(procedureId)
    const form = new FormData()
    form.set("dentist_id", dentistId)
    form.set("procedure_id", procedureId)
    form.set("active", checked ? "on" : "off")
    if (localPrices[procedureId]) form.set("price", localPrices[procedureId])
    if (localDurations[procedureId]) form.set("duration_minutes", localDurations[procedureId])
    const result = await upsertDentistProcedure(form)
    if (result?.error) {
      toast.error(result.error)
      setLocalActive((prev) => ({ ...prev, [procedureId]: !checked }))
    }
    setSaving(null)
  }, [dentistId, localPrices, localDurations])

  const handleSavePrice = useCallback(async (procedureId: string) => {
    if (!dentistId) return
    setSaving(procedureId)
    const form = new FormData()
    form.set("dentist_id", dentistId)
    form.set("procedure_id", procedureId)
    form.set("active", localActive[procedureId] ? "on" : "off")
    if (localPrices[procedureId]) form.set("price", localPrices[procedureId])
    if (localDurations[procedureId]) form.set("duration_minutes", localDurations[procedureId])
    const result = await upsertDentistProcedure(form)
    if (result?.error) toast.error(result.error)
    else toast.success("Salvo")
    setSaving(null)
  }, [dentistId, localPrices, localDurations, localActive])

  const handleSubmitRequest = async () => {
    if (!dentistId) return
    setRequestSubmitting(true)
    const form = new FormData()
    form.set("dentist_id", dentistId)
    form.set("name", requestName)
    form.set("description", requestDescription)
    form.set("duration_minutes", requestDuration)
    if (requestPrice) form.set("price", requestPrice)
    const result = await createProcedureRequest(form)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Solicitação enviada com sucesso!")
      setRequestOpen(false)
      setRequestName("")
      setRequestDescription("")
      setRequestDuration("30")
      setRequestPrice("")
      const res2 = await getMyProcedureRequests(dentistId)
      if ("data" in res2) setRequests(res2.data as ProcedureRequest[])
    }
    setRequestSubmitting(false)
  }

  const sortedProcedures = useMemo(() => {
    const sorted = [...procedures].sort((a, b) => {
      const aVal = (a[procSort.key] ?? "").toLowerCase()
      const bVal = (b[procSort.key] ?? "").toLowerCase()
      return procSort.dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
    return sorted
  }, [procedures, procSort])

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aVal = (a[reqSort.key] ?? "").toLowerCase()
      const bVal = (b[reqSort.key] ?? "").toLowerCase()
      return reqSort.dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
  }, [requests, reqSort])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const allSelected = procedures.length > 0 && procedures.every((p) => localActive[p.id])
  const someSelected = procedures.some((p) => localActive[p.id])

  const paginatedProcedures = sortedProcedures.slice((procPage - 1) * procPageSize, procPage * procPageSize)
  const paginatedRequests = sortedRequests.slice((reqPage - 1) * reqPageSize, reqPage * reqPageSize)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Procedimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personalize os procedimentos que você realiza
          </p>
        </div>
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <Button onClick={() => setRequestOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Solicitar Novo Procedimento
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Novo Procedimento</DialogTitle>
              <DialogDescription>
                Preencha os dados do procedimento que deseja cadastrar. A solicitação será enviada para aprovação do administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="req-name">Nome *</Label>
                <Input
                  id="req-name"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="Ex: Clareamento a laser"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="req-desc">Descrição</Label>
                <Input
                  id="req-desc"
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="Descrição do procedimento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="req-dur">Duração (min) *</Label>
                  <Input
                    id="req-dur"
                    type="number"
                    min="1"
                    value={requestDuration}
                    onChange={(e) => setRequestDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="req-price">Valor (R$)</Label>
                  <Input
                    id="req-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={requestPrice}
                    onChange={(e) => setRequestPrice(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitRequest} disabled={requestSubmitting || !requestName || !requestDuration}>
                {requestSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-8 rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Procedimentos Disponíveis</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={(e) => {
                    const checked = e.target.checked
                    const next: Record<string, boolean> = {}
                    for (const p of procedures) next[p.id] = checked
                    setLocalActive(next)
                    for (const p of procedures) {
                      if (checked !== (localActive[p.id] ?? false)) {
                        handleToggle(p.id, checked)
                      }
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => { setProcSort((s) => ({ key: "name", dir: s.key === "name" && s.dir === "asc" ? "desc" : "asc" })); setProcPage(1) }}>
                  Procedimento
                  {procSort.key === "name" ? (procSort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </TableHead>
              <TableHead className="max-w-xs">
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => { setProcSort((s) => ({ key: "description", dir: s.key === "description" && s.dir === "asc" ? "desc" : "asc" })); setProcPage(1) }}>
                  Descrição
                  {procSort.key === "description" ? (procSort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </TableHead>
              <TableHead className="w-28">
                <span className="flex items-center gap-1">Preço (R$)</span>
              </TableHead>
              <TableHead className="w-28">
                <span className="flex items-center gap-1">Duração (min)</span>
              </TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProcedures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">
                  Nenhum procedimento disponível.
                </TableCell>
              </TableRow>
            ) : (
              paginatedProcedures.map((p) => {
                const isActive = localActive[p.id] ?? false
                return (
                  <TableRow key={p.id}>
                    <TableCell className="h-12">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => handleToggle(p.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell className="h-12 font-medium">{p.name}</TableCell>
                    <TableCell className="h-12 max-w-xs truncate text-muted-foreground text-sm">
                      {p.description || "—"}
                    </TableCell>
                    <TableCell className="h-12">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={localPrices[p.id] ?? ""}
                        onChange={(e) => setLocalPrices((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="h-8 w-24"
                        disabled={!isActive}
                      />
                    </TableCell>
                    <TableCell className="h-12">
                      <Input
                        type="number"
                        min="1"
                        value={localDurations[p.id] ?? ""}
                        onChange={(e) => setLocalDurations((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="h-8 w-24"
                        disabled={!isActive}
                      />
                    </TableCell>
                    <TableCell className="h-12">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!isActive || saving === p.id}
                        onClick={() => handleSavePrice(p.id)}
                      >
                        {saving === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <DataTablePagination page={procPage} pageSize={procPageSize} total={procedures.length} onPageChange={setProcPage} onPageSizeChange={(s) => { setProcPageSize(s); setProcPage(1) }} />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Minhas Solicitações</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => { setReqSort((s) => ({ key: "name", dir: s.key === "name" && s.dir === "asc" ? "desc" : "asc" })); setReqPage(1) }}>
                  Procedimento
                  {reqSort.key === "name" ? (reqSort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => { setReqSort((s) => ({ key: "description", dir: s.key === "description" && s.dir === "asc" ? "desc" : "asc" })); setReqPage(1) }}>
                  Descrição
                  {reqSort.key === "description" ? (reqSort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </TableHead>
              <TableHead className="w-24">
                <span className="flex items-center gap-1">Duração</span>
              </TableHead>
              <TableHead className="w-24">
                <span className="flex items-center gap-1">Valor</span>
              </TableHead>
              <TableHead className="w-28">
                <span className="flex items-center gap-1">Situação</span>
              </TableHead>
              <TableHead className="w-32">
                <span className="flex items-center gap-1">Data</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">
                  Nenhuma solicitação enviada.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((r) => {
                const StatusIcon = STATUS_ICON[r.status]
                return (
                  <TableRow key={r.id}>
                    <TableCell className="h-12 font-medium">{r.name}</TableCell>
                    <TableCell className="h-12 text-muted-foreground max-w-xs truncate">{r.description || "—"}</TableCell>
                    <TableCell className="h-12 text-muted-foreground">{r.duration_minutes} min</TableCell>
                    <TableCell className="h-12 text-muted-foreground">
                      {r.price != null
                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.price)
                        : "—"}
                    </TableCell>
                    <TableCell className="h-12">
                      <span className={`inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-muted text-muted-foreground"}`}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABEL[r.status]}
                      </span>
                    </TableCell>
                    <TableCell className="h-12 text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <DataTablePagination page={reqPage} pageSize={reqPageSize} total={requests.length} onPageChange={setReqPage} onPageSizeChange={(s) => { setReqPageSize(s); setReqPage(1) }} />
      </div>
    </div>
  )
}

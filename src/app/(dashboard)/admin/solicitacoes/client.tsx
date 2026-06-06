"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { approveProcedureRequest, getPendingProcedureRequests, rejectProcedureRequest } from "@/lib/actions/procedure-requests"
import { DataTablePagination } from "@/components/data-table-pagination"
import { Loader2, CheckCircle, XCircle, Search, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type PendingRequest = {
  id: string
  dentist_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  status: string
  created_at: string
  dentist: {
    id: string
    name: string
  } | null
}

export function SolicitacoesClient() {
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetch = useCallback(async () => {
    const res = await getPendingProcedureRequests()
    if ("data" in res) setRequests(res.data as PendingRequest[])
    setLoading(false)
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    setPage(1)
    const res = await getPendingProcedureRequests()
    if ("data" in res) setRequests(res.data as PendingRequest[])
    setRefreshing(false)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await getPendingProcedureRequests()
      if (cancelled) return
      if ("data" in res) setRequests(res.data as PendingRequest[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const handleApprove = async (req: PendingRequest) => {
    setActionId(req.id)
    setActionLoading(true)
    const form = new FormData()
    form.set("id", req.id)
    form.set("name", req.name)
    if (req.description) form.set("description", req.description)
    form.set("duration_minutes", String(req.duration_minutes))
    if (req.price != null) form.set("price", String(req.price))
    setRequests(prev => prev.filter(r => r.id !== req.id))
    const result = await approveProcedureRequest(form)
    if (result?.error) {
      toast.error(result.error)
      fetch()
    } else {
      toast.success(`Procedimento "${req.name}" aprovado!`)
      setApproveConfirmId(null)
    }
    setActionLoading(false)
    setActionId(null)
  }

  const handleReject = async () => {
    if (!rejectId) return
    setActionId(rejectId)
    setActionLoading(true)
    const form = new FormData()
    form.set("id", rejectId)
    form.set("rejection_reason", rejectReason)
    setRequests(prev => prev.filter(r => r.id !== rejectId))
    const result = await rejectProcedureRequest(form)
    if (result?.error) {
      toast.error(result.error)
      fetch()
    } else {
      toast.success("Solicitação rejeitada")
      setRejectOpen(false)
      setRejectReason("")
    }
    setActionLoading(false)
    setActionId(null)
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "—"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  const filtered = requests.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      (r.dentist?.name ?? "").toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q)
    )
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitações de Procedimentos</h1>
          <p className="mt-1 text-muted-foreground">
            Revise as solicitações de novos procedimentos enviadas pelos dentistas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar solicitações..."
              className="h-9 pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Procedimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Dentista</TableHead>
              <TableHead className="w-20">Duração</TableHead>
              <TableHead className="w-24">Valor</TableHead>
              <TableHead className="w-28">Data</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma solicitação pendente.
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice((page - 1) * pageSize, page * pageSize).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {r.description || "—"}
                  </TableCell>
                  <TableCell>{r.dentist?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.duration_minutes} min</TableCell>
                  <TableCell className="text-muted-foreground">{formatPrice(r.price)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                        disabled={actionLoading}
                        onClick={() => setApproveConfirmId(r.id)}
                      >
                        {actionLoading && actionId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={actionLoading}
                        onClick={() => { setRejectId(r.id); setRejectOpen(true) }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
          <DataTablePagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} />
        </div>

      <Dialog open={approveConfirmId !== null} onOpenChange={() => setApproveConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja aprovar esta solicitação? Um novo procedimento será criado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const req = requests.find((r) => r.id === approveConfirmId)
                if (req) handleApprove(req)
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição (opcional).
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reject-reason">Motivo da rejeição</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Opcional"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason("") }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

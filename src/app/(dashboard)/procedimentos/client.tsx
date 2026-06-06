"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTablePagination } from "@/components/data-table-pagination"
import { EntityDialog } from "@/components/entity-dialog"
import {
  createProcedure,
  deleteProcedure,
  updateProcedure,
} from "@/lib/actions/procedures"
import {
  getAllProcedureRequests,
  approveProcedureRequest,
  rejectProcedureRequest,
} from "@/lib/actions/procedure-requests"
import { getUserSessionData } from "@/lib/actions/session"
import { getProceduresPaginated } from "@/lib/actions/queries"
import { Database } from "@/types/database"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type Procedure = Database["public"]["Tables"]["procedures"]["Row"]

type RequestRow = {
  id: string
  dentist_id: string
  admin_id: string | null
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  status: string
  created_at: string
  reviewed_at: string | null
  rejection_reason: string | null
  dentist: {
    id: string
    name: string
  } | null
  admin: {
    id: string
    name: string | null
  } | null
}

export function ProceduresClient() {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [edit, setEdit] = useState<Procedure | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<"name" | "duration_minutes" | "price" | "active">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const searchRef = useRef<HTMLInputElement>(null)

  const [userRole, setUserRole] = useState<string | null>(null)
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null)
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [reqSortColumn, setReqSortColumn] = useState<"name" | "description" | "dentist" | "created_at">("created_at")
  const [reqSortDir, setReqSortDir] = useState<"asc" | "desc">("desc")
  const [pendingPage, setPendingPage] = useState(1)
  const [pendingPageSize, setPendingPageSize] = useState(10)
  const [pendingRefreshing, setPendingRefreshing] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(10)
  const [historyRefreshing, setHistoryRefreshing] = useState(false)
  const [detailRequest, setDetailRequest] = useState<RequestRow | null>(null)
  const [pendingSearch, setPendingSearch] = useState("")
  const [historySearch, setHistorySearch] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await getProceduresPaginated(page, pageSize, search || undefined)
      if (cancelled) return
      if ("data" in result) {
        setProcedures(result.data.data as Procedure[])
        setTotal(result.data.total)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [page, pageSize, search])

  useEffect(() => {
    getUserSessionData().then((result) => {
      if ("data" in result && result.data.role === "admin") {
        setUserRole("admin")
        setRequestsLoading(true)
        getAllProcedureRequests().then((res) => {
          if ("data" in res) setRequests(res.data as RequestRow[])
          setRequestsLoading(false)
        })
      }
    })
  }, [])

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    setProcedures(prev => prev.filter(p => p.id !== id))
    const result = await deleteProcedure(form)
    if (result?.error) {
      toast.error(result.error)
      setPage(1)
    } else {
      toast.success("Procedimento excluído")
    }
  }

  const toggleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(col)
      setSortDir("asc")
    }
  }

  const toggleReqSort = (col: typeof reqSortColumn) => {
    if (reqSortColumn === col) {
      setReqSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setReqSortColumn(col)
      setReqSortDir(col === "created_at" ? "desc" : "asc")
    }
  }

  const sortRequests = (list: RequestRow[]) => [...list].sort((a, b) => {
    const dir = reqSortDir === "asc" ? 1 : -1
    if (reqSortColumn === "description") {
      return ((a.description ?? "").localeCompare(b.description ?? "pt-BR")) * dir
    }
    if (reqSortColumn === "dentist") {
      return ((a.dentist?.name ?? "").localeCompare(b.dentist?.name ?? "", "pt-BR")) * dir
    }
    if (reqSortColumn === "created_at") {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
    }
    return a.name.localeCompare(b.name, "pt-BR") * dir
  })

  const sorted = [...procedures].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    if (sortColumn === "duration_minutes") {
      return ((a.duration_minutes ?? 0) - (b.duration_minutes ?? 0)) * dir
    }
    if (sortColumn === "price") {
      return ((a.price ?? 0) - (b.price ?? 0)) * dir
    }
    if (sortColumn === "active") {
      return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * dir
    }
    const aVal = (a[sortColumn] ?? "").toString()
    const bVal = (b[sortColumn] ?? "").toString()
    return aVal.localeCompare(bVal, "pt-BR") * dir
  })

  const formatPrice = (price: number | null) => {
    if (price === null) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  const handleApprove = async (req: RequestRow) => {
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
      getAllProcedureRequests().then((res) => {
        if ("data" in res) setRequests(res.data as RequestRow[])
      })
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
      getAllProcedureRequests().then((res) => {
        if ("data" in res) setRequests(res.data as RequestRow[])
      })
    } else {
      toast.success("Solicitação rejeitada")
      setRejectOpen(false)
      setRejectReason("")
    }
    setActionLoading(false)
    setActionId(null)
  }

  const refreshPending = async () => {
    setPendingRefreshing(true)
    const res = await getAllProcedureRequests()
    if ("data" in res) setRequests(res.data as RequestRow[])
    setPendingPage(1)
    setPendingRefreshing(false)
  }

  const refreshHistory = async () => {
    setHistoryRefreshing(true)
    const res = await getAllProcedureRequests()
    if ("data" in res) setRequests(res.data as RequestRow[])
    setHistoryPage(1)
    setHistoryRefreshing(false)
  }

  const sortedRequests = sortRequests(requests)
  const pendingAll = sortedRequests
    .filter((r) => r.status === "pending")
    .filter((r) => {
      if (!pendingSearch) return true
      const q = pendingSearch.toLowerCase()
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.dentist?.name ?? "").toLowerCase().includes(q)
      )
    })
  const historyAll = sortedRequests
    .filter((r) => r.status !== "pending")
    .filter((r) => {
      if (!historySearch) return true
      const q = historySearch.toLowerCase()
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.dentist?.name ?? "").toLowerCase().includes(q)
      )
    })
  const pendingTotal = pendingAll.length
  const historyTotal = historyAll.length
  const pendingRequests = pendingAll.slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize)
  const historyRequests = historyAll.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procedimentos</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie os serviços da clínica
          </p>
        </div>
        <Button onClick={() => { setEdit(null); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Procedimento
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true) }}
              placeholder="Buscar procedimentos..."
              className="h-9 pl-9 pr-8"
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1); setLoading(true); searchRef.current?.focus() }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <div className="flex items-center gap-1">
                  Procedimento
                  {sortColumn === "name" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("duration_minutes")}>
                <div className="flex items-center gap-1">
                  Duração
                  {sortColumn === "duration_minutes" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("price")}>
                <div className="flex items-center gap-1">
                  Valor
                  {sortColumn === "price" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("active")}>
                <div className="flex items-center gap-1">
                  Ativo
                  {sortColumn === "active" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : procedures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum procedimento cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: p.color ?? "#3b82f6" }}
                      />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.duration_minutes} min</TableCell>
                  <TableCell className="text-muted-foreground">{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "secondary"}>
                      {p.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEdit(p); setOpen(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => { setPage(p) }}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </div>

      <EntityDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) { setPage(1) }
        }}
        title={edit ? "Editar Procedimento" : "Novo Procedimento"}
        description={edit ? "Atualize os dados do procedimento" : "Preencha os dados do novo procedimento"}
        fields={[
          ...(edit ? [{ name: "id" as const, label: "ID" as const, type: "hidden" as const, defaultValue: edit.id }] : []),
          { name: "name", label: "Nome", required: true, defaultValue: edit?.name ?? "" },
          { name: "description", label: "Descrição", defaultValue: edit?.description ?? "" },
          {
            name: "duration_minutes",
            label: "Duração (minutos)",
            type: "number" as const,
            required: true,
            defaultValue: String(edit?.duration_minutes ?? 30),
          },
          {
            name: "price",
            label: "Valor (R$)",
            type: "number" as const,
            step: "0.01",
            defaultValue: edit?.price ? String(edit.price) : "",
          },
          { name: "color", label: "Cor", type: "color" as const, defaultValue: edit?.color ?? "#3b82f6" },
        ]}
        action={edit ? updateProcedure : createProcedure}
        successMessage={edit ? "Procedimento atualizado" : "Procedimento cadastrado"}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Procedimento"
        description="Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
      />

      {userRole === "admin" && (
        <>
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                Solicitações Pendentes
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({pendingTotal})
                </span>
              </h2>
              <Button variant="outline" size="sm" onClick={refreshPending} disabled={pendingRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${pendingRefreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
            <div className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={pendingSearch}
                    onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1) }}
                    placeholder="Buscar nas pendentes..."
                    className="h-9 pl-9 pr-8"
                  />
                  {pendingSearch && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => { setPendingSearch(""); setPendingPage(1) }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleReqSort("name")}>
                      <div className="flex items-center gap-1">
                        Procedimento
                        {reqSortColumn === "name" ? (reqSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleReqSort("description")}>
                      <div className="flex items-center gap-1">
                        Descrição
                        {reqSortColumn === "description" ? (reqSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleReqSort("dentist")}>
                      <div className="flex items-center gap-1">
                        Solicitado por
                        {reqSortColumn === "dentist" ? (reqSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleReqSort("created_at")}>
                      <div className="flex items-center gap-1">
                        Data
                        {reqSortColumn === "created_at" ? (reqSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="w-28 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : pendingAll.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhuma solicitação pendente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {r.description || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.duration_minutes} min</TableCell>
                        <TableCell className="text-muted-foreground">{formatPrice(r.price)}</TableCell>
                        <TableCell>{r.dentist?.name ?? "—"}</TableCell>
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
                              onClick={() => setRejectConfirmId(r.id)}
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
              <DataTablePagination
                page={pendingPage}
                pageSize={pendingPageSize}
                total={pendingTotal}
                onPageChange={setPendingPage}
                onPageSizeChange={(s) => { setPendingPageSize(s); setPendingPage(1) }}
              />
            </div>
          </div>

          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                Histórico de Solicitações
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({historyTotal})
                </span>
              </h2>
              <Button variant="outline" size="sm" onClick={refreshHistory} disabled={historyRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${historyRefreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
            <div className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1) }}
                    placeholder="Buscar no histórico..."
                    className="h-9 pl-9 pr-8"
                  />
                  {historySearch && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => { setHistorySearch(""); setHistoryPage(1) }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleReqSort("name")}>
                      <div className="flex items-center gap-1">
                        Procedimento
                        {reqSortColumn === "name" ? (reqSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleReqSort("dentist")}>
                      <div className="flex items-center gap-1">
                        Solicitado por
                        {reqSortColumn === "dentist" ? (reqSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleReqSort("created_at")}>
                      <div className="flex items-center gap-1">
                        Data
                        {reqSortColumn === "created_at" ? (reqSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="w-16">Situação</TableHead>
                    <TableHead>Revisado em</TableHead>
                    <TableHead className="w-16 text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : historyAll.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Nenhum histórico disponível.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.duration_minutes} min</TableCell>
                        <TableCell className="text-muted-foreground">{formatPrice(r.price)}</TableCell>
                        <TableCell>{r.dentist?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className={`mx-auto h-3 w-3 rounded-full ${r.status === "approved" ? "bg-green-500" : "bg-red-500"}`}
                            title={r.status === "approved" ? "Aprovado" : "Rejeitado"}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.reviewed_at
                            ? new Date(r.reviewed_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDetailRequest(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <DataTablePagination
                page={historyPage}
                pageSize={historyPageSize}
                total={historyTotal}
                onPageChange={setHistoryPage}
                onPageSizeChange={(s) => { setHistoryPageSize(s); setHistoryPage(1) }}
              />
            </div>
          </div>
        </>
      )}

      <Dialog open={detailRequest !== null} onOpenChange={() => setDetailRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailRequest?.name}</DialogTitle>
            <DialogDescription>
              Detalhes completos da solicitação
            </DialogDescription>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Procedimento Solicitado</h4>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="font-medium">{detailRequest.name}</span>
                  </div>
                  {detailRequest.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descrição</span>
                      <span className="max-w-[280px] text-right">{detailRequest.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duração</span>
                    <span>{detailRequest.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor</span>
                    <span>{formatPrice(detailRequest.price)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Solicitação</h4>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solicitado por</span>
                    <span className="font-medium">{detailRequest.dentist?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data da solicitação</span>
                    <span>{new Date(detailRequest.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Revisão</h4>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Situação</span>
                    <div
                      className={`h-3 w-3 rounded-full ${detailRequest.status === "approved" ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="font-medium">{detailRequest.status === "approved" ? "Aprovado" : "Rejeitado"}</span>
                  </div>
                  {detailRequest.admin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revisado por</span>
                      <span className="font-medium">{detailRequest.admin.name ?? "—"}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revisado em</span>
                    <span>
                      {detailRequest.reviewed_at
                        ? new Date(detailRequest.reviewed_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </span>
                  </div>
                  {detailRequest.rejection_reason && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Motivo da rejeição</span>
                      <span className="max-w-[280px] text-right">{detailRequest.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRequest(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {actionLoading && approveConfirmId === actionId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={rejectConfirmId !== null}
        onOpenChange={() => setRejectConfirmId(null)}
        title="Rejeitar Solicitação"
        description="Tem certeza que deseja rejeitar esta solicitação? Você poderá informar um motivo na próxima etapa."
        confirmLabel="Continuar"
        onConfirm={() => {
          const req = requests.find((r) => r.id === rejectConfirmId)
          if (req) { setRejectId(req.id); setRejectConfirmId(null); setRejectOpen(true) }
        }}
      />

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

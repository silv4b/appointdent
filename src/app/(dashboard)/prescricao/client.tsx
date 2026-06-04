"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Eye, Pencil, Plus, Search, Trash2, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/data-table-pagination"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getPrescriptions, deletePrescription } from "@/lib/actions/prescriptions"
import { createClient } from "@/lib/supabase/client"

type PrescriptionRow = {
  id: string
  title: string
  created_at: string
  patients: { name: string } | null
  dentists: { name: string } | null
}

export function PrescricaoClient() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<PrescriptionRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
        if (data) setUserRole(data.role)
      })
    })
  }, [supabase])

  const fetch = useCallback(async (p?: number, ps?: number, s?: string) => {
    const pageNum = p ?? page
    const pageSizeNum = ps ?? pageSize
    const searchTerm = s ?? search
    const result = await getPrescriptions(pageNum, pageSizeNum, searchTerm || undefined)
    if ("error" in result) {
      toast.error(result.error)
    } else if ("data" in result && result.data) {
      setPrescriptions(result.data.data as unknown as PrescriptionRow[])
      setTotal(result.data.total)
    }
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    setPage(1)
  }, [search])

  const handleDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleting(true)
    setDeleteTarget(null)
    setPrescriptions(prev => prev.filter(p => p.id !== target.id))
    const result = await deletePrescription(target.id)
    if (result?.error) {
      toast.error(result.error)
      fetch(page)
    } else {
      toast.success("Receita excluída")
    }
    setDeleting(false)
  }

  const isReceptionist = userRole === "receptionist"

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receituário</h1>
          <p className="mt-1 text-muted-foreground">Gerencie as receitas dos pacientes.</p>
        </div>
        {!isReceptionist && (
          <Button onClick={() => router.push("/prescricao/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Receita
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por paciente ou título..."
              className="h-9 pl-9 pr-8"
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Título</TableHead>
              <TableHead className="text-left">Paciente</TableHead>
              <TableHead className="text-left">Dentista</TableHead>
              <TableHead className="text-left">Data</TableHead>
              <TableHead className="w-40 text-left">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : prescriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {search ? "Nenhuma receita encontrada." : "Nenhuma receita cadastrada."}
                </TableCell>
              </TableRow>
            ) : (
              prescriptions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.patients?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.dentists?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(p.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/prescricao/${p.id}`)}
                        title="Ver receita"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isReceptionist && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/prescricao/${p.id}?edit=true`)}
                            title="Editar receita"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(p)}
                            title="Excluir receita"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
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
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Excluir Receita"
        description={`Tem certeza que deseja excluir a receita "${deleteTarget?.title ?? ""}"?`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

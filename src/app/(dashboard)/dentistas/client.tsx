"use client"

import { Badge } from "@/components/ui/badge"
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
import { EntityDialog } from "@/components/entity-dialog"
import {
  createDentist,
  deleteDentist,
  updateDentist,
} from "@/lib/actions/dentists"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type Dentist = Database["public"]["Tables"]["dentists"]["Row"]

export function DentistsClient() {
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [edit, setEdit] = useState<Dentist | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<"name" | "specialty" | "email" | "active">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const searchRef = useRef<HTMLInputElement>(null)

  const fetch = useCallback(async (p?: number, ps?: number, s?: string) => {
    const pageNum = p ?? page
    const pageSizeNum = ps ?? pageSize
    const searchTerm = s ?? search
    const supabase = createClient()
    let query = supabase
      .from("dentists")
      .select("*", { count: "exact" })
      .order("name")
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    }
    const { data, count } = await query
      .range((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum - 1)
    if (data) setDentists(data)
    if (count !== null) setTotal(count)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    setDentists(prev => prev.filter(d => d.id !== id))
    const result = await deleteDentist(form)
    if (result?.error) {
      toast.error(result.error)
      setPage(1)
      fetch(1)
    } else {
      toast.success("Dentista excluído")
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

  const sorted = [...dentists].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    if (sortColumn === "active") {
      return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * dir
    }
    const aVal = (a[sortColumn] ?? "").toString()
    const bVal = (b[sortColumn] ?? "").toString()
    return aVal.localeCompare(bVal, "pt-BR") * dir
  })

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dentistas</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie o cadastro de dentistas
          </p>
        </div>
        <Button onClick={() => { setEdit(null); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Dentista
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true); fetch(1, pageSize, e.target.value) }}
              placeholder="Buscar dentistas..."
              className="h-9 pl-9 pr-8"
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1); setLoading(true); fetch(1, pageSize, ""); searchRef.current?.focus() }}
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
                  Nome
                  {sortColumn === "name" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("specialty")}>
                <div className="flex items-center gap-1">
                  Especialidade
                  {sortColumn === "specialty" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("email")}>
                <div className="flex items-center gap-1">
                  Email
                  {sortColumn === "email" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
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
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : dentists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum dentista cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.specialty ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.phone ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.email ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={d.active ? "default" : "secondary"}>
                      {d.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEdit(d); setOpen(true) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
          onPageChange={(p) => { setPage(p); fetch(p) }}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); fetch(1, s) }}
        />
      </div>

      <EntityDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) { setPage(1); fetch(1) }
        }}
        title={edit ? "Editar Dentista" : "Novo Dentista"}
        description={edit ? "Atualize os dados do dentista" : "Preencha os dados do novo dentista"}
        fields={[
          ...(edit ? [{ name: "id" as const, label: "ID" as const, type: "hidden" as const, defaultValue: edit.id }] : []),
          { name: "name", label: "Nome", required: true, defaultValue: edit?.name ?? "" },
          { name: "specialty", label: "Especialidade", defaultValue: edit?.specialty ?? "" },
          { name: "cro", label: "CRO", placeholder: "Ex: SP 12345", defaultValue: edit?.cro ?? "" },
          { name: "phone", label: "Telefone", type: "tel" as const, placeholder: "(00) 00000-0000", defaultValue: edit?.phone ?? "" },
          { name: "email", label: "Email", type: "email" as const, placeholder: "email@exemplo.com", defaultValue: edit?.email ?? "" },
        ]}
        action={edit ? updateDentist : createDentist}
        successMessage={edit ? "Dentista atualizado" : "Dentista cadastrado"}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Dentista"
        description="Tem certeza que deseja excluir este dentista? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
      />
    </div>
  )
}

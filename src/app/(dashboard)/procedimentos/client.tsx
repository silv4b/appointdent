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
  createProcedure,
  deleteProcedure,
  updateProcedure,
} from "@/lib/actions/procedures"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

type Procedure = Database["public"]["Tables"]["procedures"]["Row"]

export function ProceduresClient() {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [edit, setEdit] = useState<Procedure | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const fetch = useCallback(async (p?: number, ps?: number, s?: string) => {
    const pageNum = p ?? page
    const pageSizeNum = ps ?? pageSize
    const searchTerm = s ?? search
    const supabase = createClient()
    let query = supabase
      .from("procedures")
      .select("*", { count: "exact" })
      .order("name")
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    }
    const { data, count } = await query
      .range((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum - 1)
    if (data) setProcedures(data)
    if (count !== null) setTotal(count)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    await deleteProcedure(form)
    setPage(1)
    fetch(1)
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

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
              onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true); fetch(1, pageSize, e.target.value) }}
              placeholder="Buscar procedimentos..."
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
              <TableHead>Procedimento</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ativo</TableHead>
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
              procedures.map((p) => (
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEdit(p); setOpen(true) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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
      />
    </div>
  )
}

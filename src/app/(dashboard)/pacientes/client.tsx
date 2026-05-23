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
  createPatient,
  deletePatient,
  updatePatient,
} from "@/lib/actions/patients"
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

type Patient = Database["public"]["Tables"]["patients"]["Row"]

export function PatientsClient() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [edit, setEdit] = useState<Patient | null>(null)
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
      .from("patients")
      .select("*", { count: "exact" })
      .order("name")
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    }
    const { data, count } = await query
      .range((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum - 1)
    if (data) setPatients(data)
    if (count !== null) setTotal(count)
    setLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    await deletePatient(form)
    setPage(1)
    fetch(1)
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie o cadastro de pacientes
          </p>
        </div>
        <Button onClick={() => { setEdit(null); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
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
              placeholder="Buscar pacientes..."
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
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead>Ativo</TableHead>
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
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum paciente cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.cpf ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.birth_date
                      ? format(new Date(p.birth_date), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
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
        title={edit ? "Editar Paciente" : "Novo Paciente"}
        description={edit ? "Atualize os dados do paciente" : "Preencha os dados do novo paciente"}
        fields={[
          ...(edit ? [{ name: "id" as const, label: "ID" as const, type: "hidden" as const, defaultValue: edit.id }] : []),
          { name: "name", label: "Nome", required: true, defaultValue: edit?.name ?? "" },
          { name: "cpf", label: "CPF", placeholder: "000.000.000-00", defaultValue: edit?.cpf ?? "" },
          { name: "phone", label: "Telefone", type: "tel" as const, placeholder: "(00) 00000-0000", defaultValue: edit?.phone ?? "" },
          { name: "birth_date", label: "Data de Nascimento", type: "date" as const, defaultValue: edit?.birth_date ?? "" },
          { name: "notes", label: "Observações", defaultValue: edit?.notes ?? "" },
        ]}
        action={edit ? updatePatient : createPatient}
      />
    </div>
  )
}

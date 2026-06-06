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
  getPatientsPaginated,
} from "@/lib/actions/patients"
import { Database } from "@/types/database"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type Patient = Database["public"]["Tables"]["patients"]["Row"]

export function PatientsClient() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [edit, setEdit] = useState<Patient | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<"name" | "cpf" | "email" | "birth_date" | "active">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await getPatientsPaginated(page, pageSize, search, sortColumn, sortDir)
      if (cancelled) return
      if ("data" in result) {
        setPatients(result.data.data as Patient[])
        setTotal(result.data.total)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [page, pageSize, search, sortColumn, sortDir])

  const handleDelete = async (id: string) => {
    const form = new FormData()
    form.set("id", id)
    setPatients(prev => prev.filter(p => p.id !== id))
    const result = await deletePatient(form)
    if (result?.error) {
      toast.error(result.error)
      setPage(1)
    } else {
      toast.success("Paciente excluído")
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

  const sorted = [...patients].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    if (sortColumn === "birth_date") {
      const aVal = a.birth_date ?? ""
      const bVal = b.birth_date ?? ""
      return (new Date(aVal).getTime() - new Date(bVal).getTime()) * dir
    }
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true) }}
              placeholder="Buscar pacientes..."
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
                  Nome
                  {sortColumn === "name" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("cpf")}>
                <div className="flex items-center gap-1">
                  CPF
                  {sortColumn === "cpf" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("email")}>
                <div className="flex items-center gap-1">
                  Email
                  {sortColumn === "email" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("birth_date")}>
                <div className="flex items-center gap-1">
                  Nascimento
                  {sortColumn === "birth_date" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
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
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum paciente cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.cpf ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email ?? "-"}</TableCell>
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
        title={edit ? "Editar Paciente" : "Novo Paciente"}
        description={edit ? "Atualize os dados do paciente" : "Preencha os dados do novo paciente"}
        fields={[
          ...(edit ? [{ name: "id" as const, label: "ID" as const, type: "hidden" as const, defaultValue: edit.id }] : []),
          { name: "name", label: "Nome", required: true, defaultValue: edit?.name ?? "" },
          { name: "cpf", label: "CPF", placeholder: "000.000.000-00", defaultValue: edit?.cpf ?? "" },
          { name: "phone", label: "Telefone", type: "tel" as const, placeholder: "(00) 00000-0000", defaultValue: edit?.phone ?? "" },
          { name: "email", label: "Email", type: "email" as const, placeholder: "paciente@exemplo.com", defaultValue: edit?.email ?? "" },
          { name: "birth_date", label: "Data de Nascimento", type: "date" as const, defaultValue: edit?.birth_date ?? "" },
          { name: "notes", label: "Observações", defaultValue: edit?.notes ?? "" },
          { name: "active", label: "Ativo", type: "checkbox" as const, defaultValue: !edit || edit.active ? "on" : "off" },
        ]}
        action={edit ? updatePatient : createPatient}
        successMessage={edit ? "Paciente atualizado" : "Paciente cadastrado"}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Paciente"
        description="Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
      />
    </div>
  )
}

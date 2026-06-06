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
  updateDentist,
} from "@/lib/actions/dentists"
import { getDentistsPaginated } from "@/lib/actions/queries"
import { Database } from "@/types/database"
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type Dentist = Database["public"]["Tables"]["dentists"]["Row"]

export function DentistsClient({ role }: { role: string | null }) {
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [edit, setEdit] = useState<Dentist | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<"name" | "specialty" | "email" | "active">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await getDentistsPaginated(page, pageSize, search || undefined, sortColumn, sortDir)
      if (cancelled) return
      if ("data" in result) {
        setDentists(result.data.data as Dentist[])
        setTotal(result.data.total)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [page, pageSize, search, sortColumn, sortDir])

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
            Visualize os dados profissionais dos dentistas
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true) }}
              placeholder="Buscar dentistas..."
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
              <TableHead>Usuário</TableHead>
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
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : dentists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                    <Badge variant={d.profile_id ? "default" : "secondary"}>
                      {d.profile_id ? "Vinculado" : "Sem usuário"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.active ? "default" : "secondary"}>
                      {d.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {role === "admin" && (
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEdit(d); setOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
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
        title="Editar Dentista"
        description="Atualize os dados profissionais do dentista"
        fields={[
          { name: "id" as const, label: "ID" as const, type: "hidden" as const, defaultValue: edit?.id ?? "" },
          { name: "name", label: "Nome", required: true, defaultValue: edit?.name ?? "" },
          { name: "specialty", label: "Especialidade", defaultValue: edit?.specialty ?? "" },
          { name: "cro", label: "CRO", placeholder: "Ex: SP 12345", defaultValue: edit?.cro ?? "" },
          { name: "phone", label: "Telefone", type: "tel" as const, placeholder: "(00) 00000-0000", defaultValue: edit?.phone ?? "" },
          { name: "email", label: "Email", type: "email" as const, placeholder: "email@exemplo.com", defaultValue: edit?.email ?? "" },
          { name: "active", label: "Ativo", type: "checkbox" as const, defaultValue: edit?.active ? "on" : "off" },
        ]}
        action={updateDentist}
        successMessage="Dentista atualizado"
      />
    </div>
  )
}

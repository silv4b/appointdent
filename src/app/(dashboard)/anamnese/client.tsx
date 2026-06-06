"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/data-table-pagination"
import { getAnamnesePatientsList } from "@/lib/actions/queries"
import { Database } from "@/types/database"
import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Search, UserRound, FileText, X } from "lucide-react"
import Link from "next/link"

type Patient = Database["public"]["Tables"]["patients"]["Row"]
type Dentist = Database["public"]["Tables"]["dentists"]["Row"]

export function AnamneseSearchClient() {
  const [query, setQuery] = useState("")
  const [dentistId, setDentistId] = useState("all")
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortColumn, setSortColumn] = useState<"name" | "phone" | "birth_date">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [userRole] = useState<string | null>(null)
  const [receptionistDentistIds] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await getAnamnesePatientsList({ page, pageSize, search: query, dentistFilter: dentistId === "all" ? undefined : dentistId })
      if (cancelled) return
      if ("data" in result) {
        setPatients(result.data.data as Patient[])
        setTotal(result.data.total)
      } else {
        setPatients([])
        setTotal(0)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [page, pageSize, query, dentistId])

  const handleSearchChange = (value: string) => {
    setQuery(value)
    setPage(1)
    setLoading(true)
  }

  const handleDentistChange = (value: string | null) => {
    const v = value ?? "all"
    setDentistId(v)
    setPage(1)
    setLoading(true)
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
    if (sortColumn === "phone") {
      return (a.phone ?? "").localeCompare(b.phone ?? "", "pt-BR") * dir
    }
    if (sortColumn === "birth_date") {
      const aDate = a.birth_date ? new Date(a.birth_date).getTime() : 0
      const bDate = b.birth_date ? new Date(b.birth_date).getTime() : 0
      return (aDate - bDate) * dir
    }
    return (a.name ?? "").localeCompare(b.name ?? "", "pt-BR") * dir
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Anamnese</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque pacientes para visualizar ou adicionar anotações de sessões.
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Filtrar pacientes..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 pl-9 pr-8"
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  handleSearchChange("")
                  searchRef.current?.focus()
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={dentistId}
            onValueChange={handleDentistChange}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Todos os dentistas">
                {dentistId === "all"
                  ? "Todos os dentistas"
                  : dentists.find((d) => d.id === dentistId)?.name ?? "Todos os dentistas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dentistas</SelectItem>
              {(userRole === "receptionist" && receptionistDentistIds.length > 0
                ? dentists.filter((d) => receptionistDentistIds.includes(d.id))
                : dentists
              ).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <span className="flex items-center gap-1">
                  Paciente
                  {sortColumn === "name" ? (
                    sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("phone")}>
                <span className="flex items-center gap-1">
                  Telefone
                  {sortColumn === "phone" ? (
                    sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("birth_date")}>
                <span className="flex items-center gap-1">
                  Data de Nasc.
                  {sortColumn === "birth_date" ? (
                    sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <UserRound className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">
                      {total === 0 && !query && dentistId === "all"
                        ? "Nenhum paciente cadastrado"
                        : "Nenhum paciente encontrado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {total === 0 && !query && dentistId === "all"
                        ? "Cadastre pacientes para começar."
                        : "Tente alterar os filtros ou termos da busca."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.phone ?? "-"}</TableCell>
                  <TableCell>{p.birth_date ? new Date(p.birth_date).toLocaleDateString("pt-BR") : "-"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/anamnese/${p.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Anamnese
                    </Link>
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
          onPageChange={(p) => {
            setPage(p)
            setLoading(true)
          }}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
            setLoading(true)
          }}
        />
      </div>
    </div>
  )
}

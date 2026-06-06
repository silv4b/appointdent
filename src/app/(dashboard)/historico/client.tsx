"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { getUserSessionData } from "@/lib/actions/session"
import { getHistoricoPatientsList, getDentistsSimpleList } from "@/lib/actions/queries"
import { Database } from "@/types/database"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ExternalLink, Search, X } from "lucide-react"
import Link from "next/link"

import { useEffect, useRef, useState } from "react"

type Patient = Database["public"]["Tables"]["patients"]["Row"]
type Dentist = { id: string; name: string }

export function HistoricoClient() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [filterDentist, setFilterDentist] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [receptionistDentistIds, setReceptionistDentistIds] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getUserSessionData().then((result) => {
      if ("data" in result) {
        setCurrentUserRole(result.data.role)
        if (result.data.role === "receptionist") {
          setReceptionistDentistIds(result.data.receptionistDentistIds)
        }
      }
    })
    getDentistsSimpleList().then((r) => {
      if ("data" in r) setDentists(r.data as Dentist[])
    })
  }, [])

  useEffect(() => {
    if (currentUserRole === null) return
    let cancelled = false
    ;(async () => {
      const result = await getHistoricoPatientsList({
        page,
        pageSize,
        search: search || undefined,
        dentistFilter: filterDentist === "all" ? undefined : filterDentist,
      })
      if (cancelled) return
      if ("data" in result) {
        setPatients(result.data.data as Patient[])
        setTotal(result.data.total)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [page, pageSize, search, filterDentist, currentUserRole])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Agendamentos</h1>
        <p className="mt-1 text-muted-foreground">
          Consulte o histórico de atendimentos dos pacientes
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-end gap-3 border-b px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true) }}
              placeholder="Buscar por nome ou CPF..."
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

          {currentUserRole !== "dentist" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Dentista</Label>
              <Select
                value={filterDentist}
                onValueChange={(v) => { if (v) { setFilterDentist(v); setPage(1); setLoading(true) } }}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="Todos os dentistas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dentistas</SelectItem>
                  {(currentUserRole === "receptionist" && receptionistDentistIds.length > 0
                    ? dentists.filter((d) => receptionistDentistIds.includes(d.id))
                    : dentists
                  ).map((dent) => (
                    <SelectItem key={dent.id} value={dent.id}>{dent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Data início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); setLoading(true) }}
              className="h-9 w-40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Data fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); setLoading(true) }}
              className="h-9 w-40"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead>Situação</TableHead>
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
                  Nenhum paciente encontrado.
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
                    <Link href={`/historico/${p.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Atendimentos
                      </Button>
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
          onPageChange={(p) => { setPage(p) }}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </div>
    </div>
  )
}

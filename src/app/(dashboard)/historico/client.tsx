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
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ExternalLink, Search, X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

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
  const [currentDentistId, setCurrentDentistId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data: profile }) => {
        if (!profile) return
        setCurrentUserRole(profile.role)
        if (profile.role === "dentist") {
          supabase.from("dentists").select("id").eq("profile_id", user.id).single().then(({ data: dent }) => {
            if (dent) setCurrentDentistId(dent.id)
          })
        }
      })
    })
    supabase.from("dentists").select("id, name").order("name").then(({ data }) => {
      if (data) setDentists(data as Dentist[])
    })
  }, [])

  const fetchPatients = useCallback(async (p?: number, ps?: number, s?: string, d?: string, sd?: string, ed?: string) => {
    const pageNum = p ?? page
    const pageSizeNum = ps ?? pageSize
    const searchTerm = s ?? search
    const dentistFilter = d ?? filterDentist
    const start = sd ?? startDate
    const end = ed ?? endDate

    const supabase = createClient()

    const effectiveDentist = currentUserRole === "dentist" ? currentDentistId : dentistFilter !== "all" ? dentistFilter : null

    let patientIds: string[] | null = null

    if (effectiveDentist || start || end) {
      let idQuery = supabase.from("appointments").select("patient_id")
      if (effectiveDentist) idQuery = idQuery.eq("dentist_id", effectiveDentist)
      if (start) idQuery = idQuery.gte("start_time", start)
      if (end) idQuery = idQuery.lte("start_time", end)
      const { data } = await idQuery
      patientIds = [...new Set(data?.map((r) => r.patient_id) ?? [])]
    }

    let query = supabase.from("patients").select("*", { count: "exact" }).order("name")

    if (patientIds !== null) {
      query = query.in("id", patientIds.length > 0 ? patientIds : ["00000000-0000-0000-0000-000000000000"])
    }

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`)
    }

    const { data, count } = await query.range((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum - 1)

    if (data) setPatients(data)
    if (count !== null) setTotal(count)
    setLoading(false)
  }, [page, pageSize, search, filterDentist, startDate, endDate, currentUserRole, currentDentistId])

  useEffect(() => {
    if (currentUserRole !== null) fetchPatients()
  }, [fetchPatients, currentUserRole])

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
              onChange={(e) => { setSearch(e.target.value); setPage(1); setLoading(true); fetchPatients(1, pageSize, e.target.value, filterDentist, startDate, endDate) }}
              placeholder="Buscar por nome ou CPF..."
              className="h-9 pl-9 pr-8"
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1); setLoading(true); fetchPatients(1, pageSize, "", filterDentist, startDate, endDate); searchRef.current?.focus() }}
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
                onValueChange={(v) => { if (v) { setFilterDentist(v); setPage(1); setLoading(true); fetchPatients(1, pageSize, search, v, startDate, endDate) } }}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="Todos os dentistas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dentistas</SelectItem>
                  {dentists.map((dent) => (
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
              onChange={(e) => { setStartDate(e.target.value); setPage(1); setLoading(true); fetchPatients(1, pageSize, search, filterDentist, e.target.value, endDate) }}
              className="h-9 w-40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Data fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); setLoading(true); fetchPatients(1, pageSize, search, filterDentist, startDate, e.target.value) }}
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
          onPageChange={(p) => { setPage(p); fetchPatients(p) }}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); fetchPatients(1, s) }}
        />
      </div>
    </div>
  )
}

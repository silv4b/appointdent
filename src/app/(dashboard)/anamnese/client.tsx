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
import { createClient } from "@/lib/supabase/client"
import { Database } from "@/types/database"
import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, UserRound, FileText } from "lucide-react"
import Link from "next/link"

type Patient = Database["public"]["Tables"]["patients"]["Row"]
type Dentist = Database["public"]["Tables"]["dentists"]["Row"]
type AppointmentLink = Pick<Database["public"]["Tables"]["appointments"]["Row"], "patient_id" | "dentist_id">

export function AnamneseSearchClient() {
  const [query, setQuery] = useState("")
  const [dentistId, setDentistId] = useState("all")
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [appointments, setAppointments] = useState<AppointmentLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("patients").select("*").order("name").limit(500),
      supabase.from("dentists").select("*").order("name"),
      supabase.from("appointments").select("patient_id, dentist_id"),
    ]).then(([patientsRes, dentistsRes, apptsRes]) => {
      setPatients(patientsRes.data ?? [])
      setDentists(dentistsRes.data ?? [])
      setAppointments(apptsRes.data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    let result = patients

    if (dentistId !== "all") {
      const patientIds = new Set(
        appointments
          .filter((a) => a.dentist_id === dentistId)
          .map((a) => a.patient_id),
      )
      result = result.filter((p) => patientIds.has(p.id))
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }

    return result
  }, [patients, dentistId, appointments, query])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Anamnese</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque pacientes para visualizar ou adicionar anotações de sessões.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Nome do Paciente
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filtrar pacientes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="w-56">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Dentista
          </label>
          <Select
            value={dentistId}
            onValueChange={(v) => setDentistId(v ?? "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os dentistas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dentistas</SelectItem>
              {dentists.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <UserRound className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">
            {patients.length === 0
              ? "Nenhum paciente cadastrado"
              : "Nenhum paciente encontrado"}
          </p>
          <p className="text-sm text-muted-foreground">
            {patients.length === 0
              ? "Cadastre pacientes para começar."
              : "Tente alterar os filtros ou termos da busca."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data de Nasc.</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.phone ?? "-"}</TableCell>
                  <TableCell>{p.birth_date ?? "-"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/anamnese/${p.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Anamnese
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

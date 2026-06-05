"use client"

import { Button } from "@/components/ui/button"
import { DataTablePagination } from "@/components/data-table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { deleteAnamnesisTemplate, getMyAnamnesisTemplates } from "@/lib/actions/anamnesis-templates"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Plus, Trash2, FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Template = {
  id: string
  name: string
  fields: { label: string; description?: string; defaultContent?: string }[]
  created_at: string
}

export function MinhasAnamnesesClient() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data: profile }) => {
        if (profile?.role !== "dentist") {
          router.push("/")
          return
        }
        getMyAnamnesisTemplates().then((res) => {
if ("data" in res) setTemplates(res.data as unknown as Template[])
          setLoading(false)
        })
      })
    })
  }, [router])

  const handleDelete = async () => {
    if (!deleteId) return
    const targetId = deleteId
    setDeleting(true)
    setDeleteId(null)
    setTemplates(prev => prev.filter(t => t.id !== targetId))
    const form = new FormData()
    form.set("id", targetId)
    const result = await deleteAnamnesisTemplate(form)
    if (result?.error) {
      toast.error(result.error)
      const res = await getMyAnamnesisTemplates()
      if ("data" in res) setTemplates(res.data as unknown as Template[])
    } else {
      toast.success("Modelo excluído")
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Anamneses</h1>
          <p className="mt-1 text-muted-foreground">Modelos de anamnese para usar durante os atendimentos</p>
        </div>
        <Link href="/minhas-anamneses/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Modelo
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">Nenhum modelo criado</p>
          <p className="text-xs text-muted-foreground">Crie modelos de anamnese para agilizar seus atendimentos.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Campos</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.slice((page - 1) * pageSize, page * pageSize).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-sm truncate">
                    {Array.from(t.fields as any[]).reverse().map((f: any) => (
                      <span key={f.label} className="block truncate">
                        <span className="font-medium text-foreground">{f.label}</span>
                        {f.description ? <span className="text-muted-foreground/60"> — {f.description}</span> : null}
                        {f.defaultContent ? <span className="text-muted-foreground/40 ml-1">(c/ conteúdo padrão)</span> : null}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataTablePagination page={page} pageSize={pageSize} total={templates.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} />
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Modelo"
        description="Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

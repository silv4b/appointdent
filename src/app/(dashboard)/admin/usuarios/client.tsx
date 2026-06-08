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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTablePagination } from "@/components/data-table-pagination"
import { createUser, deleteUser, getUsers, updateUser } from "@/lib/actions/admin"
import { getDentistsSimpleList, getReceptionistDentistIds } from "@/lib/actions/queries"
import { ArrowDown, ArrowUp, ArrowUpDown, Dices, Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState, startTransition } from "react"
import { toast } from "sonner"
import { generatePassword } from "@/lib/utils/password"

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  dentist_id: string | null
  specialty: string | null
  created_at: string
  total: number
}

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  dentist: "Dentista",
  receptionist: "Secretária",
}

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  dentist: "secondary",
  receptionist: "outline",
}

function CriarUsuarioDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [dentistIds, setDentistIds] = useState<string[]>([])
  const [dentists, setDentists] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (open) {
      setDentistIds([])
      getDentistsSimpleList().then((res) => {
        if ("data" in res && res.data) setDentists(res.data.map((d) => ({ id: d.id, name: d.name })))
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = new FormData()
    form.set("name", name)
    form.set("email", email)
    form.set("password", password)
    form.set("confirmPassword", confirmPassword)
    form.set("role", role)
    if (role === "dentist") form.set("specialty", specialty)
    if (role === "receptionist") {
      form.set("dentist_ids", JSON.stringify(dentistIds))
    }

    setSaving(true)
    const result = await createUser(form)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Usuário criado")
      onOpenChange(false)
      onSuccess()
    }
    setSaving(false)
  }

  const toggleDentist = (id: string) => {
    setDentistIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogDescription>Crie uma conta para acesso ao sistema</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-name">Nome</Label>
            <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-password">Senha</Label>
            <div className="relative">
              <Input id="user-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número" className="pr-20" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setPassword(generatePassword())} className="text-muted-foreground hover:text-foreground" tabIndex={-1} title="Gerar senha">
                  <Dices className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-confirm">Confirmar Senha</Label>
            <div className="relative">
              <Input id="user-confirm" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pr-10" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-role">Função</Label>
            <Select value={role} onValueChange={(v) => { setRole(v ?? ""); setDentistIds([]) }}>
              <SelectTrigger id="user-role" className="w-full">
                <span className="flex flex-1 text-left">{role ? roleLabel[role] ?? role : <span className="text-muted-foreground">Selecione...</span>}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="dentist">Dentista</SelectItem>
                <SelectItem value="receptionist">Secretária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "dentist" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-specialty">Especialidade</Label>
              <Input id="user-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Clínico Geral, Ortodontia..." />
            </div>
          )}
          {role === "receptionist" && (
            <div className="flex flex-col gap-2">
              <Label>Vincular a dentistas</Label>
              {dentists.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {dentists.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={dentistIds.includes(d.id)}
                        onChange={() => toggleDentist(d.id)}
                        className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum dentista cadastrado.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditarUsuarioDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: UserRow | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(user?.name ?? "")
  const [role, setRole] = useState(user?.role ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [specialty, setSpecialty] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [dentistIds, setDentistIds] = useState<string[]>([])
  const [dentists, setDentists] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (open && user) {
      setName(user.name)
      setEmail(user.email)
      setRole(user.role)
      setSpecialty(user.specialty ?? "")
      setDentistIds([])
      getDentistsSimpleList().then((res) => {
        if ("data" in res && res.data) setDentists(res.data.map((d) => ({ id: d.id, name: d.name })))
      })
      if (user.role === "receptionist") {
        getReceptionistDentistIds(user.id).then((res) => {
          if ("data" in res && res.data) setDentistIds(res.data)
        })
      }
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const form = new FormData()
    form.set("userId", user.id)
    form.set("name", name)
    form.set("email", email)
    form.set("role", role)
    if (role === "dentist") form.set("specialty", specialty)
    if (role === "receptionist") {
      form.set("dentist_ids", JSON.stringify(dentistIds))
    }
    if (password) {
      form.set("password", password)
      form.set("confirmPassword", confirmPassword)
    }

    setSaving(true)
    const result = await updateUser(form)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Usuário atualizado")
      onOpenChange(false)
      onSuccess()
    }
    setSaving(false)
  }

  const toggleDentist = (id: string) => {
    setDentistIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Altere os dados do usuário</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-role">Função</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? "")}>
              <SelectTrigger id="edit-role" className="w-full">
                <span className="flex flex-1 text-left">{role ? roleLabel[role] ?? role : <span className="text-muted-foreground">Selecione...</span>}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="dentist">Dentista</SelectItem>
                <SelectItem value="receptionist">Secretária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "dentist" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-specialty">Especialidade</Label>
              <Input id="edit-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Clínico Geral, Ortodontia..." />
            </div>
          )}
          {role === "receptionist" && (
            <div className="flex flex-col gap-2">
              <Label>Vincular a dentistas</Label>
              {dentists.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {dentists.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={dentistIds.includes(d.id)}
                        onChange={() => toggleDentist(d.id)}
                        className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum dentista cadastrado.</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-password">Nova Senha (deixe em branco para manter)</Label>
            <div className="relative">
              <Input id="edit-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número" className="pr-20" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setPassword(generatePassword())} className="text-muted-foreground hover:text-foreground" tabIndex={-1} title="Gerar senha">
                  <Dices className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          {password && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-confirm">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input id="edit-confirm" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UsuariosClient() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sortColumn, setSortColumn] = useState<"name" | "email" | "role" | "created_at">("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const searchRef = useRef<HTMLInputElement>(null)

  const fetch = useCallback(async (p?: number, ps?: number) => {
    const pageNum = p ?? page
    const pageSizeNum = ps ?? pageSize
    const res = await getUsers(pageNum, pageSizeNum)
    startTransition(() => {
      if ("error" in res) {
        toast.error(res.error!)
      } else if (res.data) {
        setUsers(res.data.data as UserRow[])
        setTotal(res.data.total)
      }
      setLoading(false)
    })
  }, [page, pageSize])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async (u: UserRow) => {
    setDeleting(true)
    setDeletingUser(null)
    const form = new FormData()
    form.set("userId", u.id)
    setUsers(prev => prev.filter(user => user.id !== u.id))
    const result = await deleteUser(form)
    if (result?.error) {
      toast.error(result.error)
      fetch(page)
    } else {
      toast.success("Usuário excluído")
    }
    setDeleting(false)
  }

  const toggleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(col)
      setSortDir("asc")
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    const aVal = a[sortColumn] ?? ""
    const bVal = b[sortColumn] ?? ""
    if (sortColumn === "created_at") {
      return (new Date(aVal).getTime() - new Date(bVal).getTime()) * dir
    }
    return aVal.localeCompare(bVal, "pt-BR") * dir
  })

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie as contas de acesso ao sistema
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="h-9 pl-9 pr-8"
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Todas as funções">
                {roleFilter !== "all" ? roleLabel[roleFilter] ?? roleFilter : "Todas as funções"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="dentist">Dentista</SelectItem>
              <SelectItem value="receptionist">Secretária</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <span className="flex items-center gap-1">
                  Nome
                  {sortColumn === "name" ? (
                    sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("email")}>
                <span className="flex items-center gap-1">
                  Email
                  {sortColumn === "email" ? (
                    sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("role")}>
                <span className="flex items-center gap-1">
                  Função
                  {sortColumn === "role" ? (
                    sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                <span className="flex items-center gap-1">
                  Criado em
                  {sortColumn === "created_at" ? (
                    sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
              <TableHead className="w-16">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[u.role] ?? "outline"}>
                      {roleLabel[u.role] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingUser(u)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingUser(u)}
                      >
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
          onPageChange={(p) => { setPage(p); setLoading(true); fetch(p) }}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); setLoading(true); fetch(1, s) }}
        />
      </div>

      <Dialog open={!!deletingUser} onOpenChange={(v) => { if (!v) setDeletingUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deletingUser?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingUser && handleDelete(deletingUser)}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditarUsuarioDialog
        key={editingUser?.id ?? "none"}
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(v) => { if (!v) setEditingUser(null) }}
        onSuccess={() => { fetch(page) }}
      />

      <CriarUsuarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => { setPage(1); fetch(1) }}
      />
    </div>
  )
}

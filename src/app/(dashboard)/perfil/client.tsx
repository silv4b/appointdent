"use client"

import { useSupabase } from "@/components/providers/supabase-provider"
import { getUserSessionData } from "@/lib/actions/session"
import { updateProfileName, updateProfileEmail, updateProfilePassword } from "@/lib/actions/profile"
import { useCallback, useEffect, useState } from "react"
import { Building2, Loader2, User, BadgeInfo, Upload, Eye, EyeOff, Check, X, Mail, Dices, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DynamicField } from "@/components/dynamic-field"
import { toast } from "sonner"
import { getClinicSettings, saveClinicSettings } from "@/lib/actions/clinic-settings"
import { getEmailConfig, updateEmailConfig } from "@/lib/actions/config"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { CropDialog } from "@/components/crop-dialog"
import { maskPhone, maskCnpj } from "@/lib/utils/masks"
import type { Database } from "@/types/database"

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  dentist: "Dentista",
  receptionist: "Secretária",
}

type ClinicData = Database["public"]["Tables"]["clinic_settings"]["Row"]

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Mínimo de 8 caracteres"
  if (!/[A-Z]/.test(password)) return "Falta letra maiúscula"
  if (!/[a-z]/.test(password)) return "Falta letra minúscula"
  if (!/[0-9]/.test(password)) return "Falta número"
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) return "Falta caractere especial"
  return null
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const checks = [
    { label: "8+ caracteres", pass: password.length >= 8 },
    { label: "Maiúscula", pass: /[A-Z]/.test(password) },
    { label: "Minúscula", pass: /[a-z]/.test(password) },
    { label: "Número", pass: /[0-9]/.test(password) },
    { label: "Especial", pass: /[!@#$%^&*(),.?":{}|<>_\-]/.test(password) },
  ]
  const passed = checks.filter((c) => c.pass).length
  const strength = passed <= 2 ? "Fraca" : passed <= 3 ? "Média" : "Forte"
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"]

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < passed ? colors[i] : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Senha {strength}
      </p>
      <ul className="space-y-0.5">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.pass ? "text-green-600" : "text-muted-foreground"}`}>
            {c.pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PerfilClient() {
  const { user } = useSupabase()
  const [role, setRole] = useState<string | null>(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [loading, setLoading] = useState(true)

  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [, setClinic] = useState<ClinicData | null>(null)
  const [clinicId, setClinicId] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [clinicStreet, setClinicStreet] = useState("")
  const [clinicNumber, setClinicNumber] = useState("")
  const [clinicNeighborhood, setClinicNeighborhood] = useState("")
  const [clinicCity, setClinicCity] = useState("")
  const [clinicState, setClinicState] = useState("")
  const [clinicEmail, setClinicEmail] = useState("")
  const [clinicPhone1, setClinicPhone1] = useState("")
  const [clinicPhone2, setClinicPhone2] = useState("")
  const [clinicCnpj, setClinicCnpj] = useState("")
  const [clinicLogo, setClinicLogo] = useState<string | null>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false)
  const [savingClinic, setSavingClinic] = useState(false)

  const [gmailUser, setGmailUser] = useState("")
  const [gmailAppPassword, setGmailAppPassword] = useState("")
  const [savingEmailConfig, setSavingEmailConfig] = useState(false)

  useEffect(() => {
    getUserSessionData().then((result) => {
      if ("data" in result) {
        setRole(result.data.role)
        setMustChangePassword(result.data.mustChangePassword)
      }
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const name = user.user_metadata?.name as string | undefined
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (name) setEditName(name)
    if (user.email) setEditEmail(user.email)
  }, [user])

  useEffect(() => {
    if (role !== "admin") return
    getClinicSettings().then((result) => {
      if ("data" in result && result.data) {
        const c = result.data as ClinicData
        setClinic(c)
        setClinicId(c.id)
        setClinicName(c.name)
        setClinicStreet(c.street)
        setClinicNumber(c.number)
        setClinicNeighborhood(c.neighborhood)
        setClinicCity(c.city)
        setClinicState(c.state)
        setClinicEmail(c.email)
        setClinicPhone1(c.phone1 ? maskPhone(c.phone1) : "")
        setClinicPhone2(c.phone2 ? maskPhone(c.phone2) : "")
        setClinicCnpj(c.cnpj ? maskCnpj(c.cnpj) : "")
        setClinicLogo(c.logo ?? null)
      }
    })
    getEmailConfig().then((result) => {
      if (result) {
        setGmailUser(result.gmailUser)
        setGmailAppPassword(result.gmailAppPassword ? "••••••••" : "")
      }
    })
  }, [role])

  const handleSaveName = async () => {
    const trimmed = editName.trim()
    if (!trimmed) { toast.error("O nome não pode ficar vazio"); return }
    setSavingName(true)
    const result = await updateProfileName(trimmed)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Nome atualizado!")
    }
    setSavingName(false)
  }

  const handleSaveEmail = async () => {
    const trimmed = editEmail.trim()
    if (!trimmed) { toast.error("O email não pode ficar vazio"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { toast.error("Email inválido"); return }
    setSavingEmail(true)
    const result = await updateProfileEmail(trimmed)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Email de confirmação enviado! Verifique sua caixa de entrada.")
    }
    setSavingEmail(false)
  }

  const handleSavePassword = async () => {
    const error = validatePassword(newPassword)
    if (error) { toast.error(`Senha inválida: ${error}`); return }
    if (newPassword !== confirmPassword) { toast.error("As senhas não conferem"); return }
    setSavingPassword(true)
    const result = await updateProfilePassword(newPassword)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Senha atualizada com sucesso!")
      if (mustChangePassword) {
        setMustChangePassword(false)
        setNewPassword("")
        setConfirmPassword("")
        window.location.href = "/"
      } else {
        setNewPassword("")
        setConfirmPassword("")
      }
    }
    setSavingPassword(false)
  }

  const handleSaveEmailConfig = async () => {
    setSavingEmailConfig(true)
    const formData = new FormData()
    formData.set("gmailUser", gmailUser)
    formData.set("gmailAppPassword", gmailAppPassword === "••••••••" ? "" : gmailAppPassword)
    const result = await updateEmailConfig(formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Configuração de email salva!")
      setGmailAppPassword("••••••••")
    }
    setSavingEmailConfig(false)
  }

  const handleSaveClinic = useCallback(async () => {
    setSavingClinic(true)
    const formData = new FormData()
    if (clinicId) formData.set("id", clinicId)
    formData.set("name", clinicName)
    formData.set("street", clinicStreet)
    formData.set("number", clinicNumber)
    formData.set("neighborhood", clinicNeighborhood)
    formData.set("city", clinicCity)
    formData.set("state", clinicState)
    formData.set("email", clinicEmail)
    formData.set("phone1", clinicPhone1)
    formData.set("phone2", clinicPhone2)
    formData.set("cnpj", clinicCnpj)
    formData.set("logo", clinicLogo ?? "")
    const result = await saveClinicSettings(formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Dados da clínica salvos!")
    }
    setSavingClinic(false)
  }, [clinicId, clinicName, clinicStreet, clinicNumber, clinicNeighborhood, clinicCity, clinicState, clinicEmail, clinicPhone1, clinicPhone2, clinicCnpj, clinicLogo])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (mustChangePassword) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-lg border bg-card">
          <div className="border-b bg-amber-50 px-6 py-8 text-center dark:bg-amber-950">
            <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-amber-600" />
            <h1 className="text-xl font-bold text-amber-800 dark:text-amber-200">Senha Temporária</h1>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Você está usando uma senha temporária. Crie uma nova senha para continuar.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {newPassword && <PasswordStrength password={newPassword} />}

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">As senhas não conferem</p>
            )}

            <Button
              className="w-full"
              onClick={handleSavePassword}
              disabled={savingPassword || !newPassword || !!passwordError || !passwordsMatch}
            >
              {savingPassword ? "Salvando..." : "Criar Nova Senha"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const initials = user?.user_metadata?.name
    ? (user.user_metadata.name as string).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?")

  const displayName = user?.user_metadata?.name as string | undefined
  const userEmail = user?.email ?? "—"
  const passwordError = newPassword ? validatePassword(newPassword) : null
  const passwordsMatch = newPassword === confirmPassword

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="mt-1 text-muted-foreground">Informações da sua conta</p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col items-center gap-4 border-b px-6 py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
            {initials}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold">{displayName ?? "Usuário"}</h2>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div className="divide-y px-6">
          <div className="py-4">
            <p className="text-xs text-muted-foreground mb-1.5">Nome</p>
            <div className="flex gap-2">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Seu nome" />
              <Button size="sm" onClick={handleSaveName} disabled={savingName || editName === (displayName ?? "")}>
                {savingName ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          <div className="py-4">
            <p className="text-xs text-muted-foreground mb-1.5">Email</p>
            <div className="flex gap-2">
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="seu@email.com" />
              <Button size="sm" onClick={handleSaveEmail} disabled={savingEmail || editEmail === (user?.email ?? "")}>
                {savingEmail ? "Salvando..." : "Salvar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Um link de confirmação será enviado para o novo email.
            </p>
          </div>

          <div className="flex items-center gap-4 py-4">
            <BadgeInfo className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Função</p>
              <p className="text-sm font-medium">{ROLE_LABEL[role ?? ""] ?? role ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-card">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Alterar Senha</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {newPassword && (
            <PasswordStrength password={newPassword} />
          )}

          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">As senhas não conferem</p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSavePassword}
              disabled={savingPassword || !newPassword || !!passwordError || !passwordsMatch}
            >
              {savingPassword ? "Salvando..." : "Salvar Senha"}
            </Button>
          </div>
        </div>
      </div>

      {role === "admin" && (
        <div className="mt-8 rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Atalhos</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Gerencie as solicitações de procedimentos na página de{" "}
              <a href="/admin/solicitacoes" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Solicitações
              </a>.
            </p>
          </div>
        </div>
      )}

      {role === "admin" && (
        <div className="mt-8 rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Dados da Clínica</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Logo */}
              <div className="flex items-center gap-4 pb-2">
                <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {clinicLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clinicLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Logo da Clínica</p>
                <label
                  htmlFor="clinicLogo"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Escolher imagem
                </label>
                <input
                  id="clinicLogo"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      setCropImageSrc(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                    e.target.value = ""
                  }}
                />
                {clinicLogo && (
                  <button
                    type="button"
                    className="block text-xs text-destructive hover:underline"
                    onClick={() => setConfirmRemoveLogo(true)}
                  >
                    Remover logo
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DynamicField
                type="text"
                label="Nome da Clínica"
                value={clinicName}
                onChange={setClinicName}
                placeholder="Ex: Clínica Odontológica Sorriso Perfeito"
                className="sm:col-span-2"
              />
              <DynamicField
                type="text"
                label="Rua"
                value={clinicStreet}
                onChange={setClinicStreet}
                placeholder="Ex: Rua Augusta"
              />
              <DynamicField
                type="text"
                label="Número"
                value={clinicNumber}
                onChange={setClinicNumber}
                placeholder="Ex: 1500"
              />
              <DynamicField
                type="text"
                label="Bairro"
                value={clinicNeighborhood}
                onChange={setClinicNeighborhood}
                placeholder="Ex: Consolação"
              />
              <DynamicField
                type="text"
                label="Cidade"
                value={clinicCity}
                onChange={setClinicCity}
                placeholder="Ex: São Paulo"
              />
              <DynamicField
                type="text"
                label="Estado"
                value={clinicState}
                onChange={setClinicState}
                placeholder="Ex: SP"
                maxLength={2}
                inputClassName="uppercase"
              />
              <DynamicField
                type="text"
                label="E-mail"
                value={clinicEmail}
                onChange={setClinicEmail}
                placeholder="contato@clinica.com.br"
                inputType="email"
              />
              <DynamicField
                type="text"
                label="Telefone 1"
                value={clinicPhone1}
                onChange={(v) => setClinicPhone1(maskPhone(v))}
                placeholder="(11) 99999-9999"
              />
              <DynamicField
                type="text"
                label="Telefone 2"
                value={clinicPhone2}
                onChange={(v) => setClinicPhone2(maskPhone(v))}
                placeholder="(11) 88888-8888"
              />
              <DynamicField
                type="text"
                label="CNPJ"
                value={clinicCnpj}
                onChange={(v) => setClinicCnpj(maskCnpj(v))}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveClinic} disabled={savingClinic}>
                {savingClinic ? "Salvando..." : "Salvar Dados da Clínica"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {role === "admin" && (
        <div className="mt-8 rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Configuração de E-mail</h2>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Configure um Gmail para envio de e-mails automáticos (boas-vindas, notificações).
              Use uma{" "}
              <a
                href="https://support.google.com/accounts/answer/185833"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                senha de app
              </a>{" "}
              do Google.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Gmail</label>
                <input
                  type="email"
                  value={gmailUser}
                  onChange={(e) => setGmailUser(e.target.value)}
                  placeholder="seuemail@gmail.com"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Senha de App</label>
                <input
                  type="password"
                  value={gmailAppPassword}
                  onChange={(e) => setGmailAppPassword(e.target.value)}
                  placeholder="16 caracteres"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveEmailConfig} disabled={savingEmailConfig}>
                {savingEmailConfig ? "Salvando..." : "Salvar Configuração de E-mail"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemoveLogo}
        onOpenChange={setConfirmRemoveLogo}
        title="Remover logo"
        description="Tem certeza que deseja remover a logo da clínica?"
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={() => setClinicLogo(null)}
      />

      {cropImageSrc && (
        <CropDialog
          open={!!cropImageSrc}
          imageSrc={cropImageSrc}
          onCrop={(base64) => {
            setClinicLogo(base64)
            setCropImageSrc(null)
          }}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  )
}

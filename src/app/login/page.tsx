"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/lib/supabase/actions"
import { Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { useActionState, useState } from "react"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loginState, loginAction, loginPending] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      return await login(formData)
    },
    null,
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="flex flex-col items-center justify-center gap-4 bg-linear-to-br from-blue-600 to-blue-700 p-10 text-white">
          <div className="rounded-full bg-white/20 p-4">
            <Image src="/assets/tooth-icon.png" alt="Ícone" width={48} height={48} style={{ width: "auto", height: "auto" }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AppointDent</h1>
          <p className="text-center text-blue-100">
            Gerencie sua clínica com agendamentos inteligentes.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-5 p-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Entrar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta</p>
          </div>
          <form action={loginAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" name="email" type="email" placeholder="email@exemplo.com" required className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {loginState?.error && (
              <p className="text-sm text-destructive">{loginState.error}</p>
            )}
            <Button type="submit" disabled={loginPending} className="w-full h-11 text-base">
              {loginPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

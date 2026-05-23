"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, signup } from "@/lib/supabase/actions"
import { Syringe } from "lucide-react"
import { useActionState } from "react"

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      return await login(formData)
    },
    null,
  )

  const [signupState, signupAction, signupPending] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      return await signup(formData)
    },
    null,
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="hidden flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-600 to-blue-700 p-12 text-white md:flex">
          <div className="rounded-full bg-white/20 p-4">
            <Syringe className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Odonto Schedule</h1>
          <p className="max-w-sm text-center text-blue-100">
            Gerencie sua clínica com agendamentos inteligentes.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-8 p-8">
          <Card>
            <CardHeader>
              <CardTitle>Entrar</CardTitle>
              <CardDescription>Acesse sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={loginAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" placeholder="email@exemplo.com" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" name="password" type="password" required />
                </div>
                {loginState?.error && (
                  <p className="text-sm text-destructive">{loginState.error}</p>
                )}
                <Button type="submit" disabled={loginPending} className="w-full">
                  {loginPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Criar conta</CardTitle>
              <CardDescription>Registre-se para começar</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signupAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-name">Nome</Label>
                  <Input id="signup-name" name="name" placeholder="Seu nome" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="email@exemplo.com" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" name="password" type="password" required />
                </div>
                {signupState?.error && (
                  <p className="text-sm text-destructive">{signupState.error}</p>
                )}
                <Button type="submit" disabled={signupPending} className="w-full">
                  {signupPending ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

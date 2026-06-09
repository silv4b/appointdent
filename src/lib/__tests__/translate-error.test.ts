import { translateMessage, translateError } from "../utils/translate-error"

describe("translateMessage", () => {
  it("returns empty string for empty input", () => {
    expect(translateMessage("")).toBe("")
  })
  it("translates invalid login credentials", () => {
    expect(translateMessage("Invalid login credentials")).toBe("Email ou senha incorretos")
  })
  it("translates case insensitive", () => {
    expect(translateMessage("INVALID LOGIN CREDENTIALS")).toBe("Email ou senha incorretos")
  })
  it("translates email not confirmed", () => {
    expect(translateMessage("Email not confirmed")).toBe("Email não confirmado")
  })
  it("translates user already registered", () => {
    expect(translateMessage("User already registered")).toBe("Usuário já cadastrado com este email")
  })
  it("translates duplicate key", () => {
    expect(translateMessage('duplicate key value violates unique constraint "users_email_key"')).toBe("Registro duplicado")
  })
  it("translates FK violation", () => {
    expect(translateMessage("insert or update on table violates foreign key constraint")).toBe("Registro vinculado a outros dados")
  })
  it("translates RLS violation", () => {
    expect(translateMessage("violates row-level security policy")).toBe("Permissão negada")
  })
  it("translates JWT expired", () => {
    expect(translateMessage("JWT expired")).toBe("Sessão expirada")
  })
  it("translates refresh_token_not_found", () => {
    expect(translateMessage("refresh_token_not_found")).toBe("Sessão expirada. Faça login novamente.")
  })
  it("translates password length requirement", () => {
    expect(translateMessage("Password should be at least 6 characters")).toBe("Senha deve ter no mínimo 6 caracteres")
  })
  it("translates password uppercase requirement", () => {
    expect(translateMessage("Password should contain at least one uppercase character")).toBe("Senha deve conter pelo menos uma letra maiúscula")
  })
  it("translates password digit requirement", () => {
    expect(translateMessage("Password should contain at least one digit")).toBe("Senha deve conter pelo menos um número")
  })
  it("translates relation not found", () => {
    expect(translateMessage('relation "public.patients" does not exist')).toBe("Erro interno: tabela não encontrada")
  })
  it("translates record not found", () => {
    expect(translateMessage("Could not find a record")).toBe("Registro não encontrado")
  })
  it("translates type not found", () => {
    expect(translateMessage('type "status_type" does not exist')).toBe("Erro interno: tipo não encontrado")
  })
  it("translates invalid input syntax", () => {
    expect(translateMessage("invalid input syntax for type uuid: 'abc'")).toBe("Valor inválido informado")
  })
  it("returns original message when no pattern matches", () => {
    expect(translateMessage("Some completely unknown error")).toBe("Some completely unknown error")
  })
  it("handles undefined/null gracefully", () => {
    expect(translateMessage(undefined as unknown as string)).toBe(undefined)
  })
})

describe("translateError", () => {
  it("translates by code first", () => {
    expect(translateError({ code: "refresh_token_not_found", message: "" })).toBe("Sessão expirada. Faça login novamente.")
  })
  it("falls back to message", () => {
    expect(translateError({ message: "Invalid login credentials" })).toBe("Email ou senha incorretos")
  })
  it("returns empty for empty error", () => {
    expect(translateError({})).toBe("")
  })
})

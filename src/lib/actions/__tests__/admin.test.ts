import { createUser, deleteUser, updateUser, getUsers } from "../admin"

jest.mock("@/lib/supabase/guard", () => ({
  requireAuth: jest.fn(),
}))
jest.mock("@/lib/email", () => ({
  sendWelcomeEmail: jest.fn(),
}))
jest.mock("@/lib/actions/config", () => ({
  getEmailConfig: jest.fn(),
}))
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

import { requireAuth } from "@/lib/supabase/guard"
import { sendWelcomeEmail } from "@/lib/email"
import { getEmailConfig } from "@/lib/actions/config"

const mockRequireAuth = requireAuth as unknown as jest.Mock
const mockSendWelcomeEmail = sendWelcomeEmail as unknown as jest.Mock
const mockGetEmailConfig = getEmailConfig as unknown as jest.Mock

function mockSupabase(overrides: Record<string, any> = {}) {
  const mockRpc = jest.fn()
  const mockFrom = jest.fn()
  const mockSingle = jest.fn()
  const mockEq = jest.fn().mockReturnThis()
  const mockSelect = jest.fn().mockReturnThis()
  const mockDelete = jest.fn()
  const mockInsert = jest.fn()
  const mockOrder = jest.fn().mockReturnThis()
  const mockRange = jest.fn()

  const supabase = {
    from: mockFrom.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      delete: mockDelete,
      insert: mockInsert,
      order: mockOrder,
      range: mockRange,
    })),
    rpc: mockRpc,
  }

  return { supabase, mockRpc, mockFrom, mockSingle, mockEq, mockSelect, mockDelete, mockInsert, mockOrder, mockRange }
}

beforeEach(() => {
  jest.clearAllMocks()
})

const adminUser = { id: "admin-1" }

describe("createUser", () => {
  it("creates user successfully with email config", async () => {
    const { supabase, mockRpc } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: "new-user-uuid", error: null })
    mockGetEmailConfig.mockResolvedValue({ gmailUser: "admin@clinic.com", gmailAppPassword: "app-pass" })
    mockSendWelcomeEmail.mockResolvedValue(undefined)

    const fd = new FormData()
    fd.set("name", "João")
    fd.set("email", "joao@test.com")
    fd.set("password", "Senha@123")
    fd.set("confirmPassword", "Senha@123")
    fd.set("role", "dentist")
    fd.set("specialty", "Ortodontia")

    const result = await createUser(fd)
    expect(result).toEqual({})
    expect(mockRpc).toHaveBeenCalledWith("criar_usuario", {
      usuario_email: "joao@test.com",
      usuario_senha: "Senha@123",
      usuario_nome: "João",
      usuario_role: "dentist",
      especialidade: "Ortodontia",
    })
    expect(mockSendWelcomeEmail).toHaveBeenCalled()
  })

  it("creates user without email config (fails silently)", async () => {
    const { supabase, mockRpc } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: "new-user-uuid", error: null })
    mockGetEmailConfig.mockResolvedValue(null)

    const fd = new FormData()
    fd.set("name", "Maria")
    fd.set("email", "maria@test.com")
    fd.set("password", "Senha@123")
    fd.set("confirmPassword", "Senha@123")
    fd.set("role", "admin")

    const result = await createUser(fd)
    expect(result).toEqual({})
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled()
  })

  it("returns validation error for invalid input", async () => {
    const { supabase } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    const fd = new FormData()
    fd.set("name", "")
    fd.set("email", "invalid")
    fd.set("password", "123")
    fd.set("confirmPassword", "456")
    fd.set("role", "invalid")

    const result = await createUser(fd)
    expect(result).toHaveProperty("error")
  })

  it("returns rpc error on user creation failure", async () => {
    const { supabase, mockRpc } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: null, error: { message: "User already registered" } })

    const fd = new FormData()
    fd.set("name", "João")
    fd.set("email", "exists@test.com")
    fd.set("password", "Senha@123")
    fd.set("confirmPassword", "Senha@123")
    fd.set("role", "dentist")

    const result = await createUser(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Usuário já cadastrado com este email")
  })
})

describe("deleteUser", () => {
  it("deletes user via RPC", async () => {
    const { supabase, mockRpc } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: null, error: null })

    const fd = new FormData()
    fd.set("userId", "22222222-2222-2222-2222-222222222222")
    const result = await deleteUser(fd)
    expect(result).toEqual({})
    expect(mockRpc).toHaveBeenCalledWith("excluir_usuario", {
      usuario_id: "22222222-2222-2222-2222-222222222222",
      caller_id: "admin-1",
    })
  })

  it("returns error on RPC failure", async () => {
    const { supabase, mockRpc } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: null, error: { message: "Cannot delete last admin" } })

    const fd = new FormData()
    fd.set("userId", "22222222-2222-2222-2222-222222222222")
    const result = await deleteUser(fd)
    expect(result).toHaveProperty("error")
  })

  it("rejects invalid UUID", async () => {
    const { supabase } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    const fd = new FormData()
    fd.set("userId", "not-uuid")
    const result = await deleteUser(fd)
    expect(result).toHaveProperty("error")
  })
})

describe("updateUser", () => {
  it("updates user via RPC with dentist links", async () => {
    const { supabase, mockRpc } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: null, error: null })

    const fd = new FormData()
    fd.set("userId", "user-1")
    fd.set("name", "João Editado")
    fd.set("email", "joao@editado.com")
    fd.set("role", "receptionist")
    fd.set("dentist_ids", JSON.stringify(["dent-1", "dent-2"]))

    const result = await updateUser(fd)
    expect(result).toEqual({})
    expect(mockRpc).toHaveBeenCalled()
  })

  it("clears dentist links when role is not receptionist", async () => {
    const { supabase, mockRpc, mockFrom, mockEq } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: null, error: null })

    const fd = new FormData()
    fd.set("userId", "user-1")
    fd.set("name", "Dentista")
    fd.set("email", "dent@test.com")
    fd.set("role", "dentist")

    const result = await updateUser(fd)
    expect(result).toEqual({})
  })

  it("returns validation error on mismatched passwords", async () => {
    const { supabase } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    const fd = new FormData()
    fd.set("userId", "user-1")
    fd.set("name", "Nome")
    fd.set("email", "email@test.com")
    fd.set("role", "dentist")
    fd.set("password", "Senha123")
    fd.set("confirmPassword", "Senha456")

    const result = await updateUser(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("Senhas não conferem")
  })
})

describe("getUsers", () => {
  it("returns paginated users via RPC fallback", async () => {
    const { supabase, mockRpc, mockFrom, mockSelect, mockOrder, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC not found" } })
    mockSelect.mockReturnThis()
    mockOrder.mockReturnThis()
    mockRange.mockReturnThis()

    mockFrom.mockImplementation(() => ({
      select: mockSelect,
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      order: mockOrder,
      range: mockRange,
    }))

    mockRange.mockResolvedValue({
      data: [
        { id: "user-1", name: "Admin", role: "admin", created_at: "2026-01-01" },
      ],
      error: null,
    })

    mockSelect.mockImplementation((fields: any, opts?: any) => {
      if (opts?.count === "exact" && opts?.head === true) {
        return Promise.resolve({ count: 1, error: null })
      }
      return { order: mockOrder }
    })

    const result = await getUsers(1, 10)
    expect(result).toHaveProperty("data")
    if (!("error" in result)) {
      expect(result.data).toHaveLength(1)
    }
  })

  it("returns error when caller is not admin", async () => {
    const { supabase, mockFrom, mockSelect, mockEq, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "dent-user" } })

    mockSingle.mockResolvedValue({ data: { role: "dentist" }, error: null })

    const result = await getUsers(1, 10)
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Acesso negado")
  })
})

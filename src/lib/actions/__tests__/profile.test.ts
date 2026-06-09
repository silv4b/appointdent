import { updateProfilePassword, updateProfileName, updateProfileEmail } from "../profile"

const mockUpdateUser = jest.fn()
const mockFrom = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn().mockReturnThis()
const mockUpdate = jest.fn().mockReturnThis()
const mockRpc = jest.fn()

jest.mock("@/lib/supabase/guard", () => ({
  requireAuth: jest.fn(),
}))

jest.mock("@/lib/utils/rate-limit", () => ({
  checkEmailRateLimit: jest.fn(),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

import { requireAuth } from "@/lib/supabase/guard"
import { checkEmailRateLimit } from "@/lib/utils/rate-limit"

const mockRequireAuth = requireAuth as unknown as jest.Mock
const mockCheckRateLimit = checkEmailRateLimit as unknown as jest.Mock

function setupMocks(overrides: Record<string, any> = {}) {
  mockSingle.mockReset()
  mockEq.mockReset()
  mockUpdate.mockReset()
  mockUpdateUser.mockReset()
  mockRpc.mockReset()
  mockCheckRateLimit.mockReset()

  mockRequireAuth.mockResolvedValue({
    supabase: {
      from: jest.fn(() => ({
        update: mockUpdate,
        eq: mockEq,
        single: mockSingle,
      })),
      auth: {
        updateUser: mockUpdateUser,
      },
      rpc: mockRpc,
    },
    user: { id: "user-123", email: "user@test.com" },
  })
}

describe("updateProfilePassword", () => {
  beforeEach(() => {
    setupMocks()
  })

  it("returns error when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const result = await updateProfilePassword("NewPass@123")
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("Muitas tentativas")
  })

  it("calls updateUser and clears must_change_password on success", async () => {
    mockCheckRateLimit.mockResolvedValue(true)
    mockUpdateUser.mockResolvedValue({ error: null })
    mockUpdate.mockReturnThis()
    mockEq.mockResolvedValue({ error: null })

    const result = await updateProfilePassword("NewPass@123")
    expect(result).toEqual({})
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "NewPass@123" })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("returns error when password is the same as current", async () => {
    mockCheckRateLimit.mockResolvedValue(true)
    mockUpdateUser.mockResolvedValue({ error: { message: "same" } })
    const result = await updateProfilePassword("SamePass@123")
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("diferente")
  })

  it("returns generic error on updateUser failure", async () => {
    mockCheckRateLimit.mockResolvedValue(true)
    mockUpdateUser.mockResolvedValue({ error: { message: "some error" } })
    const result = await updateProfilePassword("NewPass@123")
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("Erro ao atualizar senha")
  })

  it("returns error when requireAuth throws", async () => {
    mockRequireAuth.mockRejectedValue(new Error("AuthError"))
    mockCheckRateLimit.mockResolvedValue(true)
    const result = await updateProfilePassword("NewPass@123")
    expect(result).toHaveProperty("error")
  })
})

describe("updateProfileName", () => {
  beforeEach(() => {
    setupMocks()
  })

  it("updates profile name and auth metadata", async () => {
    mockUpdate.mockReturnThis()
    mockEq.mockResolvedValue({ error: null })
    mockUpdateUser.mockResolvedValue({ error: null })

    const result = await updateProfileName("Novo Nome")
    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ name: "Novo Nome" })
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { name: "Novo Nome" } })
  })

  it("returns error on profile update failure", async () => {
    mockUpdate.mockReturnThis()
    mockEq.mockResolvedValue({ error: { message: "db error" } })
    const result = await updateProfileName("Nome")
    expect(result).toHaveProperty("error")
  })
})

describe("updateProfileEmail", () => {
  beforeEach(() => {
    setupMocks()
  })

  it("updates email via auth", async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    const result = await updateProfileEmail("new@email.com")
    expect(result).toEqual({})
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: "new@email.com" })
  })

  it("returns error on failure", async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: "email error" } })
    const result = await updateProfileEmail("new@email.com")
    expect(result).toHaveProperty("error")
  })
})

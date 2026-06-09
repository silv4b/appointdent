import { getEmailConfig, updateEmailConfig } from "../config"

jest.mock("@/lib/supabase/guard", () => ({
  requireAuth: jest.fn(),
}))
jest.mock("@/lib/crypto", () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}))

import { requireAuth } from "@/lib/supabase/guard"
import { encrypt, decrypt } from "@/lib/crypto"

const mockRequireAuth = requireAuth as unknown as jest.Mock
const mockEncrypt = encrypt as unknown as jest.Mock
const mockDecrypt = decrypt as unknown as jest.Mock

function mockSupabase() {
  const mockFrom = jest.fn()
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockSingle = jest.fn()
  const mockUpsert = jest.fn()

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    upsert: mockUpsert,
  }))

  return { supabase: { from: mockFrom }, mockSelect, mockEq, mockSingle, mockUpsert, mockFrom }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEncrypt.mockReturnValue({ iv: "iv123", encrypted: "enc123", tag: "tag123" })
  mockDecrypt.mockReturnValue("decrypted-password")
})

const adminUser = { id: "admin-1" }

describe("getEmailConfig", () => {
  it("returns email config for admin", async () => {
    const { supabase, mockSingle, mockSelect, mockEq } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null })

    mockSelect.mockResolvedValue({
      data: [
        { key: "gmail_user", value: "admin@clinic.com" },
        { key: "gmail_app_password", value: JSON.stringify({ iv: "iv", encrypted: "enc", tag: "tag" }) },
      ],
      error: null,
    })

    const result = await getEmailConfig()
    expect(result).toEqual({ gmailUser: "admin@clinic.com", gmailAppPassword: "decrypted-password" })
    expect(mockDecrypt).toHaveBeenCalled()
  })

  it("returns null when user is not admin", async () => {
    const { supabase, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "dent-user" } })

    mockSingle.mockResolvedValue({ data: { role: "dentist" }, error: null })

    const result = await getEmailConfig()
    expect(result).toBeNull()
  })

  it("returns null when config rows are empty", async () => {
    const { supabase, mockSingle, mockSelect } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null })
    mockSelect.mockResolvedValue({ data: [], error: null })

    const result = await getEmailConfig()
    expect(result).toBeNull()
  })

  it("returns null when query errors", async () => {
    const { supabase, mockSingle, mockSelect } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null })
    mockSelect.mockResolvedValue({ data: null, error: { message: "db error" } })

    const result = await getEmailConfig()
    expect(result).toBeNull()
  })

  it("returns null on decrypt failure", async () => {
    const { supabase, mockSingle, mockSelect } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null })
    mockSelect.mockResolvedValue({
      data: [
        { key: "gmail_user", value: "admin@clinic.com" },
        { key: "gmail_app_password", value: "invalid-json" },
      ],
      error: null,
    })

    const result = await getEmailConfig()
    expect(result).toBeNull()
  })
})

describe("updateEmailConfig", () => {
  it("saves email config for admin", async () => {
    const { supabase, mockSingle, mockUpsert, mockEq, mockSelect } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null }) // profile check
      .mockResolvedValueOnce({ data: { value: "{}" }, error: null }) // existing password

    mockUpsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("gmailUser", "admin@clinic.com")
    fd.set("gmailAppPassword", "new-app-password")

    const result = await updateEmailConfig(fd)
    expect(result).toEqual({})
    expect(mockEncrypt).toHaveBeenCalledWith("new-app-password")
    expect(mockUpsert).toHaveBeenCalledTimes(2)
  })

  it("returns error when user is not admin", async () => {
    const { supabase, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "dent-user" } })

    mockSingle.mockResolvedValue({ data: { role: "dentist" }, error: null })

    const fd = new FormData()
    fd.set("gmailUser", "admin@clinic.com")
    fd.set("gmailAppPassword", "password")

    const result = await updateEmailConfig(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Acesso negado")
  })

  it("keeps existing password when empty string sent", async () => {
    const { supabase, mockSingle, mockUpsert } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
      .mockResolvedValueOnce({ data: { value: JSON.stringify({ iv: "iv", encrypted: "enc", tag: "tag" }) }, error: null })

    mockUpsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("gmailUser", "admin@clinic.com")
    fd.set("gmailAppPassword", "")

    const result = await updateEmailConfig(fd)
    expect(result).toEqual({})
    expect(mockEncrypt).not.toHaveBeenCalled()
  })

  it("returns error on save failure", async () => {
    const { supabase, mockSingle, mockUpsert } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
      .mockResolvedValueOnce({ data: { value: "{}" }, error: null })

    mockUpsert.mockResolvedValue({ error: { message: "upsert failed" } })

    const fd = new FormData()
    fd.set("gmailUser", "admin@clinic.com")
    fd.set("gmailAppPassword", "pass")

    const result = await updateEmailConfig(fd)
    expect(result).toHaveProperty("error")
  })
})

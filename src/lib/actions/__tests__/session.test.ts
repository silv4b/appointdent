import { getUserSessionData } from "../session"

jest.mock("@/lib/supabase/guard", () => ({
  requireAuth: jest.fn(),
}))

import { requireAuth } from "@/lib/supabase/guard"

const mockRequireAuth = requireAuth as unknown as jest.Mock

function mockSupabase() {
  const mockFrom = jest.fn()
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockSingle = jest.fn()

  const chain = (obj: any) => {
    mockSelect.mockReturnValue(obj)
    mockEq.mockReturnValue(obj)
    return obj
  }

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
  }))

  return { supabase: { from: mockFrom }, mockSelect, mockEq, mockSingle, mockFrom }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("getUserSessionData", () => {
  it("returns session data for admin", async () => {
    const { supabase, mockSingle, mockSelect, mockEq } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "admin-1" } })

    mockSingle.mockResolvedValue({ data: { role: "admin", must_change_password: false }, error: null })

    const result = await getUserSessionData()
    expect(result).toEqual({
      data: {
        userId: "admin-1",
        role: "admin",
        dentistId: null,
        dentistName: null,
        receptionistDentistIds: [],
        mustChangePassword: false,
      },
    })
  })

  it("returns mustChangePassword: true when profile has must_change_password", async () => {
    const { supabase, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "user-1" } })

    mockSingle.mockResolvedValue({ data: { role: "admin", must_change_password: true }, error: null })

    const result = await getUserSessionData()
    expect(result).not.toHaveProperty("error")
    if ("data" in result) {
      expect(result.data.mustChangePassword).toBe(true)
    }
  })

  it("returns dentistId and dentistName for dentist role", async () => {
    const { supabase, mockSingle, mockSelect, mockEq } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "dent-user" } })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "dentist", must_change_password: false }, error: null })
      .mockResolvedValueOnce({ data: { id: "dent-1", name: "Dr. João" }, error: null })

    const result = await getUserSessionData()
    expect(result).toEqual({
      data: {
        userId: "dent-user",
        role: "dentist",
        dentistId: "dent-1",
        dentistName: "Dr. João",
        receptionistDentistIds: [],
        mustChangePassword: false,
      },
    })
  })

  it("returns linked dentist ids for receptionist", async () => {
    const { supabase, mockSingle, mockSelect, mockEq, mockFrom } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "recep-1" } })

    mockSingle.mockResolvedValueOnce({ data: { role: "receptionist", must_change_password: false }, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === "receptionist_dentists") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ dentist_id: "dent-1" }, { dentist_id: "dent-2" }],
            error: null,
          }),
        }
      }
      return {
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }
    })

    const result = await getUserSessionData()
    expect(result).toEqual({
      data: {
        userId: "recep-1",
        role: "receptionist",
        dentistId: null,
        dentistName: null,
        receptionistDentistIds: ["dent-1", "dent-2"],
        mustChangePassword: false,
      },
    })
  })

  it("returns receptionistDentistIds as empty when dentist query returns no links", async () => {
    const { supabase, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "recep-1" } })

    mockSingle.mockResolvedValueOnce({ data: { role: "receptionist", must_change_password: false }, error: null })

    supabase.from = jest.fn((table: string) => {
      if (table === "receptionist_dentists") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSingle,
      }
    })

    const result = await getUserSessionData()
    expect(result).toEqual({
      data: {
        userId: "recep-1",
        role: "receptionist",
        dentistId: null,
        dentistName: null,
        receptionistDentistIds: [],
        mustChangePassword: false,
      },
    })
  })

  it("returns null role when profile has no role", async () => {
    const { supabase, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "user-1" } })

    mockSingle.mockResolvedValue({ data: null, error: null })

    const result = await getUserSessionData()
    expect(result).toEqual({
      data: {
        userId: "user-1",
        role: null,
        dentistId: null,
        dentistName: null,
        receptionistDentistIds: [],
        mustChangePassword: false,
      },
    })
  })

  it("returns error when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new (require("@/lib/supabase/guard").AuthError)())
    const result = await getUserSessionData()
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Não autenticado")
  })
})

const mockRequireAuth = jest.fn()
const mockFrom = jest.fn()

jest.mock("../supabase/guard", () => ({
  requireAuth: mockRequireAuth,
}))

jest.mock("../supabase/server", () => ({
  createClient: jest.fn(),
}))

import { getUserDentistFilter } from "../utils/access-filter"

function mockSupabase(returnValue: any) {
  mockFrom.mockReturnValue(returnValue)
  mockRequireAuth.mockResolvedValue({
    supabase: { from: mockFrom },
    user: { id: "user-123" },
  })
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe("getUserDentistFilter", () => {
  it("returns null for admin", async () => {
    mockSupabase({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
    })
    const result = await getUserDentistFilter()
    expect(result).toBeNull()
  })

  it("returns dentist id for dentist", async () => {
    const selectMock = jest.fn().mockReturnThis()
    const eqMock = jest.fn().mockReturnThis()
    const singleMock = jest.fn().mockResolvedValue({ data: { id: "dent-1" }, error: null })

    mockSupabase({
      select: jest.fn((field) => {
        if (field === "role") {
          return { eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: "dentist" }, error: null }) }
        }
        return selectMock
      }),
      eq: eqMock,
      single: singleMock,
    })

    const result = await getUserDentistFilter()
    expect(result).toEqual(["dent-1"])
  })

  it("returns linked dentist ids for receptionist", async () => {
    const selectMock = jest.fn().mockReturnThis()
    const eqMock = jest.fn().mockReturnThis()

    mockSupabase({
      select: jest.fn((field) => {
        if (field === "role") {
          return { eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: "receptionist" }, error: null }) }
        }
        return selectMock
      }),
      eq: eqMock,
    })

    selectMock.mockResolvedValue({
      data: [{ dentist_id: "dent-1" }, { dentist_id: "dent-2" }],
      error: null,
    })

    const result = await getUserDentistFilter()
    expect(result).toEqual(["dent-1", "dent-2"])
  })

  it("returns empty array for receptionist with no links", async () => {
    const selectMock = jest.fn().mockReturnThis()
    const eqMock = jest.fn().mockReturnThis()

    mockSupabase({
      select: jest.fn((field) => {
        if (field === "role") {
          return { eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: "receptionist" }, error: null }) }
        }
        return selectMock
      }),
      eq: eqMock,
    })

    selectMock.mockResolvedValue({
      data: [],
      error: null,
    })

    const result = await getUserDentistFilter()
    expect(result).toEqual([])
  })

  it("returns empty array when requireAuth throws (safe default)", async () => {
    mockRequireAuth.mockRejectedValue(new Error("AuthError"))
    const result = await getUserDentistFilter()
    expect(result).toEqual([])
  })

  it("returns null for unknown role", async () => {
    mockSupabase({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: "unknown" }, error: null }),
    })
    const result = await getUserDentistFilter()
    expect(result).toBeNull()
  })
})

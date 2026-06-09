import { getFinancialOverview, getDentistsPaginated, getProceduresPaginated } from "../queries"

jest.mock("@/lib/supabase/guard", () => ({
  requireAuth: jest.fn(),
}))
jest.mock("@/lib/utils/access-filter", () => ({
  getUserDentistFilter: jest.fn(),
}))

import { requireAuth } from "@/lib/supabase/guard"
import { getUserDentistFilter } from "@/lib/utils/access-filter"

const mockRequireAuth = requireAuth as unknown as jest.Mock
const mockGetUserDentistFilter = getUserDentistFilter as unknown as jest.Mock

function mockSupabase() {
  const mockFrom = jest.fn()
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockSingle = jest.fn()
  const mockOrder = jest.fn()
  const mockRange = jest.fn()
  const mockIn = jest.fn()
  const mockGte = jest.fn()
  const mockLte = jest.fn()
  const mockNot = jest.fn()
  const mockOr = jest.fn()
  const mockIs = jest.fn()

  function chain(...fns: jest.Mock[]) {
    for (const fn of fns) fn.mockReturnThis()
  }
  chain(mockSelect, mockEq, mockOrder, mockRange, mockIn, mockGte, mockLte, mockNot, mockOr, mockIs)

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    range: mockRange,
    in: mockIn,
    gte: mockGte,
    lte: mockLte,
    not: mockNot,
    or: mockOr,
    is: mockIs,
  }))

  return { supabase: { from: mockFrom }, mockSelect, mockEq, mockSingle, mockOrder, mockRange, mockIn, mockGte, mockLte, mockNot, mockIs, mockFrom }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUserDentistFilter.mockResolvedValue(null)
})

const authUser = { id: "admin-1" }

describe("getFinancialOverview", () => {
  it("returns overview with zero values when no appointments", async () => {
    const { supabase, mockSelect, mockIn, mockNot, mockIs, mockGte, mockLte, mockEq, mockFrom } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    const emptyResolved = Promise.resolve({ data: [], count: 0, error: null })
    mockSelect.mockReturnValue(emptyResolved)

    const result = await getFinancialOverview()
    expect(result).not.toHaveProperty("error")
    if ("data" in result) {
      expect(result.data.revenue.day.revenue).toBe(0)
      expect(result.data.revenue.day.count).toBe(0)
      expect(result.data.revenue.month.revenue).toBe(0)
      expect(result.data.cancellationRate).toBe(0)
      expect(result.data.completionRate).toBe(1)
      expect(result.data.ticketMedio.day).toBe(0)
      expect(result.data.byDentist).toEqual([])
    }
  })

  it("calculates revenue from confirmed/completed appointments", async () => {
    const { supabase, mockSelect, mockIn, mockNot, mockIs, mockGte, mockLte, mockEq, mockFrom } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    const today = new Date().toISOString().slice(0, 10)

    const appointments = [
      {
        start_time: `${today}T10:00:00Z`,
        dentist_id: "dent-1",
        procedure_id: "proc-1",
        procedures: { price: 150, name: "Limpeza", color: "#3b82f6" },
        dentists: { name: "Dr. João" },
      },
      {
        start_time: `${today}T11:00:00Z`,
        dentist_id: "dent-1",
        procedure_id: "proc-2",
        procedures: { price: 300, name: "Canal", color: "#ef4444" },
        dentists: { name: "Dr. João" },
      },
    ]

    const cancelledResolved = Promise.resolve({ data: [], count: 5, error: null })
    const totalResolved = Promise.resolve({ data: [], count: 20, error: null })
    const revenueResolved = Promise.resolve({ data: appointments, count: 2, error: null })

    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      if (callCount === 1) return revenueResolved
      if (callCount === 2) return cancelledResolved
      return totalResolved
    })

    const result = await getFinancialOverview()
    expect(result).not.toHaveProperty("error")
    if ("data" in result) {
      expect(result.data.revenue.day.revenue).toBe(450)
      expect(result.data.revenue.day.count).toBe(2)
      expect(result.data.cancellationRate).toBe(0.25)
      expect(result.data.completionRate).toBe(0.75)
      expect(result.data.ticketMedio.day).toBe(225)
      expect(result.data.byDentist).toHaveLength(1)
      expect(result.data.byDentist[0].name).toBe("Dr. João")
      expect(result.data.byDentist[0].revenue).toBe(450)
      expect(result.data.previsaoMensal).toBeGreaterThan(0)
    }
  })
})

describe("getDentistsPaginated", () => {
  it("returns paginated dentists", async () => {
    const { supabase, mockSelect, mockOrder, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    mockRange.mockResolvedValue({
      data: [{ id: "dent-1", name: "Dr. João", specialty: "Ortodontia" }],
      count: 1,
      error: null,
    })

    const result = await getDentistsPaginated(1, 10)
    expect(result).toEqual({
      data: { data: [{ id: "dent-1", name: "Dr. João", specialty: "Ortodontia" }], total: 1 },
    })
  })

  it("supports search and sort parameters", async () => {
    const { supabase, mockOr, mockOrder, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    mockRange.mockResolvedValue({ data: [], count: 0, error: null })

    await getDentistsPaginated(1, 10, "joão", "specialty", "desc")
    expect(mockOr).toHaveBeenCalled()
    expect(mockOrder).toHaveBeenCalledWith("specialty", { ascending: false })
  })
})

describe("getProceduresPaginated", () => {
  it("returns paginated procedures", async () => {
    const { supabase, mockSelect, mockOrder, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    mockRange.mockResolvedValue({
      data: [{ id: "proc-1", name: "Limpeza", duration_minutes: 30 }],
      count: 1,
      error: null,
    })

    const result = await getProceduresPaginated(1, 10, "limpeza")
    expect(result).not.toHaveProperty("error")
  })
})

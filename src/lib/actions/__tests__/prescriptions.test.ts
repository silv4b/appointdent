import {
  getPrescriptions,
  getPrescription,
  savePrescription,
  updatePrescription,
  deletePrescription,
} from "../prescriptions"

jest.mock("@/lib/supabase/guard", () => ({
  requireAuth: jest.fn(),
}))
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
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
  const mockInsert = jest.fn()
  const mockUpdate = jest.fn()
  const mockDelete = jest.fn()
  const mockOrder = jest.fn()
  const mockRange = jest.fn()
  const mockIn = jest.fn()
  const mockOr = jest.fn()

  const chain = (obj: any, ...fns: jest.Mock[]) => {
    for (const fn of fns) {
      fn.mockReturnValue(obj)
    }
  }

  const shared = { eq: mockEq, single: mockSingle, order: mockOrder, range: mockRange, in: mockIn, or: mockOr, select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete }
  chain(shared, mockSelect, mockEq, mockOrder, mockRange, mockIn, mockOr)

  mockFrom.mockImplementation(() => shared)

  return { supabase: { from: mockFrom }, mockSelect, mockEq, mockSingle, mockInsert, mockUpdate, mockDelete, mockOrder, mockRange, mockIn, mockOr, mockFrom }
}

beforeEach(() => {
  jest.clearAllMocks()
})

const adminUser = { id: "admin-1" }

describe("getPrescriptions", () => {
  it("returns paginated prescriptions for admin", async () => {
    const { supabase, mockSelect, mockOrder, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })
    mockGetUserDentistFilter.mockResolvedValue(null)

    mockRange.mockResolvedValue({
      data: [{ id: "rx-1", title: "Rx 1", patients: { name: "João" }, dentists: { name: "Dr. X" } }],
      count: 1,
      error: null,
    })

    const result = await getPrescriptions(1, 10)
    expect(result).toEqual({
      data: { data: [{ id: "rx-1", title: "Rx 1", patients: { name: "João" }, dentists: { name: "Dr. X" } }], total: 1 },
    })
  })

  it("returns error on query failure", async () => {
    const { supabase, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })
    mockGetUserDentistFilter.mockResolvedValue(null)

    mockRange.mockResolvedValue({ data: null, count: null, error: { message: "db error" } })

    const result = await getPrescriptions(1, 10)
    expect(result).toHaveProperty("error")
  })

  it("filters by dentist when scope is limited", async () => {
    const { supabase, mockIn, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })
    mockGetUserDentistFilter.mockResolvedValue(["dent-1", "dent-2"])

    mockRange.mockResolvedValue({ data: [], count: 0, error: null })

    await getPrescriptions(1, 10)
    expect(mockIn).toHaveBeenCalledWith("dentist_id", ["dent-1", "dent-2"])
  })

  it("applies NULL_UUID filter when no dentists accessible", async () => {
    const { supabase, mockIn, mockRange } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })
    mockGetUserDentistFilter.mockResolvedValue([])

    mockRange.mockResolvedValue({ data: [], count: 0, error: null })

    await getPrescriptions(1, 10)
    expect(mockIn).toHaveBeenCalledWith("dentist_id", ["00000000-0000-0000-0000-000000000000"])
  })
})

describe("getPrescription", () => {
  it("returns prescription with joins", async () => {
    const { supabase, mockSingle, mockEq } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle.mockResolvedValue({
      data: {
        id: "rx-1",
        title: "Rx 1",
        medications: [{ medicamento: "Dipirona", dosagem: "500mg", observacao: "" }],
        patients: { name: "João" },
        dentists: { name: "Dr. X" },
      },
      error: null,
    })

    const result = await getPrescription("rx-1")
    expect(result).toEqual({
      data: {
        id: "rx-1",
        title: "Rx 1",
        medications: [{ medicamento: "Dipirona", dosagem: "500mg", observacao: "" }],
        patients: { name: "João" },
        dentists: { name: "Dr. X" },
      },
    })
  })

  it("returns error when not found", async () => {
    const { supabase, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } })

    const result = await getPrescription("rx-1")
    expect(result).toHaveProperty("error")
  })
})

describe("savePrescription", () => {
  it("saves prescription for dentist role", async () => {
    const { supabase, mockSingle, mockInsert } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "dent-user" } })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "dentist" }, error: null }) // profile
      .mockResolvedValueOnce({ data: { id: "dent-1" }, error: null }) // own dentist

    mockInsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("title", "Rx Teste")
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("medications", JSON.stringify([{ medicamento: "Dipirona", dosagem: "500mg", observacao: "" }]))

    const result = await savePrescription(fd)
    expect(result).toEqual({})
  })

  it("saves prescription for admin with chosen dentist", async () => {
    const { supabase, mockSingle, mockInsert } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
      .mockResolvedValueOnce({ data: { id: "dent-admin-1" }, error: null })

    mockInsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("title", "Rx Admin")
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("medications", JSON.stringify([{ medicamento: "Dipirona", dosagem: "500mg", observacao: "" }]))

    const result = await savePrescription(fd)
    expect(result).toEqual({})
  })

  it("returns validation error for empty medications", async () => {
    const { supabase } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    const fd = new FormData()
    fd.set("title", "Rx")
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("medications", "[]")

    const result = await savePrescription(fd)
    expect(result).toHaveProperty("error")
  })
})

describe("updatePrescription", () => {
  it("updates prescription successfully", async () => {
    const { supabase, mockEq, mockUpdate } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockUpdate.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("id", "rx-1")
    fd.set("title", "Rx Atualizado")
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("medications", JSON.stringify([{ medicamento: "Dipirona", dosagem: "1g", observacao: "" }]))

    const result = await updatePrescription(fd)
    expect(result).toEqual({})
  })

  it("returns error on update failure", async () => {
    const { supabase, mockUpdate } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockUpdate.mockResolvedValue({ error: { message: "update failed" } })

    const fd = new FormData()
    fd.set("id", "rx-1")
    fd.set("title", "Rx")
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("medications", JSON.stringify([{ medicamento: "Dipirona" }]))

    const result = await updatePrescription(fd)
    expect(result).toHaveProperty("error")
  })
})

describe("deletePrescription", () => {
  it("deletes prescription by id", async () => {
    const { supabase, mockEq, mockDelete } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockDelete.mockResolvedValue({ error: null })

    const result = await deletePrescription("rx-1")
    expect(result).toEqual({})
  })

  it("returns error on delete failure", async () => {
    const { supabase, mockDelete } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockDelete.mockResolvedValue({ error: { message: "delete denied" } })

    const result = await deletePrescription("rx-1")
    expect(result).toHaveProperty("error")
  })
})

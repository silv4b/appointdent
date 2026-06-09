import { createPatient, updatePatient, deletePatient, getPatientsPaginated } from "../patients"

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
  const mockSelect = jest.fn().mockReturnThis()
  const mockEq = jest.fn().mockReturnThis()
  const mockSingle = jest.fn()
  const mockInsert = jest.fn()
  const mockUpdate = jest.fn()
  const mockDelete = jest.fn()
  const mockOrder = jest.fn().mockReturnThis()
  const mockRange = jest.fn()
  const mockIn = jest.fn().mockReturnThis()
  const mockOr = jest.fn().mockReturnThis()

  const supabase = {
    from: mockFrom.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      order: mockOrder,
      range: mockRange,
      in: mockIn,
      or: mockOr,
    })),
  }

  return { supabase, mockFrom, mockSelect, mockEq, mockSingle, mockInsert, mockUpdate, mockDelete, mockOrder, mockRange, mockIn, mockOr }
}

beforeEach(() => {
  jest.clearAllMocks()
})

const authUser = { id: "admin-1" }

describe("createPatient", () => {
  it("creates patient successfully", async () => {
    const { supabase, mockSingle, mockInsert } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    mockInsert.mockReturnThis()
    mockSingle.mockResolvedValue({ data: { id: "patient-1", name: "Paciente" }, error: null })
    mockInsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("name", "João Paciente")
    fd.set("cpf", "123.456.789-01")
    fd.set("phone", "(11) 99999-9999")

    const result = await createPatient(fd)
    expect(result).toEqual({ data: { data: { id: "patient-1", name: "Paciente" } } })
  })

  it("returns validation error for empty name", async () => {
    const { supabase } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    const fd = new FormData()
    fd.set("name", "")
    const result = await createPatient(fd)
    expect(result).toHaveProperty("error")
  })

  it("returns error on insert failure", async () => {
    const { supabase, mockInsert, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    mockInsert.mockReturnThis()
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ error: { message: "duplicate key" } })

    const fd = new FormData()
    fd.set("name", "Paciente")
    const result = await createPatient(fd)
    expect(result).toHaveProperty("error")
  })
})

describe("updatePatient", () => {
  it("updates patient successfully", async () => {
    const { supabase, mockEq, mockUpdate } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    mockUpdate.mockReturnThis()
    mockEq.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("id", "patient-uuid")
    fd.set("name", "Nome Atualizado")
    const result = await updatePatient(fd)
    expect(result).toEqual({})
  })

  it("returns error when id is missing", async () => {
    const { supabase } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    const fd = new FormData()
    fd.set("name", "Nome")
    const result = await updatePatient(fd)
    expect(result).toHaveProperty("error")
  })
})

describe("deletePatient", () => {
  it("deletes patient as admin", async () => {
    const { supabase, mockSingle, mockDelete } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })

    mockSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null })
    mockDelete.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("id", "11111111-1111-1111-1111-111111111111")
    const result = await deletePatient(fd)
    expect(result).toEqual({})
  })

  it("deletes patient as dentist", async () => {
    const { supabase, mockSingle, mockDelete } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "dent-user" } })

    mockSingle.mockResolvedValueOnce({ data: { role: "dentist" }, error: null })
    mockDelete.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("id", "11111111-1111-1111-1111-111111111111")
    const result = await deletePatient(fd)
    expect(result).toEqual({})
  })

  it("blocks receptionist from deleting", async () => {
    const { supabase, mockSingle } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "recep-user" } })

    mockSingle.mockResolvedValueOnce({ data: { role: "receptionist" }, error: null })

    const fd = new FormData()
    fd.set("id", "11111111-1111-1111-1111-111111111111")
    const result = await deletePatient(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Acesso negado")
  })
})

describe("getPatientsPaginated", () => {
  it("returns paginated patients for admin", async () => {
    const { supabase, mockSelect, mockOrder, mockRange, mockIn, mockOr } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })
    mockGetUserDentistFilter.mockResolvedValue(null)

    mockSelect.mockReturnThis()
    mockOrder.mockReturnThis()
    mockRange.mockReturnThis()

    mockRange.mockResolvedValue({
      data: [{ id: "p1", name: "Paciente 1" }],
      count: 1,
      error: null,
    })

    const result = await getPatientsPaginated(1, 10)
    expect(result).toEqual({ data: { data: [{ id: "p1", name: "Paciente 1" }], total: 1 } })
  })

  it("filters by dentist for non-admin", async () => {
    const { supabase, mockSelect, mockOrder, mockRange, mockIn, mockFrom } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "dent-user" } })
    mockGetUserDentistFilter.mockResolvedValue(["dent-1"])

    mockFrom.mockImplementation((table: string) => {
      if (table === "appointments") {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [{ patient_id: "p1" }, { patient_id: "p2" }] }),
        }
      }
      return {
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
        in: mockIn,
        or: jest.fn().mockReturnThis(),
      }
    })

    mockSelect.mockReturnThis()
    mockOrder.mockReturnThis()
    mockRange.mockReturnThis()

    mockRange.mockResolvedValue({
      data: [{ id: "p1", name: "Paciente 1" }],
      count: 1,
      error: null,
    })

    const result = await getPatientsPaginated(1, 10)
    expect(result).not.toHaveProperty("error")
  })

  it("supports search parameter", async () => {
    const { supabase, mockSelect, mockOrder, mockRange, mockOr } = mockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: authUser })
    mockGetUserDentistFilter.mockResolvedValue(null)

    mockSelect.mockReturnThis()
    mockOrder.mockReturnThis()
    mockRange.mockReturnThis()
    mockOr.mockReturnThis()

    mockRange.mockResolvedValue({ data: [], count: 0, error: null })

    await getPatientsPaginated(1, 10, "João")
    expect(mockOr).toHaveBeenCalled()
  })
})

import {
  createAppointment,
  confirmAppointment,
  rejectAppointment,
  deleteAppointment,
  startAppointment,
  finishAppointment,
  getAppointments,
  getPendingAppointments,
} from "../appointments"

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

function createMockSupabase() {
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockGte = jest.fn()
  const mockLte = jest.fn()
  const mockOrder = jest.fn()
  const mockSingle = jest.fn()
  const mockInsert = jest.fn()
  const mockUpdate = jest.fn()
  const mockDelete = jest.fn()
  const mockIn = jest.fn()
  const mockNeq = jest.fn()
  const mockLt = jest.fn()
  const mockGt = jest.fn()
  const mockFrom = jest.fn()

  function chain(...fns: jest.Mock[]) {
    for (const fn of fns) {
      fn.mockReturnThis()
    }
  }

  chain(mockGte, mockLte, mockOrder, mockEq, mockNeq, mockLt, mockGt, mockIn, mockDelete)

  const supabase = {
    from: mockFrom.mockImplementation((table: string) => {
      if (table === "appointments") {
        return {
          select: mockSelect.mockReturnThis(),
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
          eq: mockEq,
          neq: mockNeq,
          gte: mockGte,
          lte: mockLte,
          lt: mockLt,
          gt: mockGt,
          in: mockIn,
          order: mockOrder,
          single: mockSingle,
        }
      }
      if (table === "profiles") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        }
      }
      if (table === "dentists") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        }
      }
      if (table === "receptionist_dentists") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        }
      }
      if (table === "dentist_procedures") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        }
      }
      if (table === "availability_slots") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lt: mockLt,
          gt: mockGt,
        }
      }
      if (table === "clinic_hours") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      }
    }),
  }

  return { supabase, mockSelect, mockEq, mockSingle, mockInsert, mockUpdate, mockDelete, mockGte, mockLte, mockOrder, mockIn, mockNeq, mockLt, mockGt, mockFrom }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUserDentistFilter.mockResolvedValue(null)
})

const adminUser = { id: "admin-1" }
const dentistUser = { id: "dent-user-1" }

describe("createAppointment", () => {
  it("returns validation error for invalid input", async () => {
    const { supabase } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    const fd = new FormData()
    fd.set("patient_id", "not-uuid")
    fd.set("dentist_id", "not-uuid")
    fd.set("start_time", "")

    const result = await createAppointment(fd)
    expect(result).toHaveProperty("error")
  })

  it("creates appointment successfully for admin", async () => {
    const { supabase, mockSingle, mockInsert } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null }) // profile check
      .mockResolvedValueOnce({ data: {}, error: null }) // insert result

    mockInsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("start_time", "2026-06-10T10:00")
    fd.set("procedure_id", "33333333-3333-3333-3333-333333333333")

    const result = await createAppointment(fd)
    expect(result).toEqual({})
  })

  it("returns overlap error when conflict exists", async () => {
    const { supabase, mockSelect, mockEq, mockSingle, mockInsert, mockLt, mockGt, mockNeq, mockIn } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { duration_minutes: 30 }, error: null }) // dentist_procedure
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null }) // profile

    mockSelect.mockImplementation((fields: string) => {
      if (fields.includes("id, start_time, end_time, patients!inner(name), dentists!inner(name)")) {
        return Promise.resolve({
          data: [{
            id: "conflict-1",
            start_time: "2026-06-10T10:00:00.000Z",
            end_time: "2026-06-10T11:00:00.000Z",
            patients: { name: "Paciente X" },
            dentists: { name: "Dr. Y" },
          }],
        })
      }
      return { data: [] }
    })

    const fd = new FormData()
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("start_time", "2026-06-10T10:00")
    fd.set("procedure_id", "33333333-3333-3333-3333-333333333333")

    const result = await createAppointment(fd)
    expect(result).toHaveProperty("error")
    expect(result.error!).toContain("Conflito")
  })

  it("blocks receptionist from creating for non-linked dentist", async () => {
    const { supabase, mockSingle } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: { id: "recep-1" } })

    mockSingle
      .mockResolvedValueOnce({ data: { duration_minutes: 30 }, error: null })
      .mockResolvedValueOnce({ data: { role: "receptionist" }, error: null })

    supabase.from("receptionist_dentists").select = jest.fn().mockReturnThis()
    supabase.from("receptionist_dentists").eq = jest.fn().mockReturnThis()
    jest.spyOn(supabase.from("receptionist_dentists"), "select").mockResolvedValue({
      data: [{ dentist_id: "dentist-111" }],
      error: null,
    })

    const fd = new FormData()
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("start_time", "2026-06-10T10:00")

    const result = await createAppointment(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Acesso negado")
  })

  it("returns error on insert failure", async () => {
    const { supabase, mockSingle, mockInsert } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { duration_minutes: 30 }, error: null })
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null })

    mockInsert.mockResolvedValue({ error: { message: "insert failed" } })

    const fd = new FormData()
    fd.set("patient_id", "11111111-1111-1111-1111-111111111111")
    fd.set("dentist_id", "22222222-2222-2222-2222-222222222222")
    fd.set("start_time", "2026-06-10T10:00")
    fd.set("procedure_id", "33333333-3333-3333-3333-333333333333")

    const result = await createAppointment(fd)
    expect(result).toHaveProperty("error")
  })
})

describe("confirmAppointment", () => {
  it("confirms appointment as admin", async () => {
    const { supabase, mockSingle, mockUpdate } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { dentist_id: "dent-1" }, error: null }) // get appt
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null }) // profile

    mockUpdate.mockResolvedValue({ error: null })

    const result = await confirmAppointment("appt-id")
    expect(result).toEqual({})
  })

  it("returns error when appointment not found", async () => {
    const { supabase, mockSingle } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })
    mockSingle.mockResolvedValue({ data: null, error: null })

    const result = await confirmAppointment("nonexistent")
    expect(result).toHaveProperty("error")
  })

  it("returns error when dentist tries to confirm another's appointment", async () => {
    const { supabase, mockSingle } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: dentistUser })

    mockSingle
      .mockResolvedValueOnce({ data: { dentist_id: "other-dent" }, error: null })
      .mockResolvedValueOnce({ data: { role: "dentist" }, error: null })

    const result = await confirmAppointment("appt-id")
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Acesso negado")
  })

  it("returns error on update failure", async () => {
    const { supabase, mockSingle, mockUpdate } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { dentist_id: "dent-1" }, error: null })
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null })

    mockUpdate.mockResolvedValue({ error: { message: "db error" } })

    const result = await confirmAppointment("appt-id")
    expect(result).toHaveProperty("error")
  })
})

describe("rejectAppointment", () => {
  it("rejects appointment with cancelled status", async () => {
    const { supabase, mockSingle, mockUpdate } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle
      .mockResolvedValueOnce({ data: { dentist_id: "dent-1" }, error: null })
      .mockResolvedValueOnce({ data: { role: "admin" }, error: null })

    mockUpdate.mockResolvedValue({ error: null })

    const result = await rejectAppointment("appt-id")
    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ status: "cancelled" })
  })
})

describe("deleteAppointment", () => {
  it("deletes appointment as admin", async () => {
    const { supabase, mockSingle, mockDelete } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null })
    mockDelete.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("id", "11111111-1111-1111-1111-111111111111")
    const result = await deleteAppointment(fd)
    expect(result).toEqual({})
  })

  it("blocks delete by non-owner dentist", async () => {
    const { supabase, mockSingle, mockDelete } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: dentistUser })

    mockSingle
      .mockResolvedValueOnce({ data: { role: "dentist" }, error: null }) // profile
      .mockResolvedValueOnce({ data: { dentist_id: "other-dent" }, error: null }) // appt
      .mockResolvedValueOnce({ data: { id: "my-dent" }, error: null }) // own dentist profile

    const fd = new FormData()
    fd.set("id", "11111111-1111-1111-1111-111111111111")
    const result = await deleteAppointment(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toBe("Acesso negado")
  })

  it("rejects invalid UUID", async () => {
    const { supabase } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    const fd = new FormData()
    fd.set("id", "not-a-uuid")
    const result = await deleteAppointment(fd)
    expect(result).toHaveProperty("error")
  })
})

describe("startAppointment", () => {
  it("starts appointment for own dentist", async () => {
    const { supabase, mockSingle, mockUpdate } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: dentistUser })

    mockSingle
      .mockResolvedValueOnce({ data: { id: "dent-1" }, error: null }) // own dentist profile
      .mockResolvedValueOnce({ data: { id: "appt-1", status: "scheduled", dentist_id: "dent-1" }, error: null }) // appt
      .mockResolvedValueOnce({ error: null }) // update

    mockUpdate.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("id", "appt-id")
    const result = await startAppointment(fd)
    expect(result).toEqual({})
  })

  it("blocks start of another dentist's appointment", async () => {
    const { supabase, mockSingle } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: dentistUser })

    mockSingle
      .mockResolvedValueOnce({ data: { id: "dent-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "appt-1", status: "scheduled", dentist_id: "other-dent" }, error: null })

    const fd = new FormData()
    fd.set("id", "appt-id")
    const result = await startAppointment(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("não pertence a você")
  })

  it("blocks start when status is not scheduled/confirmed", async () => {
    const { supabase, mockSingle } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: dentistUser })

    mockSingle
      .mockResolvedValueOnce({ data: { id: "dent-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "appt-1", status: "completed", dentist_id: "dent-1" }, error: null })

    const fd = new FormData()
    fd.set("id", "appt-id")
    const result = await startAppointment(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("não pode ser iniciado")
  })
})

describe("finishAppointment", () => {
  it("finishes in-progress appointment", async () => {
    const { supabase, mockSingle, mockUpdate } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: dentistUser })

    mockSingle
      .mockResolvedValueOnce({ data: { id: "dent-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "appt-1", status: "in_progress", dentist_id: "dent-1" }, error: null })
      .mockResolvedValueOnce({ error: null })

    mockUpdate.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set("id", "appt-id")
    const result = await finishAppointment(fd)
    expect(result).toEqual({})
  })

  it("blocks finish when not in_progress", async () => {
    const { supabase, mockSingle } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: dentistUser })

    mockSingle
      .mockResolvedValueOnce({ data: { id: "dent-1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "appt-1", status: "scheduled", dentist_id: "dent-1" }, error: null })

    const fd = new FormData()
    fd.set("id", "appt-id")
    const result = await finishAppointment(fd)
    expect(result).toHaveProperty("error")
    expect(result.error).toContain("não está em andamento")
  })
})

describe("getAppointments", () => {
  it("returns empty array on error", async () => {
    mockRequireAuth.mockRejectedValue(new Error("AuthError"))
    const result = await getAppointments("2026-06-10")
    expect(result).toEqual([])
  })

  it("filters by dentist when getUserDentistFilter returns ids", async () => {
    const { supabase, mockSelect, mockOrder } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })
    mockGetUserDentistFilter.mockResolvedValue(["dent-1", "dent-2"])

    mockSelect.mockImplementation((fields: string) => {
      return Promise.resolve({ data: [] })
    })

    const result = await getAppointments("2026-06-10")
    expect(result).toEqual([])
  })
})

describe("getPendingAppointments", () => {
  it("returns ok with pending appointments", async () => {
    const { supabase, mockSelect, mockOrder } = createMockSupabase()
    mockRequireAuth.mockResolvedValue({ supabase, user: adminUser })

    mockSelect.mockImplementation((fields: string) => {
      return Promise.resolve({
        data: [{ id: "appt-1", status: "pending", patients: { name: "Paciente" }, dentists: { name: "Dentista" } }],
      })
    })

    const result = await getPendingAppointments()
    expect(result).toEqual({
      data: [{ id: "appt-1", status: "pending", patients: { name: "Paciente" }, dentists: { name: "Dentista" } }],
    })
  })

  it("returns error on failure", async () => {
    mockRequireAuth.mockRejectedValue(new Error("AuthError"))
    const result = await getPendingAppointments()
    expect(result).toHaveProperty("error")
  })
})

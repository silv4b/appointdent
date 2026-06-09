import {
  patientSchema,
  quickPatientSchema,
  dentistSchema,
  procedureSchema,
  appointmentSchema,
  appointmentUpdateSchema,
  availabilitySlotSchema,
  loginSchema,
  signupSchema,
  createUserSchema,
  anamneseSessionSchema,
  anamneseSessionUpdateSchema,
  dentistProcedureSchema,
  procedureRequestSchema,
  clinicHoursSchema,
} from "../index"

describe("patientSchema", () => {
  it("rejects name shorter than 1 char", () => {
    const r = patientSchema.safeParse({ name: "" })
    expect(r.success).toBe(false)
  })
  it("accepts name at exactly 200 chars", () => {
    const r = patientSchema.safeParse({ name: "a".repeat(200) })
    expect(r.success).toBe(true)
  })
  it("rejects name longer than 200 chars", () => {
    const r = patientSchema.safeParse({ name: "a".repeat(201) })
    expect(r.success).toBe(false)
  })
  it("accepts cpf up to 14 chars", () => {
    const r = patientSchema.safeParse({ name: "x", cpf: "123.456.789-01" })
    expect(r.success).toBe(true)
  })
  it("rejects cpf longer than 14 chars", () => {
    const r = patientSchema.safeParse({ name: "x", cpf: "1".repeat(15) })
    expect(r.success).toBe(false)
  })
  it("coerces active from 'on' string to true", () => {
    const r = patientSchema.safeParse({ name: "x", active: "on" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.active).toBe(true)
  })
  it("coerces active from 'true' boolean to true", () => {
    const r = patientSchema.safeParse({ name: "x", active: true })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.active).toBe(true)
  })
  it("defaults active to true when omitted", () => {
    const r = patientSchema.safeParse({ name: "x" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.active).toBe(true)
  })
  it("accepts email with plus sign", () => {
    const r = patientSchema.safeParse({ name: "x", email: "test+tag@example.com" })
    expect(r.success).toBe(true)
  })
  it("rejects invalid email", () => {
    const r = patientSchema.safeParse({ name: "x", email: "not-an-email" })
    expect(r.success).toBe(false)
  })
  it("accepts null email", () => {
    const r = patientSchema.safeParse({ name: "x", email: null })
    expect(r.success).toBe(true)
  })
  it("rejects notes longer than 500 chars", () => {
    const r = patientSchema.safeParse({ name: "x", notes: "a".repeat(501) })
    expect(r.success).toBe(false)
  })
})

describe("quickPatientSchema", () => {
  it("requires only name and optional phone/email", () => {
    const r = quickPatientSchema.safeParse({ name: "Paciente Rápido" })
    expect(r.success).toBe(true)
  })
  it("rejects empty name", () => {
    const r = quickPatientSchema.safeParse({ name: "" })
    expect(r.success).toBe(false)
  })
})

describe("dentistSchema", () => {
  it("rejects empty name", () => {
    const r = dentistSchema.safeParse({ name: "" })
    expect(r.success).toBe(false)
  })
  it("accepts optional fields as null", () => {
    const r = dentistSchema.safeParse({ name: "Dr. X", specialty: null, cro: null })
    expect(r.success).toBe(true)
  })
  it("coerces active from 'on'", () => {
    const r = dentistSchema.safeParse({ name: "Dr. X", active: "on" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.active).toBe(true)
  })
})

describe("procedureSchema", () => {
  it("rejects duration_minutes = 0", () => {
    const r = procedureSchema.safeParse({ name: "Procedimento", duration_minutes: 0 })
    expect(r.success).toBe(false)
  })
  it("accepts duration_minutes = 1", () => {
    const r = procedureSchema.safeParse({ name: "Procedimento", duration_minutes: 1 })
    expect(r.success).toBe(true)
  })
  it("coerces string duration to number", () => {
    const r = procedureSchema.safeParse({ name: "P", duration_minutes: "30" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.duration_minutes).toBe(30)
  })
  it("rejects negative price", () => {
    const r = procedureSchema.safeParse({ name: "P", duration_minutes: 30, price: -1 })
    expect(r.success).toBe(false)
  })
  it("rejects color longer than 9 chars", () => {
    const r = procedureSchema.safeParse({ name: "P", duration_minutes: 30, color: "#1234567890" })
    expect(r.success).toBe(false)
  })
  it("defaults color to #3b82f6", () => {
    const r = procedureSchema.safeParse({ name: "P", duration_minutes: 30 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.color).toBe("#3b82f6")
  })
})

describe("appointmentSchema", () => {
  const valid = {
    patient_id: "11111111-1111-1111-1111-111111111111",
    dentist_id: "22222222-2222-2222-2222-222222222222",
    start_time: "2026-06-09T10:00:00",
  }
  it("accepts valid appointment", () => {
    const r = appointmentSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })
  it("rejects non-uuid patient_id", () => {
    const r = appointmentSchema.safeParse({ ...valid, patient_id: "not-a-uuid" })
    expect(r.success).toBe(false)
  })
  it("accepts null end_time", () => {
    const r = appointmentSchema.safeParse({ ...valid, end_time: null })
    expect(r.success).toBe(true)
  })
  it("accepts null procedure_id", () => {
    const r = appointmentSchema.safeParse({ ...valid, procedure_id: null })
    expect(r.success).toBe(true)
  })
  it("accepts null return_to_id", () => {
    const r = appointmentSchema.safeParse({ ...valid, return_to_id: null })
    expect(r.success).toBe(true)
  })
  it("rejects notes longer than 500 chars", () => {
    const r = appointmentSchema.safeParse({ ...valid, notes: "a".repeat(501) })
    expect(r.success).toBe(false)
  })
})

describe("appointmentUpdateSchema", () => {
  it("requires id field", () => {
    const r = appointmentUpdateSchema.safeParse({
      patient_id: "11111111-1111-1111-1111-111111111111",
      dentist_id: "22222222-2222-2222-2222-222222222222",
      start_time: "2026-06-09T10:00:00",
    })
    expect(r.success).toBe(false)
  })
  it("accepts valid update with id", () => {
    const r = appointmentUpdateSchema.safeParse({
      id: "33333333-3333-3333-3333-333333333333",
      patient_id: "11111111-1111-1111-1111-111111111111",
      dentist_id: "22222222-2222-2222-2222-222222222222",
      start_time: "2026-06-09T10:00:00",
    })
    expect(r.success).toBe(true)
  })
})

describe("availabilitySlotSchema", () => {
  it("accepts valid slot", () => {
    const r = availabilitySlotSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      day_of_week: 1,
      start_time: "08:00",
      end_time: "12:00",
    })
    expect(r.success).toBe(true)
  })
  it("coerces day_of_week from string", () => {
    const r = availabilitySlotSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      day_of_week: "3",
      start_time: "08:00",
      end_time: "12:00",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.day_of_week).toBe(3)
  })
  it("rejects day_of_week < 0", () => {
    const r = availabilitySlotSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      day_of_week: -1,
      start_time: "08:00",
      end_time: "12:00",
    })
    expect(r.success).toBe(false)
  })
  it("rejects day_of_week > 6", () => {
    const r = availabilitySlotSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      day_of_week: 7,
      start_time: "08:00",
      end_time: "12:00",
    })
    expect(r.success).toBe(false)
  })
  it("defaults slot_type to 'available'", () => {
    const r = availabilitySlotSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      day_of_week: 1,
      start_time: "08:00",
      end_time: "12:00",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.slot_type).toBe("available")
  })
  it("rejects invalid slot_type", () => {
    const r = availabilitySlotSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      day_of_week: 1,
      start_time: "08:00",
      end_time: "12:00",
      slot_type: "invalid",
    })
    expect(r.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("rejects empty email", () => {
    const r = loginSchema.safeParse({ email: "", password: "x" })
    expect(r.success).toBe(false)
  })
  it("rejects malformed email", () => {
    const r = loginSchema.safeParse({ email: "bademail", password: "x" })
    expect(r.success).toBe(false)
  })
  it("rejects empty password", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "" })
    expect(r.success).toBe(false)
  })
})

describe("signupSchema", () => {
  it("rejects short password", () => {
    const r = signupSchema.safeParse({ email: "a@b.com", password: "Ab1", name: "X" })
    expect(r.success).toBe(false)
  })
  it("rejects password without uppercase", () => {
    const r = signupSchema.safeParse({ email: "a@b.com", password: "abcdef1g", name: "X" })
    expect(r.success).toBe(false)
  })
  it("rejects password without digit", () => {
    const r = signupSchema.safeParse({ email: "a@b.com", password: "Abcdefgh", name: "X" })
    expect(r.success).toBe(false)
  })
  it("accepts valid password", () => {
    const r = signupSchema.safeParse({ email: "a@b.com", password: "Abcdef1g", name: "X" })
    expect(r.success).toBe(true)
  })
  it("rejects empty name", () => {
    const r = signupSchema.safeParse({ email: "a@b.com", password: "Abcdef1g", name: "" })
    expect(r.success).toBe(false)
  })
})

describe("createUserSchema", () => {
  const valid = {
    name: "User",
    email: "user@test.com",
    password: "Senha123",
    confirmPassword: "Senha123",
    role: "dentist" as const,
  }
  it("accepts valid user creation", () => {
    const r = createUserSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })
  it("rejects mismatched passwords", () => {
    const r = createUserSchema.safeParse({ ...valid, confirmPassword: "Outra123" })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].path).toContain("confirmPassword")
    }
  })
  it("rejects invalid role", () => {
    const r = createUserSchema.safeParse({ ...valid, role: "dentista" })
    expect(r.success).toBe(false)
  })
  it("accepts admin role", () => {
    const r = createUserSchema.safeParse({ ...valid, role: "admin" })
    expect(r.success).toBe(true)
  })
  it("accepts receptionist role", () => {
    const r = createUserSchema.safeParse({ ...valid, role: "receptionist" })
    expect(r.success).toBe(true)
  })
  it("rejects weak password (no uppercase)", () => {
    const r = createUserSchema.safeParse({ ...valid, password: "senha123", confirmPassword: "senha123" })
    expect(r.success).toBe(false)
  })
  it("rejects weak password (no digit)", () => {
    const r = createUserSchema.safeParse({ ...valid, password: "SenhaaBC", confirmPassword: "SenhaaBC" })
    expect(r.success).toBe(false)
  })
  it("rejects short password", () => {
    const r = createUserSchema.safeParse({ ...valid, password: "Ab1", confirmPassword: "Ab1" })
    expect(r.success).toBe(false)
  })
})

describe("anamneseSessionSchema", () => {
  const valid = {
    title: "Anamnese",
    patient_id: "11111111-1111-1111-1111-111111111111",
    dentist_id: "22222222-2222-2222-2222-222222222222",
  }
  it("accepts valid anamnese", () => {
    const r = anamneseSessionSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })
  it("parses fields from JSON string", () => {
    const fields = JSON.stringify([{ label: "Pressão", content: "120/80" }])
    const r = anamneseSessionSchema.safeParse({ ...valid, fields })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.fields).toHaveLength(1)
      expect(r.data.fields[0].label).toBe("Pressão")
    }
  })
  it("falls back to empty array on invalid JSON string", () => {
    const r = anamneseSessionSchema.safeParse({ ...valid, fields: "not-json" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.fields).toEqual([])
  })
  it("rejects field label longer than 200 chars", () => {
    const r = anamneseSessionSchema.safeParse({
      ...valid,
      fields: [{ label: "a".repeat(201), content: "" }],
    })
    expect(r.success).toBe(false)
  })
  it("rejects content longer than 10000 chars", () => {
    const r = anamneseSessionSchema.safeParse({
      ...valid,
      fields: [{ label: "x", content: "a".repeat(10001) }],
    })
    expect(r.success).toBe(false)
  })
  it("defaults fields to empty array when omitted", () => {
    const r = anamneseSessionSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.fields).toEqual([])
  })
  it("accepts null appointment_id", () => {
    const r = anamneseSessionSchema.safeParse({ ...valid, appointment_id: null })
    expect(r.success).toBe(true)
  })
})

describe("anamneseSessionUpdateSchema", () => {
  it("requires id", () => {
    const r = anamneseSessionUpdateSchema.safeParse({
      title: "Updated",
      patient_id: "11111111-1111-1111-1111-111111111111",
    })
    expect(r.success).toBe(false)
  })
  it("allows partial fields", () => {
    const r = anamneseSessionUpdateSchema.safeParse({
      id: "33333333-3333-3333-3333-333333333333",
      title: "Apenas título",
    })
    expect(r.success).toBe(true)
  })
})

describe("dentistProcedureSchema", () => {
  it("coerces price from string", () => {
    const r = dentistProcedureSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      procedure_id: "22222222-2222-2222-2222-222222222222",
      price: "150.50",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.price).toBe(150.5)
  })
  it("rejects negative price", () => {
    const r = dentistProcedureSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      procedure_id: "22222222-2222-2222-2222-222222222222",
      price: -10,
    })
    expect(r.success).toBe(false)
  })
  it("rejects duration_minutes = 0", () => {
    const r = dentistProcedureSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      procedure_id: "22222222-2222-2222-2222-222222222222",
      duration_minutes: 0,
    })
    expect(r.success).toBe(false)
  })
  it("defaults active to true", () => {
    const r = dentistProcedureSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      procedure_id: "22222222-2222-2222-2222-222222222222",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.active).toBe(true)
  })
})

describe("procedureRequestSchema", () => {
  it("rejects duration_minutes = 0", () => {
    const r = procedureRequestSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      name: "Solicitação",
      duration_minutes: 0,
    })
    expect(r.success).toBe(false)
  })
  it("accepts negative price", () => {
    const r = procedureRequestSchema.safeParse({
      dentist_id: "11111111-1111-1111-1111-111111111111",
      name: "Solicitação",
      duration_minutes: 30,
      price: -1,
    })
    expect(r.success).toBe(false)
  })
})

describe("clinicHoursSchema", () => {
  it("coerces day_of_week from string", () => {
    const r = clinicHoursSchema.safeParse({ day_of_week: "2", open_time: "08:00", close_time: "18:00", is_open: "on" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.day_of_week).toBe(2)
  })
  it("rejects day_of_week < 0", () => {
    const r = clinicHoursSchema.safeParse({ day_of_week: -1, open_time: "08:00", close_time: "18:00", is_open: true })
    expect(r.success).toBe(false)
  })
  it("rejects day_of_week > 6", () => {
    const r = clinicHoursSchema.safeParse({ day_of_week: 7, open_time: "08:00", close_time: "18:00", is_open: true })
    expect(r.success).toBe(false)
  })
  it("coerces is_open from 'on'", () => {
    const r = clinicHoursSchema.safeParse({ day_of_week: 1, open_time: "08:00", close_time: "18:00", is_open: "on" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.is_open).toBe(true)
  })
})

import { prescriptionSchema, prescriptionUpdateSchema } from "../prescriptions"

describe("prescriptionSchema", () => {
  const valid = {
    title: "Prescrição",
    patient_id: "11111111-1111-1111-1111-111111111111",
    dentist_id: "22222222-2222-2222-2222-222222222222",
    medications: [{ medicamento: "Dipirona", dosagem: "500mg", observacao: "8/8h" }],
  }
  it("accepts valid prescription", () => {
    const r = prescriptionSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })
  it("rejects empty medications array", () => {
    const r = prescriptionSchema.safeParse({ ...valid, medications: [] })
    expect(r.success).toBe(false)
  })
  it("parses medications from JSON string", () => {
    const meds = JSON.stringify([{ medicamento: "Dipirona", dosagem: "500mg", observacao: "" }])
    const r = prescriptionSchema.safeParse({ ...valid, medications: meds })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.medications).toHaveLength(1)
  })
  it("falls back to empty array on invalid JSON", () => {
    const r = prescriptionSchema.safeParse({ ...valid, medications: "not-json" })
    expect(r.success).toBe(false)
  })
  it("rejects medicamento longer than 300 chars", () => {
    const r = prescriptionSchema.safeParse({
      ...valid,
      medications: [{ medicamento: "a".repeat(301), dosagem: "", observacao: "" }],
    })
    expect(r.success).toBe(false)
  })
  it("defaults dosagem to empty string", () => {
    const r = prescriptionSchema.safeParse({
      ...valid,
      medications: [{ medicamento: "Dipirona" }],
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.medications[0].dosagem).toBe("")
  })
  it("defaults observacao to empty string", () => {
    const r = prescriptionSchema.safeParse({
      ...valid,
      medications: [{ medicamento: "Dipirona" }],
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.medications[0].observacao).toBe("")
  })
  it("accepts null appointment_id", () => {
    const r = prescriptionSchema.safeParse({ ...valid, appointment_id: null })
    expect(r.success).toBe(true)
  })
  it("accepts general_observations up to 10000 chars", () => {
    const r = prescriptionSchema.safeParse({ ...valid, general_observations: "a".repeat(10000) })
    expect(r.success).toBe(true)
  })
  it("rejects general_observations longer than 10000", () => {
    const r = prescriptionSchema.safeParse({ ...valid, general_observations: "a".repeat(10001) })
    expect(r.success).toBe(false)
  })
})

describe("prescriptionUpdateSchema", () => {
  it("requires id", () => {
    const r = prescriptionUpdateSchema.safeParse({
      title: "Update",
      patient_id: "11111111-1111-1111-1111-111111111111",
      dentist_id: "22222222-2222-2222-2222-222222222222",
    })
    expect(r.success).toBe(false)
  })
  it("allows partial medications", () => {
    const r = prescriptionUpdateSchema.safeParse({
      id: "33333333-3333-3333-3333-333333333333",
      title: "Update",
      patient_id: "11111111-1111-1111-1111-111111111111",
      dentist_id: "22222222-2222-2222-2222-222222222222",
    })
    expect(r.success).toBe(true)
  })
})

import { z } from "zod"

const MedicationFieldSchema = z.object({
  medicamento: z.string().min(1, "Medicamento é obrigatório").max(300),
  dosagem: z.string().max(200).default(""),
  observacao: z.string().max(500).default(""),
})

export const prescriptionSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  patient_id: z.string().uuid("Paciente inválido"),
  dentist_id: z.string().uuid("Dentista inválido"),
  appointment_id: z.string().uuid().nullable().optional(),
  medications: z.preprocess(
    (v) => {
      if (typeof v === "string") {
        try { return JSON.parse(v) } catch { return [] }
      }
      return v ?? []
    },
    z.array(MedicationFieldSchema).min(1, "Adicione pelo menos um medicamento"),
  ),
  general_observations: z.string().max(10000).default(""),
})

export const prescriptionUpdateSchema = prescriptionSchema.extend({
  id: z.string().uuid(),
  medications: z.preprocess(
    (v) => {
      if (typeof v === "string") {
        try { return JSON.parse(v) } catch { return [] }
      }
      return v ?? []
    },
    z.array(MedicationFieldSchema).optional(),
  ),
})



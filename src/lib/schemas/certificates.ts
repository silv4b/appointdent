import { z } from "zod"

export const certificateSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  patient_id: z.string().uuid("Paciente inválido"),
  dentist_id: z.string().uuid("Dentista inválido"),
  appointment_id: z.string().uuid().nullable().optional(),
  content: z.string().max(10000).default(""),
  general_observations: z.string().max(10000).default(""),
})

export const certificateUpdateSchema = certificateSchema.extend({
  id: z.string().uuid(),
})

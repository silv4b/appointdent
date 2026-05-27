import { z } from "zod"

export const patientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  cpf: z.string().max(14).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  birth_date: z.string().max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const quickPatientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  phone: z.string().max(20).nullable().optional(),
})

export const dentistSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  specialty: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  active: z.boolean().optional(),
})

export const procedureSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  description: z.string().max(500).nullable().optional(),
  duration_minutes: z.coerce.number().int().min(1, "Duração deve ser maior que 0"),
  price: z.coerce.number().min(0).nullable().optional(),
  color: z.string().max(9).default("#3b82f6"),
  active: z.boolean().optional(),
})

export const appointmentSchema = z.object({
  patient_id: z.string().uuid("Paciente inválido"),
  dentist_id: z.string().uuid("Dentista inválido"),
  procedure_id: z.string().uuid().nullable().optional(),
  start_time: z.string().min(1, "Início é obrigatório"),
  end_time: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  status: z.string().max(20).optional(),
  return_to_id: z.string().uuid().nullable().optional(),
})

export const appointmentUpdateSchema = appointmentSchema.extend({
  id: z.string().uuid(),
})

export const availabilitySlotSchema = z.object({
  dentist_id: z.string().uuid("Dentista inválido"),
  day_of_week: z.coerce.number().int().min(0).max(6),
  start_time: z.string().min(1, "Início é obrigatório"),
  end_time: z.string().min(1, "Fim é obrigatório"),
})

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
})

export const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  name: z.string().min(1, "Nome é obrigatório").max(200),
})

export type PatientInput = z.infer<typeof patientSchema>
export type QuickPatientInput = z.infer<typeof quickPatientSchema>
export type DentistInput = z.infer<typeof dentistSchema>
export type ProcedureInput = z.infer<typeof procedureSchema>
export const anamneseSessionSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  patient_id: z.string().uuid("Paciente inválido"),
  appointment_id: z.string().uuid("Agendamento inválido").nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export type AppointmentInput = z.infer<typeof appointmentSchema>
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>

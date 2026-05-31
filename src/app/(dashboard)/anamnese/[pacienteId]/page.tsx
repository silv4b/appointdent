import { PacienteAnamneseClient } from "./client"

export default async function PacienteAnamnesePage({
  params,
  searchParams,
}: {
  params: Promise<{ pacienteId: string }>
  searchParams: Promise<{ appointmentId?: string; sessionId?: string }>
}) {
  const { pacienteId } = await params
  const { appointmentId, sessionId } = await searchParams
  return <PacienteAnamneseClient pacienteId={pacienteId} appointmentId={appointmentId} sessionId={sessionId} />
}

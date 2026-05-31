import { PacienteDetailClient } from "./client"

export default async function PacienteDetailPage(props: { params: Promise<{ pacienteId: string }> }) {
  const { pacienteId } = await props.params
  return <PacienteDetailClient pacienteId={pacienteId} />
}

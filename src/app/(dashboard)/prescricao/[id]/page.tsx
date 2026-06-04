import { PrescricaoFormClient } from "./client"

export default async function PrescricaoFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const { edit } = await searchParams
  return <PrescricaoFormClient prescriptionId={id} editMode={edit === "true"} />
}

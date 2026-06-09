import { CertificateFormClient } from "./client"

export const metadata = { title: "Atestados" }

export default async function CertificateFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const { edit } = await searchParams
  return <CertificateFormClient certificateId={id} editMode={edit === "true"} />
}

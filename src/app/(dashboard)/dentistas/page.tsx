import { getUserSessionData } from "@/lib/actions/session"
import { DentistsClient } from "./client"

export default async function DentistsPage() {
  const session = await getUserSessionData()
  const role = "data" in session ? session.data.role : null

  return <DentistsClient role={role} />
}

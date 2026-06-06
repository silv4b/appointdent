import { redirect } from "next/navigation"

export const metadata = { title: "Financeiro" }
import { getUserSessionData } from "@/lib/actions/session"
import { getFinancialOverview } from "@/lib/actions/queries"
import { FinanceiroClient } from "./client"

export default async function FinanceiroPage() {
  const result = await getUserSessionData()
  if (!("data" in result)) redirect("/")

  const { role } = result.data

  const financialResult = await getFinancialOverview()
  const initialData = "data" in financialResult ? financialResult.data : null

  return <FinanceiroClient initialData={initialData} role={role ?? "unknown"} />
}

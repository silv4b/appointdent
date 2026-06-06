"use client"

import { CalendarDays, DollarSign, TrendingUp, Ban, PiggyBank } from "lucide-react"
import { formatToBRL } from "@/lib/utils/format"

type PeriodRevenue = { revenue: number; count: number }

type TopProcedure = {
  procedure_id: string
  procedure_name: string
  color: string | null
  count: number
  total: number
}

type OverviewData = {
  revenue: {
    day: PeriodRevenue
    week: PeriodRevenue
    month: PeriodRevenue
    year: PeriodRevenue
    all_time: PeriodRevenue
  }
  ticket: Record<string, number>
  cancellationRate: number
  cancelledCount: number
  previsaoMensal: number
  byDentist: Array<{ dentist_id: string; name: string; revenue: number; count: number }>
  monthlyEvolution: Array<{ month: string; label: string; revenue: number; count: number }>
  maxMonthlyRevenue: number
  topProcedures: TopProcedure[]
  totalAppointments: number
}

export function FinanceiroClient({ initialData, role }: { initialData: OverviewData | null; role: string }) {
  const data = initialData

  const bg1 = "bg-chart-1/10", bg2 = "bg-chart-2/10", bg3 = "bg-chart-3/10", bg4 = "bg-chart-4/10"
  const tx1 = "text-chart-1", tx2 = "text-chart-2", tx3 = "text-chart-3", tx4 = "text-chart-4"

  const colorMap: Record<string, { bg: string; tx: string }> = {
    c1: { bg: bg1, tx: tx1 },
    c2: { bg: bg2, tx: tx2 },
    c3: { bg: bg3, tx: tx3 },
    c4: { bg: bg4, tx: tx4 },
  }

  const Card = ({
    label,
    value,
    sub,
    icon: Icon,
    c,
  }: {
    label: string
    value: string
    sub?: string
    icon: typeof DollarSign
    c: string
  }) => (
    <div className="group rounded-2xl border bg-card text-card-foreground transition-all duration-300 hover:border-primary/20">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${
              colorMap[c]?.bg ?? bg1
            }`}
          >
            <Icon className={`h-6 w-6 ${colorMap[c]?.tx ?? tx1}`} />
          </div>
        </div>
      </div>
    </div>
  )

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Erro ao carregar dados financeiros.
      </div>
    )
  }

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "admin" ? "Acompanhe o faturamento da clínica." : "Acompanhe seus dados financeiros."}
        </p>
      </div>

      {/* Row 1: Faturamento por período */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Hoje"
          value={formatToBRL(data.revenue.day.revenue)}
          sub={`${data.revenue.day.count} atendimento${data.revenue.day.count !== 1 ? "s" : ""}`}
          icon={CalendarDays}
          c="c1"
        />
        <Card
          label="Esta Semana"
          value={formatToBRL(data.revenue.week.revenue)}
          sub={`${data.revenue.week.count} atendimento${data.revenue.week.count !== 1 ? "s" : ""}`}
          icon={TrendingUp}
          c="c2"
        />
        <Card
          label="Este Mês"
          value={formatToBRL(data.revenue.month.revenue)}
          sub={`${data.revenue.month.count} atendimento${data.revenue.month.count !== 1 ? "s" : ""}`}
          icon={CalendarDays}
          c="c3"
        />
        <Card
          label="Este Ano"
          value={formatToBRL(data.revenue.year.revenue)}
          sub={`${data.revenue.year.count} atendimento${data.revenue.year.count !== 1 ? "s" : ""}`}
          icon={TrendingUp}
          c="c4"
        />
      </div>

      {/* Row 2: Ticket médio + Cancelamentos + Previsão */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card
          label="Ticket Médio (mês)"
          value={formatToBRL(data.ticket.month)}
          sub={`${data.revenue.month.count} atendimentos`}
          icon={DollarSign}
          c="c1"
        />
        <Card
          label="Cancelamentos (mês)"
          value={`${data.cancelledCount}`}
          sub={`${pct(data.cancellationRate)} de taxa`}
          icon={Ban}
          c="c3"
        />
        <Card
          label="Previsão Mensal"
          value={formatToBRL(data.previsaoMensal)}
          sub="Projeção baseada no ritmo atual"
          icon={PiggyBank}
          c="c2"
        />
      </div>

      {/* Row 3: Faturamento por Dentista + Evolução Mensal */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Tabela por dentista */}
        <div className="rounded-2xl border bg-card text-card-foreground">
          <div className="p-6 pb-3">
            <h3 className="text-base font-semibold tracking-tight">
              Faturamento por Dentista (mês)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pl-6 text-start text-xs font-medium text-muted-foreground">
                    Dentista
                  </th>
                  <th className="pb-3 text-start text-xs font-medium text-muted-foreground">
                    Atend.
                  </th>
                  <th className="pb-3 pr-6 text-end text-xs font-medium text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.byDentist.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Nenhum dado no mês.
                    </td>
                  </tr>
                ) : (
                  data.byDentist.map((d) => (
                    <tr
                      key={d.dentist_id}
                      className="group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 pl-6">
                        <span className="text-sm font-medium">{d.name}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-muted-foreground">
                          {d.count}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-end">
                        <span className="text-sm font-medium">
                          {formatToBRL(d.revenue)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de barras CSS */}
        <div className="rounded-2xl border bg-card text-card-foreground">
          <div className="p-6 pb-3">
            <h3 className="text-base font-semibold tracking-tight">
              Evolução Mensal
            </h3>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end gap-3 h-40">
              {data.monthlyEvolution.map((m) => {
                const height =
                  m.revenue > 0
                    ? Math.max((m.revenue / data.maxMonthlyRevenue) * 100, 8)
                    : 4
                return (
                  <div
                    key={m.month}
                    className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {formatToBRL(m.revenue)}
                    </span>
                    <div
                      className="w-full rounded-md bg-chart-1 transition-all duration-300 hover:opacity-80"
                      style={{ height: `${height}%`, minHeight: "4px" }}
                      title={`${m.label}: ${formatToBRL(m.revenue)} (${m.count} atendimentos)`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {m.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Procedimentos Mais Realizados */}
      <div className="rounded-2xl border bg-card text-card-foreground">
        <div className="flex items-center justify-between p-6 pb-3">
          <h3 className="text-base font-semibold tracking-tight">
            Procedimentos Mais Realizados
          </h3>
          <span className="text-xs text-muted-foreground">
            {data.totalAppointments} atendimentos no total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pl-6 text-start text-xs font-medium text-muted-foreground">
                  Procedimento
                </th>
                <th className="pb-3 text-start text-xs font-medium text-muted-foreground">
                  Qtd
                </th>
                <th className="pb-3 pr-6 text-end text-xs font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topProcedures.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Nenhum atendimento concluído ainda.
                  </td>
                </tr>
              ) : (
                data.topProcedures.map((p) => (
                  <tr
                    key={p.procedure_id}
                    className="group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-2">
                        {p.color && (
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                        )}
                        <span className="text-sm font-medium">
                          {p.procedure_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-muted-foreground">
                        {p.count}x
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-end">
                      <span className="text-sm font-medium">
                        {formatToBRL(p.total)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

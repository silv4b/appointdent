"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  addMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: { name: string } | null
  dentists: { name: string } | null
  procedures: { name: string; color: string | null; duration_minutes: number } | null
}

interface MiniCalendarProps {
  currentDate: Date
  onSelect: (d: Date) => void
  appointments: Appointment[]
}

export function MiniCalendar({ currentDate, onSelect, appointments }: MiniCalendarProps) {
  const viewMonth = startOfMonth(currentDate)

  const days = eachDayOfInterval({
    start: startOfWeek(viewMonth),
    end: endOfWeek(endOfMonth(viewMonth)),
  })

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  const dotsMap = useMemo(() => {
    const map = new Map<string, "past" | "current" | "future">()
    const now = new Date()
    for (const a of appointments) {
      const key = a.start_time.slice(0, 10)
      const start = new Date(a.start_time)
      const end = new Date(a.end_time)
      let status: "past" | "current" | "future"
      if (end < now) status = "past"
      else if (start > now) status = "future"
      else status = "current"
      const existing = map.get(key)
      if (!existing || status === "current" || (status === "future" && existing === "past")) {
        map.set(key, status)
      }
    }
    return map
  }, [appointments])

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          onClick={() => onSelect(startOfMonth(subMonths(currentDate, 1)))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{format(viewMonth, "MMMM yyyy", { locale: ptBR })}</span>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          onClick={() => onSelect(startOfMonth(addMonths(currentDate, 1)))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center">
        {dayNames.map((name) => (
          <div key={name} className="py-1 text-[11px] font-medium text-muted-foreground">
            {name}
          </div>
        ))}
        {days.map((day, i) => {
          const isSelected = isSameDay(day, currentDate)
          const isCurrentMonth = isSameMonth(day, viewMonth)
          const isCurrentDay = isToday(day)
          const dot = isCurrentMonth ? dotsMap.get(format(day, "yyyy-MM-dd")) : undefined
          return (
            <button
              key={i}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isCurrentDay && isCurrentMonth
                    ? "border border-primary text-primary"
                    : isCurrentMonth
                      ? "text-foreground hover:bg-accent"
                      : "text-muted-foreground/30",
              )}
              onClick={() => { onSelect(day) }}
            >
              {format(day, "d")}
              {dot && (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                    dot === "current" ? "bg-green-500" : dot === "future" ? "bg-blue-500" : "bg-muted-foreground/50",
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"

interface EventTooltipProps {
  content: ReactNode
  children: ReactNode
}

export function EventTooltip({ content, children }: EventTooltipProps) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
      setVisible(true)
    } else {
      const timer = setTimeout(() => setVisible(false), 120)
      leaveTimerRef.current = timer
    }
  }, [open])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setOpen(true)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    let x = rect.left + rect.width / 2
    let y = rect.bottom + 6

    if (x < 100) x = 100
    if (y + 200 > window.innerHeight) y = rect.top - 6

    setPos({ x, y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="size-full"
    >
      {children}
      {visible && mounted && createPortal(
        <div
          className="fixed z-[9999] min-w-52 max-w-64 rounded-lg border bg-popover p-3 text-popover-foreground pointer-events-none transition-opacity duration-[120ms]"
          style={{
            left: pos.x,
            top: pos.y,
            transform: "translateX(-50%)",
            opacity: open ? 1 : 0,
          }}
        >
          {content}
        </div>,
        document.body,
      )}
    </div>
  )
}

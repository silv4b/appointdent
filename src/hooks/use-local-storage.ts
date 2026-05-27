"use client"

import { useCallback, useEffect, useState } from "react"

export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        setValue(JSON.parse(stored) as T)
      }
    } catch {
      // parse error — ignore
    }
  }, [key])

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // quota exceeded or other storage error — ignore
    }
  }, [key, value])

  const set = useCallback((next: T) => {
    setValue(next)
  }, [])

  return [value, set]
}

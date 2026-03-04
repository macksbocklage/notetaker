'use client'
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Always start with initialValue to match server render (avoids hydration mismatch)
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isHydrated, setIsHydrated] = useState(false)

  // Read from localStorage after mount (one-time)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item !== null) setStoredValue(JSON.parse(item) as T)
    } catch {}
    setIsHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Write only after hydration to avoid overwriting stored data before the read fires
  useEffect(() => {
    if (!isHydrated) return
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error('localStorage write failed:', error)
    }
  }, [key, storedValue, isHydrated])

  return [storedValue, setStoredValue] as const
}

import { useEffect, useState } from 'react'

/**
 * Ca useState, dar valoarea e salvata in localStorage si supravietuieste refresh-ului.
 * Cheia e citita o singura data, la montare; pentru alta cheie, componenta se remonteaza (prop `key`).
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial // localStorage blocat sau JSON corupt: pornim de la zero
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ex. navigare privata cu stocare blocata: aplicatia merge in continuare, doar nu salveaza
    }
  }, [key, value])

  return [value, setValue] as const
}

import { useState } from 'react'
import { parseGrade } from '../format'

interface Props {
  value: number | undefined
  onChange: (value: number | undefined) => void
  label: string
  /** Nota finala e intreaga; notele pe componente pot avea zecimale. */
  decimals?: boolean
  /** Coloreaza campul dupa rezultat: verde promovat, rosu picat. */
  tone?: 'passed' | 'failed'
}

/**
 * Camp pentru o nota 1-10. Tine textul scris local (ca sa poti scrie "8," fara sa se stearga)
 * si trimite mai departe doar valori valide.
 */
export function GradeInput({ value, onChange, label, decimals = false, tone }: Props) {
  const [text, setText] = useState(value === undefined ? '' : String(value))
  const parsed = parseGrade(text)
  const invalid = parsed === null || (!decimals && parsed !== undefined && !Number.isInteger(parsed))

  return (
    <input
      className={`grade-input${tone && !invalid ? ` ${tone}` : ''}`}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid}
      title={invalid ? (decimals ? 'Nota trebuie sa fie intre 1 si 10' : 'Nota finala e un numar intreg 1-10') : undefined}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const next = parseGrade(e.target.value)
        const ok = next !== null && (decimals || next === undefined || Number.isInteger(next))
        onChange(ok ? (next ?? undefined) : undefined)
      }}
    />
  )
}

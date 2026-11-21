interface Option<T> {
  value: T
  label: string
}

interface Props<T> {
  options: Option<T>[]
  value: T | undefined
  onChange: (value: T) => void
  label: string
}

/** Control segmentat in stil iOS: cateva optiuni alaturate, una selectata. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: Props<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

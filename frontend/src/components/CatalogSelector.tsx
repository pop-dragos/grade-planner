import type { Program } from '../api'

export interface Selection {
  program: string
  academicYear: string
  year: number
  semester: number
}

interface Props {
  programs: Program[]
  value: Selection
  onChange: (next: Selection) => void
}

export function CatalogSelector({ programs, value, onChange }: Props) {
  const program = programs.find((p) => p.code === value.program) ?? programs[0]

  return (
    <div className="selector">
      <label>
        Specializarea
        <select
          value={program.code}
          onChange={(e) => {
            const next = programs.find((p) => p.code === e.target.value) ?? program
            onChange({ ...value, program: next.code, academicYear: next.academicYears[0] })
          }}
        >
          {programs.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} ({p.language.toUpperCase()})
            </option>
          ))}
        </select>
      </label>
      <label>
        Anul universitar
        <select value={value.academicYear} onChange={(e) => onChange({ ...value, academicYear: e.target.value })}>
          {program.academicYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label>
        Anul de studiu
        <select value={value.year} onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>
              Anul {y}
            </option>
          ))}
        </select>
      </label>
      <label>
        Semestrul
        <select value={value.semester} onChange={(e) => onChange({ ...value, semester: Number(e.target.value) })}>
          <option value={1}>Semestrul 1</option>
          <option value={2}>Semestrul 2</option>
        </select>
      </label>
    </div>
  )
}

import type { Program } from '../api'
import { Segmented } from './Segmented'

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
      <div className="selector-row">
        <select
          aria-label="Specializarea"
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
        <select
          aria-label="Anul universitar"
          value={value.academicYear}
          onChange={(e) => onChange({ ...value, academicYear: e.target.value })}
        >
          {program.academicYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="selector-row">
        <Segmented
          label="Anul de studiu"
          options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Anul ${y}` }))}
          value={value.year}
          onChange={(year) => onChange({ ...value, year })}
        />
        <Segmented
          label="Semestrul"
          options={[
            { value: 1, label: 'Sem. 1' },
            { value: 2, label: 'Sem. 2' },
          ]}
          value={value.semester}
          onChange={(semester) => onChange({ ...value, semester })}
        />
      </div>
    </div>
  )
}

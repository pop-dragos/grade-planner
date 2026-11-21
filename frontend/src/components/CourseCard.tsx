import type { ReactNode } from 'react'
import type { Course } from '../api'
import { formatNumber } from '../format'
import { courseResult, minGradeFor, type CourseResult, type NeededGrade } from '../grading'
import { emptyCourse, toEntry, type StoredCourse } from '../storedGrades'
import { GradeInput } from './GradeInput'
import { Segmented } from './Segmented'

interface Props {
  course: Course
  stored: StoredCourse | undefined
  onChange: (next: StoredCourse) => void
  /** Titlu afisat in locul numelui materiei (ex. „Limbă străină I” pentru un pachet optional). */
  title?: string
  /** Alegerea variantei dintr-un pachet optional. */
  picker?: ReactNode
}

const EVALUATION = { E: 'Examen', C: 'Colocviu', V: 'Verificare' } as const

export function CourseCard({ course, stored, onChange, title, picker }: Props) {
  const s = stored ?? emptyCourse()
  const result = courseResult(course, toEntry(course, stored))
  const componentsMode = s.mode === 'components' && course.rulesStatus === 'CLEAR'
  const canUseComponents = course.rulesStatus === 'CLEAR' && course.gradingType === 'NUMERIC'
  const syllabusNotes = [
    ...course.conditions.map((c) => c.sourceText).filter((t): t is string => !!t),
    ...course.extraRequirements,
  ].filter((t, i, all) => all.indexOf(t) === i)

  return (
    <li className="row">
      <div className="row-main">
        <div className="row-text">
          <span className="row-title">{title ?? course.name}</span>
          <span className="row-subtitle">
            {course.credits} credite · {EVALUATION[course.evaluationForm]}
          </span>
          <span className="status-below">
            <Status result={result} course={course} />
          </span>
        </div>

        <div className="row-accessory">
          <span className="status-beside">
            <Status result={result} course={course} />
          </span>
          {course.gradingType === 'PASS_FAIL' ? (
            <Segmented
              label={`Rezultat ${course.name}`}
              options={[
                { value: 'admis', label: 'Admis' },
                { value: 'respins', label: 'Respins' },
              ]}
              value={s.passed === undefined ? undefined : s.passed ? 'admis' : 'respins'}
              onChange={(v) => onChange({ ...s, passed: v === 'admis' })}
            />
          ) : (
            !componentsMode && (
              <GradeInput
                label={`Nota finală ${course.name}`}
                value={s.final}
                onChange={(final) => onChange({ ...s, final })}
              />
            )
          )}
        </div>
      </div>

      {picker && <div className="row-picker">{picker}</div>}

      {componentsMode && <ComponentsForm course={course} stored={s} onChange={onChange} />}

      {(canUseComponents || syllabusNotes.length > 0) && (
        <div className="row-footer">
          {canUseComponents && (
            <label className="toggle">
              <input
                type="checkbox"
                checked={componentsMode}
                onChange={(e) => onChange({ ...s, mode: e.target.checked ? 'components' : 'final' })}
              />
              <span>Calculează din componente</span>
            </label>
          )}
          {syllabusNotes.length > 0 && (
            <details className="disclosure">
              <summary>Condiții din fișă</summary>
              <ul>
                {syllabusNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </li>
  )
}

function ComponentsForm({ course, stored, onChange }: { course: Course; stored: StoredCourse; onChange: (s: StoredCourse) => void }) {
  const missing = course.components.filter((c) => stored.components[c.code] === undefined)
  // „Ce imi trebuie” are sens cand lipseste exact o componenta (de obicei examenul)
  const target = missing.length === 1 ? missing[0] : null

  return (
    <div className="components">
      {course.components.map((c) => (
        <div className="component" key={c.code}>
          <span>
            {c.label} <span className="row-subtitle">{c.weight}%</span>
          </span>
          <GradeInput
            decimals
            label={`${c.label} ${course.name}`}
            value={stored.components[c.code]}
            onChange={(v) => onChange({ ...stored, components: { ...stored.components, [c.code]: v } })}
          />
        </div>
      ))}
      {target && (
        <p className="hint">
          La {target.label.toLowerCase()} îți trebuie {describeNeeded(minGradeFor(course, stored.components, target.code, 5))}{' '}
          ca să treci și {describeNeeded(minGradeFor(course, stored.components, target.code, 10))} pentru 10.
        </p>
      )}
    </div>
  )
}

function describeNeeded(n: NeededGrade): string {
  switch (n.kind) {
    case 'possible':
      return `minim ${formatNumber(n.grade)}`
    case 'impossible':
      return 'peste 10'
    case 'notAdmitted':
      return '— (nu ești admis la examen)'
    case 'missingOtherGrades':
      return '—'
  }
}

function Status({ result, course }: { result: CourseResult; course: Course }) {
  switch (result.status) {
    case 'INCOMPLETE':
      return null
    case 'PASSED':
      return (
        <span className="chip passed">
          {course.gradingType === 'NUMERIC' && result.rawGrade !== null ? `Promovat · ${result.grade}` : 'Promovat'}
        </span>
      )
    case 'NOT_ADMITTED':
      return <span className="chip failed">Neadmis</span>
    case 'FAILED':
      return <span className="chip failed">Nepromovat</span>
  }
}

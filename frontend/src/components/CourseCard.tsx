import type { ReactNode } from 'react'
import type { Course, GradingCondition } from '../api'
import { formatNumber } from '../format'
import { courseResult, minGradeFor, type CourseResult, type NeededGrade } from '../grading'
import { emptyCourse, toEntry, type StoredCourse } from '../storedGrades'
import { GradeInput } from './GradeInput'

interface Props {
  course: Course
  stored: StoredCourse | undefined
  onChange: (next: StoredCourse) => void
  /** Pentru pachetele optionale: dropdown-ul cu materiile din pachet, afisat in locul titlului. */
  optionPicker?: ReactNode
}

const EVALUATION = { E: 'Examen', C: 'Colocviu', V: 'Verificare' } as const

export function CourseCard({ course, stored, onChange, optionPicker }: Props) {
  const s = stored ?? emptyCourse()
  const result = courseResult(course, toEntry(course, stored))
  const componentsMode = s.mode === 'components' && course.rulesStatus === 'CLEAR'
  const canUseComponents = course.rulesStatus === 'CLEAR' && course.gradingType === 'NUMERIC'

  return (
    <article className={`card status-${result.status.toLowerCase()}`}>
      <div className="card-main">
        <div className="card-title">
          {optionPicker ?? <h3>{course.name}</h3>}
          <p className="meta">
            {course.credits} credite · {EVALUATION[course.evaluationForm]}
            {course.syllabus?.academicYear && ` · fișa ${course.syllabus.academicYear}`}
          </p>
        </div>

        <div className="card-grade">
          <StatusChip result={result} course={course} />
          {course.gradingType === 'PASS_FAIL' ? (
            <div className="segmented" role="group" aria-label={`Rezultat ${course.name}`}>
              <button type="button" aria-pressed={s.passed === true} onClick={() => onChange({ ...s, passed: true })}>
                Admis
              </button>
              <button type="button" aria-pressed={s.passed === false} onClick={() => onChange({ ...s, passed: false })}>
                Respins
              </button>
            </div>
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

      {componentsMode && <ComponentsForm course={course} stored={s} onChange={onChange} />}

      {(canUseComponents || course.rulesStatus === 'AMBIGUOUS' || course.extraRequirements.length > 0) && (
        <div className="card-footer">
          {canUseComponents && (
            <label className="toggle">
              <input
                type="checkbox"
                checked={componentsMode}
                onChange={(e) => onChange({ ...s, mode: e.target.checked ? 'components' : 'final' })}
              />
              Calculează din componente
            </label>
          )}
          {course.rulesStatus === 'AMBIGUOUS' && (
            <p className="warning">Regulile din fișă nu sunt clare sau nu se aplică strict, așa că introdu nota finală.</p>
          )}
          {course.extraRequirements.length > 0 && (
            <details className="requirements">
              <summary>Condiții din fișă</summary>
              <ul>
                {course.extraRequirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </article>
  )
}

function ComponentsForm({ course, stored, onChange }: { course: Course; stored: StoredCourse; onChange: (s: StoredCourse) => void }) {
  const missing = course.components.filter((c) => stored.components[c.code] === undefined)
  // „Ce imi trebuie” are sens cand lipseste exact o componenta (de obicei examenul)
  const target = missing.length === 1 ? missing[0] : null

  return (
    <div className="components">
      {course.components.map((c) => (
        <div className="component-row" key={c.code}>
          <span>
            {c.label} <span className="meta">{c.weight}%</span>
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
        <p className="needed">
          La <strong>{target.label}</strong> îți trebuie {describeNeeded(minGradeFor(course, stored.components, target.code, 5))}{' '}
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
      return 'peste 10 (imposibil)'
    case 'notAdmitted':
      return '— (nu ești admis la examen)'
    case 'missingOtherGrades':
      return '—'
  }
}

function StatusChip({ result, course }: { result: CourseResult; course: Course }) {
  const reasons = result.failedConditions.map((c) => describeCondition(c, course)).join(', ')
  switch (result.status) {
    case 'INCOMPLETE':
      return null
    case 'PASSED':
      return (
        <span className="chip passed">
          {course.gradingType === 'PASS_FAIL' ? 'Promovat' : `Promovat · ${result.grade}`}
        </span>
      )
    case 'NOT_ADMITTED':
      return (
        <span className="chip failed" title={reasons}>
          Neadmis la examen
        </span>
      )
    case 'FAILED':
      return (
        <span className="chip failed" title={reasons || undefined}>
          Nepromovat{result.grade !== null && course.gradingType === 'NUMERIC' && ` · ${result.grade}`}
        </span>
      )
  }
}

function describeCondition(c: GradingCondition, course: Course): string {
  const label = c.component === null ? 'Nota finală' : (course.components.find((x) => x.code === c.component)?.label ?? c.component)
  return `${label} sub ${c.minGrade}`
}

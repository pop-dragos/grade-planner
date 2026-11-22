import type { ReactNode } from 'react'
import type { Course } from '../api'
import { courseResult, type CourseResult } from '../grading'
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
            <GradeInput
              label={`Nota finală ${course.name}`}
              value={s.final}
              tone={toneOf(result)}
              onChange={(final) => onChange({ ...s, mode: 'final', final })}
            />
          )}
        </div>
      </div>

      {picker && <div className="row-picker">{picker}</div>}
    </li>
  )
}

function toneOf(result: CourseResult): 'passed' | 'failed' | undefined {
  if (result.status === 'PASSED') return 'passed'
  if (result.status === 'FAILED' || result.status === 'NOT_ADMITTED') return 'failed'
  return undefined
}

function Status({ result, course }: { result: CourseResult; course: Course }) {
  switch (result.status) {
    case 'INCOMPLETE':
      return null
    case 'PASSED':
      return <span className="chip passed">Promovat</span>
    case 'NOT_ADMITTED':
    case 'FAILED':
      return <span className="chip failed">{course.gradingType === 'PASS_FAIL' ? 'Respins' : 'Nepromovat'}</span>
  }
}

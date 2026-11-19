import { useState, type ReactNode } from 'react'
import type { Course } from '../api'
import { countedCourses, summarize } from '../grading'
import { EMPTY_CURRICULUM, toEntry, type StoredCourse, type StoredCurriculum } from '../storedGrades'
import { useLocalStorage } from '../useLocalStorage'
import { CourseCard } from './CourseCard'
import { SummaryPanel } from './SummaryPanel'

interface Props {
  courses: Course[]
  /** Cheia din localStorage pentru planul curent, ex. "gp:grades:CALC-RO:2026-2027". */
  storageKey: string
}

/** O materie simpla sau un pachet optional (ex. limbile straine) afisat ca un singur card. */
type Item = { kind: 'course'; course: Course } | { kind: 'group'; group: string; courses: Course[] }

export function SemesterView({ courses, storageKey }: Props) {
  const [saved, setSaved] = useLocalStorage<StoredCurriculum>(storageKey, EMPTY_CURRICULUM)
  // Creste la „Sterge notele”, ca sa remonteze cardurile (campurile isi tin textul local).
  const [version, setVersion] = useState(0)

  const counted = countedCourses(courses, saved.options)
  const entries = Object.fromEntries(counted.map((c) => [c.planCode, toEntry(c, saved.courses[c.planCode])]))
  const summary = summarize(counted, entries)

  const updateCourse = (planCode: string, next: StoredCourse) =>
    setSaved((prev) => ({ ...prev, courses: { ...prev.courses, [planCode]: next } }))
  const chooseOption = (group: string, planCode: string) =>
    setSaved((prev) => ({ ...prev, options: { ...prev.options, [group]: planCode } }))

  const resetSemester = () => {
    if (!window.confirm('Ștergi toate notele introduse în acest semestru?')) return
    setSaved((prev) => {
      const remaining = { ...prev.courses }
      for (const c of courses) delete remaining[c.planCode]
      return { ...prev, courses: remaining }
    })
    setVersion((v) => v + 1)
  }

  const renderItem = (item: Item) => {
    if (item.kind === 'course') {
      return (
        <CourseCard
          key={`${item.course.planCode}-${version}`}
          course={item.course}
          stored={saved.courses[item.course.planCode]}
          onChange={(next) => updateCourse(item.course.planCode, next)}
        />
      )
    }
    const chosen = item.courses.find((c) => c.planCode === saved.options[item.group]) ?? item.courses[0]
    return (
      <CourseCard
        key={`${chosen.planCode}-${version}`}
        course={chosen}
        stored={saved.courses[chosen.planCode]}
        onChange={(next) => updateCourse(chosen.planCode, next)}
        optionPicker={
          <select
            aria-label="Alege materia din pachetul opțional"
            value={chosen.planCode}
            onChange={(e) => chooseOption(item.group, e.target.value)}
          >
            {item.courses.map((c) => (
              <option key={c.planCode} value={c.planCode}>
                {c.name}
              </option>
            ))}
          </select>
        }
      />
    )
  }

  const items = toItems(courses.filter((c) => c.regime !== 'DFA'))
  const required = items.filter((i) => i.kind === 'course' && i.course.regime === 'DOB')
  const optional = items.filter((i) => !(i.kind === 'course' && i.course.regime === 'DOB'))
  const extra = toItems(courses.filter((c) => c.regime === 'DFA'))

  return (
    <div className="layout">
      <div className="sections">
        {required.length > 0 && <Section title="Obligatorii">{required.map(renderItem)}</Section>}
        {optional.length > 0 && (
          <Section title="Opționale" hint="Alege materia din pachet; doar ea intră în medie.">
            {optional.map(renderItem)}
          </Section>
        )}
        {extra.length > 0 && (
          <details className="section extra">
            <summary>
              Facultative <span className="hint">· {extra.length} materii, nu intră în medie</span>
            </summary>
            <div className="cards">{extra.map(renderItem)}</div>
          </details>
        )}
      </div>
      <SummaryPanel summary={summary} onReset={resetSemester} />
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>
        {title} {hint && <span className="hint">· {hint}</span>}
      </h2>
      <div className="cards">{children}</div>
    </section>
  )
}

function toItems(courses: Course[]): Item[] {
  const items: Item[] = []
  const groups = new Map<string, Course[]>()
  for (const course of courses) {
    if (course.optionGroup === null) {
      items.push({ kind: 'course', course })
      continue
    }
    let members = groups.get(course.optionGroup)
    if (!members) {
      members = []
      groups.set(course.optionGroup, members)
      items.push({ kind: 'group', group: course.optionGroup, courses: members })
    }
    members.push(course)
  }
  return items
}

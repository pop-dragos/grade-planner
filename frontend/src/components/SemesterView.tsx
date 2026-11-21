import { useState } from 'react'
import type { Course } from '../api'
import { countedCourses, summarize } from '../grading'
import { EMPTY_CURRICULUM, toEntry, type StoredCourse, type StoredCurriculum } from '../storedGrades'
import { useLocalStorage } from '../useLocalStorage'
import { CourseCard } from './CourseCard'
import { Segmented } from './Segmented'
import { SummaryPanel } from './SummaryPanel'

interface Props {
  courses: Course[]
  /** Cheia din localStorage pentru planul curent, ex. "gp:grades:CALC-RO:2026-2027". */
  storageKey: string
}

/** O materie simpla sau un pachet optional (ex. limbile straine) afisat ca un singur rand. */
type Item = { kind: 'course'; course: Course } | { kind: 'group'; group: string; courses: Course[] }

export function SemesterView({ courses, storageKey }: Props) {
  const [saved, setSaved] = useLocalStorage<StoredCurriculum>(storageKey, EMPTY_CURRICULUM)
  // Creste la „Sterge notele”, ca sa remonteze randurile (campurile isi tin textul local).
  const [version, setVersion] = useState(0)

  // Facultativele nu intra in medie, deci nu le afisam deloc.
  const visible = courses.filter((c) => c.regime !== 'DFA')
  const counted = countedCourses(visible, saved.options)
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
        title={groupTitle(item.courses)}
        stored={saved.courses[chosen.planCode]}
        onChange={(next) => updateCourse(chosen.planCode, next)}
        picker={
          <Segmented
            label="Alege varianta"
            options={item.courses.map((c) => ({ value: c.planCode, label: variantLabel(c.name) }))}
            value={chosen.planCode}
            onChange={(planCode) => chooseOption(item.group, planCode)}
          />
        }
      />
    )
  }

  return (
    <div className="layout">
      <section aria-label="Materii">
        <h2 className="list-header">Materii</h2>
        <ul className="list">{toItems(visible).map(renderItem)}</ul>
      </section>
      <SummaryPanel summary={summary} onReset={resetSemester} />
    </div>
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

const LANGUAGE = /^Limba\s+(\S+)(?:\s+([IVX]+))?$/i

/** „Limba engleză I”, „Limba germană I” -> „Limbă străină I”. Alt tip de pachet -> „Pachet opțional”. */
function groupTitle(courses: Course[]): string {
  const match = courses[0].name.match(LANGUAGE)
  if (match && courses.every((c) => LANGUAGE.test(c.name))) {
    return match[2] ? `Limbă străină ${match[2]}` : 'Limbă străină'
  }
  return 'Pachet opțional'
}

/** „Limba engleză I” -> „Engleză”; alte nume raman neschimbate. */
function variantLabel(name: string): string {
  const match = name.match(LANGUAGE)
  if (!match) return name
  return match[1].charAt(0).toUpperCase() + match[1].slice(1)
}

import { useState } from 'react'
import type { Course } from '../api'
import { countedCourses, summarize } from '../grading'
import { EMPTY_CURRICULUM, toEntry, type StoredCourse, type StoredCurriculum } from '../storedGrades'
import { useLocalStorage } from '../useLocalStorage'
import { CourseCard } from './CourseCard'
import { Segmented } from './Segmented'
import { SummaryPanel, type Scope } from './SummaryPanel'

interface Props {
  /** Materiile semestrului afisat. */
  courses: Course[]
  /** Materiile ambelor semestre ale anului de studiu, pentru media anuala. */
  yearCourses: Course[]
  /** Cheia din localStorage pentru planul curent, ex. "gp:grades:CALC-RO:2026-2027". */
  storageKey: string
}

/** O materie simpla sau un pachet optional (ex. limbile straine) afisat ca un singur rand. */
type Item = { kind: 'course'; course: Course } | { kind: 'group'; group: string; courses: Course[] }

export function SemesterView({ courses, yearCourses, storageKey }: Props) {
  const [saved, setSaved] = useLocalStorage<StoredCurriculum>(storageKey, EMPTY_CURRICULUM)
  // Creste la „Sterge notele”, ca sa remonteze randurile (campurile isi tin textul local).
  const [version, setVersion] = useState(0)

  // Facultativele nu intra in medie, deci nu le afisam deloc.
  const visible = courses.filter((c) => c.regime !== 'DFA')
  const semester = scopeOf(visible, saved)
  // Anul: aceleasi reguli (credite, picat = 0), pe ambele semestre.
  const year = scopeOf(yearCourses.filter((c) => c.regime !== 'DFA'), saved)

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
    const languages = isLanguageGroup(item.courses)
    return (
      <CourseCard
        key={`${chosen.planCode}-${version}`}
        course={chosen}
        title={languages ? languageTitle(item.courses[0].name) : 'Pachet opțional'}
        stored={saved.courses[chosen.planCode]}
        onChange={(next) => updateCourse(chosen.planCode, next)}
        picker={
          languages ? (
            <Segmented
              label="Alege limba"
              options={item.courses.map((c) => ({ value: c.planCode, label: languageLabel(c.name) }))}
              value={chosen.planCode}
              onChange={(planCode) => chooseOption(item.group, planCode)}
            />
          ) : (
            // Numele materiilor optionale sunt lungi: dropdown, nu control segmentat.
            <select
              className="option-select"
              aria-label="Alege materia din pachet"
              value={chosen.planCode}
              onChange={(e) => chooseOption(item.group, e.target.value)}
            >
              {item.courses.map((c) => (
                <option key={c.planCode} value={c.planCode}>
                  {c.name}
                </option>
              ))}
            </select>
          )
        }
      />
    )
  }

  return (
    <div className="layout">
      <section aria-label="Materii">
        <h2 className="list-header">Materii</h2>
        <ul className="list">{toItems(visible).map(renderItem)}</ul>
        {/* Pe telefon, sumarul e o bara compacta jos; butonul sta la finalul listei. */}
        <button type="button" className="text-button reset-below-list" onClick={resetSemester}>
          Șterge notele semestrului
        </button>
      </section>
      <SummaryPanel semester={semester} year={year} onReset={resetSemester} />
    </div>
  )
}

/** Materiile care intra in medie, ce a introdus studentul la ele si sumarul lor. */
function scopeOf(courses: Course[], saved: StoredCurriculum): Scope {
  const counted = countedCourses(courses, saved.options)
  const entries = Object.fromEntries(counted.map((c) => [c.planCode, toEntry(c, saved.courses[c.planCode])]))
  return { courses: counted, entries, summary: summarize(counted, entries) }
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

// „Limba engleză I”, „Limba germană II - Redactarea documentelor tehnice”
const LANGUAGE = /^Limba\s+(\S+)(?:\s+([IVX]+))?(?:\s+-\s+(.+))?$/i

function isLanguageGroup(courses: Course[]): boolean {
  return courses.every((c) => LANGUAGE.test(c.name))
}

/** „Limba engleză II - Redactarea documentelor tehnice” -> „Limbă străină II - Redactarea documentelor tehnice”. */
function languageTitle(name: string): string {
  const [, , level, topic] = name.match(LANGUAGE) ?? []
  return ['Limbă străină', level, topic && `- ${topic}`].filter(Boolean).join(' ')
}

/** „Limba engleză I” -> „Engleză”. */
function languageLabel(name: string): string {
  const language = name.match(LANGUAGE)?.[1] ?? name
  return language.charAt(0).toUpperCase() + language.slice(1)
}

// Ce salvam in localStorage pentru fiecare materie, si cum transformam asta in intrarea pentru grading.ts.
// Pastram atat nota finala, cat si notele pe componente, ca sa nu se piarda nimic cand comuti modul.

import type { Course } from './api'
import type { CourseEntry } from './grading'

export interface StoredCourse {
  mode: 'final' | 'components'
  final?: number
  components: Record<string, number | undefined>
  passed?: boolean
}

/** Tot ce e salvat pentru un plan de invatamant (o specializare intr-un an universitar). */
export interface StoredCurriculum {
  courses: Record<string, StoredCourse>
  /** Pachet optional -> plan_code-ul materiei alese, ex. { "7": "7.10" }. */
  options: Record<string, string>
}

export const EMPTY_CURRICULUM: StoredCurriculum = { courses: {}, options: {} }

const DEMO_GRADES = [9, 8, 10, 7, 9, 8, 10, 9]

/** Note de exemplu pentru modul „exemplu”: cate o nota la fiecare materie, admis la cele admis/respins. */
export function demoCurriculum(courses: Course[]): StoredCurriculum {
  const stored: Record<string, StoredCourse> = {}
  courses
    .filter((c) => c.regime !== 'DFA')
    .forEach((c, i) => {
      stored[c.planCode] =
        c.gradingType === 'PASS_FAIL'
          ? { mode: 'final', components: {}, passed: true }
          : { mode: 'final', components: {}, final: DEMO_GRADES[i % DEMO_GRADES.length] }
    })
  return { courses: stored, options: {} }
}

export function emptyCourse(): StoredCourse {
  return { mode: 'final', components: {} }
}

export function toEntry(course: Course, stored: StoredCourse | undefined): CourseEntry | undefined {
  if (!stored) return undefined
  if (course.gradingType === 'PASS_FAIL') {
    return stored.passed === undefined ? undefined : { mode: 'passFail', passed: stored.passed }
  }
  // MVP: doar nota finala. Calculul pe componente (grading.ts) revine cand adaugam fisele.
  return stored.final === undefined ? undefined : { mode: 'final', grade: stored.final }
}

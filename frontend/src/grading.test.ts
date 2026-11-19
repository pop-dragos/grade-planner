import { describe, expect, it } from 'vitest'
import type { Course } from './api'
import {
  countedCourses,
  courseResult,
  minGradeFor,
  neededAverage,
  roundHalfUp,
  summarize,
  truncate2,
} from './grading'

// ─────────────── Materii de test (copiate din catalog) ───────────────

function course(overrides: Partial<Course>): Course {
  return {
    planCode: '0.00',
    name: 'Materie',
    yearOfStudy: 1,
    semester: 1,
    credits: 5,
    evaluationForm: 'E',
    gradingType: 'NUMERIC',
    category: 'DF',
    regime: 'DOB',
    optionGroup: null,
    rulesStatus: 'NONE',
    syllabus: null,
    extraRequirements: [],
    components: [],
    conditions: [],
    ...overrides,
  }
}

const logicDesign = course({
  planCode: '4.00',
  name: 'Proiectare logică',
  rulesStatus: 'CLEAR',
  components: [
    { code: 'exam', kind: 'EXAM', label: 'Examen final', weight: 70, sourceText: null },
    { code: 'lab', kind: 'LAB', label: 'Laborator', weight: 30, sourceText: null },
  ],
  conditions: [
    { type: 'ADMISSION', component: 'lab', minGrade: 5, sourceText: null, note: null },
    { type: 'PROMOTION', component: 'exam', minGrade: 5, sourceText: null, note: null },
  ],
})

const analysis = course({
  planCode: '1.00',
  credits: 4,
  rulesStatus: 'CLEAR',
  components: [
    { code: 'theory', kind: 'EXAM', label: 'Curs', weight: 40, sourceText: null },
    { code: 'problems', kind: 'EXAM', label: 'Seminar', weight: 60, sourceText: null },
  ],
})

const sport = course({ planCode: '14.00', credits: 2, gradingType: 'PASS_FAIL', evaluationForm: 'V' })

// ─────────────── Rotunjiri ───────────────

describe('rotunjiri', () => {
  it('rotunjeste de la ,50 in sus', () => {
    expect(roundHalfUp(4.5)).toBe(5)
    expect(roundHalfUp(4.49)).toBe(4)
    expect(roundHalfUp(9.5)).toBe(10)
  })

  it('trunchiaza media la 2 zecimale', () => {
    expect(truncate2(8.679)).toBe(8.67)
    expect(truncate2(26 / 3)).toBe(8.66)
    expect(truncate2(7)).toBe(7)
  })
})

// ─────────────── Nota pe materie ───────────────

describe('courseResult', () => {
  it('calculeaza nota din componente si o rotunjeste', () => {
    const r = courseResult(logicDesign, { mode: 'components', grades: { exam: 6, lab: 8 } })
    expect(r.rawGrade).toBeCloseTo(6.6)
    expect(r.grade).toBe(7)
    expect(r.status).toBe('PASSED')
  })

  it('neadmis la examen cand laboratorul e sub 5', () => {
    const r = courseResult(logicDesign, { mode: 'components', grades: { exam: 10, lab: 4 } })
    expect(r.status).toBe('NOT_ADMITTED')
    expect(r.failedConditions[0].component).toBe('lab')
  })

  it('picat cand examenul e sub 5, chiar daca media trece de 5', () => {
    const r = courseResult(logicDesign, { mode: 'components', grades: { exam: 4, lab: 10 } })
    expect(r.grade).toBe(6) // 0.7*4 + 0.3*10 = 5.8
    expect(r.status).toBe('FAILED')
  })

  it('4.50 trece, 4.49 nu', () => {
    expect(courseResult(analysis, { mode: 'components', grades: { theory: 4.5, problems: 4.5 } }).status).toBe('PASSED')
    expect(courseResult(analysis, { mode: 'components', grades: { theory: 4.49, problems: 4.49 } }).status).toBe('FAILED')
  })

  it('incompleta cand lipseste o componenta', () => {
    expect(courseResult(logicDesign, { mode: 'components', grades: { lab: 8 } }).status).toBe('INCOMPLETE')
    expect(courseResult(logicDesign, undefined).status).toBe('INCOMPLETE')
  })

  it('nota finala introdusa direct', () => {
    expect(courseResult(logicDesign, { mode: 'final', grade: 7 })).toMatchObject({ status: 'PASSED', grade: 7 })
    expect(courseResult(logicDesign, { mode: 'final', grade: 4 }).status).toBe('FAILED')
  })

  it('admis/respins: admis valoreaza 10', () => {
    expect(courseResult(sport, { mode: 'passFail', passed: true })).toMatchObject({ status: 'PASSED', grade: 10 })
    expect(courseResult(sport, { mode: 'passFail', passed: false }).status).toBe('FAILED')
  })
})

// ─────────────── Ce imi trebuie la examen ───────────────

describe('minGradeFor', () => {
  it('cu lab 8, examenul trebuie sa fie macar 5 (conditia de promovare)', () => {
    // matematic ar ajunge 3: 0.7*3 + 0.3*8 = 4.5 -> 5; dar conditia cere examen >= 5
    expect(minGradeFor(logicDesign, { lab: 8 }, 'exam', 5)).toEqual({ kind: 'possible', grade: 5 })
  })

  it('nota necesara pentru 10', () => {
    // 0.7*x + 0.3*10 >= 9.5  =>  x >= 9.2857 -> 9.29
    expect(minGradeFor(logicDesign, { lab: 10 }, 'exam', 10)).toEqual({ kind: 'possible', grade: 9.29 })
  })

  it('imposibil cand ar trebui peste 10', () => {
    expect(minGradeFor(logicDesign, { lab: 6 }, 'exam', 10)).toEqual({ kind: 'impossible' })
  })

  it('neadmis daca laboratorul e deja sub 5', () => {
    expect(minGradeFor(logicDesign, { lab: 3 }, 'exam', 5).kind).toBe('notAdmitted')
  })

  it('cere notele celorlalte componente', () => {
    expect(minGradeFor(logicDesign, {}, 'exam', 5)).toEqual({ kind: 'missingOtherGrades' })
  })
})

// ─────────────── Media ───────────────

describe('countedCourses', () => {
  const english = course({ planCode: '7.10', credits: 2, regime: 'DOP', optionGroup: '7' })
  const french = course({ planCode: '7.20', credits: 2, regime: 'DOP', optionGroup: '7' })
  const optionalExtra = course({ planCode: '101.00', regime: 'DFA' })
  const all = [logicDesign, english, french, optionalExtra]

  it('exclude facultativele si numara un singur curs din pachetul optional', () => {
    expect(countedCourses(all, {}).map((c) => c.planCode)).toEqual(['4.00', '7.10'])
  })

  it('pastreaza din pachet doar materia aleasa', () => {
    expect(countedCourses(all, { '7': '7.20' }).map((c) => c.planCode)).toEqual(['4.00', '7.20'])
  })
})

describe('summarize', () => {
  const a = course({ planCode: 'A', credits: 5 })
  const b = course({ planCode: 'B', credits: 5 })
  const c = course({ planCode: 'C', credits: 5 })

  it('media ponderata cu creditele, trunchiata', () => {
    const s = summarize([a, b, c], {
      A: { mode: 'final', grade: 9 },
      B: { mode: 'final', grade: 9 },
      C: { mode: 'final', grade: 8 },
    })
    expect(s.average).toBe(8.66) // 26/3 = 8.666...
    expect(s.creditsEarned).toBe(15)
  })

  it('o materie picata intra in medie cu 0', () => {
    const s = summarize([a, b], { A: { mode: 'final', grade: 10 }, B: { mode: 'final', grade: 4 } })
    expect(s.average).toBe(5)
    expect(s.creditsEarned).toBe(5)
    expect(s.creditsGraded).toBe(10)
  })

  it('materiile necompletate nu intra in medie', () => {
    const s = summarize([a, b], { A: { mode: 'final', grade: 8 } })
    expect(s.average).toBe(8)
    expect(s.remaining.map((x) => x.planCode)).toEqual(['B'])
  })

  it('sport admis conteaza ca 10', () => {
    const s = summarize([a, sport], { A: { mode: 'final', grade: 8 }, '14.00': { mode: 'passFail', passed: true } })
    expect(s.average).toBe(8.57) // (8*5 + 10*2) / 7 = 8.571...
  })
})

describe('neededAverage', () => {
  const done = course({ planCode: 'D', credits: 20 })
  const left = course({ planCode: 'L', credits: 10 })

  it('media necesara la materiile ramase', () => {
    const s = summarize([done, left], { D: { mode: 'final', grade: 8 } })
    // (8.5*30 - 8*20) / 10 = 9.5
    expect(neededAverage(s, 8.5)).toEqual({ kind: 'possible', average: 9.5 })
  })

  it('minimul este 5 (sub 5 materia e picata)', () => {
    const s = summarize([done, left], { D: { mode: 'final', grade: 10 } })
    expect(neededAverage(s, 6)).toEqual({ kind: 'possible', average: 5 })
  })

  it('imposibil peste 10', () => {
    const s = summarize([done, left], { D: { mode: 'final', grade: 6 } })
    expect(neededAverage(s, 9)).toEqual({ kind: 'impossible' })
  })

  it('nimic de calculat cand totul e completat', () => {
    const s = summarize([done], { D: { mode: 'final', grade: 6 } })
    expect(neededAverage(s, 9)).toEqual({ kind: 'nothingRemaining' })
  })
})

// Logica de calcul a notelor. Functii pure: primesc date, intorc rezultate, fara React si fara retea.
// Totul ruleaza in browser: notele studentului nu ajung niciodata pe server.

import type { Course, GradingCondition } from './api'

// ─────────────── Ce introduce studentul pentru o materie ───────────────

export type CourseEntry =
  | { mode: 'final'; grade: number } // nota finala introdusa direct (1-10)
  | { mode: 'components'; grades: Record<string, number | undefined> } // pe componente: cod -> nota
  | { mode: 'passFail'; passed: boolean } // admis / respins

export type CourseStatus = 'PASSED' | 'FAILED' | 'NOT_ADMITTED' | 'INCOMPLETE'

export interface CourseResult {
  status: CourseStatus
  /** Media ponderata a componentelor, inainte de rotunjire (null daca nu se aplica). */
  rawGrade: number | null
  /** Nota obtinuta (rotunjita); pentru admis/respins: 10 / null. */
  grade: number | null
  /** Conditiile neindeplinite (pentru a explica de ce ai picat). */
  failedConditions: GradingCondition[]
}

// ─────────────── Rotunjiri ───────────────

// Toleranta pentru erorile de virgula mobila (ex. 4.5 calculat ca 4.4999999999).
const EPSILON = 1e-9

/** Rotunjire la intreg, de la ,50 in sus: 4.50 -> 5, 4.49 -> 4. */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + EPSILON)
}

/** Trunchiere la 2 zecimale: 8.679 -> 8.67. */
export function truncate2(x: number): number {
  return Math.floor(x * 100 + EPSILON) / 100
}

/** Rotunjire in sus la 2 zecimale (pentru „nota minima necesara”): 9.2857 -> 9.29. */
function ceil2(x: number): number {
  return Math.ceil(x * 100 - EPSILON) / 100
}

// ─────────────── Nota pe materie ───────────────

const PASSING_GRADE = 5

/** Calculeaza rezultatul unei materii din ce a introdus studentul. */
export function courseResult(course: Course, entry: CourseEntry | undefined): CourseResult {
  if (!entry) {
    return { status: 'INCOMPLETE', rawGrade: null, grade: null, failedConditions: [] }
  }
  switch (entry.mode) {
    case 'passFail':
      return {
        status: entry.passed ? 'PASSED' : 'FAILED',
        rawGrade: null,
        grade: entry.passed ? 10 : null,
        failedConditions: [],
      }
    case 'final':
      return {
        status: entry.grade >= PASSING_GRADE ? 'PASSED' : 'FAILED',
        rawGrade: null,
        grade: entry.grade,
        failedConditions: [],
      }
    case 'components':
      return fromComponents(course, entry.grades)
  }
}

function fromComponents(course: Course, grades: Record<string, number | undefined>): CourseResult {
  const missing = course.components.some((c) => grades[c.code] === undefined)
  if (course.components.length === 0 || missing) {
    return { status: 'INCOMPLETE', rawGrade: null, grade: null, failedConditions: [] }
  }

  // 1. Conditii de admitere (ex. Lab >= 5 ca sa intri in examen)
  const failedAdmission = course.conditions.filter(
    (c) => c.type === 'ADMISSION' && !conditionMet(c, grades, null),
  )
  if (failedAdmission.length > 0) {
    return { status: 'NOT_ADMITTED', rawGrade: null, grade: null, failedConditions: failedAdmission }
  }

  // 2. Media ponderata, rotunjita
  const raw = weightedSum(course, grades) / 100
  const grade = roundHalfUp(raw)

  // 3. Conditii de promovare (ex. Examen >= 5) + pragul general de 5
  const failedPromotion = course.conditions.filter(
    (c) => c.type === 'PROMOTION' && !conditionMet(c, grades, grade),
  )
  const passed = failedPromotion.length === 0 && grade >= PASSING_GRADE
  return { status: passed ? 'PASSED' : 'FAILED', rawGrade: raw, grade, failedConditions: failedPromotion }
}

/** Suma (pondere% * nota) a componentelor. Ponderile sunt procente (insumeaza 100). */
function weightedSum(course: Course, grades: Record<string, number | undefined>): number {
  return course.components.reduce((sum, c) => sum + c.weight * (grades[c.code] ?? 0), 0)
}

function conditionMet(c: GradingCondition, grades: Record<string, number | undefined>, finalGrade: number | null) {
  const value = c.component === null ? finalGrade : grades[c.component]
  return value !== null && value !== undefined && value + EPSILON >= c.minGrade
}

// ─────────────── „Ce imi trebuie” la o componenta ───────────────

export type NeededGrade =
  | { kind: 'possible'; grade: number } // nota minima necesara
  | { kind: 'impossible' } // ar trebui peste 10
  | { kind: 'notAdmitted'; failedConditions: GradingCondition[] } // o conditie de admitere e deja picata
  | { kind: 'missingOtherGrades' } // nu stim inca celelalte componente

/**
 * Nota minima la componenta `componentCode` (de obicei examenul) ca nota finala sa fie cel putin `target`
 * (5 = sa treci, 10 = sa iei 10), stiind notele celorlalte componente.
 */
export function minGradeFor(
  course: Course,
  grades: Record<string, number | undefined>,
  componentCode: string,
  target: number,
): NeededGrade {
  const component = course.components.find((c) => c.code === componentCode)
  if (!component) {
    throw new Error(`Materia ${course.planCode} nu are componenta ${componentCode}`)
  }
  const others = course.components.filter((c) => c.code !== componentCode)
  if (others.some((c) => grades[c.code] === undefined)) {
    return { kind: 'missingOtherGrades' }
  }

  // Conditiile de admitere pe celelalte componente trebuie deja indeplinite
  const failedAdmission = course.conditions.filter(
    (c) => c.type === 'ADMISSION' && c.component !== componentCode && !conditionMet(c, grades, null),
  )
  if (failedAdmission.length > 0) {
    return { kind: 'notAdmitted', failedConditions: failedAdmission }
  }

  // Nota finala rotunjita >= target  <=>  media bruta >= target - 0.5
  const finalTarget = Math.max(
    target,
    PASSING_GRADE,
    ...course.conditions.filter((c) => c.component === null).map((c) => c.minGrade),
  )
  const othersSum = others.reduce((sum, c) => sum + c.weight * (grades[c.code] as number), 0)
  let needed = ((finalTarget - 0.5) * 100 - othersSum) / component.weight

  // Conditiile puse direct pe aceasta componenta (ex. Examen >= 5)
  for (const c of course.conditions) {
    if (c.component === componentCode) {
      needed = Math.max(needed, c.minGrade)
    }
  }

  needed = Math.max(ceil2(needed), 1)
  return needed > 10 + EPSILON ? { kind: 'impossible' } : { kind: 'possible', grade: needed }
}

// ─────────────── Media pe semestru / an ───────────────

/**
 * Materiile care intra in medie si in cele 30 de credite:
 * fara facultative (DFA); dintr-un pachet optional, doar materia aleasa
 * (daca nu s-a ales inca, prima din pachet tine locul, ca sa numaram creditele o singura data).
 */
export function countedCourses(courses: Course[], chosenOptions: Record<string, string>): Course[] {
  const seenGroups = new Set<string>()
  return courses.filter((c) => {
    if (c.regime === 'DFA') return false
    if (c.optionGroup === null) return true
    const chosen = chosenOptions[c.optionGroup]
    if (chosen !== undefined) return c.planCode === chosen
    if (seenGroups.has(c.optionGroup)) return false
    seenGroups.add(c.optionGroup)
    return true
  })
}

export interface Summary {
  /** Media ponderata cu creditele, trunchiata la 2 zecimale; null daca nu e nicio materie completata. */
  average: number | null
  /** Suma (nota * credite); o materie picata contribuie cu 0. */
  points: number
  /** Credite ale materiilor completate (promovate sau picate). */
  creditsGraded: number
  creditsEarned: number
  creditsTotal: number
  /** Materiile inca necompletate. */
  remaining: Course[]
}

export function summarize(courses: Course[], entries: Record<string, CourseEntry | undefined>): Summary {
  let points = 0
  let creditsGraded = 0
  let creditsEarned = 0
  let creditsTotal = 0
  const remaining: Course[] = []

  for (const course of courses) {
    creditsTotal += course.credits
    const result = courseResult(course, entries[course.planCode])
    if (result.status === 'INCOMPLETE') {
      remaining.push(course)
      continue
    }
    creditsGraded += course.credits
    if (result.status === 'PASSED') {
      creditsEarned += course.credits
      points += (result.grade as number) * course.credits
    }
    // FAILED / NOT_ADMITTED: intra in medie cu 0 (creditele raman la numitor)
  }

  return {
    average: creditsGraded > 0 ? truncate2(points / creditsGraded) : null,
    points,
    creditsGraded,
    creditsEarned,
    creditsTotal,
    remaining,
  }
}

export type NeededAverage =
  | { kind: 'possible'; average: number } // media necesara la materiile cu nota ramase
  | { kind: 'impossible' }
  | { kind: 'nothingRemaining' }

/**
 * Ce medie iti trebuie la materiile ramase ca media finala sa fie cel putin `target`.
 * Materiile admis/respins ramase sunt presupuse promovate (contribuie cu 10).
 * Minimul e 5: sub 5 o materie e picata si intra in medie cu 0.
 */
export function neededAverage(summary: Summary, target: number): NeededAverage {
  const numeric = summary.remaining.filter((c) => c.gradingType === 'NUMERIC')
  const passFail = summary.remaining.filter((c) => c.gradingType === 'PASS_FAIL')
  const numericCredits = numeric.reduce((s, c) => s + c.credits, 0)
  const passFailPoints = passFail.reduce((s, c) => s + 10 * c.credits, 0)

  if (numericCredits === 0) {
    return { kind: 'nothingRemaining' }
  }

  // media trunchiata >= target  <=>  media bruta >= target
  const totalCredits = summary.creditsGraded + numericCredits + passFail.reduce((s, c) => s + c.credits, 0)
  const needed = (target * totalCredits - summary.points - passFailPoints) / numericCredits
  const rounded = Math.max(ceil2(needed), PASSING_GRADE)
  return rounded > 10 + EPSILON ? { kind: 'impossible' } : { kind: 'possible', average: rounded }
}

// ─────────────── Media anului ───────────────

export interface AnnualAverage {
  /** null daca nu e nicio nota in tot anul. */
  average: number | null
  /** true cat timp un semestru nu e complet: media se va mai schimba. */
  provisional: boolean
}

/**
 * Media anuala = media aritmetica a celor doua medii semestriale (fiecare deja trunchiata),
 * trunchiata la 2 zecimale. Cat timp un semestru e incomplet, afisam provizoriu media ponderata
 * a notelor introduse pana acum.
 */
export function annualAverage(first: Summary, second: Summary): AnnualAverage {
  const complete = (s: Summary) => s.creditsGraded > 0 && s.remaining.length === 0
  if (complete(first) && complete(second)) {
    return { average: truncate2(((first.average as number) + (second.average as number)) / 2), provisional: false }
  }
  const credits = first.creditsGraded + second.creditsGraded
  return {
    average: credits > 0 ? truncate2((first.points + second.points) / credits) : null,
    provisional: true,
  }
}

// ─────────────── Plan de marire ───────────────
//
// Reguli (regulamentul UTCN, cum le-a confirmat utilizatorul):
// - pe an se pot face cel mult 4 mariri (primele 2 gratuite, urmatoarele platite);
// - la marire ramane nota mai mare, deci o marire nu poate strica media;
// - restantele (trecerea unei materii picate) NU consuma din mariri.
//
// Spatiul de cautare e mic (≈20 de materii pe an, cel mult 4 mariri), asa ca verificam
// TOATE combinatiile de materii si o alegem pe cea mai buna dupa strategia ceruta.

export type Strategy = 'fewestExams' | 'smallestSteps'

export interface PlanOptions {
  /** Cate mariri mai are studentul in anul curent (0-4). */
  maxImprovements: number
  /** fewestExams = cat mai putine examene; smallestSteps = cresteri cat mai mici la fiecare materie. */
  strategy: Strategy
  /** Daca e setat, propune mariri doar la materiile din acest semestru. */
  semester?: number
  /** plan_code-urile materiilor la care studentul nu vrea sa mareasca. */
  excluded?: readonly string[]
}

/** O schimbare propusa: marire (consuma din cele 4) sau restanta (nu consuma). */
export interface GradeChange {
  course: Course
  from: number | null
  to: number
  retake: boolean
}

/**
 * O schimbare din plan, spusa pentru om: „+1 (8 -> 9) la oricare `count` dintre `options`”.
 * Materiile din `options` sunt echivalente (aceleasi credite, aceeasi nota acum), deci oricare merge la fel.
 */
export interface ChangeGroup {
  from: number | null
  to: number
  retake: boolean
  count: number
  options: Course[]
}

export type ImprovementPlan =
  | { kind: 'already'; average: number }
  /** changes = o varianta concreta; groups = aceeasi varianta, cu alternativele echivalente grupate. */
  | { kind: 'plan'; changes: GradeChange[]; groups: ChangeGroup[]; newAverage: number }
  /** bestAverage = cea mai buna medie posibila cu marirle ramase (null daca nu e nicio nota). */
  | { kind: 'impossible'; bestAverage: number | null }

interface Candidate {
  course: Course
  from: number | null
  /** Nota cu care materia conteaza acum in medie: nota daca e promovata, 0 daca e picata. */
  base: number
  /** Cea mai mica nota noua care conteaza: +1 la o marire, 5 la o restanta. */
  minGrade: number
  retake: boolean
}

interface Evaluated {
  grades: Map<Candidate, number>
  gained: number
  exams: number
  totalSteps: number
  maxStep: number
  /** Cea mai mare nota ceruta (un 10 e mai greu de luat decat un 9). */
  maxTarget: number
  sumTarget: number
}

/** „Pasul” unei schimbari: cu cat creste nota (o restanta de la 4 la 5 = 1 pas). */
function step(c: Candidate, grade: number): number {
  return grade - (c.retake ? c.minGrade - 1 : c.base)
}

export function planImprovements(
  courses: Course[],
  entries: Record<string, CourseEntry | undefined>,
  target: number,
  options: PlanOptions,
): ImprovementPlan {
  const summary = summarize(courses, entries)
  if (summary.creditsGraded === 0) {
    return { kind: 'impossible', bestAverage: null }
  }

  // Media trunchiata >= target  <=>  puncte >= target * credite
  const missing = target * summary.creditsGraded - summary.points
  if (missing <= EPSILON) {
    return { kind: 'already', average: summary.average as number }
  }

  const excluded = new Set(options.excluded ?? [])
  const improvable: Candidate[] = []
  const retakes: Candidate[] = []
  for (const course of courses) {
    if (excluded.has(course.planCode)) continue
    if (options.semester !== undefined && course.semester !== options.semester) continue
    const result = courseResult(course, entries[course.planCode])
    if (result.status === 'INCOMPLETE') continue
    if (course.gradingType === 'PASS_FAIL') {
      // Respins conteaza 0; refacerea (Admis) valoreaza 10 si e restanta, nu consuma din mariri.
      if (result.status !== 'PASSED') {
        retakes.push({ course, from: null, base: 0, minGrade: 10, retake: true })
      }
      continue
    }
    if (result.status === 'PASSED') {
      const grade = result.grade as number
      if (grade < 10) improvable.push({ course, from: grade, base: grade, minGrade: grade + 1, retake: false })
    } else {
      retakes.push({ course, from: result.grade, base: 0, minGrade: PASSING_GRADE, retake: true })
    }
  }

  const maxImprovements = Math.max(0, Math.floor(options.maxImprovements))
  let best: Evaluated | null = null

  for (const chosenImprovements of subsets(improvable, maxImprovements)) {
    for (const chosenRetakes of subsets(retakes, retakes.length)) {
      const chosen = [...chosenImprovements, ...chosenRetakes]
      if (chosen.length === 0) continue
      const evaluated = evaluate(chosen, missing, options.strategy)
      if (evaluated && (best === null || better(evaluated, best, options.strategy))) {
        best = evaluated
      }
    }
  }

  if (best === null) {
    // Cea mai buna medie posibila: cele mai valoroase mariri permise + toate restantele cu 10.
    const improvementGains = improvable
      .map((c) => (10 - c.base) * c.course.credits)
      .sort((a, b) => b - a)
      .slice(0, maxImprovements)
    const maxGain = [...improvementGains, ...retakes.map((c) => 10 * c.course.credits)].reduce((s, g) => s + g, 0)
    return { kind: 'impossible', bestAverage: truncate2((summary.points + maxGain) / summary.creditsGraded) }
  }

  const changes = [...best.grades.entries()]
    .map(([c, to]) => ({ course: c.course, from: c.from, to, retake: c.retake }))
    .sort((a, b) => Number(a.retake) - Number(b.retake) || b.course.credits - a.course.credits)

  return {
    kind: 'plan',
    changes,
    groups: groupEquivalent(best, [...improvable, ...retakes]),
    newAverage: truncate2((summary.points + best.gained) / summary.creditsGraded),
  }
}

/** Doua materii sunt echivalente pentru plan daca schimbarea uneia cu cealalta nu schimba nimic. */
function signature(c: Candidate): string {
  return [c.retake, c.course.gradingType, c.course.credits, c.base, c.from].join('|')
}

/**
 * Grupeaza schimbarile din plan cu alternativele lor echivalente: daca planul cere +1 la o materie de 4 credite
 * cu 8, iar studentul are trei astfel de materii, ii spunem „la oricare dintre cele trei”.
 */
function groupEquivalent(best: Evaluated, eligible: Candidate[]): ChangeGroup[] {
  const bySignature = new Map<string, [Candidate, number][]>()
  for (const [c, to] of best.grades) {
    const list = bySignature.get(signature(c)) ?? []
    list.push([c, to])
    bySignature.set(signature(c), list)
  }

  const groups: ChangeGroup[] = []
  for (const [sig, chosen] of bySignature) {
    const [first, to] = chosen[0]
    if (chosen.every(([, t]) => t === to)) {
      const options = eligible.filter((c) => signature(c) === sig).map((c) => c.course)
      groups.push({ from: first.from, to, retake: first.retake, count: chosen.length, options })
    } else {
      // Aceeasi materie „tip”, dar note tinta diferite: le listam separat, fara alternative.
      for (const [c, t] of chosen) {
        groups.push({ from: c.from, to: t, retake: c.retake, count: 1, options: [c.course] })
      }
    }
  }
  return groups.sort(
    (a, b) => Number(a.retake) - Number(b.retake) || b.options[0].credits - a.options[0].credits,
  )
}

/**
 * Pentru un set fix de materii alese: cea mai buna repartizare a notelor noi, sau null daca nici cu 10
 * la toate nu se strang punctele lipsa. Fiecare materie aleasa primeste macar nota minima (altfel n-ar fi aleasa).
 */
function evaluate(chosen: Candidate[], missing: number, strategy: Strategy): Evaluated | null {
  const gainAt = (c: Candidate, grade: number) => (grade - c.base) * c.course.credits
  const maxPossible = chosen.reduce((s, c) => s + gainAt(c, 10), 0)
  if (maxPossible < missing - EPSILON) return null

  // smallestSteps: cel mai mic „pas maxim” care ajunge; fewestExams: fara limita de pas.
  let stepCap = 10
  if (strategy === 'smallestSteps') {
    for (let cap = 1; cap <= 10; cap++) {
      const reachable = chosen.reduce((s, c) => s + gainAt(c, Math.min(10, c.minGrade + cap - 1)), 0)
      if (reachable >= missing - EPSILON) {
        stepCap = cap
        break
      }
    }
  }

  // Pornim de la nota minima la fiecare, apoi +1 pe rand unde sunt mai multe credite
  // (acolo +1 aduce cele mai multe puncte), fara sa depasim 10 sau pasul maxim.
  const grades = new Map<Candidate, number>(chosen.map((c) => [c, c.minGrade]))
  let gained = chosen.reduce((s, c) => s + gainAt(c, c.minGrade), 0)
  const byCredits = [...chosen].sort((a, b) => b.course.credits - a.course.credits)
  while (gained < missing - EPSILON) {
    const next = byCredits.find((c) => {
      const grade = grades.get(c) as number
      return grade < 10 && step(c, grade + 1) <= stepCap
    })
    if (!next) return null
    grades.set(next, (grades.get(next) as number) + 1)
    gained += next.course.credits
  }

  const steps = chosen.map((c) => step(c, grades.get(c) as number))
  const targets = chosen.map((c) => grades.get(c) as number)
  return {
    grades,
    gained,
    exams: chosen.length,
    totalSteps: steps.reduce((s, x) => s + x, 0),
    maxStep: Math.max(...steps),
    maxTarget: Math.max(...targets),
    sumTarget: targets.reduce((s, x) => s + x, 0),
  }
}

/**
 * a e mai bun decat b? Comparam pe rand criteriile strategiei; la egalitate preferam note tinta mai mici
 * (8 -> 9 e mai usor de obtinut decat 9 -> 10).
 */
function better(a: Evaluated, b: Evaluated, strategy: Strategy): boolean {
  const key = (e: Evaluated) =>
    strategy === 'fewestExams'
      ? [e.exams, e.totalSteps, e.maxStep, e.maxTarget, e.sumTarget]
      : [e.maxStep, e.exams, e.totalSteps, e.maxTarget, e.sumTarget]
  const [ka, kb] = [key(a), key(b)]
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] < kb[i]
  }
  return false
}

/** Toate submultimile lui items cu cel mult maxSize elemente (inclusiv cea vida). */
function* subsets<T>(items: T[], maxSize: number, start = 0, current: T[] = []): Generator<T[]> {
  yield current
  if (current.length === maxSize) return
  for (let i = start; i < items.length; i++) {
    yield* subsets(items, maxSize, i + 1, [...current, items[i]])
  }
}

// Tipurile oglindesc DTO-urile din backend (CatalogDtos.java).
// Daca schimbi forma JSON-ului in backend, schimbi si aici.

export type RulesStatus = 'CLEAR' | 'AMBIGUOUS' | 'NONE'
export type GradingType = 'NUMERIC' | 'PASS_FAIL'
export type Regime = 'DOB' | 'DOP' | 'DFA'
export type ComponentKind =
  | 'EXAM' | 'LAB' | 'SEMINAR' | 'PROJECT' | 'PARTIAL' | 'COLLOQUIUM' | 'CONTINUOUS' | 'OTHER'

export interface Program {
  code: string
  name: string
  language: string
  academicYears: string[]
}

export interface GradeComponent {
  code: string
  kind: ComponentKind
  label: string
  weight: number
  sourceText: string | null
}

export interface GradingCondition {
  type: 'ADMISSION' | 'PROMOTION'
  component: string | null // null = conditia se aplica notei finale
  minGrade: number
  sourceText: string | null
  note: string | null
}

export interface Course {
  planCode: string
  name: string
  yearOfStudy: number
  semester: number
  credits: number
  evaluationForm: 'E' | 'C' | 'V'
  gradingType: GradingType
  category: 'DF' | 'DD' | 'DID' | 'DS' | 'DC'
  regime: Regime
  optionGroup: string | null
  rulesStatus: RulesStatus
  syllabus: { url: string | null; academicYear: string | null; completedOn: string | null } | null
  extraRequirements: string[]
  components: GradeComponent[]
  conditions: GradingCondition[]
}

// Pe planul gratuit, backend-ul „adoarme” dupa inactivitate si porneste in pana la un minut.
// Intre timp, proxy-ul raspunde cu 502/503/504 sau conexiunea pica: reincercam, nu aratam eroare imediat.
const RETRYABLE_STATUS = new Set([502, 503, 504])
const SLOW_AFTER_MS = 3_000
const RETRY_EVERY_MS = 3_000
const GIVE_UP_AFTER_MS = 180_000 // pe planul gratuit, pornirea la rece poate dura 2-3 minute

/** onSlow e apelat o singura data, daca raspunsul intarzie (ca UI-ul sa poata explica asteptarea). */
async function getJson<T>(url: string, onSlow?: () => void): Promise<T> {
  const started = Date.now()
  let slowReported = false
  const reportSlow = () => {
    if (!slowReported) {
      slowReported = true
      onSlow?.()
    }
  }
  const slowTimer = setTimeout(reportSlow, SLOW_AFTER_MS)

  try {
    for (;;) {
      let response: Response | null = null
      try {
        response = await fetch(url)
      } catch {
        response = null // eroare de retea: o tratam ca pe un raspuns temporar
      }

      if (response && !RETRYABLE_STATUS.has(response.status)) {
        if (!response.ok) {
          throw new Error(`${url} a raspuns cu ${response.status}`)
        }
        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(`${url} nu a intors JSON (probabil API-ul nu e accesibil)`)
        }
        return (await response.json()) as T
      }

      if (Date.now() - started > GIVE_UP_AFTER_MS) {
        throw new Error(`${url} nu a raspuns nici dupa ${GIVE_UP_AFTER_MS / 1000}s`)
      }
      reportSlow()
      await new Promise((resolve) => setTimeout(resolve, RETRY_EVERY_MS))
    }
  } finally {
    clearTimeout(slowTimer)
  }
}

export function fetchPrograms(onSlow?: () => void): Promise<Program[]> {
  return getJson('/api/catalog/programs', onSlow)
}

export function fetchCourses(
  program: string,
  academicYear: string,
  year: number,
  semester: number,
  onSlow?: () => void,
): Promise<Course[]> {
  const params = new URLSearchParams({ program, academicYear, year: String(year), semester: String(semester) })
  return getJson(`/api/catalog/courses?${params}`, onSlow)
}

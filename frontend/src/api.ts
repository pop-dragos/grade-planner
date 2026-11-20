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
  category: 'DF' | 'DD' | 'DS' | 'DC'
  regime: Regime
  optionGroup: string | null
  rulesStatus: RulesStatus
  syllabus: { url: string | null; academicYear: string | null; completedOn: string | null } | null
  extraRequirements: string[]
  components: GradeComponent[]
  conditions: GradingCondition[]
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} a raspuns cu ${response.status}`)
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`${url} nu a intors JSON (probabil API-ul nu e accesibil)`)
  }
  return response.json() as Promise<T>
}

export function fetchPrograms(): Promise<Program[]> {
  return getJson('/api/catalog/programs')
}

export function fetchCourses(program: string, academicYear: string, year: number, semester: number): Promise<Course[]> {
  const params = new URLSearchParams({ program, academicYear, year: String(year), semester: String(semester) })
  return getJson(`/api/catalog/courses?${params}`)
}

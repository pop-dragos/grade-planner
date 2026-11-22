import { useEffect, useState } from 'react'
import { fetchCourses, fetchPrograms, type Course, type Program } from './api'
import { CatalogSelector, type Selection } from './components/CatalogSelector'
import { SemesterView } from './components/SemesterView'
import { useLocalStorage } from './useLocalStorage'

type Theme = 'light' | 'dark'

export default function App() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [savedSelection, setSelection] = useLocalStorage<Selection | null>('gp:selection', null)
  const [theme, setTheme] = useLocalStorage<Theme>('gp:theme', 'light')
  // Materiile anului de studiu selectat, pe semestre: { 1: [...], 2: [...] }
  const [yearCourses, setYearCourses] = useState<Record<number, Course[]> | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // true cat timp asteptam un server care tocmai porneste (planul gratuit „adoarme” backend-ul)
  const [waking, setWaking] = useState(false)
  // Creste la „Reîncearcă”: efectele de incarcare depind de el, deci ruleaza din nou.
  const [attempt, setAttempt] = useState(0)

  const onSlow = () => setWaking(true)

  const retry = () => {
    setLoadFailed(false)
    setAttempt((a) => a + 1)
  }

  // Utilizatorul vede un mesaj simplu; detaliul tehnic ramane in consola browserului (F12).
  const onLoadError = (e: Error) => {
    console.error('Eroare la incarcarea catalogului:', e)
    setWaking(false)
    setLoadFailed(true)
  }

  // Tema se aplica pe <html data-theme="...">; CSS-ul are culorile pentru fiecare.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    fetchPrograms(onSlow)
      .then((result) => {
        setWaking(false)
        setPrograms(result)
      })
      .catch(onLoadError)
  }, [attempt])

  // Pana alege studentul ceva, pornim de la primul program, cel mai recent an universitar, anul 1 sem 1
  const selection: Selection | null =
    savedSelection ??
    (programs.length > 0
      ? { program: programs[0].code, academicYear: programs[0].academicYears[0], year: 1, semester: 1 }
      : null)

  const program = selection?.program
  const academicYear = selection?.academicYear
  const year = selection?.year

  // Incarcam ambele semestre odata: pentru media anuala, iar schimbarea semestrului e instantanee.
  useEffect(() => {
    if (!program || !academicYear || !year) return
    let cancelled = false // ignora raspunsul daca intre timp s-a schimbat selectia
    Promise.all([
      fetchCourses(program, academicYear, year, 1, onSlow),
      fetchCourses(program, academicYear, year, 2, onSlow),
    ])
      .then(([first, second]) => {
        setWaking(false)
        if (!cancelled) setYearCourses({ 1: first, 2: second })
      })
      .catch(onLoadError)
    return () => {
      cancelled = true
    }
  }, [program, academicYear, year, attempt])

  const courses = selection && yearCourses ? (yearCourses[selection.semester] ?? []) : null

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>Calculator medii CTI</h1>
          <p className="subtitle">
            Alege anul și semestrul, introdu notele și vezi media, creditele și ce medie îți mai trebuie.
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={theme === 'light' ? 'Temă întunecată' : 'Temă luminoasă'}
          title={theme === 'light' ? 'Temă întunecată' : 'Temă luminoasă'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      {waking && !loadFailed && (
        <p className="notice" role="status">
          <span className="spinner" aria-hidden="true" />
          Serverul pornește, poate dura 2–3 minute…
        </p>
      )}

      {loadFailed && (
        <div className="error" role="alert">
          <span>Nu am putut încărca materiile. Serverul nu răspunde momentan.</span>
          <button type="button" className="retry-button" onClick={retry}>
            Reîncearcă
          </button>
        </div>
      )}

      {selection && programs.length > 0 && (
        <CatalogSelector programs={programs} value={selection} onChange={setSelection} />
      )}

      {selection && courses && courses.length === 0 && (
        <p className="empty">
          Nu avem încă materiile pentru anul {selection.year}, semestrul {selection.semester}.
        </p>
      )}

      {selection && yearCourses && courses && courses.length > 0 && (
        <SemesterView
          key={`${selection.program}:${selection.academicYear}`}
          storageKey={`gp:grades:${selection.program}:${selection.academicYear}`}
          courses={courses}
          yearCourses={[...(yearCourses[1] ?? []), ...(yearCourses[2] ?? [])]}
        />
      )}

      <footer className="app-footer">Notele sunt salvate doar în acest browser.</footer>
    </div>
  )
}

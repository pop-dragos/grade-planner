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
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // true cat timp asteptam un server care tocmai porneste (planul gratuit „adoarme” backend-ul)
  const [waking, setWaking] = useState(false)

  const onSlow = () => setWaking(true)

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
  }, [])

  // Pana alege studentul ceva, pornim de la primul program, cel mai recent an universitar, anul 1 sem 1
  const selection: Selection | null =
    savedSelection ??
    (programs.length > 0
      ? { program: programs[0].code, academicYear: programs[0].academicYears[0], year: 1, semester: 1 }
      : null)

  const program = selection?.program
  const academicYear = selection?.academicYear
  const year = selection?.year
  const semester = selection?.semester

  useEffect(() => {
    if (!program || !academicYear || !year || !semester) return
    let cancelled = false // ignora raspunsul daca intre timp s-a schimbat selectia
    fetchCourses(program, academicYear, year, semester, onSlow)
      .then((result) => {
        setWaking(false)
        if (!cancelled) setCourses(result)
      })
      .catch(onLoadError)
    return () => {
      cancelled = true
    }
  }, [program, academicYear, year, semester])

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>Calculator medii CTI</h1>
          <p className="subtitle">
            Alege anul și semestrul, introdu notele și vezi media, creditele și ce îți mai trebuie la examene.
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
          Serverul pornește, poate dura până la un minut…
        </p>
      )}

      {loadFailed && (
        <p className="error" role="alert">
          Nu am putut încărca materiile. Serverul nu răspunde momentan, încearcă din nou puțin mai târziu.
        </p>
      )}

      {selection && programs.length > 0 && (
        <CatalogSelector programs={programs} value={selection} onChange={setSelection} />
      )}

      {selection && courses && courses.length === 0 && (
        <p className="empty">
          Nu avem încă materiile pentru anul {selection.year}, semestrul {selection.semester}.
        </p>
      )}

      {selection && courses && courses.length > 0 && (
        <SemesterView
          key={`${selection.program}:${selection.academicYear}`}
          storageKey={`gp:grades:${selection.program}:${selection.academicYear}`}
          courses={courses}
        />
      )}

      <footer className="app-footer">Notele sunt salvate doar în acest browser.</footer>
    </div>
  )
}

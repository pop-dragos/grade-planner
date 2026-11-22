import { useEffect, useState } from 'react'
import { fetchCourses, fetchPrograms, type Course, type Program } from './api'
import { CatalogSelector, type Selection } from './components/CatalogSelector'
import { SemesterView } from './components/SemesterView'
import { Welcome } from './components/Welcome'
import { useLocalStorage } from './useLocalStorage'

type Theme = 'light' | 'dark'

const DEMO_PREFIX = 'gp:demo:grades:'

/** Tema implicita: cea a sistemului de operare, pana alege utilizatorul. */
function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Cine a mai folosit aplicatia (are selectie sau note salvate) nu mai vede pagina de bun venit. */
function hasExistingData(): boolean {
  try {
    if (localStorage.getItem('gp:selection') !== null) return true
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith('gp:grades:')) return true
    }
  } catch {
    // localStorage blocat: tratam ca pe un utilizator nou
  }
  return false
}

/** Sterge notele din modul exemplu, ca urmatorul exemplu sa porneasca de la zero. */
function clearDemoData() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(DEMO_PREFIX)) keys.push(key)
    }
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    // ignoram: exemplul ramane cum era
  }
}

const STEPS = [
  'Alege specializarea, anul și semestrul',
  'Introdu notele pe care le ai sau le estimezi',
  'Vezi media, creditele și planul de măriri',
]

export default function App() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [savedSelection, setSelection] = useLocalStorage<Selection | null>('gp:selection', null)
  const [theme, setTheme] = useLocalStorage<Theme>('gp:theme', systemTheme())
  const [welcomed, setWelcomed] = useLocalStorage('gp:welcomed', hasExistingData())
  const [guideHidden, setGuideHidden] = useLocalStorage('gp:guide-hidden', false)
  const [demo, setDemo] = useLocalStorage('gp:demo', false)
  // Pagina de bun venit: la prima vizita, sau din linkul „Despre”.
  const [showWelcome, setShowWelcome] = useState(!welcomed)
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

  const start = () => {
    setWelcomed(true)
    setShowWelcome(false)
  }

  const startDemo = () => {
    clearDemoData()
    setDemo(true)
    start()
  }

  const exitDemo = () => {
    clearDemoData()
    setDemo(false)
  }

  // Tema se aplica pe <html data-theme="...">; CSS-ul are culorile pentru fiecare.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Pornim incarcarea si pe pagina de bun venit: pana apasa „Incepe”, serverul s-a trezit deja.
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
  const themeButton = (
    <button
      type="button"
      className="icon-button"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label={theme === 'light' ? 'Temă întunecată' : 'Temă luminoasă'}
      title={theme === 'light' ? 'Temă întunecată' : 'Temă luminoasă'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )

  if (showWelcome) {
    return (
      <div className="page">
        <div className="topbar">{themeButton}</div>
        <Welcome onStart={start} onDemo={startDemo} />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <h1>Calculator medii CTI</h1>
          <p className="subtitle">
            Alege anul și semestrul, introdu notele și vezi ce medie ai, câte credite ai strâns și cum ajungi la media
            dorită.
          </p>
          <span className="privacy">🔒 Notele rămân doar în browserul tău</span>
        </div>
        <div className="hero-actions">
          {themeButton}
          <button type="button" className="text-button" onClick={() => setShowWelcome(true)}>
            Despre
          </button>
        </div>
      </header>

      {demo && (
        <div className="notice demo-banner" role="status">
          <span>Mod exemplu: notele de mai jos nu sunt ale tale.</span>
          <button type="button" className="text-button" onClick={exitDemo}>
            Ieși din exemplu
          </button>
        </div>
      )}

      {!guideHidden && (
        <section className="guide" aria-label="Cum funcționează">
          <ol className="steps">
            {STEPS.map((step, i) => (
              <li key={step}>
                <span className="step-n">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="guide-close"
            onClick={() => setGuideHidden(true)}
            aria-label="Ascunde ghidul"
            title="Ascunde ghidul"
          >
            ✕
          </button>
        </section>
      )}

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

      {!loadFailed && (programs.length === 0 || !yearCourses) && <Skeleton withSelector={programs.length === 0} />}

      {selection && courses && courses.length === 0 && (
        <p className="empty">
          Nu avem încă materiile pentru anul {selection.year}, semestrul {selection.semester}.
        </p>
      )}

      {selection && yearCourses && courses && courses.length > 0 && (
        <SemesterView
          key={`${selection.program}:${selection.academicYear}:${demo ? 'demo' : 'real'}`}
          storageKey={`${demo ? DEMO_PREFIX : 'gp:grades:'}${selection.program}:${selection.academicYear}`}
          demo={demo}
          courses={courses}
          yearCourses={[...(yearCourses[1] ?? []), ...(yearCourses[2] ?? [])]}
        />
      )}
    </div>
  )
}

/** Randuri gri animate cat timp se incarca catalogul (in loc de o pagina goala). */
function Skeleton({ withSelector }: { withSelector: boolean }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {withSelector && <div className="skeleton-block selector-skeleton" />}
      <div className="skeleton-block list-skeleton" />
    </div>
  )
}

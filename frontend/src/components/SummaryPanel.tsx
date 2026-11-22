import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Course } from '../api'
import { formatNumber, parseGrade } from '../format'
import {
  neededAverage,
  planImprovements,
  type AnnualAverage,
  type CourseEntry,
  type Strategy,
  type Summary,
} from '../grading'
import { useLocalStorage } from '../useLocalStorage'
import { Segmented } from './Segmented'

/** Materiile care intra in medie (semestru sau an), notele introduse si sumarul lor. */
export interface Scope {
  courses: Course[]
  entries: Record<string, CourseEntry | undefined>
  summary: Summary
}

interface Props {
  semester: Scope
  year: Scope
  /** Media anului afisata (media aritmetica a semestrelor). */
  annual: AnnualAverage
  onReset: () => void
}

const MAX_IMPROVEMENTS = 4
const FREE_IMPROVEMENTS = 2

/**
 * Pe ecran lat: coloana din dreapta, fixa la scroll.
 * Pe telefon: o bara de un rand jos, care se deschide la apasare si se ascunde cat timp tastezi o nota.
 */
export function SummaryPanel({ semester, year, annual, onReset }: Props) {
  const [targetText, setTargetText] = useState('')
  const [targetScope, setTargetScope] = useState<'semester' | 'year'>('year')
  const cardRef = useRef<HTMLElement>(null)
  const cardVisible = useIsVisible(cardRef)
  const typing = useTypingOutside('.summary')
  const target = parseGrade(targetText)
  const summary = semester.summary
  const progress = summary.creditsTotal > 0 ? (summary.creditsEarned / summary.creditsTotal) * 100 : 0
  const annualText = annual.average === null ? '—' : formatNumber(annual.average)

  return (
    <>
      {/* Doar pe telefon: bara mica de jos, cat timp cardul nu e pe ecran; un tap duce la card. */}
      <button
        type="button"
        className={`summary-mini${cardVisible || typing ? ' hidden' : ''}`}
        onClick={() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        aria-label="Mergi la medie și planul de măriri"
      >
        <span>
          Media <strong>{summary.average === null ? '—' : formatNumber(summary.average)}</strong>
        </span>
        <span>
          An <strong>{annualText}</strong>
        </span>
        <span>
          Credite <strong>{summary.creditsEarned}</strong>/{summary.creditsTotal}
        </span>
        <span className="summary-mini-arrow" aria-hidden="true">
          ↓
        </span>
      </button>

      <aside ref={cardRef} className="summary" aria-label="Sumar semestru">
        <div className="summary-body">
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Media semestrului</span>
              {summary.average === null ? (
                <span className="stat-empty">Introdu prima notă ca să vezi media</span>
              ) : (
                <span className="stat-value">{formatNumber(summary.average)}</span>
              )}
              {annual.average !== null && (
                <span className="stat-sub">
                  Media anului: <strong>{annualText}</strong>
                  {annual.provisional && ' (provizorie)'}
                </span>
              )}
            </div>
            <div className="stat">
              <span className="stat-label">Credite</span>
              <span className="stat-value">
                {summary.creditsEarned}
                <span className="stat-total">/{summary.creditsTotal}</span>
              </span>
              <div
                className="progress"
                role="progressbar"
                aria-label="Credite promovate"
                aria-valuemin={0}
                aria-valuemax={summary.creditsTotal}
                aria-valuenow={summary.creditsEarned}
              >
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="target">
            <label className="target-row">
              <span>Vreau media</span>
              <input
                className="grade-input"
                inputMode="decimal"
                placeholder="8,50"
                value={targetText}
                aria-invalid={target === null}
                onChange={(e) => setTargetText(e.target.value)}
              />
            </label>
            <Segmented
              label="Media pentru"
              options={[
                { value: 'year', label: 'An' },
                { value: 'semester', label: 'Semestru' },
              ]}
              value={targetScope}
              onChange={setTargetScope}
            />
          </div>

          {typeof target === 'number' && (
            <PlanAnswer
              key={targetScope}
              period={targetScope}
              scope={targetScope === 'year' ? year : semester}
              target={target}
            />
          )}

          <button type="button" className="text-button destructive" onClick={onReset}>
            Șterge notele semestrului
          </button>
        </div>
      </aside>
    </>
  )
}

/** true cat timp elementul e (macar putin) pe ecran. */
function useIsVisible(ref: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return visible
}

/**
 * true cat timp e selectat un camp (nota, dropdown) in afara elementului dat.
 * Pe telefon, atunci apare tastatura: ascundem bara de jos ca sa nu acopere campul.
 */
function useTypingOutside(selector: string): boolean {
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      setTyping(el.matches('input, select, textarea') && !el.closest(selector))
    }
    const onFocusOut = () => setTyping(false)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [selector])
  return typing
}

/**
 * „Ce medie iti trebuie la materiile ramase”, spus concret: din ce semestru, cate materii, cate credite,
 * si ce presupunem despre materiile admis/respins ramase (ca vor fi admise).
 */
function RemainingAnswer({ summary, target, period }: { summary: Summary; target: number; period: 'year' | 'semester' }) {
  const needed = neededAverage(summary, target)
  const numeric = summary.remaining.filter((c) => c.gradingType === 'NUMERIC')
  const passFail = summary.remaining.filter((c) => c.gradingType === 'PASS_FAIL')
  const semesters = [...new Set(numeric.map((c) => c.semester))]
  const where =
    period === 'semester'
      ? 'din acest semestru'
      : semesters.length === 1
        ? `din semestrul ${semesters[0]}`
        : 'din ambele semestre'
  // Calculul presupune Admis la materiile admis/respins ramase, deci il spunem ca parte din ce iti trebuie.
  const names = passFail.map((c) => c.name)
  const admitted =
    names.length === 0
      ? ''
      : names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} și ${names[names.length - 1]}`

  if (needed.kind === 'possible') {
    // Orientativ: o zecimala, rotunjita in sus (ca sa nu para ca iti trebuie mai putin decat e cazul).
    const approx = Math.ceil(needed.average * 10 - 1e-9) / 10
    return (
      <div className="answer">
        <p>
          Îți trebuie în medie cam <strong>{formatNumber(approx, 1)}</strong> la materiile {where} care n-au încă notă
          {admitted && (
            <>
              {' '}
              și <strong>Admis</strong> la {admitted}
            </>
          )}
          .
        </p>
        <p className="hint">Pune notele pe care le estimezi și vezi direct ce medie îți iese.</p>
      </div>
    )
  }
  return (
    <p className="answer">
      Media {formatNumber(target)} nu se mai poate atinge, nici cu 10 la materiile {where} care n-au încă notă.
    </p>
  )
}

/**
 * Raspunsul la „Vreau media X” pentru an sau pentru semestrul afisat:
 * - daca mai sunt materii fara nota: ce medie iti trebuie la ele;
 * - daca toate au nota (reala sau estimata): planul de mariri. Bugetul de mariri e acelasi (anual)
 *   in ambele cazuri; pe semestru se propun doar materiile semestrului.
 */
function PlanAnswer({ period, scope, target }: { period: 'year' | 'semester'; scope: Scope; target: number }) {
  const periodName = period === 'year' ? 'anului' : 'semestrului'
  const [improvementsLeft, setImprovementsLeft] = useLocalStorage('gp:improvements-left', MAX_IMPROVEMENTS)
  const [improveIn, setImproveIn] = useState<0 | 1 | 2>(0) // 0 = tot anul
  const [strategy, setStrategy] = useState<Strategy>('fewestExams')
  const [excluded, setExcluded] = useState<string[]>([])

  const { summary } = scope
  if (summary.creditsGraded === 0) {
    return <p className="hint">Introdu notele pe care le ai sau le estimezi.</p>
  }
  if (summary.remaining.some((c) => c.gradingType === 'NUMERIC')) {
    return (
      <>
        <RemainingAnswer summary={summary} target={target} period={period} />
        <p className="hint">Pentru un plan de măriri, completează (sau estimează) toate notele {periodName}.</p>
      </>
    )
  }

  const plan = planImprovements(scope.courses, scope.entries, target, {
    maxImprovements: improvementsLeft,
    strategy,
    // pe semestru, scope-ul contine deja doar materiile semestrului
    semester: period === 'year' && improveIn !== 0 ? improveIn : undefined,
    excluded,
  })

  if (plan.kind === 'already') {
    return (
      <p className="answer ok">
        Ai deja media {periodName} <strong>{formatNumber(plan.average)}</strong> ✓
      </p>
    )
  }

  // Primele mariri sunt automat cele gratuite; cate gratuite mai sunt din cele ramase:
  const freeLeft = Math.max(0, improvementsLeft - (MAX_IMPROVEMENTS - FREE_IMPROVEMENTS))
  // Eticheta fiecarui grup: „gratuită”, „plătită”, „2 gratuite”, „1 gratuită + 1 plătită”, „restanță”.
  const labels: string[] = []
  if (plan.kind === 'plan') {
    let free = freeLeft
    for (const g of plan.groups) {
      if (g.retake) {
        labels.push('restanță')
        continue
      }
      const usedFree = Math.min(free, g.count)
      free -= usedFree
      const paid = g.count - usedFree
      const part = (n: number, one: string, many: string) => (n === 1 && g.count === 1 ? one : `${n} ${n === 1 ? one : many}`)
      labels.push(
        [usedFree > 0 && part(usedFree, 'gratuită', 'gratuite'), paid > 0 && part(paid, 'plătită', 'plătite')]
          .filter(Boolean)
          .join(' + '),
      )
    }
  }

  return (
    <div className="planner">
      <div className="planner-controls">
        <div className="stepper" role="group" aria-label="Măriri rămase">
          <span>Măriri rămase</span>
          <button
            type="button"
            aria-label="Mai puține"
            disabled={improvementsLeft <= 0}
            onClick={() => setImprovementsLeft(improvementsLeft - 1)}
          >
            −
          </button>
          <strong>{improvementsLeft}</strong>
          <button
            type="button"
            aria-label="Mai multe"
            disabled={improvementsLeft >= MAX_IMPROVEMENTS}
            onClick={() => setImprovementsLeft(improvementsLeft + 1)}
          >
            +
          </button>
        </div>
        {period === 'year' && (
          <Segmented
            label="Măresc la"
            options={[
              { value: 0, label: 'Tot anul' },
              { value: 1, label: 'Sem. 1' },
              { value: 2, label: 'Sem. 2' },
            ]}
            value={improveIn}
            onChange={setImproveIn}
          />
        )}
        <Segmented
          label="Strategie"
          options={[
            { value: 'fewestExams', label: 'Puține examene' },
            { value: 'smallestSteps', label: 'Măriri mici' },
          ]}
          value={strategy}
          onChange={setStrategy}
        />
      </div>

      {plan.kind === 'impossible' ? (
        <p className="answer">
          Nu ajungi la {formatNumber(target)} cu {improvementsLeft === 1 ? 'o mărire' : `${improvementsLeft} măriri`}
          {excluded.length > 0 || improveIn !== 0 ? ' și cu alegerile de mai sus' : ''}.
          {plan.bestAverage !== null && (
            <>
              {' '}
              Maximul posibil e <strong>{formatNumber(plan.bestAverage)}</strong>.
            </>
          )}
        </p>
      ) : (
        <div className="answer">
          <ul className="plan">
            {plan.groups.map((group, i) => {
              const { from, to, retake, count, options } = group
              const passFail = options[0].gradingType === 'PASS_FAIL'
              const anyOf = options.length > count // exista alternative echivalente
              const exclude = (planCode: string) => setExcluded([...excluded, planCode])
              return (
                <li key={options.map((c) => c.planCode).join('-')}>
                  <span className={`plan-delta${retake ? ' retake' : ''}`}>
                    {passFail ? 'A' : from === null ? to : `+${to - from}`}
                  </span>
                  <span className="plan-name">
                    {anyOf ? (
                      <span>la oricare {count > 1 ? `${count} ` : ''}dintre:</span>
                    ) : (
                      options.length === 1 && options[0].name
                    )}
                    <span className="plan-kind">
                      {passFail ? (
                        <>
                          Respins → <strong>Admis</strong>
                        </>
                      ) : (
                        <>
                          {from ?? '–'} → <strong>{to}</strong>
                        </>
                      )}{' '}
                      · {labels[i]}
                    </span>
                    {(anyOf || options.length > 1) && (
                      <ul className="plan-options">
                        {options.map((c) => (
                          <li key={c.planCode}>
                            <span>{c.name}</span>
                            <ExcludeButton course={c} onExclude={exclude} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </span>
                  {!anyOf && options.length === 1 ? <ExcludeButton course={options[0]} onExclude={exclude} /> : <span />}
                </li>
              )
            })}
          </ul>
          <p className="hint">
            Media {periodName} devine {formatNumber(plan.newAverage)}. La mărire rămâne nota mai mare, deci nu ai ce
            pierde.
          </p>
        </div>
      )}

      {excluded.length > 0 && (
        <button type="button" className="text-button" onClick={() => setExcluded([])}>
          Ai exclus {excluded.length === 1 ? 'o materie' : `${excluded.length} materii`} · include-le din nou
        </button>
      )}
    </div>
  )
}

/** ✕ langa o materie din plan: „nu maresc aici” (planul se recalculeaza fara ea). */
function ExcludeButton({ course, onExclude }: { course: Course; onExclude: (planCode: string) => void }) {
  return (
    <button
      type="button"
      className="plan-exclude"
      aria-label={`Nu măresc la ${course.name}`}
      title="Nu măresc aici"
      onClick={() => onExclude(course.planCode)}
    >
      ✕
    </button>
  )
}

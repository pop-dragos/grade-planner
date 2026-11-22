import { useState } from 'react'
import type { Course } from '../api'
import { formatNumber, parseGrade } from '../format'
import { neededAverage, planImprovements, type CourseEntry, type Strategy, type Summary } from '../grading'
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
  onReset: () => void
}

const MAX_IMPROVEMENTS = 4
const FREE_IMPROVEMENTS = 2

/** Pe ecran lat: coloana din dreapta, fixa la scroll. Pe telefon: bara fixa in partea de jos. */
export function SummaryPanel({ semester, year, onReset }: Props) {
  const [targetText, setTargetText] = useState('')
  const [targetScope, setTargetScope] = useState<'semester' | 'year'>('year')
  const target = parseGrade(targetText)
  const summary = semester.summary
  const progress = summary.creditsTotal > 0 ? (summary.creditsEarned / summary.creditsTotal) * 100 : 0

  return (
    <aside className="summary" aria-label="Sumar semestru">
      <div className="summary-stats">
        <div className="stat">
          <span className="stat-label">Media semestrului</span>
          {summary.average === null ? (
            <span className="stat-empty">Introdu o notă</span>
          ) : (
            <span className="stat-value">{formatNumber(summary.average)}</span>
          )}
          {year.summary.average !== null && (
            <span className="stat-sub">
              Media anului: <strong>{formatNumber(year.summary.average)}</strong>
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
    </aside>
  )
}

function RemainingAnswer({ summary, target }: { summary: Summary; target: number }) {
  const needed = neededAverage(summary, target)
  if (needed.kind === 'possible') {
    return (
      <p className="answer">
        Îți trebuie media <strong>{formatNumber(needed.average)}</strong> la materiile rămase.
      </p>
    )
  }
  return <p className="answer">Media {formatNumber(target)} nu se mai poate atinge, nici cu 10 la materiile rămase.</p>
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
        <RemainingAnswer summary={summary} target={target} />
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

  // Presupunem ca primele mariri folosite au fost cele gratuite.
  const freeLeft = Math.max(0, improvementsLeft - (MAX_IMPROVEMENTS - FREE_IMPROVEMENTS))
  const labels = new Map<string, string>()
  if (plan.kind === 'plan') {
    plan.changes
      .filter((c) => !c.retake)
      .forEach((c, i) => labels.set(c.course.planCode, i < freeLeft ? 'gratuită' : 'plătită'))
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
            {plan.changes.map(({ course, from, to, retake }) => {
              const label = retake ? 'restanță' : labels.get(course.planCode)
              return (
                <li key={course.planCode}>
                  <span className={`plan-delta${retake ? ' retake' : ''}`}>
                    {from === null ? to : `+${to - from}`}
                  </span>
                  <span className="plan-name">
                    {course.name}
                    <span className="plan-kind">
                      {from ?? '–'} → <strong>{to}</strong> · {label}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="plan-exclude"
                    aria-label={`Nu măresc la ${course.name}`}
                    title="Nu măresc aici"
                    onClick={() => setExcluded([...excluded, course.planCode])}
                  >
                    ✕
                  </button>
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

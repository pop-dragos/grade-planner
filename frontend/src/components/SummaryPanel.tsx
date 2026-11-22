import { useState } from 'react'
import { formatNumber, parseGrade } from '../format'
import { neededAverage, type Summary } from '../grading'

interface Props {
  summary: Summary
  /** Media pe tot anul de studiu (ambele semestre); null daca nu e nicio nota in an. */
  yearAverage: number | null
  onReset: () => void
}

/** Pe ecran lat: coloana din dreapta, fixa la scroll. Pe telefon: bara fixa in partea de jos. */
export function SummaryPanel({ summary, yearAverage, onReset }: Props) {
  const [targetText, setTargetText] = useState('')
  const target = parseGrade(targetText)
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
          {yearAverage !== null && (
            <span className="stat-sub">
              Media anului: <strong>{formatNumber(yearAverage)}</strong>
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

      <label className="target">
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
      {typeof target === 'number' && <p className="hint">{describeTarget(summary, target)}</p>}

      <button type="button" className="text-button destructive" onClick={onReset}>
        Șterge notele semestrului
      </button>
    </aside>
  )
}

function describeTarget(summary: Summary, target: number): string {
  const result = neededAverage(summary, target)
  switch (result.kind) {
    case 'possible':
      return `Îți trebuie media ${formatNumber(result.average)} la materiile rămase.`
    case 'impossible':
      return `Media ${formatNumber(target)} nu mai poate fi atinsă în acest semestru.`
    case 'nothingRemaining':
      return 'Toate materiile sunt completate.'
  }
}

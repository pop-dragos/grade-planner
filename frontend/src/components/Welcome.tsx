interface Props {
  onStart: () => void
  onDemo: () => void
}

/** Pagina de la prima vizita (si din linkul „Despre”): ce face aplicatia si cum incepi. */
export function Welcome({ onStart, onDemo }: Props) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-inner">
        <p className="greeting">
          Salut! <span className="wave">👋</span>
        </p>
        <h1 id="welcome-title">Calculator medii CTI</h1>
        <p className="lead">
          Alege anul și semestrul, introdu notele și vezi ce medie ai, câte credite ai strâns și cum ajungi la media
          dorită.
        </p>
        <ul className="features">
          <li>📊 Media semestrului și a anului</li>
          <li>🎯 „Vreau media X”</li>
          <li>📈 Plan de măriri</li>
        </ul>
        <button type="button" className="cta" onClick={onStart}>
          Începe <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="example" onClick={onDemo}>
          sau vezi un exemplu completat
        </button>
        <span className="privacy-note">🔒 Notele rămân doar în browserul tău</span>
      </div>
    </section>
  )
}

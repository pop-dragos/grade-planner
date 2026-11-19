/** Numar in format romanesc, ex. 8.5 -> "8,50". */
export function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString('ro-RO', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Nota scrisa de student: gol -> undefined; in afara intervalului 1-10 -> null (invalida). */
export function parseGrade(text: string): number | undefined | null {
  if (text.trim() === '') return undefined
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) && n >= 1 && n <= 10 ? n : null
}

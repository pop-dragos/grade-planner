import { useEffect, useState } from 'react'
import { fetchCourses, type Course } from './api'

// Pas temporar (3a): doar verificam ca frontend-ul primeste date de la backend.
// Selectia de an/semestru si notele vin in pasul 3c.
export default function App() {
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses('CALC-RO', '2026-2027', 1, 1)
      .then(setCourses)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <main>
      <h1>Calculator medii CTI</h1>
      <p>Calculatoare (RO) · 2026-2027 · Anul 1, semestrul 1</p>

      {error && <p role="alert">Nu am putut incarca materiile: {error}</p>}

      <table>
        <thead>
          <tr>
            <th>Cod</th>
            <th>Materie</th>
            <th>Credite</th>
            <th>Reguli</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.planCode}>
              <td>{c.planCode}</td>
              <td>{c.name}</td>
              <td>{c.credits}</td>
              <td>{c.rulesStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

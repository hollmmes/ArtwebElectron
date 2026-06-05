const API_BASE = 'http://localhost:8000'

export async function searchBusinesses(query, location) {
  const response = await fetch(`${API_BASE}/api/maps/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, location }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Backend baglantisi kurulamadi')
  }

  return response.json()
}

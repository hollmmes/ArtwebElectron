import { API_BASE } from '../config.js'

export async function searchBusinessesStream(query, location, maxResults, { onResult, onProgress, onStatus, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/maps/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location, max_results: maxResults }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || 'Backend baglantisi kurulamadi')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'result') onResult?.(event)
          else if (event.type === 'progress') onProgress?.(event)
          else if (event.type === 'status') onStatus?.(event)
          else if (event.type === 'error') onError?.(new Error(event.message || 'Backend hatasi'))
          else if (event.type === 'done') onDone?.()
        } catch {
          // skip malformed events
        }
      }
    }
  } catch (err) {
    onError?.(err)
  }
}

export async function getSearchHistory() {
  const response = await fetch(`${API_BASE}/api/maps/history`)
  if (!response.ok) throw new Error('Gecmis yuklenemedi')
  return response.json()
}

export async function getSearchHistoryGrouped() {
  const response = await fetch(`${API_BASE}/api/maps/history/grouped`)
  if (!response.ok) throw new Error('Gecmis yuklenemedi')
  return response.json()
}

export async function getCategories() {
  const response = await fetch(`${API_BASE}/api/maps/categories`)
  if (!response.ok) throw new Error('Kategoriler yuklenemedi')
  return response.json()
}

export async function getBusinesses({ limit = 100, offset = 0, query = '', location = '', search = '' } = {}) {
  const params = new URLSearchParams({ limit, offset, query, location, search })
  const response = await fetch(`${API_BASE}/api/maps/businesses?${params}`)
  if (!response.ok) throw new Error('Isletmeler yuklenemedi')
  return response.json()
}

export async function backfillCoordinates() {
  const response = await fetch(`${API_BASE}/api/maps/backfill-coordinates`, { method: 'POST' })
  if (!response.ok) throw new Error('Onarım başarısız')
  return response.json()
}

export async function deleteBusiness(id) {
  const response = await fetch(`${API_BASE}/api/maps/businesses/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Silinemedi')
  return response.json()
}


export function getExportUrl(format, query = '', location = '') {
  const params = new URLSearchParams({ query, location })
  return `${API_BASE}/api/maps/export/${format}?${params}`
}

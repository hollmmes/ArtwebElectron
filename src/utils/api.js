const API_BASE = 'http://localhost:8000'

export async function searchBusinessesStream(query, location, maxResults, { onResult, onProgress, onStatus, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/maps/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location, max_results: maxResults }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || 'Backend bağlantısı kurulamadı')
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

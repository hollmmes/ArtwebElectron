// Kategori adından deterministik renk üretir — aynı kategori her zaman aynı renk
const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#d946ef', '#eab308', '#22c55e', '#0ea5e9',
  '#a855f7', '#f43f5e', '#65a30d', '#0891b2', '#7c3aed',
]

export function categoryColor(category) {
  const key = (category || 'Diğer').trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length]
}

// ─── Shared formatting helpers ─────────────────────────────────────────────
// Used by tests overview, session detail pages, and results page.

/** "1h 32m" or "45m 10s" */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** "Mar 25, 2026 · 7:42 PM" */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' · ' + d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase()
  } catch {
    return isoString
  }
}

/** "25 Mar 2026" */
export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return isoString
  }
}

/** "62.5%" */
export function formatScore(score: number): string {
  return `${score.toFixed(1)}%`
}

/** Average seconds per question formatted as "55s" or "2m 3s" */
export function formatAvgTime(totalSeconds: number, questions: number): string {
  if (questions === 0) return '—'
  const avg = Math.round(totalSeconds / questions)
  return formatDuration(avg)
}

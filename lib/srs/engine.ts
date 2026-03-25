import type { Note, SRSRating } from '@/types'

export interface SRSResult {
  interval_days: number
  ease_factor: number
  next_review_at: string
}

export function computeNextReview(note: Pick<Note, 'interval_days' | 'ease_factor'>, rating: SRSRating): SRSResult {
  let { interval_days, ease_factor } = note

  switch (rating) {
    case 'again':
      interval_days = 1
      ease_factor = Math.max(1.3, ease_factor - 0.20)
      break
    case 'hard':
      interval_days = Math.max(1, Math.round(interval_days * 1.2))
      ease_factor = Math.max(1.3, ease_factor - 0.15)
      break
    case 'good':
      interval_days = Math.max(1, Math.round(interval_days * ease_factor))
      break
    case 'easy':
      interval_days = Math.max(1, Math.round(interval_days * ease_factor * 1.3))
      ease_factor = ease_factor + 0.15
      break
  }

  const next = new Date()
  next.setDate(next.getDate() + interval_days)

  return {
    interval_days,
    ease_factor: parseFloat(ease_factor.toFixed(2)),
    next_review_at: next.toISOString(),
  }
}

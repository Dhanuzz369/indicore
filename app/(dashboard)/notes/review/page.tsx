'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { getDueNotes, updateNote } from '@/lib/appwrite/queries'
import { computeNextReview } from '@/lib/srs/engine'
import { FlipCard } from '@/components/notes/FlipCard'
import { RatingButtons } from '@/components/notes/RatingButtons'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { Note, SRSRating } from '@/types'

type RatingCount = { again: number; hard: number; good: number; easy: number }

export default function ReviewPage() {
  const router = useRouter()
  const [cards, setCards] = useState<Note[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [counts, setCounts] = useState<RatingCount>({ again: 0, hard: 0, good: 0, easy: 0 })

  useEffect(() => {
    getCurrentUser().then(async user => {
      if (!user) { router.push('/login'); return }
      try {
        const due = await getDueNotes(user.$id)
        setCards(due)
      } catch {
        toast.error('Failed to load review cards.')
      } finally {
        setLoading(false)
      }
    })
  }, [router])

  const handleRate = async (rating: SRSRating) => {
    if (saving) return
    setSaving(true)
    const card = cards[currentIndex]
    const { interval_days, ease_factor, next_review_at } = computeNextReview(card, rating)
    try {
      await updateNote(card.$id, {
        interval_days,
        ease_factor,
        next_review_at,
        review_count: card.review_count + 1,
      })
      setCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }))
      if (currentIndex + 1 >= cards.length) {
        setDone(true)
      } else {
        setCurrentIndex(i => i + 1)
        setFlipped(false)
      }
    } catch {
      toast.error('Failed to save rating.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
      </div>
    )
  }

  if (cards.length === 0 || done) {
    const total = counts.again + counts.hard + counts.good + counts.easy
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {cards.length === 0 ? 'All caught up!' : 'Session Complete!'}
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              {cards.length === 0 ? 'No cards due right now. Check back later.' : `You reviewed ${total} card${total !== 1 ? 's' : ''}.`}
            </p>
          </div>
          {total > 0 && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {(['again', 'hard', 'good', 'easy'] as SRSRating[]).map(r => (
                <div key={r} className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xl font-black text-gray-900">{counts[r]}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5 capitalize">{r}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => router.push('/notes')} className="bg-[#FF6B00] hover:bg-[#FF8C00] text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 transition-colors">
            Back to Notes
          </button>
        </div>
      </div>
    )
  }

  const card = cards[currentIndex]
  const progress = ((currentIndex) / cards.length) * 100

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/notes')} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Exit
          </button>
          <span className="text-sm font-black text-gray-500">{currentIndex + 1} / {cards.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#FF6B00] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Subject badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">{card.subject}</span>
          {card.topic && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{card.topic}</span>}
        </div>

        {/* Flip card */}
        <FlipCard front={card.front} back={card.back} onFlipped={() => setFlipped(true)} />

        {/* Rating buttons — only shown after flip */}
        {flipped ? (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">How well did you know this?</p>
            <RatingButtons onRate={handleRate} disabled={saving} />
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 font-medium">Tap the card to reveal the answer</p>
        )}
      </div>
    </div>
  )
}

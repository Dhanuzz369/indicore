'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/supabase/auth'
import { Star, Send, CheckCircle2 } from 'lucide-react'

const CATEGORIES = ['UI/UX', 'Content Quality', 'Bug Report', 'Feature Request', 'Other']

interface FeedbackCardProps {
  sessionId: string
  testMode?: string
  onDone?: () => void   // called after successful submit
  onSkip?: () => void   // called when user skips
}

export function FeedbackCard({ sessionId, testMode, onDone, onSkip }: FeedbackCardProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [category, setCategory] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) {
        setUserId(u.$id ?? u.id ?? '')
        setUserEmail(u.email ?? '')
      }
    }).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!text.trim()) { setError('Please enter your feedback.'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userEmail,
          sessionId,
          testMode,
          rating,
          category,
          feedback: text,
          timestamp: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Server error')
      setSubmitted(true)
      setTimeout(() => onDone?.(), 1500)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6 md:p-8 flex flex-col items-center text-center gap-3">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <h3 className="text-lg font-black text-emerald-800">Thank you for your feedback!</h3>
        <p className="text-sm text-emerald-600 font-medium">Your input helps us make Indicore better for every UPSC aspirant.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 md:p-8">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-1">Feedback</p>
        <h3 className="text-xl font-black text-gray-900 leading-tight">How was your experience?</h3>
        <p className="text-sm text-gray-400 font-medium mt-1">Help the team improve — takes 30 seconds</p>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-1.5 mb-5">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
            aria-label={`${i} star${i !== 1 ? 's' : ''}`}
          >
            <Star
              className="h-7 w-7 transition-colors"
              fill={i <= (hovered || rating) ? '#f59e0b' : 'none'}
              stroke={i <= (hovered || rating) ? '#f59e0b' : '#d1d5db'}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs font-semibold text-amber-600 ml-2">
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(prev => prev === c ? '' : c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              category === c
                ? 'bg-[#4A90E2] text-white border-[#4A90E2]'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#4A90E2] hover:text-[#4A90E2]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Text area */}
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); if (error) setError('') }}
        placeholder="Tell us what you think, what broke, or what would make Indicore better for you…"
        className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[#4A90E2] text-gray-700 placeholder-gray-300 transition-colors"
        rows={3}
      />

      {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}

      {/* Submit */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-400">Your feedback goes directly to the backend team.</p>
        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors ml-2"
            >
              Skip for now
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4A90E2] text-white text-sm font-black rounded-xl hover:bg-[#3a7fd4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? 'Sending…' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}

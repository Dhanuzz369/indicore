// components/modals/FullMockNudgeModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COOLDOWN_KEY = 'mock_nudge_dismissed_at'
const COOLDOWN_MS  = 24 * 60 * 60 * 1000  // 24 hours

function isCoolingDown(): boolean {
  try {
    const ts = localStorage.getItem(COOLDOWN_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < COOLDOWN_MS
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

interface Props {
  sessionScore: number          // 0–100 accuracy %
  sessionSubject: string        // e.g. "Polity"
}

export default function FullMockNudgeModal({ sessionScore, sessionSubject }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Skip if cooldown active
    if (isCoolingDown()) return

    // Check if user has ever completed a full-length mock
    const sb = createClient()
    let cancelled = false

    sb.from('test_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_type', 'INDICORE_MOCK')
      .then(({ count }) => {
        if (cancelled) return
        if ((count ?? 0) === 0) {
          // Fire after 1.5s delay so user can absorb their score first
          const timer = setTimeout(() => setOpen(true), 1500)
          return () => clearTimeout(timer)
        }
      })

    return () => { cancelled = true }
  }, [])

  function handleTryNow() {
    setOpen(false)
    router.push('/quiz?tab=mock&highlight=mock1')
  }

  function handleDismiss() {
    markDismissed()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header pill */}
        <div className="inline-flex items-center gap-1.5 bg-[#4A90E2]/10 text-[#4A90E2] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
          📊 Your Practice Insight
        </div>

        {/* Score line */}
        <p className="text-[#1A1C1C] font-black text-lg leading-snug">
          You scored <span className="text-[#4A90E2]">{sessionScore}%</span> in {sessionSubject}
        </p>

        {/* Message */}
        <p className="text-gray-500 text-sm leading-relaxed">
          Subject practice gives you limited insights. Simulate a real Prelims experience with our full-length mock test.
        </p>

        {/* Stat chips */}
        <div className="flex gap-2 flex-wrap">
          {['100 Questions', '2 Hours', '200 Marks'].map(chip => (
            <span key={chip} className="text-[11px] font-black bg-gray-100 text-gray-600 rounded-xl px-3 py-1.5">
              {chip}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleTryNow}
            className="w-full bg-[#4A90E2] hover:bg-[#3a7fd4] text-white font-black text-sm rounded-2xl py-3 transition-colors"
          >
            Try Mock 1 →
          </button>
          <button
            onClick={handleDismiss}
            className="w-full text-gray-400 hover:text-gray-600 text-sm font-medium py-2 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

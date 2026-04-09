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
  sessionId: string
  sessionScore: number          // 0–100 accuracy %
  sessionSubject: string        // e.g. "Polity"
}

export default function FullMockNudgeModal({ sessionId, sessionScore, sessionSubject }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Skip if cooldown active
    if (isCoolingDown()) return

    const sb = createClient()
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const schedule = () => {
      if (!cancelled) timer = setTimeout(() => setOpen(true), 1500)
    }

    ;(async () => {
      try {
        // getSession reads the local cookie — no network round-trip
        const { data: { session } } = await sb.auth.getSession()
        if (cancelled) return

        if (!session?.user?.id) return  // not logged in

        // Check 1: is this session actually a practice session (not a mock)?
        const { data: sessionRow } = await sb
          .from('test_sessions')
          .select('mode')
          .eq('id', sessionId)
          .eq('user_id', session.user.id)
          .single()

        if (cancelled) return
        // Only show after practice sessions, not full-length mocks or PYQs
        if (sessionRow && sessionRow.mode !== 'practice') return

        // Check 2: has the user ever completed a full-length mock?
        const { data: mockData, error: mockError } = await sb
          .from('test_sessions')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('exam_type', 'INDICORE_MOCK')
          .limit(1)

        if (cancelled) return
        // Fail-open: only suppress if we cleanly confirm mocks exist
        if (!mockError && mockData && mockData.length > 0) return

        schedule()
      } catch {
        // Any unexpected error → show the modal
        schedule()
      }
    })()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [sessionId])

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

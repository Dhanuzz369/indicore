'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getQuestions } from '@/lib/supabase/queries'
import { useQuizStore } from '@/store/quiz-store'
import type { Subject, Question } from '@/types'

interface WeakSubjectModalProps {
  subject: Subject | null
  accuracy: number
  onClose: () => void
}

function getPerfLabel(accuracy: number): { label: string; color: string } {
  if (accuracy >= 75) return { label: 'Strong',     color: 'text-emerald-600' }
  if (accuracy >= 55) return { label: 'Moderate',   color: 'text-amber-600' }
  if (accuracy >= 35) return { label: 'Needs Work', color: 'text-orange-500' }
  return                     { label: 'Critical',   color: 'text-red-600' }
}

export function WeakSubjectModal({ subject, accuracy, onClose }: WeakSubjectModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset error/loading state whenever the modal opens for a new subject
  useEffect(() => {
    if (subject) {
      setLoading(false)
      setError(null)
    }
  }, [subject])

  // Close on Escape key
  useEffect(() => {
    if (!subject) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [subject, onClose])

  const handleClose = () => {
    setLoading(false)
    setError(null)
    onClose()
  }

  if (!subject) return null

  const perf = getPerfLabel(accuracy)

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getQuestions({
        subjectId: subject.$id,
        examType: 'INDICORE_MOCK',
        limit: 10,
      })
      if (!result.documents?.length) {
        setError('No questions available for this subject yet')
        setLoading(false)
        return
      }
      const qs = result.documents as unknown as Question[]
      useQuizStore.getState().resetQuiz()
      useQuizStore.getState().setQuestions(qs)
      useQuizStore.getState().setTestMode(true)
      useQuizStore.getState().setPracticeTimerTotal(qs.length * 72)
      useQuizStore.getState().setPaperLabel(`${subject.Name} · Weak Area Focus · ${qs.length}Q`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      setError('Failed to load questions. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="weak-subject-modal-title"
      >
        {/* Header */}
        <div>
          <h2 id="weak-subject-modal-title" className="text-xl font-black text-gray-900">{subject.Name}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-sm font-bold ${perf.color}`}>{accuracy}%</span>
            <span className={`text-xs font-semibold ${perf.color}`}>— {perf.label}</span>
          </div>
        </div>

        {/* Motivational line */}
        <p className="text-sm text-gray-500 font-medium">
          10 focused questions to push your score up
        </p>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3 bg-[#4A90E2] text-white rounded-full font-black text-sm uppercase tracking-wider hover:bg-[#3a7fd4] hover:shadow-lg hover:shadow-[#4A90E2]/30 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Start Practising Now'
          )}
        </button>

        {/* Dismiss */}
        <button
          onClick={handleClose}
          className="text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors text-center"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

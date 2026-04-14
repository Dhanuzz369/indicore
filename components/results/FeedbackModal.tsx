'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { FeedbackCard } from './FeedbackCard'

interface FeedbackModalProps {
  sessionId: string
  testMode?: string
  onDone: () => void   // navigate after submit
  onSkip: () => void   // navigate without feedback
}

export function FeedbackModal({ sessionId, testMode, onDone, onSkip }: FeedbackModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSkip])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onSkip}
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <p id="feedback-modal-title" className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
            Quick Feedback
          </p>
          <button
            onClick={onSkip}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close feedback"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* FeedbackCard content (borderless inside modal) */}
        <div className="px-6 pb-6">
          <FeedbackCard
            sessionId={sessionId}
            testMode={testMode}
            onDone={onDone}
            onSkip={onSkip}
          />
        </div>
      </div>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTestSession, listAttemptsBySession, getQuestionsByIds } from '@/lib/appwrite/queries'
import type { TestSession, QuizAttempt, Question } from '@/types'
import { formatDuration, formatDateTime } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, CheckCircle, XCircle, MinusCircle, Clock,
  ChevronDown, Brain, Trophy
} from 'lucide-react'
import { toast } from 'sonner'

function confLabel(tag: string | null | undefined) {
  if (tag === 'sure') return '100% Sure'
  if (tag === 'fifty_fifty') return '50:50'
  if (tag === 'guess') return "It's a Guess"
  return null
}

function QuestionReviewCard({
  index,
  question,
  attempt,
}: {
  index: number
  question: Question
  attempt: QuizAttempt | undefined
}) {
  const [open, setOpen] = useState(false)
  const selected = attempt?.selected_option
  const correct = question.correct_option
  const isCorrect = selected === correct
  const isSkipped = !selected

  const statusColor = isSkipped
    ? 'border-gray-200 bg-gray-50'
    : isCorrect
    ? 'border-emerald-200 bg-emerald-50/40'
    : 'border-red-200 bg-red-50/40'

  const tagLabel = confLabel(attempt?.confidence_tag)

  return (
    <div className={`rounded-xl border transition-all ${statusColor}`}>
      <button
        className="w-full px-5 py-4 flex items-center gap-3 text-left"
        onClick={() => setOpen(!open)}
      >
        {/* Status icon */}
        <div className="shrink-0">
          {isSkipped
            ? <MinusCircle className="h-5 w-5 text-gray-400" />
            : isCorrect
            ? <CheckCircle className="h-5 w-5 text-emerald-600" />
            : <XCircle className="h-5 w-5 text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 line-clamp-2">{question.question_text}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[11px] text-gray-400">Q.{index + 1}</span>
            {selected && (
              <span className="text-[11px] text-gray-500">
                Your answer: <strong>{selected}</strong>
                {!isCorrect && <> · Correct: <strong className="text-emerald-700">{correct}</strong></>}
              </span>
            )}
            {attempt?.time_taken_seconds !== undefined && (
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(attempt.time_taken_seconds)}
              </span>
            )}
            {tagLabel && (
              <Badge variant="outline" className="text-[10px] py-0 h-4">
                {tagLabel}
              </Badge>
            )}
          </div>
        </div>

        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Options */}
          <div className="space-y-1.5">
            {(['A', 'B', 'C', 'D'] as const).map(key => {
              const optText = question[`option_${key.toLowerCase()}` as keyof Question] as string
              const isSelected = selected === key
              const isCorrectOpt = correct === key
              let cls = 'bg-white border border-gray-200 text-gray-700'
              if (isCorrectOpt) cls = 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold'
              if (isSelected && !isCorrectOpt) cls = 'bg-red-50 border border-red-300 text-red-700 font-semibold'
              return (
                <div key={key} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${cls}`}>
                  <span className="font-bold shrink-0">{key}.</span>
                  <span className="whitespace-pre-wrap">{optText}</span>
                </div>
              )
            })}
          </div>
          {/* Explanation */}
          {question.explanation && (
            <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Explanation</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionResultsPage() {
  const { sessionId } = useParams() as { sessionId: string }
  const router = useRouter()

  const [session, setSession] = useState<TestSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    const load = async () => {
      try {
        const [sess, attemptsResult] = await Promise.all([
          getTestSession(sessionId),
          listAttemptsBySession(sessionId),
        ])
        const attemptDocs = attemptsResult.documents as unknown as QuizAttempt[]
        const qIds = attemptDocs.map(a => a.question_id)
        const qResult = await getQuestionsByIds(qIds)
        setSession(sess)
        setAttempts(attemptDocs)
        setQuestions(qResult.documents as unknown as Question[])
      } catch (e) {
        console.error(e)
        toast.error('Failed to load this test session.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <div className="space-y-3">
          <p className="text-gray-500">Session not found.</p>
          <Button onClick={() => router.push('/tests')} variant="outline">Back to My Tests</Button>
        </div>
      </div>
    )
  }

  const attemptsMap = Object.fromEntries(attempts.map(a => [a.question_id, a]))
  const scoreLabel = session.score >= 60
    ? { text: 'Great Work! 🎯', cls: 'text-emerald-600' }
    : session.score >= 40
    ? { text: 'Good Effort! 📚', cls: 'text-amber-600' }
    : { text: 'Keep Practicing! 💪', cls: 'text-red-600' }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/tests')}
            className="gap-1.5 text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> My Tests
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{session.paper_label}</p>
            <p className="text-xs text-gray-400">{formatDateTime(session.submitted_at)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Score card */}
        <div className="bg-[#111] rounded-[2rem] p-8 text-white flex flex-col sm:flex-row items-center gap-8">
          <div className="w-24 h-24 rounded-full bg-[#FF6B00]/20 border-4 border-[#FF6B00]/50 flex items-center justify-center shrink-0">
            <span className="text-3xl font-black text-[#FF6B00]">{session.score.toFixed(0)}%</span>
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h2 className={`text-xl font-black ${scoreLabel.cls}`}>{scoreLabel.text}</h2>
            <p className="text-gray-400 text-sm font-medium">{session.paper_label}</p>
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm mt-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle className="h-4 w-4" /> {session.correct} Correct
              </span>
              <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                <XCircle className="h-4 w-4" /> {session.incorrect} Wrong
              </span>
              <span className="flex items-center gap-1.5 text-gray-500 font-semibold">
                <MinusCircle className="h-4 w-4" /> {session.skipped} Skipped
              </span>
              <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                <Clock className="h-4 w-4" /> {formatDuration(session.total_time_seconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Analytics CTA */}
        <div className="flex gap-3">
          <Button
            onClick={() => router.push(`/tests/${sessionId}/analytics`)}
            className="flex-1 bg-[#FF6B00] hover:bg-[#FF8C00] gap-2 font-semibold"
          >
            <Brain className="h-4 w-4" /> View Analytics
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/quiz')}
            className="gap-2 font-semibold"
          >
            <Trophy className="h-4 w-4" /> Retake
          </Button>
        </div>

        {/* Question review */}
        <div>
          <h2 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">
            Question Review
          </h2>
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <QuestionReviewCard
                key={q.$id}
                index={idx}
                question={q}
                attempt={attemptsMap[q.$id]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

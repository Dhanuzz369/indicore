'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getTestSession, getQuestionsByIds, listAttemptsBySession } from '@/lib/supabase/queries'
import { CheckCircle, XCircle, Lightbulb, BookOpen, ArrowLeft, ArrowRight, ChevronLeft, Flag, Loader2 } from 'lucide-react'
import type { Question } from '@/types'
import { reportIssue } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth'
import { toast } from 'sonner'

function confLabel(tag: string | null | undefined) {
  if (tag === 'sure') return '100% Sure ✅'
  if (tag === 'fifty_fifty') return '50:50 🟣'
  if (tag === 'guess') return "It's a Guess 🎲"
  return null
}

function confBadgeClass(tag: string | null | undefined) {
  if (tag === 'sure') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (tag === 'fifty_fifty') return 'bg-purple-100 text-purple-700 border border-purple-200'
  if (tag === 'guess') return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  return ''
}

interface ReplayData {
  questions: Question[]
  answers: Record<string, any>
  confidenceMap: Record<string, string>
}

function ReviewContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const qParam = searchParams.get('q')
  const currentIndex = qParam !== null ? parseInt(qParam, 10) : 0

  const [data, setData] = useState<ReplayData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const session = await getTestSession(sessionId)
        if (cancelled || !session) return

        // Try snapshot first
        if (session.snapshot) {
          try {
            const snap = typeof session.snapshot === 'string' ? JSON.parse(session.snapshot) : session.snapshot
            if (snap.questions?.length > 0 && !cancelled) {
              setData({
                questions: snap.questions,
                answers: snap.answers ?? {},
                confidenceMap: snap.confidenceMap ?? {},
              })
              setLoading(false)
              return
            }
          } catch { /* fall through */ }
        }

        // Fallback: reconstruct from DB
        const qIds: string[] = session.question_ids ? JSON.parse(session.question_ids) : []
        if (qIds.length === 0) {
          if (!cancelled) { setData({ questions: [], answers: {}, confidenceMap: {} }); setLoading(false) }
          return
        }

        const [attResult, qResult] = await Promise.all([
          listAttemptsBySession(sessionId),
          getQuestionsByIds(qIds),
        ])
        if (cancelled) return

        const orderedQs = qIds
          .map((id: string) => (qResult.documents as unknown as Question[]).find(q => q.$id === id))
          .filter(Boolean) as Question[]

        const reconstructedAnswers: Record<string, any> = {}
        const reconstructedConfMap: Record<string, string> = {}
        attResult.documents.forEach((att: any) => {
          reconstructedAnswers[att.question_id] = {
            selectedOption: att.selected_option,
            isCorrect: att.is_correct,
            timeTaken: att.time_taken_seconds,
            confidenceTag: att.confidence_tag,
            used5050: !!att.used_5050,
            isGuess: !!(att.is_guess || att.used_guess),
          }
          if (att.confidence_tag) reconstructedConfMap[att.question_id] = att.confidence_tag
        })

        if (!cancelled) {
          setData({ questions: orderedQs, answers: reconstructedAnswers, confidenceMap: reconstructedConfMap })
          setLoading(false)
        }
      } catch (e) {
        console.error('Review load failed:', e)
        if (!cancelled) { toast.error('Failed to load this session.'); setLoading(false) }
      }
    }

    load()
    return () => { cancelled = true }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 bg-gray-50">
        <Loader2 className="h-10 w-10 text-[#FF6B00] animate-spin mb-4" />
        <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Loading Review...</p>
      </div>
    )
  }

  if (!data || data.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-6 bg-gray-50">
        <div className="text-center space-y-4 max-w-xs">
          <h2 className="text-xl font-bold text-gray-900">No Question Data</h2>
          <p className="text-gray-500 text-sm">This is a legacy session without saved question data.</p>
          <button
            onClick={() => router.push(`/results?session=${sessionId}&replay=true`)}
            className="bg-[#FF6B00] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-[#FF8C00] transition-all"
          >
            Back to Analytics
          </button>
        </div>
      </div>
    )
  }

  const { questions, answers, confidenceMap } = data
  const safeIndex = Math.max(0, Math.min(currentIndex, questions.length - 1))
  const question = questions[safeIndex]
  const answer = answers[question.$id]
  const confTag = confidenceMap[question.$id] || answer?.confidenceTag

  const goTo = (idx: number) => router.push(`/tests/${sessionId}/review?q=${idx}`)
  const backToAnalytics = () => router.push(`/results?session=${sessionId}&replay=true`)

  const handleReportIssue = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return
      const promise = reportIssue({ user_id: user.$id, question_id: question.$id, mode: 'review' })
      toast.promise(promise, { loading: 'Reporting...', success: 'Issue logged!', error: 'Failed to report' })
    } catch (e) { console.error(e) }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4">
          <button
            onClick={backToAnalytics}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors text-sm font-semibold"
          >
            <ChevronLeft className="h-4 w-4" /> Analytics
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-black text-gray-700">
              Question {safeIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(safeIndex - 1)}
              disabled={safeIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goTo(safeIndex + 1)}
              disabled={safeIndex === questions.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Left: Question + answer review */}
        <div className="space-y-6">
          {/* Status banner */}
          <div className={`rounded-3xl p-6 flex items-center gap-4 ${
            !answer ? 'bg-gray-100 border border-gray-200'
            : answer.isCorrect ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-red-50 border border-red-200'
          }`}>
            {!answer ? (
              <span className="font-bold text-gray-500 text-sm">⊖ Not Answered</span>
            ) : answer.isCorrect ? (
              <><CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /><span className="font-bold text-emerald-700 text-sm">Correct Answer</span></>
            ) : (
              <><XCircle className="h-5 w-5 text-red-600 shrink-0" /><span className="font-bold text-red-700 text-sm">Incorrect Answer</span></>
            )}
            {confTag && (
              <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${confBadgeClass(confTag)}`}>
                {confLabel(confTag)}
              </span>
            )}
          </div>

          {/* Question number + difficulty */}
          <div className="flex items-center gap-3">
            <span className="bg-[#FF6B00] text-white px-4 py-1.5 rounded-xl font-black text-sm shadow-sm shadow-orange-200">Q.{safeIndex + 1}</span>
            {question.difficulty && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600'
                : question.difficulty === 'hard' ? 'bg-red-50 text-red-600'
                : 'bg-yellow-50 text-yellow-600'
              }`}>{question.difficulty}</span>
            )}
            <button
              onClick={handleReportIssue}
              className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm"
            >
              <Flag className="h-3 w-3" /> Report
            </button>
          </div>

          {/* Question text */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-sm">
            <p className="text-base md:text-lg leading-relaxed font-medium text-gray-900 whitespace-pre-wrap">{question.question_text}</p>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {(['A', 'B', 'C', 'D'] as const).map(key => {
              const optionText = question[`option_${key.toLowerCase()}` as keyof Question] as string
              const isSelected = answer?.selectedOption === key
              const isCorrectOpt = question.correct_option === key
              let cls = 'bg-white border-gray-200 text-gray-700'
              let icon = null
              if (isCorrectOpt && isSelected) { cls = 'bg-emerald-50 border-emerald-400 text-emerald-900'; icon = <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" /> }
              else if (isCorrectOpt && !isSelected) { cls = 'bg-emerald-50 border-emerald-300 text-emerald-900'; icon = <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 opacity-70" /> }
              else if (isSelected && !isCorrectOpt) { cls = 'bg-red-50 border-red-400 text-red-900'; icon = <XCircle className="h-5 w-5 text-red-600 shrink-0" /> }
              return (
                <div key={key} className={`flex items-start gap-3 p-4 rounded-xl border-2 text-sm transition-all ${cls}`}>
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{key}</span>
                  <span className="flex-1 leading-relaxed whitespace-pre-wrap">{optionText}</span>
                  {icon}
                </div>
              )
            })}
          </div>

          {/* Explanation */}
          {question.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Explanation</p>
              </div>
              <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
            </div>
          )}

          {/* Subtopic */}
          {(question.subtopic || (question.tags && question.tags[0])) && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-orange-600 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Sub-Topic</p>
                <p className="text-sm font-semibold text-orange-900 mt-0.5">{question.subtopic || question.tags[0]}</p>
              </div>
            </div>
          )}

          {/* Stats row */}
          {answer && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {answer.timeTaken !== undefined && (
                <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 font-medium">Time Taken</p>
                  <p className="text-lg font-black text-gray-900 mt-1">{answer.timeTaken > 60 ? `${Math.floor(answer.timeTaken / 60)}m ${answer.timeTaken % 60}s` : `${answer.timeTaken || 0}s`}</p>
                </div>
              )}
              {confTag && (
                <div className={`rounded-xl p-3 border text-center ${confBadgeClass(confTag)}`}>
                  <p className="text-xs font-medium opacity-70">Confidence</p>
                  <p className="text-sm font-black mt-1 capitalize">{confLabel(confTag)}</p>
                </div>
              )}
              <div className={`rounded-xl p-3 border text-center ${answer.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p className="text-xs font-medium opacity-70">Result</p>
                <p className="text-sm font-black mt-1">{answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}</p>
              </div>
            </div>
          )}

          {/* Bottom nav */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => goTo(safeIndex - 1)} disabled={safeIndex === 0} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
            <button onClick={backToAnalytics} className="flex-1 flex items-center justify-center py-3 rounded-xl bg-[#FF6B00] text-white font-bold text-sm hover:bg-[#FF8C00] transition-colors">
              Back to Analytics
            </button>
            <button onClick={() => goTo(safeIndex + 1)} disabled={safeIndex === questions.length - 1} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: Question Palette */}
        <div className="hidden lg:block">
          <div className="sticky top-20 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-h-[calc(100vh-100px)] overflow-y-auto">
            <h3 className="font-black text-gray-800 text-sm mb-4 uppercase">Question Palette</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.$id]
                const isCorrect = ans?.isCorrect
                const isSkipped = !ans
                const isCurrent = idx === safeIndex
                let colorCls = 'bg-gray-50 text-gray-400 border-gray-200'
                if (isCorrect) colorCls = 'bg-emerald-500 text-white border-emerald-500'
                else if (!isSkipped) colorCls = 'bg-red-500 text-white border-red-500'
                return (
                  <button key={q.$id} onClick={() => goTo(idx)} className={`h-9 w-9 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 ${colorCls} ${isCurrent ? 'ring-2 ring-offset-1 ring-[#FF6B00] scale-110' : ''}`}>
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-[11px] text-gray-500">
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-emerald-500" />Correct</div>
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-red-500" />Incorrect</div>
              <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />Not Answered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Question Palette */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {questions.map((q, idx) => {
            const ans = answers[q.$id]
            const isCorrect = ans?.isCorrect
            const isSkipped = !ans
            const isCurrent = idx === safeIndex
            let colorCls = 'bg-gray-100 text-gray-400'
            if (isCorrect) colorCls = 'bg-emerald-500 text-white'
            else if (!isSkipped) colorCls = 'bg-red-500 text-white'
            return (
              <button key={q.$id} onClick={() => goTo(idx)} className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-xl font-black text-xs transition-all ${colorCls} ${isCurrent ? 'ring-2 ring-offset-1 ring-[#FF6B00] scale-110' : ''}`}>
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function TestReviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#FF6B00]" /></div>}>
      <ReviewContent />
    </Suspense>
  )
}

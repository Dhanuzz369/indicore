'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy, Target, BookOpen, Clock, RefreshCw, Home } from 'lucide-react'
import type { Question } from '@/types'

// ─── Score helpers ───────────────────────────────────────────
function getScoreThreshold(pct: number) {
  if (pct >= 80) return { label: 'Outstanding! 🏆', color: 'from-emerald-500 to-emerald-600', ring: 'text-emerald-400' }
  if (pct >= 60) return { label: 'Great Work! 🎯', color: 'from-blue-500 to-blue-600', ring: 'text-blue-400' }
  if (pct >= 40) return { label: 'Good Effort! 📚', color: 'from-amber-500 to-amber-600', ring: 'text-amber-400' }
  if (pct >= 20) return { label: 'Keep Practising! 💪', color: 'from-orange-500 to-orange-600', ring: 'text-orange-400' }
  return { label: 'Needs More Work! 🔥', color: 'from-red-500 to-red-600', ring: 'text-red-400' }
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export default function ResultsPage() {
  const router = useRouter()
  const { questions, answers, getScore, reset, paperLabel, elapsedSeconds } = useQuizStore()
  const score = getScore()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // ─── No data state ───────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <BookOpen className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No Quiz Data</h2>
          <p className="text-gray-500 text-sm">Start a practice session to see your results here.</p>
          <button
            onClick={() => router.push('/quiz')}
            className="bg-[#FF6B00] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#FF8C00] transition-colors"
          >
            Start Practice →
          </button>
        </div>
      </div>
    )
  }

  const threshold = getScoreThreshold(score.percentage)
  const skipped = questions.length - score.total

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">

      {/* ── Hero Score Card ── */}
      <div className={`bg-gradient-to-br ${threshold.color} text-white`}>
        <div className="max-w-2xl mx-auto px-5 pt-8 pb-10">

          {/* Paper label */}
          {paperLabel && (
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-4 text-center">{paperLabel}</p>
          )}

          {/* Score ring */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="white"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - score.percentage / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{score.percentage}%</span>
                <span className="text-white/70 text-[10px] font-medium">accuracy</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold mt-1">{threshold.label}</h1>
            <p className="text-white/80 text-sm">{score.correct} correct out of {questions.length} questions</p>

            {elapsedSeconds > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full text-sm mt-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-5">

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-black text-gray-900">{score.correct}</p>
            <p className="text-[11px] text-gray-400 font-medium">Correct</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xl font-black text-gray-900">{score.wrong}</p>
            <p className="text-[11px] text-gray-400 font-medium">Wrong</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-2">
              <Target className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xl font-black text-gray-900">{skipped}</p>
            <p className="text-[11px] text-gray-400 font-medium">Skipped</p>
          </div>
        </div>

        {/* ── Performance Insight ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Performance Breakdown</h3>
          <div className="space-y-2.5">
            {/* Accuracy bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Score</span>
                <span className="font-semibold text-gray-700">{score.correct}/{questions.length}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${threshold.color} transition-all duration-700`}
                  style={{ width: `${score.percentage}%` }}
                />
              </div>
            </div>
            {/* Negative marking estimate (UPSC style: -0.66 per wrong) */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 text-xs">
              <div>
                <p className="text-gray-500">UPSC Marks estimate</p>
                <p className="text-gray-400 text-[10px]">+2 correct / −0.66 wrong</p>
              </div>
              <div className="text-right">
                <p className="font-black text-base text-gray-900">
                  {(score.correct * 2 - score.wrong * 0.66).toFixed(2)}
                </p>
                <p className="text-gray-400 text-[10px]">out of {questions.length * 2}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Question Review ── */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Question Review</h2>
          <div className="space-y-2">
            {questions.map((question, index) => {
              const answer = answers[question.$id]
              const isCorrect = answer?.isCorrect ?? false
              const isSkipped = !answer
              const isExpanded = expandedIndex === index

              return (
                <div
                  key={question.$id}
                  className={`bg-white rounded-2xl border-l-4 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${isSkipped ? 'border-l-gray-300' : isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                    }`}
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                >
                  {/* Collapsed */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg ${isSkipped ? 'bg-gray-100 text-gray-400' : isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                        Q{index + 1}
                      </span>
                      <p className="text-sm text-gray-700 font-medium truncate">
                        {question.question_text.slice(0, 80)}{question.question_text.length > 80 ? '…' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSkipped ? (
                        <span className="text-[10px] text-gray-400 font-medium">Skipped</span>
                      ) : isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-50 space-y-3">
                      <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap pt-3">
                        {question.question_text}
                      </p>
                      <div className="space-y-1.5">
                        {(['A', 'B', 'C', 'D'] as const).map(key => {
                          const optionText = question[`option_${key.toLowerCase()}` as keyof Question] as string
                          const isSelected = answer?.selectedOption === key
                          const isCorrectOpt = question.correct_option === key
                          return (
                            <div
                              key={key}
                              className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${isCorrectOpt
                                  ? 'bg-green-50 border-green-300 text-green-800'
                                  : isSelected && !isCorrectOpt
                                    ? 'bg-red-50 border-red-300 text-red-800'
                                    : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                            >
                              <span className="font-bold shrink-0">{key}.</span>
                              <span className="flex-1 whitespace-pre-wrap">{optionText}</span>
                              {isCorrectOpt && <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                              {isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                            </div>
                          )
                        })}
                      </div>
                      {question.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">Explanation</p>
                          <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { reset(); router.push('/quiz') }}
            className="flex-1 bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Practice Again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" /> Home
          </button>
        </div>

      </div>
    </div>
  )
}

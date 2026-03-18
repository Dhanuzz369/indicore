'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ChevronDown, Trophy, BookOpen, Clock, RefreshCw, Home } from 'lucide-react'
import type { Question } from '@/types'
import { generateTestAnalytics } from '@/lib/analytics/engine'

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

// Subject performance card with collapsible question grid
function SubjectPerformanceCard({ 
  subject, 
  correct, 
  total, 
  accuracy, 
  questions,
  answers,
  onQuestionClick
}: {
  subject: string
  correct: number
  total: number
  accuracy: number
  questions: Question[]
  answers: Record<string, any>
  onQuestionClick: (questionId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  // Get questions for this subject
  const subjectQuestions = questions.filter(q => q.subject_id === subject)
  
  // Determine color based on accuracy
  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return 'text-green-500'
    if (acc >= 60) return 'text-blue-500'
    if (acc >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-between flex-1">
          <h3 className="text-lg font-bold text-white">{subject}</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-400 text-sm">{correct}/{total}</p>
            </div>
            <div className={`font-bold text-lg ${getAccuracyColor(accuracy)}`}>
              {accuracy}%
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-gray-400 hover:text-gray-200 transition-transform ${isExpanded ? '' : 'transform rotate-180'}`}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Areas to revisit */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Question grid */}
          <div className="flex flex-wrap gap-2">
            {subjectQuestions.map((q, idx) => {
              const answer = answers[q.$id]
              const isCorrect = answer?.isCorrect
              const isSkipped = !answer
              
              // Determine button color
              let buttonColor = 'bg-gray-700 text-gray-400 border-gray-600'
              if (isCorrect) buttonColor = 'bg-green-600 text-white border-green-500'
              else if (!isSkipped) buttonColor = 'bg-red-600 text-white border-red-500'
              
              return (
                <button
                  key={q.$id}
                  onClick={() => onQuestionClick(q.$id)}
                  className={`h-9 w-9 flex items-center justify-center rounded-lg font-semibold text-xs border transition-all hover:shadow-md ${buttonColor}`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>

          {/* Areas to revisit section */}
          {subjectQuestions.some(q => {
            const answer = answers[q.$id]
            return answer && !answer.isCorrect
          }) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase">Areas to revisit</p>
              <div className="flex flex-wrap gap-2">
                {subjectQuestions
                  .filter(q => {
                    const answer = answers[q.$id]
                    return answer && !answer.isCorrect
                  })
                  .slice(0, 3)
                  .map(q => {
                    // Extract topic from question or use placeholder
                    const topic = q.tags?.[0] || 'General Knowledge'
                    return (
                      <div key={q.$id} className="px-3 py-1 rounded-full bg-yellow-900 text-yellow-300 text-xs font-semibold border border-yellow-700">
                        {topic}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const { questions, answers, getScore, reset, paperLabel, elapsedSeconds } = useQuizStore()
  const score = getScore()
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

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

  const attempts = Object.entries(answers).map(([qId, ans]) => ({
    $id: '',
    user_id: '',
    question_id: qId,
    selected_option: ans.selectedOption,
    is_correct: ans.isCorrect,
    time_taken_seconds: ans.timeTaken,
    used_5050: ans.used5050,
    used_guess: ans.isGuess,
    used_areyousure: ans.usedAreYouSure,
    is_guess: ans.isGuess
  }))
  const analytics = generateTestAnalytics({ questions, attempts, totalTestTime: elapsedSeconds })

  // Group questions by subject
  const subjectGroups = Array.from(
    questions.reduce((map, q) => {
      if (!map.has(q.subject_id)) map.set(q.subject_id, [])
      map.get(q.subject_id)!.push(q)
      return map
    }, new Map<string, Question[]>())
  )

  // Get expanded question details
  const expandedQuestion = expandedQuestionId ? questions.find(q => q.$id === expandedQuestionId) : null
  const expandedAnswer = expandedQuestion ? answers[expandedQuestion.$id] : null

  return (
    <div className="min-h-screen bg-gray-950 pb-24 md:pb-8">

      {/* ── Hero Score Card ── */}
      <div className={`bg-gradient-to-br ${threshold.color} text-white`}>
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-10">

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

      <div className="max-w-4xl mx-auto px-4 -mt-4 space-y-5">

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-800">
            <div className="w-8 h-8 rounded-xl bg-green-900 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-xl font-black text-white">{score.correct}</p>
            <p className="text-[11px] text-gray-400 font-medium">Correct</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-800">
            <div className="w-8 h-8 rounded-xl bg-red-900 flex items-center justify-center mx-auto mb-2">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-xl font-black text-white">{score.wrong}</p>
            <p className="text-[11px] text-gray-400 font-medium">Wrong</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-800">
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-2">
              <Trophy className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xl font-black text-white">{skipped}</p>
            <p className="text-[11px] text-gray-400 font-medium">Skipped</p>
          </div>
        </div>

        {/* ── Subject-wise Performance ── */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Subject-wise Performance</h2>
          {subjectGroups.map(([subject, subjectQuestions]) => {
            const subjectCorrect = subjectQuestions.filter(q => answers[q.$id]?.isCorrect).length
            const subjectTotal = subjectQuestions.length
            const subjectAccuracy = subjectTotal > 0 ? Math.round((subjectCorrect / subjectTotal) * 100) : 0
            
            return (
              <SubjectPerformanceCard
                key={subject}
                subject={subject}
                correct={subjectCorrect}
                total={subjectTotal}
                accuracy={subjectAccuracy}
                questions={subjectQuestions}
                answers={answers}
                onQuestionClick={setExpandedQuestionId}
              />
            )
          })}
        </div>

        {/* ── Question Detail Modal/Expanded View ── */}
        {expandedQuestion && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Question {questions.findIndex(q => q.$id === expandedQuestion.$id) + 1}</h3>
              <button 
                onClick={() => setExpandedQuestionId(null)}
                className="text-gray-400 hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Question text */}
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">
                {expandedQuestion.question_text}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {(['A', 'B', 'C', 'D'] as const).map(key => {
                const optionText = expandedQuestion[`option_${key.toLowerCase()}` as keyof Question] as string
                const isSelected = expandedAnswer?.selectedOption === key
                const isCorrectOpt = expandedQuestion.correct_option === key
                
                let optionClass = 'bg-gray-800 border-gray-700 text-gray-300'
                if (isCorrectOpt) optionClass = 'bg-green-900 border-green-700 text-green-100'
                else if (isSelected && !isCorrectOpt) optionClass = 'bg-red-900 border-red-700 text-red-100'
                
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${optionClass}`}
                  >
                    <span className="font-bold shrink-0">{key}.</span>
                    <span className="flex-1 whitespace-pre-wrap">{optionText}</span>
                    {isCorrectOpt && <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />}
                    {isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />}
                  </div>
                )
              })}
            </div>

            {/* Explanation */}
            {expandedQuestion.explanation && (
              <div className="bg-blue-900 border border-blue-700 rounded-xl p-3">
                <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-2">Explanation</p>
                <p className="text-sm text-blue-100 leading-relaxed whitespace-pre-wrap">{expandedQuestion.explanation}</p>
              </div>
            )}

            {/* Time taken */}
            {expandedAnswer?.timeTaken && (
              <div className="bg-gray-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-gray-300 text-sm">Time Taken</span>
                <span className="text-white font-semibold">{expandedAnswer.timeTaken}s</span>
              </div>
            )}

            {/* Button usage */}
            {(expandedAnswer?.used5050 || expandedAnswer?.isGuess || expandedAnswer?.usedAreYouSure) && (
              <div className="bg-gray-800 rounded-xl p-3 space-y-1">
                <p className="text-gray-300 text-sm font-semibold">Buttons Used</p>
                <div className="flex flex-wrap gap-2">
                  {expandedAnswer?.used5050 && <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded">50:50</span>}
                  {expandedAnswer?.isGuess && <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded">Guess</span>}
                  {expandedAnswer?.usedAreYouSure && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">Are You Sure?</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Suggestions ── */}
        {analytics.suggestions.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-3">Recommended Areas for Improvement</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
              {analytics.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

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
            className="flex-1 bg-gray-900 border border-gray-700 text-gray-300 hover:bg-gray-800 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" /> Home
          </button>
        </div>

      </div>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { CheckCircle, XCircle, ChevronDown, Trophy, BookOpen, Clock, RefreshCw, Home, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react'
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

// Question Detail View Component
function QuestionDetailView({ expandedQuestion, expandedAnswer, questions, onClose }: { expandedQuestion: any, expandedAnswer: any, questions: any[], onClose: () => void }) {
  if (!expandedQuestion) return null
  return (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Question {questions.findIndex(q => q.$id === expandedQuestion.$id) + 1}</h3>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Question text */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {expandedQuestion.question_text}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {(['A', 'B', 'C', 'D'] as const).map(key => {
                const optionText = expandedQuestion[`option_${key.toLowerCase()}` as keyof Question] as string
                const isSelected = expandedAnswer?.selectedOption === key
                const isCorrectOpt = expandedQuestion.correct_option === key
                
                let optionClass = 'bg-gray-50 border-gray-200 text-gray-700'
                if (isCorrectOpt) optionClass = 'bg-emerald-50 border-emerald-300 text-emerald-900'
                else if (isSelected && !isCorrectOpt) optionClass = 'bg-red-50 border-red-300 text-red-900'
                
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${optionClass}`}
                  >
                    <span className="font-bold shrink-0">{key}.</span>
                    <span className="flex-1 whitespace-pre-wrap">{optionText}</span>
                    {isCorrectOpt && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
                    {isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                  </div>
                )
              })}
            </div>

            {/* Explanation */}
            {expandedQuestion.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Explanation</p>
                </div>
                <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{expandedQuestion.explanation}</p>
              </div>
            )}

            {/* Subtopic */}
            {(expandedQuestion.subtopic || (expandedQuestion.tags && expandedQuestion.tags[0])) && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Sub-Topic</p>
                </div>
                <p className="text-sm text-orange-900 font-semibold">{expandedQuestion.subtopic || expandedQuestion.tags[0]}</p>
              </div>
            )}

            {/* Additional Info */}
            {expandedAnswer && (
              <div className="grid grid-cols-2 gap-3">
                {expandedAnswer?.timeTaken && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                     <p className="text-xs text-gray-600 font-medium mb-1">Time Taken</p>
                     <p className="text-lg font-bold text-gray-900">{expandedAnswer.timeTaken}s</p>
                  </div>
                )}
                {expandedAnswer?.isCorrect !== undefined && (
                  <div className={`${expandedAnswer.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} rounded-xl p-3 border`}>
                     <p className={`text-xs ${expandedAnswer.isCorrect ? 'text-emerald-600' : 'text-red-600'} font-medium mb-1`}>Status</p>
                     <p className={`text-lg font-bold ${expandedAnswer.isCorrect ? 'text-emerald-900' : 'text-red-900'}`}>
                       {expandedAnswer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                     </p>
                  </div>
                )}
                {expandedAnswer?.confidenceTag && (
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                     <p className="text-xs text-purple-600 font-medium mb-1">Confidence</p>
                     <p className="text-sm font-bold text-purple-900 capitalize px-2 py-1 bg-purple-200 rounded inline-block">
                       {expandedAnswer.confidenceTag.replace('_', ' ')}
                     </p>
                  </div>
                )}
              </div>
            )}
          </div>
  )
}

// Subject performance card with collapsible question grid
function SubjectPerformanceCard({ 
  subject, 
  correct, 
  total, 
  accuracy, 
  questions,
  answers
}: {
  subject: string
  correct: number
  total: number
  accuracy: number
  questions: Question[]
  answers: Record<string, any>
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
  
  // Get questions for this subject
  const subjectQuestions = questions.filter(q => q.subject_id === subject)
  
  // Determine color based on accuracy
  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return 'text-emerald-400'
    if (acc >= 60) return 'text-blue-400'
    if (acc >= 40) return 'text-amber-400'
    return 'text-red-400'
  }

  const expandedQuestion = expandedQuestionId ? subjectQuestions.find(q => q.$id === expandedQuestionId) : null
  const expandedAnswer = expandedQuestion ? answers[expandedQuestion.$id] : null

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-between flex-1">
          <h3 className="text-lg font-bold text-gray-900">{subject}</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-600 text-sm font-medium">{correct}/{total}</p>
            </div>
            <div className={`font-bold text-lg ${getAccuracyColor(accuracy)}`}>
              {accuracy}%
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-gray-400 hover:text-gray-600 transition-transform ${isExpanded ? '' : 'transform rotate-180'}`}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-4">
                 {/* Question grid grouped by sub-topic */}
          <div className="space-y-6">
            {Object.entries(
              subjectQuestions.reduce((acc, q) => {
                const subtopic = q.subtopic || (q.tags && q.tags[0]) || 'General'
                if (!acc[subtopic]) acc[subtopic] = []
                acc[subtopic].push(q)
                return acc
              }, {} as Record<string, Question[]>)
            ).map(([topic, topicQuestions]) => (
              <div key={topic} className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{topic}</h4>
                <div className="flex flex-wrap gap-2">
                  {topicQuestions.map((q) => {
                    const answer = answers[q.$id]
                    const isCorrect = answer?.isCorrect
                    const isSkipped = !answer
                    
                    // Determine button color
                    let buttonColor = 'bg-gray-100 text-gray-600 border-gray-300'
                    if (isCorrect) buttonColor = 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    else if (!isSkipped) buttonColor = 'bg-red-100 text-red-700 border-red-300'
                    
                    return (
                      <button
                        key={q.$id}
                        onClick={() => setExpandedQuestionId(prev => prev === q.$id ? null : q.$id)}
                        className={`h-9 w-9 flex items-center justify-center rounded-lg font-semibold text-xs border transition-all hover:shadow-md ${buttonColor} ${expandedQuestionId === q.$id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                      >
                        {questions.findIndex(allQ => allQ.$id === q.$id) + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Areas to revisit section */}
          {subjectQuestions.some(q => {
            const answer = answers[q.$id]
            return answer && !answer.isCorrect
          }) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Areas to revisit</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(
                  subjectQuestions
                    .filter(q => {
                      const answer = answers[q.$id]
                      return answer && !answer.isCorrect
                    })
                    .map(q => q.subtopic || (q.tags && q.tags[0]))
                ))
                .filter((t): t is string => !!t)
                .slice(0, 5)
                .map(topic => (
                  <div key={topic} className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold border border-orange-200">
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          )}

          <QuestionDetailView expandedQuestion={expandedQuestion} expandedAnswer={expandedAnswer} questions={questions} onClose={() => setExpandedQuestionId(null)} />
        </div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const { questions, answers, getScore, reset, paperLabel, elapsedSeconds } = useQuizStore()
  const score = getScore()

  // ─── No data state ───────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-6 bg-gray-50">
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



  // Calculate average time per question
  const avgTimePerQuestion = Math.round(elapsedSeconds / score.total) || 0

  // Identify weak areas
  const weakAreas = analytics.subjectStats.filter(s => s.accuracy < 50)
  const strongAreas = analytics.subjectStats.filter(s => s.accuracy >= 80)

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">

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
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-200">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-gray-900">{score.correct}</p>
            <p className="text-[11px] text-gray-500 font-medium">Correct</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-200">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xl font-black text-gray-900">{score.wrong}</p>
            <p className="text-[11px] text-gray-500 font-medium">Wrong</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-200">
            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <Trophy className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xl font-black text-gray-900">{skipped}</p>
            <p className="text-[11px] text-gray-500 font-medium">Skipped</p>
          </div>
        </div>

        {/* ── Key Insights ── */}
        <div className="space-y-3">
          {/* Strong Areas */}
          {strongAreas.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-900 mb-1">Strong Areas</h3>
                  <p className="text-sm text-emerald-700">You're performing excellently in <span className="font-semibold">{strongAreas.map(s => s.subject).join(', ')}</span>. Keep up the momentum!</p>
                </div>
              </div>
            </div>
          )}

          {/* Weak Areas */}
          {weakAreas.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-orange-900 mb-1">Areas Needing Attention</h3>
                  <p className="text-sm text-orange-700">Focus on <span className="font-semibold">{weakAreas.map(s => s.subject).join(', ')}</span> to improve your score. Revisit the concepts and practice more questions.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Performance Metrics ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Performance Metrics</h3>
          
          {/* Accuracy bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Accuracy</span>
              <span className="font-semibold text-gray-900">{score.correct}/{questions.length}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${threshold.color} transition-all duration-700`}
                style={{ width: `${score.percentage}%` }}
              />
            </div>
          </div>

          {/* Time efficiency */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Time Efficiency</span>
              <span className="font-semibold text-gray-900">{avgTimePerQuestion}s avg/question</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-700"
                style={{ width: `${Math.min((avgTimePerQuestion / 120) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* UPSC Score Estimate */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-1">UPSC Score Estimate</p>
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-blue-600">+2 per correct, -0.66 per wrong</p>
              <p className="text-xl font-black text-blue-900">{(score.correct * 2 - score.wrong * 0.66).toFixed(2)} / {questions.length * 2}</p>
            </div>
          </div>
        </div>

        {/* ── Button Usage Analytics ── */}
        {(analytics.buttonUsageStats.total5050 > 0 || analytics.buttonUsageStats.totalGuess > 0) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Lifeline Usage Analysis</h3>
            <div className="space-y-3">
              {analytics.buttonUsageStats.total5050 > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-purple-900">50:50 Lifeline</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">{analytics.buttonUsageStats.correct5050}/{analytics.buttonUsageStats.total5050}</span>
                  </div>
                  <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${(analytics.buttonUsageStats.correct5050 / analytics.buttonUsageStats.total5050) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-purple-700 mt-2">{Math.round((analytics.buttonUsageStats.correct5050 / analytics.buttonUsageStats.total5050) * 100)}% success rate</p>
                </div>
              )}
              {analytics.buttonUsageStats.totalGuess > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-yellow-900">Guess Button</span>
                    <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">{analytics.buttonUsageStats.correctGuess}/{analytics.buttonUsageStats.totalGuess}</span>
                  </div>
                  <div className="w-full h-2 bg-yellow-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${(analytics.buttonUsageStats.correctGuess / analytics.buttonUsageStats.totalGuess) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">{Math.round((analytics.buttonUsageStats.correctGuess / analytics.buttonUsageStats.totalGuess) * 100)}% success rate</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Advanced Analytics ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Revision Summary */}
           {(analytics.revisionSummary.totalRevised > 0) && (
             <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-4">Revisions (Changed Answers)</h3>
               <div className="space-y-2">
                 <p className="text-sm text-gray-600">Total Revised: <span className="font-bold text-gray-900">{analytics.revisionSummary.totalRevised}</span></p>
                 <p className="text-sm text-emerald-600 font-semibold">Wrong → Correct: {analytics.revisionSummary.changedWrongToCorrect}</p>
                 <p className="text-sm text-red-600 font-semibold">Correct → Wrong: {analytics.revisionSummary.changedCorrectToWrong}</p>
                 {analytics.revisionSummary.changedWrongToCorrect >= analytics.revisionSummary.changedCorrectToWrong ? (
                   <p className="text-xs text-gray-500 mt-2">Good job! Reversing your decisions worked out.</p>
                 ) : (
                   <p className="text-xs text-gray-500 mt-2">Trust your first instinct more.</p>
                 )}
               </div>
             </div>
           )}

           {/* Confidence Stats */}
           {(analytics.confidenceStats.some(s => s.total > 0)) && (
             <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-4">Confidence Breakdown</h3>
               <div className="space-y-3">
                  {analytics.confidenceStats.map(s => s.total > 0 && (
                    <div key={s.tag} className="flex flex-col gap-1 pb-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="capitalize font-semibold text-gray-700">{s.tag.replace('_', ' ')}</span>
                        <span className="font-bold">{s.accuracy}% ({s.correct}/{s.total})</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-[#FF6B00]" style={{ width: `${s.accuracy}%` }} />
                      </div>
                      
                      {s.tag === 'fifty_fifty' && s.accuracy <= 50 && <p className="text-xs text-orange-600 font-medium">Your 50:50 eliminations are frequently incorrect. Avoid narrow guesswork and revisit core concepts.</p>}
                      {s.tag === 'fifty_fifty' && s.accuracy > 50 && <p className="text-xs text-emerald-600 font-medium">Good elimination skills! Your 50:50 choices are mostly correct.</p>}
                      
                      {s.tag === 'guess' && s.accuracy > 30 && <p className="text-xs text-emerald-600 font-medium">Your guesses are surprisingly accurate! But don't rely on luck permanently.</p>}
                      {s.tag === 'guess' && s.accuracy <= 30 && <p className="text-xs text-red-600 font-medium">Your guesses were mostly wrong. A blind guess is dangerous for negative marking.</p>}

                      {s.tag === 'sure' && s.accuracy >= 80 && <p className="text-xs text-emerald-600 font-medium">Great self-awareness! When you're 100% sure, you're usually right.</p>}
                      {s.tag === 'sure' && s.accuracy < 80 && <p className="text-xs text-red-600 font-medium">Overconfidence alert! Many answers you were '100% Sure' about were actually incorrect. Double-check your logic.</p>}
                    </div>
                  ))}
               </div>
             </div>
           )}
        </div>

        {/* ── Subject-wise Performance ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Subject-wise Performance</h2>
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
                questions={questions}
                answers={answers}
              />
            )
          })}
        </div>



        {/* ── Personalized Recommendations ── */}
        <div className="bg-gradient-to-r from-[#FF6B00]/10 to-[#FF8C00]/10 border border-[#FF6B00]/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-6 w-6 text-[#FF6B00] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">Recommendations</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {score.percentage < 50 && <li>• Focus on understanding core concepts. Your current accuracy suggests conceptual gaps.</li>}
                {score.percentage >= 50 && score.percentage < 70 && <li>• Practice more questions from weak areas to improve your accuracy from {score.percentage}% to 70%+.</li>}
                {avgTimePerQuestion > 120 && <li>• Work on time management. Your average {avgTimePerQuestion}s per question is above optimal.</li>}
                {strongAreas.length > 0 && <li>• Excellent work in {strongAreas[0].subject}! Apply similar strategies to other subjects.</li>}
                {weakAreas.length > 0 && <li>• Dedicate 30% more study time to {weakAreas[0].subject} before your next attempt.</li>}
              </ul>
            </div>
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
            className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" /> Home
          </button>
        </div>

      </div>
    </div>
  )
}

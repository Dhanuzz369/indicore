'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { 
  CheckCircle, XCircle, ChevronDown, Trophy, BookOpen, Clock, RefreshCw, Home, 
  TrendingUp, AlertCircle, Lightbulb, Brain, Target, Zap
} from 'lucide-react'
import type { Question } from '@/types'
import { generateTestAnalytics } from '@/lib/analytics/engine'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts'

// ─── Score helpers ───────────────────────────────────────────
function getScoreThreshold(pct: number) {
  if (pct >= 80) return { label: 'Outstanding! 🏆', color: 'from-emerald-500 to-emerald-600', ring: 'text-emerald-400' }
  if (pct >= 60) return { label: 'Great Work! 🎯', color: 'from-blue-500 to-blue-600', ring: 'text-blue-400' }
  if (pct >= 40) return { label: 'Good Effort! 📚', color: 'from-amber-500 to-amber-600', ring: 'text-amber-400' }
  if (pct >= 20) return { label: 'Keep Practising! 💪', color: 'from-orange-500 to-orange-600', ring: 'text-orange-400' }
  return { label: 'Needs More Work! 🔥', color: 'from-red-500 to-red-600', ring: 'text-red-400' }
}

// Confidence tag label
function confLabel(tag: string | null | undefined) {
  if (tag === 'sure') return '100% Sure'
  if (tag === 'fifty_fifty') return '50:50'
  if (tag === 'guess') return "It's a Guess"
  return 'Not Tagged'
}

function confColor(tag: string | null | undefined) {
  if (tag === 'sure') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (tag === 'fifty_fifty') return 'bg-purple-100 text-purple-700 border-purple-200'
  if (tag === 'guess') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

// Subject performance card — collapsed by default, flat question list (no subtopics)
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
  onQuestionClick: (questionIndex: number) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false) // collapsed by default

  const subjectQuestions = questions.filter(q => q.subject_id === subject)

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
      {/* Header — always visible */}
      <div 
        className="flex items-center justify-between p-6 md:p-8 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${accuracy >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {accuracy}%
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">{subject.replace(/_/g, ' ')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase">{correct} / {total} Correct</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-gray-400 font-medium">
            {isExpanded ? 'Hide questions' : 'Show questions'}
          </span>
          <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Expandable question palette — flat list, no subtopics */}
      {isExpanded && (
        <div className="px-6 pb-6 md:px-8 md:pb-8 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-t border-gray-100 pt-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              Question Numbers — click to review
            </p>
            <div className="flex flex-wrap gap-2.5">
              {subjectQuestions.map((q) => {
                const answer = answers[q.$id]
                const isCorrect = answer?.isCorrect
                const isSkipped = !answer
                const globalIndex = questions.findIndex(allQ => allQ.$id === q.$id)
                
                let statusColor = 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400'
                if (isCorrect) statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 shadow-sm shadow-emerald-50'
                else if (!isSkipped) statusColor = 'bg-red-50 text-red-700 border-red-200 hover:border-red-400 shadow-sm shadow-red-50'
                
                // Show confidence badge if tagged
                const confTag = answer?.confidenceTag
                const confDot = confTag === 'sure' ? 'ring-2 ring-emerald-400' 
                  : confTag === 'fifty_fifty' ? 'ring-2 ring-purple-400' 
                  : confTag === 'guess' ? 'ring-2 ring-yellow-400' 
                  : ''
                
                return (
                  <button
                    key={q.$id}
                    title={`Q${globalIndex + 1} — ${isSkipped ? 'Not Answered' : isCorrect ? 'Correct' : 'Incorrect'}${confTag ? ` (${confLabel(confTag)})` : ''}`}
                    onClick={() => onQuestionClick(globalIndex)}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 ${statusColor} ${confDot}`}
                  >
                    {globalIndex + 1}
                  </button>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />Correct</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Wrong</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />Not Answered</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-emerald-400" />Sure</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-purple-400" />50:50</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-yellow-400" />Guess</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaggedQuestionsDropdown({ 
  tag,
  title,
  questions,
  answers,
  confidenceMap,
  onQuestionClick
}: {
  tag: 'sure' | 'fifty_fifty' | 'guess'
  title: string
  questions: Question[]
  answers: Record<string, any>
  confidenceMap: Record<string, string>
  onQuestionClick: (index: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const taggedItems = questions.map((q, index) => {
    const finalTag = confidenceMap[q.$id] || answers[q.$id]?.confidenceTag || null
    return { q, index, finalTag, answer: answers[q.$id] }
  }).filter(item => item.finalTag === tag)

  if (taggedItems.length === 0) return null

  const themeClass = tag === 'sure' 
    ? 'text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200' 
    : tag === 'fifty_fifty'
      ? 'text-blue-700 bg-blue-50/80 hover:bg-blue-100 border-blue-200'
      : 'text-orange-700 bg-orange-50/80 hover:bg-orange-100 border-orange-200'

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-gray-100 bg-white/50 backdrop-blur-md shadow-sm transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-5 py-3 text-xs font-black transition-all ${themeClass}`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 opacity-70" />
          <span className="uppercase tracking-widest">{title}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/50 text-[10px] ml-1">{taggedItems.length}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <div 
        className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
      >
        <div className="p-4 border-t border-gray-100 bg-white/80">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Questions marked as {tag.replace('_', ':')}</p>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {taggedItems.map(({ q, index, answer }) => {
              const isCorrect = answer?.isCorrect
              let statusStyle = 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
              if (isCorrect === true) statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm shadow-emerald-100/50'
              else if (isCorrect === false) statusStyle = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-sm shadow-red-100/50'
              
              return (
                <button
                  key={q.$id}
                  onClick={() => onQuestionClick(index)}
                  className={`flex items-center justify-center h-9 w-9 rounded-xl text-[11px] font-black border transition-all hover:scale-110 active:scale-95 ${statusStyle}`}
                  title={`${isCorrect === true ? 'Correct' : isCorrect === false ? 'Incorrect' : 'Skipped'}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const { questions, answers, confidenceMap, getScore, reset, paperLabel, elapsedSeconds } = useQuizStore()
  const score = getScore()



  const analytics = useMemo(() => 
    generateTestAnalytics({ 
      questions, 
      attempts: Object.entries(answers).map(([id, ans]) => {
        // Prefer confidenceMap (set after option click) over stored tag
        const finalTag: 'sure' | 'fifty_fifty' | 'guess' | null = confidenceMap[id] || ans.confidenceTag || null
        return {
          question_id: id,
          selected_option: ans.selectedOption,
          is_correct: ans.isCorrect,
          time_taken_seconds: ans.timeTaken,
          used_5050: finalTag === 'fifty_fifty',
          used_guess: finalTag === 'guess',
          used_areyousure: finalTag === 'sure',
          is_guess: finalTag === 'guess',
          confidence_tag: finalTag,
          selection_history: ans.selectionHistory ? JSON.stringify({ selections: ans.selectionHistory }) : undefined,
        }
      }),
      totalTestTime: elapsedSeconds 
    }),
    [questions, answers, confidenceMap, elapsedSeconds]
  )

  const subjectChartData = analytics.subjectStats.map(s => ({
    name: s.subject.charAt(0).toUpperCase() + s.subject.slice(1).toLowerCase().replace(/_/g, ' '),
    accuracy: s.accuracy,
    incorrect: 100 - s.accuracy
  }))

  const { buttonUsageStats } = analytics

  const sureAcc = buttonUsageStats.totalAreYouSure
    ? Math.round((buttonUsageStats.correctAreYouSure / buttonUsageStats.totalAreYouSure) * 100)
    : 0
  const fiftyAcc = buttonUsageStats.total5050
    ? Math.round((buttonUsageStats.correct5050 / buttonUsageStats.total5050) * 100)
    : 0
  const guessAcc = buttonUsageStats.totalGuess
    ? Math.round((buttonUsageStats.correctGuess / buttonUsageStats.totalGuess) * 100)
    : 0

  const confidenceRadarData = [
    { subject: '100% Sure', A: sureAcc },
    { subject: '50:50 Deduction', A: fiftyAcc },
    { subject: 'Intuition/Guess', A: guessAcc },
  ]

  const threshold = getScoreThreshold(score.percentage)

  const handleQuestionClick = (index: number) => {
    router.push(`/results/review?q=${index}`)
  }

  // ─── No data state ───────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-6 bg-gray-50">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-full bg-gray-200/50 flex items-center justify-center mx-auto ring-8 ring-gray-100">
            <BookOpen className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No Analysis Available</h2>
          <p className="text-gray-500 text-sm">Complete a practice session to unlock the Analytical Engine.</p>
          <button
            onClick={() => router.push('/quiz')}
            className="bg-[#FF6B00] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-[#FF8C00] transition-all shadow-xl shadow-orange-100"
          >
            Start Practice
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24">
      {/* Dynamic Glassmorphic Navbar */}
      <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF6B00] p-2 rounded-xl shadow-lg shadow-orange-200">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase italic">Analytical Engine <span className="text-[#FF6B00]">PRO</span></h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">{paperLabel || 'Real-time Analysis'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => router.push('/dashboard')}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
             >
                <Home className="h-4 w-4" /> Dashboard
             </button>
             <button 
              onClick={() => { reset(); router.push('/quiz') }}
              className="bg-white border border-gray-200 px-5 py-2.5 rounded-2xl text-sm font-black text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
             >
                <RefreshCw className="h-4 w-4" /> Retake
             </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Top Tier Metrics Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Dark Header Part */}
            <div className="bg-[#111111] p-8 md:p-10 text-white relative">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    {paperLabel || 'Real-time Mock Analysis'} · {questions.length} Qs
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl md:text-7xl font-black">
                      {Math.max(0, parseFloat(((score.correct * 2) - (score.wrong * 0.66)).toFixed(1)))}
                    </span>
                    <span className="text-2xl md:text-3xl font-bold text-gray-500">/{questions.length * 2}</span>
                  </div>
                  
                  {/* Progress Bar Area */}
                  <div className="pt-4 max-w-md">
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {Object.keys(answers).length} of {questions.length} attempted
                       </span>
                    </div>
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00E5BE] rounded-full transition-all duration-1000"
                        style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Accuracy Circle/Text on Right */}
                <div className="flex flex-col items-end">
                   <div className="text-right">
                      <span className="text-4xl md:text-5xl font-black text-[#00E5BE]">{score.percentage}%</span>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">accuracy</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Light Bottom Part */}
            <div className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 bg-white">
              {/* Status Boxes */}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="min-w-[120px] bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{score.correct}</p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Correct</p>
                </div>
                <div className="min-w-[120px] bg-red-50/50 border border-red-100 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-red-600">{score.wrong}</p>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Wrong</p>
                </div>
                <div className="min-w-[120px] bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-400">{questions.length - Object.keys(answers).length}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skipped</p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
                  Duration <span className="text-gray-900 ml-1">
                    {Math.floor(elapsedSeconds / 3600)} hrs {Math.floor((elapsedSeconds % 3600) / 60)} mins
                  </span>
                </div>
                <button
                  onClick={() => handleQuestionClick(0)}
                  className="bg-gray-50 border border-gray-200 px-6 py-3 rounded-2xl text-xs font-black text-gray-900 hover:bg-gray-100 transition-all flex items-center gap-2 shadow-sm uppercase tracking-widest"
                >
                  <Clock className="h-3 w-3" /> Review test
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence Intelligence Layer — only show if any confidence buttons were used */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-indigo-600" />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase leading-none">Decision Confidence Map</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Accuracy vs Internally Perceived Confidence</p>
                 </div>
              </div>

              {(buttonUsageStats.totalAreYouSure > 0 || buttonUsageStats.total5050 > 0 || buttonUsageStats.totalGuess > 0) ? (
                <div className="h-[260px] w-full mt-4">
                   <ResponsiveContainer width="100%" height="100%">
                     <RadarChart cx="50%" cy="50%" outerRadius="80%" data={confidenceRadarData}>
                       <PolarGrid stroke="#F1F5F9" />
                       <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 800, fill: '#475569'}} />
                       <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                       <Radar name="Accuracy" dataKey="A" stroke="#FF6B00" fill="#FF6B00" fillOpacity={0.4} />
                     </RadarChart>
                   </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center text-gray-400 bg-gray-50 rounded-2xl">
                  <Zap className="h-8 w-8 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No confidence buttons used</p>
                  <p className="text-xs mt-1">Use Sure / 50:50 / Guess buttons next time to see insights here</p>
                </div>
              )}

              {/* Confidence usage stats */}
              {(buttonUsageStats.totalAreYouSure > 0 || buttonUsageStats.total5050 > 0 || buttonUsageStats.totalGuess > 0) && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
                    <p className="font-black text-emerald-700 text-base">{buttonUsageStats.totalAreYouSure}</p>
                    <p className="text-emerald-600 font-medium">Sure</p>
                    <p className="text-emerald-500 font-bold">{sureAcc}%</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2 border border-purple-100">
                    <p className="font-black text-purple-700 text-base">{buttonUsageStats.total5050}</p>
                    <p className="text-purple-600 font-medium">50:50</p>
                    <p className="text-purple-500 font-bold">{fiftyAcc}%</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-2 border border-yellow-100">
                    <p className="font-black text-yellow-700 text-base">{buttonUsageStats.totalGuess}</p>
                    <p className="text-yellow-600 font-medium">Guess</p>
                    <p className="text-yellow-500 font-bold">{guessAcc}%</p>
                  </div>
                </div>
              )}
           </div>

           <div className="space-y-4">
               {/* 100% Sure Analysis */}
               <div className="bg-emerald-50/50 rounded-[2rem] p-6 border border-emerald-100/50 flex gap-4 items-start group hover:bg-emerald-50 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                     <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Mastery Level</span>
                        <span className="text-xs font-black text-emerald-700">
                          {buttonUsageStats.totalAreYouSure > 0 ? `${sureAcc}% Accuracy (${buttonUsageStats.totalAreYouSure} used)` : 'Not used'}
                        </span>
                     </div>
                     <h4 className="font-bold text-gray-900 leading-tight">Sure-Answer Consistency</h4>
                     <p className="text-xs text-gray-600 mt-2 leading-relaxed italic">
                        {buttonUsageStats.totalAreYouSure === 0 ? "You haven't marked any answers as 'Sure'. Try marking them to track accuracy in your strong zones." : 
                         sureAcc > 90 ? 
                         "Excellent self-calibration! You know exactly what you know. This is critical for zero-risk scoring." :
                         "Your 'Sure' accuracy is under 90%. This suggests 'Hidden Knowledge Gaps'—you think you are right, but nuances are tricking you."}
                     </p>
                     <TaggedQuestionsDropdown
                        tag="sure"
                        title="Check 'Sure' Questions"
                        questions={questions}
                        answers={answers}
                        confidenceMap={confidenceMap}
                        onQuestionClick={handleQuestionClick}
                     />
                  </div>
               </div>

               {/* Logical Deduction Analysis */}
               <div className="bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100/50 flex gap-4 items-start group hover:bg-blue-50 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                     <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Deduction Index</span>
                        <span className="text-xs font-black text-blue-700">
                          {buttonUsageStats.total5050 > 0 ? `${fiftyAcc}% Success (${buttonUsageStats.total5050} used)` : 'Not used'}
                        </span>
                     </div>
                     <h4 className="font-bold text-gray-900 leading-tight">50:50 Logic Outcomes</h4>
                     <p className="text-xs text-gray-600 mt-2 leading-relaxed italic">
                        {buttonUsageStats.total5050 === 0 ? "Use the 50:50 tool when you narrow down to two options to analyze your elimination logic." : 
                         fiftyAcc > 60 ? 
                         "Strong elimination skills! Your ability to navigate through complex options is better than average." :
                         "Your deduction is failing at the final hurdle. You are identifying the wrong one between the final two choices."}
                     </p>
                     <TaggedQuestionsDropdown
                        tag="fifty_fifty"
                        title="Check '50:50' Questions"
                        questions={questions}
                        answers={answers}
                        confidenceMap={confidenceMap}
                        onQuestionClick={handleQuestionClick}
                     />
                  </div>
               </div>

               {/* Risk Management / Guess Analysis */}
               <div className="bg-orange-50/50 rounded-[2rem] p-6 border border-orange-100/50 flex gap-4 items-start group hover:bg-orange-50 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                     <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Risk Quotient</span>
                        <span className="text-xs font-black text-orange-700">
                          {buttonUsageStats.totalGuess > 0 ? `${guessAcc}% Hit Rate (${buttonUsageStats.totalGuess} guessed)` : 'Not used'}
                        </span>
                     </div>
                     <h4 className="font-bold text-gray-900 leading-tight">Intuition Efficiency</h4>
                     <p className="text-xs text-gray-600 mt-2 leading-relaxed italic">
                        {buttonUsageStats.totalGuess === 0 ? "Zero guessing detected. You are playing a very safe game—typical for final-days revision." : 
                         guessAcc > 40 ? 
                         "Educated guessing is working. Your subconscious intuition is high—but don't make it a habit." :
                         "High blind guessing rate. This is dangerous for negative marking—focus on conceptual clarity to reduce guesses."}
                     </p>
                     <TaggedQuestionsDropdown
                        tag="guess"
                        title="Check 'Guess' Questions"
                        questions={questions}
                        answers={answers}
                        confidenceMap={confidenceMap}
                        onQuestionClick={handleQuestionClick}
                     />
                  </div>
               </div>
           </div>
        </div>

        {/* Drill-Down Section */}
        <div className="pt-8 border-t border-gray-100">
           <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight italic">Engine Drill-Down</h2>
                <p className="text-xs text-gray-500 font-medium">Subject-wise question breakdown — click a question number to review</p>
              </div>
           </div>
           
           {/* Merge confidenceMap into answers so question badges reflect the latest tags */}
           {(() => {
             const mergedAnswers = Object.fromEntries(
               Object.entries(answers).map(([qId, ans]) => [
                 qId,
                 { ...ans, confidenceTag: confidenceMap[qId] || ans.confidenceTag || null }
               ])
             )
             return (
               <div className="space-y-4">
                 {analytics.subjectStats.map((stat) => (
                   <SubjectPerformanceCard
                     key={stat.subject}
                     subject={stat.subject}
                     correct={stat.correct}
                     total={stat.total}
                     accuracy={stat.accuracy}
                     questions={questions}
                     answers={mergedAnswers}
                     onQuestionClick={handleQuestionClick}
                   />
                 ))}
               </div>
             )
           })()}
        </div>

        {/* Global Strategy Suggestions */}
        {analytics.suggestions.length > 0 && (
          <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Lightbulb className="h-40 w-40" />
             </div>
             <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Zap className="h-6 w-6 text-[#FF6B00]" /> Strategy Protocol
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                   {analytics.suggestions.map((s, idx) => (
                      <div key={idx} className="flex gap-4">
                         <span className="text-[#FF6B00] font-black italic">#{idx+1}</span>
                         <p className="text-sm font-medium text-gray-300 leading-relaxed">{s}</p>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  )
}

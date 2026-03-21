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
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts'

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

  const analytics = useMemo(() => 
    generateTestAnalytics({ 
      questions, 
      attempts: Object.entries(answers).map(([id, ans]) => ({ ...ans, question_id: id } as any)), 
      totalTestTime: elapsedSeconds 
    }),
    [questions, answers, elapsedSeconds]
  )

  const subjectChartData = analytics.subjectStats.map(s => ({
    name: s.subject.charAt(0).toUpperCase() + s.subject.slice(1).toLowerCase().replace(/_/g, ' '),
    accuracy: s.accuracy,
    incorrect: 100 - s.accuracy
  }))

  const confidenceRadarData = [
    { subject: '100% Sure', A: analytics.buttonUsageStats.totalAreYouSure ? Math.round((analytics.buttonUsageStats.correctAreYouSure / analytics.buttonUsageStats.totalAreYouSure) * 100) : 0 },
    { subject: '50:50 Deduction', A: analytics.buttonUsageStats.total5050 ? Math.round((analytics.buttonUsageStats.correct5050 / analytics.buttonUsageStats.total5050) * 100) : 0 },
    { subject: 'Intuition/Guess', A: analytics.buttonUsageStats.totalGuess ? Math.round((analytics.buttonUsageStats.correctGuess / analytics.buttonUsageStats.totalGuess) * 100) : 0 },
  ]

  const threshold = getScoreThreshold(score.percentage)

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
        
        {/* Top Tier Metrics: The "Control Room" Look */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="h-24 w-24 text-[#FF6B00]" />
             </div>
             <div className="relative z-10">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="#F1F5F9" strokeWidth="8" fill="none" />
                    <circle 
                      cx="64" cy="64" r="58" stroke="#FF6B00" strokeWidth="10" 
                      strokeDasharray={364} strokeDashoffset={364 - (364 * score.percentage / 100)}
                      fill="none" strokeLinecap="round" className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-900">{score.percentage}%</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Accuracy</span>
                  </div>
                </div>
                <h2 className={`text-sm font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${threshold.color.includes('emerald') ? 'from-emerald-600 to-teal-500' : 'from-orange-600 to-red-500'}`}>
                  {threshold.label}
                </h2>
             </div>
          </div>

          <div className="md:col-span-3 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2 text-sm italic">
                    <TrendingUp className="h-4 w-4 text-orange-500" /> Subject Proficiency Matrix
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">Correlation between attempted subjects and hit-ratio</p>
                </div>
             </div>
             <div className="flex-1 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94A3B8'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94A3B8'}} unit="%" domain={[0, 100]} />
                    <RechartsTooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar dataKey="accuracy" fill="#FF6B00" radius={[8, 8, 8, 8]} barSize={45} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Confidence Intelligence Layer */}
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

              <div className="h-[280px] w-full mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="80%" data={confidenceRadarData}>
                     <PolarGrid stroke="#F1F5F9" />
                     <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 800, fill: '#475569'}} />
                     <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                     <Radar name="Accuracy" dataKey="A" stroke="#FF6B00" fill="#FF6B00" fillOpacity={0.4} />
                   </RadarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="space-y-6">
               {/* 100% Sure Analysis */}
               <div className="bg-emerald-50/50 rounded-[2rem] p-6 border border-emerald-100/50 flex gap-4 items-start group hover:bg-emerald-50 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                     <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Mastery Level</span>
                        <span className="text-xs font-black text-emerald-700">{analytics.buttonUsageStats.totalAreYouSure ? Math.round((analytics.buttonUsageStats.correctAreYouSure / analytics.buttonUsageStats.totalAreYouSure) * 100) : 0}% Accuracy</span>
                     </div>
                     <h4 className="font-bold text-gray-900 leading-tight">Sure-Answer Consistency</h4>
                     <p className="text-xs text-gray-600 mt-2 leading-relaxed italic">
                        {analytics.buttonUsageStats.totalAreYouSure === 0 ? "You haven't marked any answers as 'Sure'. Try marking them to track accuracy in your strong zones." : 
                         (analytics.buttonUsageStats.correctAreYouSure / analytics.buttonUsageStats.totalAreYouSure) > 0.9 ? 
                         "Excellent self-calibration! You know exactly what you know. This is critical for zero-risk scoring." :
                         "Your 'Sure' accuracy is under 90%. This suggests 'Hidden Knowledge Gaps'—you think you are right, but nuances are tricking you."}
                     </p>
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
                        <span className="text-xs font-black text-blue-700">{analytics.buttonUsageStats.total5050 ? Math.round((analytics.buttonUsageStats.correct5050 / analytics.buttonUsageStats.total5050) * 100) : 0}% Success</span>
                     </div>
                     <h4 className="font-bold text-gray-900 leading-tight">50:50 Logic Outcomes</h4>
                     <p className="text-xs text-gray-600 mt-2 leading-relaxed italic">
                        {analytics.buttonUsageStats.total5050 === 0 ? "Use the 50:50 tool when you narrow down to two options to analyze your elimination logic." : 
                         (analytics.buttonUsageStats.correct5050 / analytics.buttonUsageStats.total5050) > 0.6 ? 
                         "Strong elimination skills! Your ability to navigate through complex options is better than average." :
                         "Your deduction is failing at the final hurdle. You are identifying the wrong one between the final two choices."}
                     </p>
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
                        <span className="text-xs font-black text-orange-700">{analytics.buttonUsageStats.totalGuess ? Math.round((analytics.buttonUsageStats.correctGuess / analytics.buttonUsageStats.totalGuess) * 100) : 0}% Hit Rate</span>
                     </div>
                     <h4 className="font-bold text-gray-900 leading-tight">Intuition Efficiency</h4>
                     <p className="text-xs text-gray-600 mt-2 leading-relaxed italic">
                        {analytics.buttonUsageStats.totalGuess === 0 ? "Zero guessing detected. You are playing a very safe game—typical for final-days revision." : 
                         (analytics.buttonUsageStats.correctGuess / analytics.buttonUsageStats.totalGuess) > 0.4 ? 
                         "Educated guessing is working. Your subconscious intuition is high—but don't make it a habit." :
                         "High blind guessing rate. This is dangerous for negative marking—focus on conceptual clarity to reduce guesses."}
                     </p>
                  </div>
               </div>
           </div>
        </div>

        {/* Drill-Down Section Header */}
        <div className="pt-8 border-t border-gray-100">
           <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight italic">Engine Drill-Down</h2>
                <p className="text-xs text-gray-500 font-medium">Subject-wise subtopic segmentation and solution review</p>
              </div>
           </div>
           
           <div className="space-y-6">
              {analytics.subjectStats.map((stat) => (
                <SubjectPerformanceCard
                  key={stat.subject}
                  subject={stat.subject}
                  correct={stat.correct}
                  total={stat.total}
                  accuracy={stat.accuracy}
                  questions={questions}
                  answers={answers}
                />
              ))}
           </div>
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


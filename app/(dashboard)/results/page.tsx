'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { getTestSession, listAttemptsBySession, getQuestionsByIds } from '@/lib/appwrite/queries'
import { 
  CheckCircle, XCircle, ChevronDown, BookOpen, Clock, RefreshCw, Home, 
  AlertCircle, Lightbulb, Brain, Target, Zap
} from 'lucide-react'
import type { Question } from '@/types'
import { generateTestAnalytics } from '@/lib/analytics/engine'
import { toast } from 'sonner'
import { 
  ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
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

function formatTime(seconds: number | undefined) {
  if (seconds === undefined) return '0s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
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
                    title={`Q${globalIndex + 1} — ${isSkipped ? 'Not Answered' : isCorrect ? 'Correct' : 'Incorrect'}${confTag ? ` (${confLabel(confTag)})` : ''} — Took ${formatTime(answer?.timeTaken)}`}
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

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const { 
    questions, answers, confidenceMap, getScore, reset, paperLabel, elapsedSeconds,
    setQuestions, setAnswers, setConfidenceForQuestion, setTestMode, setPaperLabel, setElapsed
  } = useQuizStore()
  
  const [isRehydrating, setIsRehydrating] = useState(false)
  const [storedAnalytics, setStoredAnalytics] = useState<any>(null)
  

  // ─── REHYDRATION LOGIC ──────────────────────────────────────
  useEffect(() => {
    const rehydrate = async () => {
      if (!sessionId || questions.length > 0) return
      
      setIsRehydrating(true)
      try {
        const session = await getTestSession(sessionId)
        if (!session) throw new Error('Session not found')

        // 0. Set stored analytics if present for perfect historical reproduction
        if (session.analytics || session.results_history) {
          try {
            const data = session.results_history || session.analytics
            setStoredAnalytics(typeof data === 'string' ? JSON.parse(data) : data)
          } catch (e: any) {
            console.warn('Failed to parse stored analytics:', e.message)
          }
        }

        // 1. Get attempts to reconstruct answers & confidence
        const attemptsResult = await listAttemptsBySession(sessionId)
        
        // 2. Get questions
        const qIds = session.question_ids ? JSON.parse(session.question_ids) : []
        if (qIds.length === 0) throw new Error('No question IDs in session')
        
        const questionsResult = await getQuestionsByIds(qIds)
        // Sort questions order to match the original attempt
        const orderedQs = qIds.map((id: string) => questionsResult.documents.find((q: any) => q.$id === id)).filter(Boolean)

        // 3. Update store
        setQuestions(orderedQs as any)
        setTestMode(session.mode === 'full_length')
        setPaperLabel(session.paper_label)
        setElapsed(session.total_time_seconds)

        const reconstructedAnswers: any = {}
        attemptsResult.documents.forEach((att: any) => {
          reconstructedAnswers[att.question_id] = {
            selectedOption: att.selected_option,
            isCorrect: att.is_correct,
            timeTaken: att.time_taken_seconds,
            confidenceTag: att.confidence_tag,
            used5050: !!att.used_5050,
            isGuess: !!(att.is_guess || att.used_guess),
            usedAreYouSure: !!att.used_areyousure,
            selectionHistory: att.selection_history ? JSON.parse(att.selection_history).selections : []
          }
          if (att.confidence_tag) {
            setConfidenceForQuestion(att.question_id, att.confidence_tag)
          }
        })
        setAnswers(reconstructedAnswers)

      } catch (e: any) {
        console.error('Rehydration failed:', e)
        toast.error('Failed to reconstruct analysis.')
      } finally {
        setIsRehydrating(false)
      }
    }
    
    rehydrate()
  }, [sessionId, questions.length, setQuestions, setAnswers, setConfidenceForQuestion, setTestMode, setPaperLabel, setElapsed])

  // ─── ANALYTICS CALCULATION ──────────────────────────────────
  const generatedAnalytics = useMemo(() => 
    generateTestAnalytics({ 
      questions, 
      attempts: Object.entries(answers).map(([id, ans]) => {
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

  const analytics = storedAnalytics || generatedAnalytics
  const score = analytics.score || getScore()

  // Subject radar — up to 5 subjects, value = correct questions count
  const MAX_RADAR_SUBJECTS = 5
  const subjectRadarData = analytics.subjectStats
    .slice(0, MAX_RADAR_SUBJECTS)
    .map((s: any) => ({
      subject: s.subject
        .replace(/_/g, ' ')
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' '),
      correct: s.correct,
      total: s.total,
      accuracy: s.accuracy,
    }))
  const maxCorrect = Math.max(...subjectRadarData.map((d: any) => d.correct), 1)

  const threshold = getScoreThreshold(score.percentage)

  const handleQuestionClick = (index: number) => {
    router.push(`/results/review?q=${index}`)
  }

  // ─── No data / Rehydrating state ────────────────────────────
  if (isRehydrating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 bg-gray-50">
        <Loader2 className="h-10 w-10 text-[#FF6B00] animate-spin mb-4" />
        <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Reconstructing Analysis...</p>
      </div>
    )
  }

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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* ── TOP SECTION: Compact Score Card (left) + Subject Radar (right) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LEFT — Compact square score card */}
          <div className="bg-[#111111] rounded-[2rem] overflow-hidden flex flex-col">
            {/* Score block */}
            <div className="p-7 flex-1">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">
                {paperLabel || 'Mock Analysis'} · {questions.length} Qs
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Score</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">
                      {score.correct}
                    </span>
                    <span className="text-xl font-bold text-gray-600">/{questions.length}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-[#00E5BE]">{score.percentage}%</span>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">accuracy</p>
                </div>
              </div>

              {/* Attempt progress bar */}
              <div className="mt-5">
                <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  <span>{Object.keys(answers).length} of {questions.length} attempted</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00E5BE] rounded-full transition-all duration-1000"
                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 border-t border-white/5">
              <div className="py-4 text-center border-r border-white/5">
                <p className="text-xl font-black text-emerald-400">{score.correct}</p>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">Correct</p>
              </div>
              <div className="py-4 text-center border-r border-white/5">
                <p className="text-xl font-black text-red-400">{score.wrong}</p>
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mt-0.5">Wrong</p>
              </div>
              <div className="py-4 text-center">
                <p className="text-xl font-black text-gray-500">{questions.length - Object.keys(answers).length}</p>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-0.5">Skipped</p>
              </div>
            </div>

            {/* Duration + Review */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {Math.floor(elapsedSeconds / 3600)}h {Math.floor((elapsedSeconds % 3600) / 60)}m
              </div>
              <button
                onClick={() => handleQuestionClick(0)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                <Clock className="h-3 w-3" /> Review Test
              </button>
            </div>
          </div>

          {/* RIGHT — Subject Performance Bar Graph (moved from below) */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-7 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">Subject Performance</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Accuracy per subject</p>
              </div>
            </div>

            <div className="flex-1 min-h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={analytics.subjectStats} 
                  layout="vertical" 
                  margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="subject" 
                    type="category" 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #F1F5F9', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="correct" radius={[0, 4, 4, 0]} barSize={14}>
                    {analytics.subjectStats.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.accuracy >= 70 ? '#00E5BE' : entry.accuracy >= 40 ? '#FF6B00' : '#FF4B4B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>


        {/* ── CONFIDENCE METRIC CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Mastery</span>
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-2">Sure Items</h4>
            <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">Questions you answered with absolute confidence. These reflect your core strengths.</p>
            <TaggedQuestionsDropdown 
                tag="sure" 
                title="Review Sure Items" 
                questions={questions} 
                answers={answers} 
                confidenceMap={confidenceMap} 
                onQuestionClick={handleQuestionClick}
            />
          </div>

          <div className="bg-white rounded-[2rem] border border-blue-100 shadow-sm p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Learning</span>
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-2">50:50 Logic</h4>
            <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">Questions where you narrowed it down but were hesitant. This is where your edge lies.</p>
            <TaggedQuestionsDropdown 
                tag="fifty_fifty" 
                title="Review Fifty-Fifty Items" 
                questions={questions} 
                answers={answers} 
                confidenceMap={confidenceMap} 
                onQuestionClick={handleQuestionClick}
            />
          </div>

          <div className="bg-white rounded-[2rem] border border-orange-100 shadow-sm p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Luck Factor</span>
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-2">Calculated Guesses</h4>
            <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">Pure guesses. Analyzing these helps you understand your subconscious processing.</p>
            <TaggedQuestionsDropdown 
                tag="guess" 
                title="Review Guess Items" 
                questions={questions} 
                answers={answers} 
                confidenceMap={confidenceMap} 
                onQuestionClick={handleQuestionClick}
            />
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
import { Loader2 } from 'lucide-react'

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#FF6B00]" /></div>}>
      <ResultsContent />
    </Suspense>
  )
}

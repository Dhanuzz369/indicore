'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjects, getQuestions, getQuestionCountBySubject } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth'
import { useQuizStore } from '@/store/quiz-store'
import { toast } from 'sonner'
import {
  Loader2, ArrowRight, LayoutGrid, FileText, Sparkles, X,
  Clock, Zap, Target, ChevronRight, Search,
} from 'lucide-react'
import type { Question, Subject } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

const PAPER_OPTIONS = [
  { examType: "UPSC_PRE", year: 2024, label: "GS Paper I", status: "active", theme: "orange", questions: 100, time: "2 Hr", marks: 200, id: "p1" },
  { examType: "UPSC_PRE", year: 2023, label: "GS Paper I", status: "active", theme: "black", questions: 100, time: "2 Hr", marks: 200, id: "p2" },
  { examType: "UPSC_PRE", year: 2022, label: "GS Paper I", status: "active", theme: "gray", questions: 100, time: "2 Hr", marks: 200, id: "p3" },
]

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'] as const
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40, 50]
// 1.2 minutes = 72 seconds per question
const SECONDS_PER_QUESTION = 72

type Difficulty = typeof DIFFICULTY_OPTIONS[number]

function getSubjectAccent(name: string) {
  const l = name.toLowerCase()
  if (l.includes('polity')) return { color: '#FF6B00', bg: 'bg-orange-50', text: 'text-orange-600', icon: '⚖️' }
  if (l.includes('hist')) return { color: '#8B4513', bg: 'bg-amber-50', text: 'text-amber-700', icon: '🏛️' }
  if (l.includes('geo')) return { color: '#007AFF', bg: 'bg-blue-50', text: 'text-blue-600', icon: '🌍' }
  if (l.includes('econ')) return { color: '#FF3B30', bg: 'bg-red-50', text: 'text-red-600', icon: '📈' }
  if (l.includes('environ')) return { color: '#34C759', bg: 'bg-green-50', text: 'text-green-600', icon: '🌿' }
  if (l.includes('science') || l.includes('tech')) return { color: '#5856D6', bg: 'bg-indigo-50', text: 'text-indigo-600', icon: '🔬' }
  return { color: '#FF6B00', bg: 'bg-orange-50', text: 'text-orange-600', icon: '📚' }
}

function formatTimerPreview(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (s === 0) return `${m}:00`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getDifficultyStyle(d: Difficulty, selected: boolean) {
  const base = 'px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2'
  if (!selected) return `${base} bg-white border-gray-100 text-gray-400 hover:border-gray-300`
  switch (d) {
    case 'Easy': return `${base} bg-green-500 border-green-500 text-white shadow-md shadow-green-100`
    case 'Medium': return `${base} bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100`
    case 'Hard': return `${base} bg-red-500 border-red-500 text-white shadow-md shadow-red-100`
    default: return `${base} bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-200`
  }
}

function QuizSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const { setQuestions, setTestMode, setPaperLabel, setPracticeTimerTotal } = useQuizStore()

  const [activeTab, setActiveTab] = useState<'full' | 'subject'>(tabParam === 'subject' ? 'subject' : 'full')
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)

  type SubjectWithCount = Subject & { count: number }
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [userName, setUserName] = useState('')

  // Subject practice config state
  const [configSubject, setConfigSubject] = useState<SubjectWithCount | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('All')
  const [questionCount, setQuestionCount] = useState(20)
  const [startLoading, setStartLoading] = useState(false)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) setUserName(user.name || 'Aspirant')
    })
    const fetchSubjects = async () => {
      try {
        const result = await getSubjects()
        const subjectsData = result.documents as unknown as Subject[]
        const withCounts = await Promise.all(
          subjectsData.map(async subj => ({
            ...subj,
            count: await getQuestionCountBySubject(subj.$id),
          }))
        )
        setSubjects(withCounts)
      } catch {
        toast.error('Failed to load subjects')
      } finally {
        setLoadingSubjects(false)
      }
    }
    fetchSubjects()
  }, [])

  // ── Full Length Test ──
  const handleStartTest = async (paper: typeof PAPER_OPTIONS[0]) => {
    setLoadingCardId(paper.id)
    try {
      const result = await getQuestions({ limit: paper.questions, examType: paper.examType, year: paper.year })
      if (!result.documents?.length) { toast.error('No questions found.'); setLoadingCardId(null); return }
      
      // RESET STORE BEFORE STARTING NEW SESSION
      useQuizStore.getState().resetQuiz()
      
      setQuestions(result.documents as unknown as Question[])
      setTestMode(true)
      setPracticeTimerTotal(0)   // 0 = use default 120-min full-length timer
      setPaperLabel(`${paper.label} ${paper.year}`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start test')
      setLoadingCardId(null)
    }
  }

  // ── Subject Practice — open config ──
  const openConfig = (subj: SubjectWithCount) => {
    setConfigSubject(subj)
    setSelectedDifficulty('All')
    setQuestionCount(20)
  }

  // ── Subject Practice — begin after config ──
  const handleStartPractice = async () => {
    if (!configSubject) return
    setStartLoading(true)
    try {
      const cap = Math.min(questionCount, configSubject.count || questionCount)
      const filters: any = {
        subjectId: configSubject.$id,
        limit: cap,
      }
      if (selectedDifficulty !== 'All') filters.difficulty = selectedDifficulty.toLowerCase()
      
      const result = await getQuestions(filters)
      if (!result.documents?.length) {
        toast.error('No questions found. Try a different difficulty or count.')
        setStartLoading(false)
        return
      }

      // RESET STORE BEFORE STARTING NEW SESSION
      useQuizStore.getState().resetQuiz()

      const qs = result.documents as unknown as Question[]
      setQuestions(qs)
      setTestMode(true)                                           // same quiz mode as full-length
      setPracticeTimerTotal(qs.length * SECONDS_PER_QUESTION)    // 72s per question countdown
      setPaperLabel(`${configSubject.Name} · ${selectedDifficulty === 'All' ? 'All' : selectedDifficulty} · ${qs.length}Q`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start practice')
      setStartLoading(false)
    }
  }

  const totalTimerSeconds = questionCount * SECONDS_PER_QUESTION

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {activeTab === 'full' ? 'Practice Selection' : 'Practice Lab'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-[#FF6B00] transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <div className="h-12 w-12 rounded-full bg-gray-900 border-2 border-white shadow-md overflow-hidden ring-4 ring-gray-50">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="User" />
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-3xl mx-auto px-6 mt-4">
        <div className="bg-gray-100 p-1.5 rounded-[2rem] flex h-16">
          <button
            onClick={() => { setActiveTab('full'); setConfigSubject(null) }}
            className={`flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'full' ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Full Length Test
          </button>
          <button
            onClick={() => { setActiveTab('subject'); setConfigSubject(null) }}
            className={`flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'subject' ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Subject Practice
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-16">

        {/* ── FULL LENGTH TEST VIEW ── */}
        {activeTab === 'full' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase">UPSC CSE.</h2>
              <div className="flex bg-gray-100 p-1.5 rounded-full h-10 px-3 w-fit">
                <button className="text-[10px] font-black text-white bg-black rounded-full px-5 uppercase tracking-tighter">Prelims</button>
                <button className="text-[10px] font-black text-gray-400 px-5 uppercase tracking-tighter">Mains</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PAPER_OPTIONS.map(paper => (
                <div key={paper.id} className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 group hover:shadow-xl hover:border-orange-100 transition-all flex flex-col">
                  <div className="absolute top-6 right-8 text-[72px] font-black text-gray-50 select-none -z-10 tracking-tighter group-hover:scale-110 transition-transform">
                    {paper.year}
                  </div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 font-mono">UPSC PRELIMS</p>
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="text-2xl font-black text-gray-900">{paper.label}</h3>
                    <span className="text-sm font-black text-gray-400">{paper.year}</span>
                  </div>
                  <p className="text-xs text-gray-400 font-semibold mb-8">Prelims · General Studies · Paper I</p>
                  <div className="grid grid-cols-3 gap-4 mb-10 mt-auto">
                    <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Questions</p>
                      <p className="text-sm font-black text-gray-900">{paper.questions}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-sm font-black text-gray-900">{paper.time}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Marks</p>
                      <p className="text-sm font-black text-gray-900">{paper.marks}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartTest(paper)}
                    disabled={loadingCardId === paper.id}
                    className={`h-16 w-full rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-60 ${
                      paper.theme === 'black'
                        ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                        : paper.theme === 'gray'
                          ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-lg shadow-gray-200'
                          : 'bg-[#FF6B00] text-white hover:bg-orange-600 shadow-lg shadow-orange-100'
                    }`}
                  >
                    {loadingCardId === paper.id ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>Start Test <ArrowRight className="h-5 w-5" /></>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#111111] rounded-[2.5rem] overflow-hidden p-10 text-white relative">
                <span className="inline-block px-4 py-1.5 bg-[#FF6B00] text-[10px] font-black uppercase tracking-widest rounded-full mb-6">Adaptive Learning</span>
                <h3 className="text-4xl font-black tracking-tight leading-tight mb-6">Focus on Weak<br />Subjects</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed mb-10 max-w-md">
                  Practice subject-wise to target your weak areas and boost your score.
                </p>
                <button
                  onClick={() => setActiveTab('subject')}
                  className="bg-white text-black px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-xl"
                >
                  Go to Subjects
                </button>
              </div>

              <div className="bg-[#FFF8EF] rounded-[2.5rem] p-10 flex flex-col">
                <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-8">
                  <Sparkles className="h-7 w-7 text-orange-600" />
                </div>
                <h4 className="text-2xl font-black text-gray-900 mb-4">Previous Analysis</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10">
                  Review your mistakes to improve your current score.
                </p>
                <button
                  onClick={() => router.push('/tests')}
                  className="mt-auto text-[11px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 hover:translate-x-2 transition-transform"
                >
                  View My Tests <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBJECT PRACTICE VIEW ── */}
        {activeTab === 'subject' && (
          <div className="space-y-12">

            {/* If no subject selected: show grid */}
            {!configSubject ? (
              <>
                <div>
                  <h2 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none">
                    Subject-wise<br />Practice
                  </h2>
                  <p className="text-lg text-gray-400 font-medium mt-6 max-w-xl leading-relaxed">
                    Pick a subject, choose your question count and difficulty, and start a timed practice session.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loadingSubjects
                    ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-[2.5rem]" />)
                    : subjects.map(subj => {
                        const accent = getSubjectAccent(subj.Name)
                        return (
                          <div
                            key={subj.$id}
                            className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 hover:shadow-xl hover:border-orange-50 transition-all group flex flex-col cursor-pointer"
                            onClick={() => openConfig(subj)}
                          >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: accent.color }} />
                            <div className="flex items-start justify-between mb-8">
                              <div className={`h-16 w-16 ${accent.bg} rounded-3xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform`}>
                                {accent.icon}
                              </div>
                              <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${accent.bg} ${accent.text}`}>
                                {subj.slug?.split('-')[0] ?? subj.Name.slice(0, 4)}
                              </div>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">{subj.Name}</h3>
                            <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                              <FileText className="h-3 w-3" /> {subj.count} questions
                            </p>
                            <div className="mt-10 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#FF6B00]">
                              Configure & Start <ChevronRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                            </div>
                          </div>
                        )
                      })}
                </div>
              </>
            ) : (

              /* ── SUBJECT PRACTICE CONFIGURATION PANEL ── */
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">

                {/* Back */}
                <button
                  onClick={() => setConfigSubject(null)}
                  className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 mb-8 transition-colors"
                >
                  <X className="h-4 w-4" /> Back to subjects
                </button>

                {/* Subject Hero */}
                {(() => {
                  const accent = getSubjectAccent(configSubject.Name)
                  return (
                    <div className={`${accent.bg} rounded-[2.5rem] p-8 mb-8 flex items-center gap-6 border-2`} style={{ borderColor: accent.color + '30' }}>
                      <div className="text-5xl">{accent.icon}</div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accent.color }}>
                          Subject Practice
                        </p>
                        <h2 className="text-3xl font-black text-gray-900">{configSubject.Name}</h2>
                        <p className="text-sm text-gray-500 font-semibold mt-1">
                          {configSubject.count} questions available
                        </p>
                      </div>
                    </div>
                  )
                })()}

                {/* Config Card */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-10">

                  {/* Question Count */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Target className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Questions</p>
                        <p className="text-xs text-gray-400">How many questions to practice</p>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {QUESTION_COUNT_OPTIONS.map(n => (
                        <button
                          key={n}
                          onClick={() => setQuestionCount(n)}
                          className={`px-5 py-3 rounded-2xl font-black text-sm transition-all border-2 ${
                            questionCount === n
                              ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-lg shadow-orange-100 scale-105'
                              : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <Zap className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Difficulty</p>
                        <p className="text-xs text-gray-400">Filter questions by difficulty level</p>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {DIFFICULTY_OPTIONS.map(d => (
                        <button
                          key={d}
                          onClick={() => setSelectedDifficulty(d)}
                          className={getDifficultyStyle(d, selectedDifficulty === d)}
                        >
                          {d === 'Easy' ? '🟢' : d === 'Medium' ? '🟡' : d === 'Hard' ? '🔴' : '⚡'} {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timer Preview */}
                  <div className="bg-gray-900 rounded-[2rem] p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-[#FF6B00]/20 rounded-2xl flex items-center justify-center">
                        <Clock className="h-6 w-6 text-[#FF6B00]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Countdown</p>
                        <p className="text-2xl font-black text-white font-mono">{formatTimerPreview(totalTimerSeconds)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Per Question</p>
                      <p className="text-lg font-black text-[#FF6B00]">1:12</p>
                    </div>
                  </div>

                  {/* Session summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                      <p className="text-xl font-black text-gray-900">{questionCount}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Questions</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                      <p className="text-xl font-black text-gray-900">{formatTimerPreview(totalTimerSeconds)}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Timer</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                      <p className={`text-xl font-black ${
                        selectedDifficulty === 'Easy' ? 'text-green-600'
                        : selectedDifficulty === 'Medium' ? 'text-amber-500'
                        : selectedDifficulty === 'Hard' ? 'text-red-500'
                        : 'text-gray-900'
                      }`}>{selectedDifficulty}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Difficulty</p>
                    </div>
                  </div>

                  {/* Begin Practice CTA */}
                  <button
                    onClick={handleStartPractice}
                    disabled={startLoading}
                    className="w-full h-20 bg-gradient-to-r from-[#FF6B00] to-orange-500 rounded-[2rem] flex items-center justify-center gap-4 text-white font-black tracking-widest uppercase shadow-xl shadow-orange-100 hover:scale-[1.01] hover:shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {startLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>Begin Practice <ArrowRight className="h-6 w-6" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>}>
      <QuizSetupContent />
    </Suspense>
  )
}

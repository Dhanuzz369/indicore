'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjectsWithCounts, getQuestions, listMocks, getSubjectsWithMockCounts, listTestSessions, getQuestionsByIds } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth'
import { useQuizStore } from '@/store/quiz-store'
import { toast } from 'sonner'
import {
  Loader2, ArrowRight, LayoutGrid, FileText, Sparkles, X,
  Clock, Zap, Target, ChevronRight, Search, RotateCcw, Eye,
} from 'lucide-react'
import type { Question, Subject, Mock, TestSession } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalytics } from '@/hooks/useAnalytics'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const PAPER_OPTIONS = [
  { examType: "UPSC_PRE", year: 2024, label: "GS Paper I", status: "active", theme: "orange", questions: 100, time: "2 Hr", marks: 200, id: "p1" },
  { examType: "UPSC_PRE", year: 2023, label: "GS Paper I", status: "active", theme: "black", questions: 100, time: "2 Hr", marks: 200, id: "p2" },
  { examType: "UPSC_PRE", year: 2022, label: "GS Paper I", status: "active", theme: "gray", questions: 100, time: "2 Hr", marks: 200, id: "p3" },
]

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'] as const
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 40, 50]
const SECONDS_PER_QUESTION = 72

type Difficulty = typeof DIFFICULTY_OPTIONS[number]

function getSubjectAccent(name: string) {
  const l = name.toLowerCase()
  if (l.includes('polity')) return { color: '#4A90E2', bg: 'bg-blue-50', text: 'text-blue-600', icon: '⚖️' }
  if (l.includes('hist')) return { color: '#8B4513', bg: 'bg-amber-50', text: 'text-amber-700', icon: '🏛️' }
  if (l.includes('geo')) return { color: '#007AFF', bg: 'bg-blue-50', text: 'text-blue-600', icon: '🌍' }
  if (l.includes('econ')) return { color: '#FF3B30', bg: 'bg-red-50', text: 'text-red-600', icon: '📈' }
  if (l.includes('environ')) return { color: '#34C759', bg: 'bg-green-50', text: 'text-green-600', icon: '🌿' }
  if (l.includes('science') || l.includes('tech')) return { color: '#5856D6', bg: 'bg-indigo-50', text: 'text-indigo-600', icon: '🔬' }
  return { color: '#4A90E2', bg: 'bg-blue-50', text: 'text-blue-600', icon: '📚' }
}

function formatTimerPreview(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (s === 0) return `${m}:00`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
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
  const { track } = useAnalytics()

  const [activeTab, setActiveTab] = useState<'mock' | 'full' | 'subject'>(
    tabParam === 'full' ? 'full' : tabParam === 'subject' ? 'subject' : 'mock'
  )
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

  // Mock tab state
  type MockSubjectWithCount = Subject & { count: number }
  const [mocks, setMocks] = useState<Mock[]>([])
  const [loadingMocks, setLoadingMocks] = useState(true)
  const [loadingMockId, setLoadingMockId] = useState<string | null>(null)
  const [mockSubjects, setMockSubjects] = useState<MockSubjectWithCount[]>([])
  const [loadingMockSubjects, setLoadingMockSubjects] = useState(true)
  const [mockConfigSubject, setMockConfigSubject] = useState<MockSubjectWithCount | null>(null)
  const [mockSelectedDifficulty, setMockSelectedDifficulty] = useState<Difficulty>('All')
  const [mockQuestionCount, setMockQuestionCount] = useState(20)
  const [mockStartLoading, setMockStartLoading] = useState(false)

  // Previous sessions
  const [mockSessions, setMockSessions] = useState<TestSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        setUserName(user.name || 'Aspirant')
        listTestSessions({ userId: user.$id, examType: 'INDICORE_MOCK', sort: 'newest', limit: 5 })
          .then(r => setMockSessions(r.documents))
          .catch(() => {})
          .finally(() => setLoadingSessions(false))
      } else {
        setLoadingSessions(false)
      }
    })

    const fetchSubjects = async () => {
      try {
        const cached = sessionStorage.getItem('subjects_with_counts_v2')
        if (cached) {
          setSubjects(JSON.parse(cached))
          setLoadingSubjects(false)
          return
        }
        const result = await getSubjectsWithCounts()
        const docs = result.documents as unknown as SubjectWithCount[]
        sessionStorage.setItem('subjects_with_counts_v2', JSON.stringify(docs))
        setSubjects(docs)
      } catch {
        toast.error('Failed to load subjects')
      } finally {
        setLoadingSubjects(false)
      }
    }
    fetchSubjects()

    const fetchMocks = async () => {
      try {
        const result = await listMocks()
        setMocks(result.documents)
      } catch {
        toast.error('Failed to load mocks')
      } finally {
        setLoadingMocks(false)
      }
    }
    const fetchMockSubjects = async () => {
      try {
        const result = await getSubjectsWithMockCounts()
        setMockSubjects(result.documents as unknown as MockSubjectWithCount[])
      } catch {
        toast.error('Failed to load mock subjects')
      } finally {
        setLoadingMockSubjects(false)
      }
    }
    fetchMocks()
    fetchMockSubjects()
  }, [])

  // ── Full Length PYQ Test ──
  const handleStartTest = async (paper: typeof PAPER_OPTIONS[0]) => {
    setLoadingCardId(paper.id)
    try {
      const result = await getQuestions({ limit: paper.questions, examType: paper.examType, year: paper.year })
      if (!result.documents?.length) { toast.error('No questions found.'); setLoadingCardId(null); return }
      useQuizStore.getState().resetQuiz()
      setQuestions(result.documents as unknown as Question[])
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel(`${paper.label} ${paper.year}`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start test')
      setLoadingCardId(null)
    }
  }

  // ── Full Mock ──
  const handleStartMock = async (mock: Mock) => {
    setLoadingMockId(mock.$id)
    try {
      useQuizStore.getState().resetQuiz()
      const allQuestions: Question[] = []
      const batches = await Promise.all(
        mock.subject_weights.map(weight =>
          getQuestions({
            examType: 'INDICORE_MOCK',
            subjectId: weight.subjectId,
            limit: weight.count * 2,
          }).then(result => {
            const batch = result.documents as unknown as Question[]
            return shuffleArray(batch).slice(0, weight.count)
          })
        )
      )
      for (const batch of batches) allQuestions.push(...batch)
      if (allQuestions.length === 0) {
        toast.error('No mock questions available yet. Upload questions first.')
        setLoadingMockId(null)
        return
      }
      setQuestions(shuffleArray(allQuestions))
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel(mock.name)
      track('mock_test_started', { mock_id: mock.$id, mock_title: mock.name })
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start mock test')
      setLoadingMockId(null)
    }
  }

  // ── Retake a previous session ──
  const handleRetake = async (session: TestSession) => {
    setLoadingCardId(session.$id)
    try {
      const ids: string[] = JSON.parse(session.question_ids ?? '[]')
      if (!ids.length) { toast.error('No question IDs saved for this session.'); setLoadingCardId(null); return }
      const result = await getQuestionsByIds(ids)
      if (!result.documents.length) { toast.error('Questions not found.'); setLoadingCardId(null); return }
      useQuizStore.getState().resetQuiz()
      const shuffled = shuffleArray(result.documents as unknown as Question[])
      setQuestions(shuffled)
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel((session.paper_label ?? 'Mock') + ' · Retake')
      track('test_retaken', { session_id: session.$id })
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start retake')
      setLoadingCardId(null)
    }
  }

  // ── Subject Practice ──
  const openConfig = (subj: SubjectWithCount) => {
    setConfigSubject(subj)
    setSelectedDifficulty('All')
    setQuestionCount(20)
  }

  const handleStartPractice = async () => {
    if (!configSubject) return
    setStartLoading(true)
    try {
      const cap = Math.min(questionCount, configSubject.count || questionCount)
      const filters: Parameters<typeof getQuestions>[0] = {
        subjectId: configSubject.$id,
        examType: 'INDICORE_MOCK',
        limit: cap,
      }
      if (selectedDifficulty !== 'All') filters.difficulty = selectedDifficulty.toLowerCase()
      const result = await getQuestions(filters)
      if (!result.documents?.length) {
        toast.error('No questions found. Try a different difficulty or count.')
        setStartLoading(false)
        return
      }
      useQuizStore.getState().resetQuiz()
      const qs = result.documents as unknown as Question[]
      setQuestions(qs)
      setTestMode(true)
      setPracticeTimerTotal(qs.length * SECONDS_PER_QUESTION)
      setPaperLabel(`${configSubject.Name} · ${selectedDifficulty === 'All' ? 'All' : selectedDifficulty} · ${qs.length}Q`)
      track('subject_practice_started', {
        subject_name: configSubject.Name,
        question_count: qs.length,
      })
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start practice')
      setStartLoading(false)
    }
  }

  // ── Subject-wise Mock Practice ──
  const handleStartMockPractice = async () => {
    if (!mockConfigSubject) return
    setMockStartLoading(true)
    try {
      const filters: Parameters<typeof getQuestions>[0] = {
        examType: 'INDICORE_MOCK',
        subjectId: mockConfigSubject.$id,
        limit: mockQuestionCount * 2,
      }
      if (mockSelectedDifficulty !== 'All') filters.difficulty = mockSelectedDifficulty.toLowerCase()
      const result = await getQuestions(filters)
      if (!result.documents?.length) {
        toast.error('No mock questions found. Try a different difficulty.')
        setMockStartLoading(false)
        return
      }
      useQuizStore.getState().resetQuiz()
      const shuffled = shuffleArray(result.documents as unknown as Question[])
      const finalQs = mockSelectedDifficulty === 'All' ? shuffled.slice(0, mockQuestionCount) : shuffled
      setQuestions(finalQs)
      setTestMode(true)
      setPracticeTimerTotal(finalQs.length * SECONDS_PER_QUESTION)
      setPaperLabel(`${mockConfigSubject.Name} · Mock · ${mockSelectedDifficulty === 'All' ? 'All' : mockSelectedDifficulty} · ${finalQs.length}Q`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start mock practice')
      setMockStartLoading(false)
    }
  }

  const handleStartMockFullLength = async () => {
    if (!mockConfigSubject) return
    setMockStartLoading(true)
    try {
      const result = await getQuestions({
        examType: 'INDICORE_MOCK',
        subjectId: mockConfigSubject.$id,
        limit: mockConfigSubject.count + 50,
      })
      if (!result.documents?.length) {
        toast.error('No mock questions found for this subject.')
        setMockStartLoading(false)
        return
      }
      useQuizStore.getState().resetQuiz()
      const finalQs = shuffleArray(result.documents as unknown as Question[])
      setQuestions(finalQs)
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel(`${mockConfigSubject.Name} · Full Mock · ${finalQs.length}Q`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start full mock')
      setMockStartLoading(false)
    }
  }

  const totalTimerSeconds = questionCount * SECONDS_PER_QUESTION

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-4 md:pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="h-9 md:h-12 w-9 md:w-12 bg-blue-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <LayoutGrid className="h-5 md:h-6 w-5 md:w-6" />
          </div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight">
            {activeTab === 'full' ? 'PYQ Tests' : activeTab === 'mock' ? 'Mock Tests' : 'Practice Lab'}
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="h-9 md:h-12 w-9 md:w-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-[#4A90E2] transition-colors">
            <Search className="h-4 md:h-5 w-4 md:w-5" />
          </button>
          <div className="h-9 md:h-12 w-9 md:w-12 rounded-full bg-gray-900 border-2 border-white shadow-md overflow-hidden ring-2 md:ring-4 ring-gray-50">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="User" />
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-3xl mx-auto px-3 md:px-6 mt-3 md:mt-4">
        <div className="bg-gray-100 p-1 md:p-1.5 rounded-[1.5rem] md:rounded-[2rem] flex h-11 md:h-16">
          <button
            onClick={() => { setActiveTab('mock'); setMockConfigSubject(null); setMockSelectedDifficulty('All'); setMockQuestionCount(20) }}
            className={`flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'mock' ? 'bg-[#4A90E2] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Mock Test
          </button>
          <button
            onClick={() => { setActiveTab('full'); setConfigSubject(null) }}
            className={`flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'full' ? 'bg-[#4A90E2] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            PYQ
          </button>
          <button
            onClick={() => { setActiveTab('subject'); setConfigSubject(null) }}
            className={`flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'subject' ? 'bg-[#4A90E2] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Subject Practice
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 md:px-6 mt-8 md:mt-16">

        {/* ── MOCK TEST TAB ── */}
        {activeTab === 'mock' && (
          <div className="space-y-12">

            {/* Full Length Mocks */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <h2 className="text-3xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase">INDICORE MOCK.</h2>
                <div className="flex bg-gray-100 p-1.5 rounded-full h-10 px-3 w-fit">
                  <span className="text-[10px] font-black text-white bg-black rounded-full px-5 uppercase tracking-tighter flex items-center">Full Length</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingMocks
                  ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)
                  : mocks.filter(m => m.subject_weights.length > 1).length === 0
                    ? (
                      <div className="col-span-3 bg-white rounded-[2.5rem] border border-gray-100 p-10 text-center">
                        <p className="text-sm font-bold text-gray-500">Full-length mocks coming soon</p>
                        <p className="text-xs text-gray-400 mt-1">Multi-subject mock tests will appear here once configured</p>
                      </div>
                    )
                    : mocks.filter(m => m.subject_weights.length > 1).map((mock, idx) => {
                        const theme = idx === 0 ? 'blue' : idx === 1 ? 'black' : 'gray'
                        return (
                          <div key={mock.$id} className="relative bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-5 md:p-8 group hover:shadow-xl hover:border-blue-100 transition-all flex flex-col">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 font-mono">INDICORE MOCK</p>
                            <h3 className="text-lg md:text-2xl font-black text-gray-900 mb-4 md:mb-6">{mock.name}</h3>
                            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5 md:mb-8 mt-auto">
                              <div>
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-wider mb-1">Questions</p>
                                <p className="text-sm font-black text-gray-900">100</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-wider mb-1">Duration</p>
                                <p className="text-sm font-black text-gray-900">2 Hr</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-wider mb-1">Marks</p>
                                <p className="text-sm font-black text-gray-900">200</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStartMock(mock)}
                              disabled={loadingMockId === mock.$id}
                              className={`h-12 md:h-16 w-full rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-60 ${
                                theme === 'black'
                                  ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                                  : theme === 'gray'
                                    ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-lg shadow-gray-200'
                                    : 'bg-[#4A90E2] text-white hover:bg-blue-600 shadow-lg shadow-blue-100'
                              }`}
                            >
                              {loadingMockId === mock.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Attempt Test <ArrowRight className="h-4 w-4" /></>}
                            </button>
                          </div>
                        )
                      })}
              </div>
            </div>

            {/* Previous Sessions */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Previous Sessions</h3>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              {loadingSessions ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-64 flex-none rounded-[2rem]" />)}
                </div>
              ) : mockSessions.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-gray-100 p-10 text-center">
                  <p className="text-sm font-bold text-gray-500">Complete your first mock to see your history here.</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {mockSessions.map(session => (
                    <div key={session.$id} className="flex-none w-64 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{formatDate(session.submitted_at)}</p>
                      <p className="text-sm font-black text-gray-900 leading-snug line-clamp-2">{session.paper_label}</p>
                      {(() => {
                        const marksScored = Math.max(0, parseFloat(((session.correct ?? 0) * 2 - (session.incorrect ?? 0) * (2 / 3)).toFixed(1)))
                        const totalMarks  = (session.total_questions ?? 0) * 2
                        return (
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-gray-900">{marksScored}</span>
                            <span className="text-xs font-bold text-gray-400">/ {totalMarks} marks</span>
                          </div>
                        )
                      })()}
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => router.push('/results?session=' + session.$id)}
                          className="flex-1 h-10 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> Review
                        </button>
                        <button
                          onClick={() => handleRetake(session)}
                          disabled={loadingCardId === session.$id}
                          className="flex-1 h-10 rounded-xl bg-[#4A90E2] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {loadingCardId === session.$id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCcw className="h-3.5 w-3.5" /> Retake</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── PYQ TAB ── */}
        {activeTab === 'full' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <h2 className="text-3xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase">UPSC CSE.</h2>
              <div className="flex bg-gray-100 p-1.5 rounded-full h-10 px-3 w-fit">
                <button className="text-[10px] font-black text-white bg-black rounded-full px-5 uppercase tracking-tighter">Prelims</button>
                <button className="text-[10px] font-black text-gray-400 px-5 uppercase tracking-tighter">Mains</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PAPER_OPTIONS.map(paper => (
                <div key={paper.id} className="relative bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-5 md:p-8 group hover:shadow-xl hover:border-blue-100 transition-all flex flex-col">
                  <div className="absolute top-4 md:top-6 right-5 md:right-8 text-[48px] md:text-[72px] font-black text-gray-50 select-none -z-10 tracking-tighter group-hover:scale-110 transition-transform">{paper.year}</div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 font-mono">UPSC PRELIMS</p>
                  <div className="flex items-baseline gap-2 md:gap-3 mb-1 md:mb-2">
                    <h3 className="text-lg md:text-2xl font-black text-gray-900">{paper.label}</h3>
                    <span className="text-sm font-black text-gray-400">{paper.year}</span>
                  </div>
                  <p className="text-xs text-gray-400 font-semibold mb-4 md:mb-8">Prelims · General Studies · Paper I</p>
                  <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5 md:mb-10 mt-auto">
                    <div><p className="text-[9px] font-black text-gray-300 uppercase tracking-wider mb-1">Questions</p><p className="text-sm font-black text-gray-900">{paper.questions}</p></div>
                    <div><p className="text-[9px] font-black text-gray-300 uppercase tracking-wider mb-1">Duration</p><p className="text-sm font-black text-gray-900">{paper.time}</p></div>
                    <div><p className="text-[9px] font-black text-gray-300 uppercase tracking-wider mb-1">Marks</p><p className="text-sm font-black text-gray-900">{paper.marks}</p></div>
                  </div>
                  <button
                    onClick={() => handleStartTest(paper)}
                    disabled={loadingCardId === paper.id}
                    className={`h-12 md:h-16 w-full rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-60 ${
                      paper.theme === 'black' ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                      : paper.theme === 'gray' ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-lg shadow-gray-200'
                      : 'bg-[#4A90E2] text-white hover:bg-blue-600 shadow-lg shadow-blue-100'
                    }`}
                  >
                    {loadingCardId === paper.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start Test <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#111111] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden p-6 md:p-10 text-white relative">
                <span className="inline-block px-3 py-1 bg-[#4A90E2] text-[10px] font-black uppercase tracking-widest rounded-full mb-4 md:mb-6">Adaptive Learning</span>
                <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-3 md:mb-6">Focus on Weak<br />Subjects</h3>
                <p className="text-xs md:text-sm text-gray-400 font-medium leading-relaxed mb-6 md:mb-10 max-w-md">Practice subject-wise to target your weak areas and boost your score.</p>
                <button onClick={() => setActiveTab('subject')} className="bg-white text-black px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-xl">Go to Subjects</button>
              </div>
              <div className="bg-[#FFF8EF] rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 flex flex-col">
                <div className="h-10 md:h-14 w-10 md:w-14 bg-white rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center mb-5 md:mb-8">
                  <Sparkles className="h-5 md:h-7 w-5 md:w-7 text-blue-600" />
                </div>
                <h4 className="text-xl md:text-2xl font-black text-gray-900 mb-2 md:mb-4">Previous Analysis</h4>
                <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed mb-6 md:mb-10">Review your mistakes to improve your current score.</p>
                <button onClick={() => router.push('/tests')} className="mt-auto text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:translate-x-2 transition-transform">
                  View My Tests <ArrowRight className="h-4 md:h-5 w-4 md:w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBJECT PRACTICE TAB ── */}
        {activeTab === 'subject' && (
          <div className="space-y-12">
            {!configSubject ? (
              <>
                <div>
                  <h2 className="text-3xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none">Subject-wise<br />Practice</h2>
                  <p className="text-sm md:text-lg text-gray-400 font-medium mt-3 md:mt-6 max-w-xl leading-relaxed">Pick a subject, choose your question count and difficulty, and start a timed practice session.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loadingSubjects
                    ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-[2.5rem]" />)
                    : subjects.map(subj => {
                        const accent = getSubjectAccent(subj.Name)
                        return (
                          <div key={subj.$id}
                            className="relative bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-5 md:p-8 hover:shadow-xl hover:border-blue-50 transition-all group flex flex-col cursor-pointer"
                            onClick={() => openConfig(subj)}
                          >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: accent.color }} />
                            <div className="flex items-start justify-between mb-4 md:mb-8">
                              <div className={`h-12 md:h-16 w-12 md:w-16 ${accent.bg} rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl shadow-sm group-hover:scale-110 transition-transform`}>{accent.icon}</div>
                              <div className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${accent.bg} ${accent.text}`}>{subj.slug?.split('-')[0] ?? subj.Name.slice(0, 4)}</div>
                            </div>
                            <h3 className="text-base md:text-2xl font-black text-gray-900 mb-1 md:mb-2">{subj.Name}</h3>
                            <div className="mt-4 md:mt-10 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#4A90E2]">
                              Configure & Start <ChevronRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                            </div>
                          </div>
                        )
                      })}
                </div>
              </>
            ) : (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button onClick={() => setConfigSubject(null)} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 mb-8 transition-colors">
                  <X className="h-4 w-4" /> Back to subjects
                </button>
                {(() => {
                  const accent = getSubjectAccent(configSubject.Name)
                  return (
                    <div className={`${accent.bg} rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 mb-5 md:mb-8 flex items-center gap-4 md:gap-6 border-2`} style={{ borderColor: accent.color + '30' }}>
                      <div className="text-3xl md:text-5xl">{accent.icon}</div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accent.color }}>Subject Practice</p>
                        <h2 className="text-xl md:text-3xl font-black text-gray-900">{configSubject.Name}</h2>
                      </div>
                    </div>
                  )
                })()}
                <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm p-5 md:p-8 space-y-7 md:space-y-10">
                  {selectedDifficulty === 'All' && (
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 bg-blue-50 rounded-2xl flex items-center justify-center"><Target className="h-5 w-5 text-blue-600" /></div>
                        <div><p className="text-sm font-black text-gray-900">Questions</p><p className="text-xs text-gray-400">How many questions to practice</p></div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {QUESTION_COUNT_OPTIONS.map(n => (
                          <button key={n} onClick={() => setQuestionCount(n)}
                            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all border-2 ${questionCount === n ? 'bg-[#4A90E2] border-[#4A90E2] text-white shadow-lg shadow-blue-100 scale-105' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 bg-purple-50 rounded-2xl flex items-center justify-center"><Zap className="h-5 w-5 text-purple-600" /></div>
                      <div><p className="text-sm font-black text-gray-900">Difficulty</p><p className="text-xs text-gray-400">Filter questions by difficulty level</p></div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {DIFFICULTY_OPTIONS.map(d => (
                        <button key={d} onClick={() => setSelectedDifficulty(d)} className={getDifficultyStyle(d, selectedDifficulty === d)}>
                          {d === 'Easy' ? '🟢' : d === 'Medium' ? '🟡' : d === 'Hard' ? '🔴' : '⚡'} {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                      <p className="text-xl font-black text-gray-900">{selectedDifficulty === 'All' ? questionCount : 'All'}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Questions</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                      <p className="text-xl font-black text-gray-900">{formatTimerPreview(totalTimerSeconds)}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Timer</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                      <p className={`text-xl font-black ${selectedDifficulty === 'Easy' ? 'text-green-600' : selectedDifficulty === 'Medium' ? 'text-amber-500' : selectedDifficulty === 'Hard' ? 'text-red-500' : 'text-gray-900'}`}>{selectedDifficulty}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Difficulty</p>
                    </div>
                  </div>
                  <button onClick={handleStartPractice} disabled={startLoading}
                    className="w-full h-14 md:h-20 bg-gradient-to-r from-[#4A90E2] to-[#3a7fd4] rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center gap-3 md:gap-4 text-white font-black tracking-widest uppercase shadow-xl shadow-blue-100 hover:scale-[1.01] hover:shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {startLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Begin Practice <ArrowRight className="h-5 w-5 md:h-6 md:w-6" /></>}
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

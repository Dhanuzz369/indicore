'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjectsWithCounts, getQuestions, listMocks, getSubjectsWithMockCounts, listTestSessions, getQuestionsByIds, getSeenMockQuestionIds } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth'
import { useQuizStore } from '@/store/quiz-store'
import { toast } from 'sonner'
import {
  Loader2, ArrowRight, LayoutGrid, FileText, Sparkles, X,
  Clock, Zap, Target, ChevronRight, Search, RotateCcw, Eye,
  BookOpen, Trophy, FlameIcon, CheckCircle2, TimerIcon,
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

const DIFFICULTY_OPTIONS = ['All', 'Basic', 'Intermediate', 'Advanced'] as const
const DIFFICULTY_TO_DB: Record<string, string> = {
  Basic: 'easy',
  Intermediate: 'medium',
  Advanced: 'hard',
}
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
    case 'Basic': return `${base} bg-green-500 border-green-500 text-white shadow-md shadow-green-100`
    case 'Intermediate': return `${base} bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100`
    case 'Advanced': return `${base} bg-red-500 border-red-500 text-white shadow-md shadow-red-100`
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

  // Highlight Mock 1 when navigated from nudge modal
  const highlightParam = searchParams.get('highlight')
  const [highlighted, setHighlighted] = useState(highlightParam === 'mock1')

  useEffect(() => {
    if (!highlighted) return
    const timer = setTimeout(() => setHighlighted(false), 5000)
    return () => clearTimeout(timer)
  }, [highlighted])

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

      // Fetch the full set of question IDs this user has already seen in any mock
      const user = await getCurrentUser()
      const seenIds = user ? await getSeenMockQuestionIds(user.$id) : new Set<string>()
      const seenArr = [...seenIds]

      // Helper: fetch fresh questions (unseen), fall back to seen ones to fill the gap
      const fetchWithFallback = async (
        params: Parameters<typeof getQuestions>[0],
        needed: number
      ): Promise<Question[]> => {
        // Fresh first — exclude already-seen IDs
        const fresh = shuffleArray(
          (await getQuestions({ ...params, excludeIds: seenArr, limit: needed * 3 }))
            .documents as unknown as Question[]
        ).slice(0, needed)

        if (fresh.length >= needed) return fresh

        // Not enough fresh — pad with seen questions to reach the target count
        const stillNeeded = needed - fresh.length
        const freshIds = new Set(fresh.map(q => q.$id))
        const fallback = shuffleArray(
          (await getQuestions({ ...params, limit: stillNeeded * 3 }))
            .documents as unknown as Question[]
        ).filter(q => !freshIds.has(q.$id)).slice(0, stillNeeded)

        return [...fresh, ...fallback]
      }

      const allQuestions: Question[] = []

      for (const weight of mock.subject_weights) {
        // Path A — subtopic groups (e.g. History: ancient / medieval / modern)
        if (weight.subtopic_groups && weight.subtopic_groups.length > 0) {
          // Fetch full unseen pool for this subject, then split by keyword groups
          const freshPool = (await getQuestions({
            examType: 'INDICORE_MOCK',
            subjectId: weight.subjectId,
            excludeIds: seenArr,
            limit: 500,
          })).documents as unknown as Question[]

          // Also keep a seen fallback pool ready
          const seenPool = (await getQuestions({
            examType: 'INDICORE_MOCK',
            subjectId: weight.subjectId,
            limit: 500,
          })).documents as unknown as Question[]

          for (const group of weight.subtopic_groups) {
            const matchFresh = shuffleArray(
              freshPool.filter(q =>
                group.keywords.some(kw =>
                  (q.subtopic ?? '').toLowerCase().includes(kw.toLowerCase())
                )
              )
            ).slice(0, group.count)

            let picked = matchFresh
            if (picked.length < group.count) {
              // Pad from seen pool for this subtopic group
              const pickedIds = new Set(picked.map(q => q.$id))
              const fallback = shuffleArray(
                seenPool.filter(q =>
                  !pickedIds.has(q.$id) &&
                  group.keywords.some(kw =>
                    (q.subtopic ?? '').toLowerCase().includes(kw.toLowerCase())
                  )
                )
              ).slice(0, group.count - picked.length)
              picked = [...picked, ...fallback]
            }
            allQuestions.push(...picked)
          }
          continue
        }

        // Path B — per-difficulty counts
        if (weight.easy_count !== undefined || weight.medium_count !== undefined || weight.hard_count !== undefined) {
          const slots = [
            { difficulty: 'easy',   count: weight.easy_count   ?? 0 },
            { difficulty: 'medium', count: weight.medium_count ?? 0 },
            { difficulty: 'hard',   count: weight.hard_count   ?? 0 },
          ].filter(s => s.count > 0)

          const diffBatches = await Promise.all(
            slots.map(slot =>
              fetchWithFallback(
                { examType: 'INDICORE_MOCK', subjectId: weight.subjectId, difficulty: slot.difficulty },
                slot.count
              )
            )
          )
          for (const b of diffBatches) allQuestions.push(...b)
          continue
        }

        // Path C — legacy: random selection, no difficulty spec
        const batch = await fetchWithFallback(
          { examType: 'INDICORE_MOCK', subjectId: weight.subjectId },
          weight.count
        )
        allQuestions.push(...batch)
      }

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
      if (selectedDifficulty !== 'All') filters.difficulty = DIFFICULTY_TO_DB[selectedDifficulty]
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
      if (mockSelectedDifficulty !== 'All') filters.difficulty = DIFFICULTY_TO_DB[mockSelectedDifficulty]
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
    <div className="min-h-screen bg-[#F8F9FC] pb-32">

      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <p className="text-xs font-semibold text-[#4A90E2] uppercase tracking-widest mb-1">
            {activeTab === 'full' ? 'Previous Year Questions' : activeTab === 'mock' ? 'Indicore Mock Series' : 'Subject Practice'}
          </p>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
            {activeTab === 'full' ? 'PYQ Tests' : activeTab === 'mock' ? 'Mock Tests' : 'Practice Lab'}
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-1">
            {activeTab === 'full'
              ? 'Attempt original UPSC Prelims papers under timed conditions'
              : activeTab === 'mock'
              ? 'Full-length simulated exams designed to replicate UPSC Prelims'
              : 'Targeted subject-wise practice to sharpen your weak areas'}
          </p>
        </div>

        {/* ── TABS ── */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex gap-0 border-t border-gray-100">
          {([
            { id: 'mock',    label: 'Mock Tests',        icon: Trophy },
            { id: 'full',    label: 'PYQ',               icon: FileText },
            { id: 'subject', label: 'Subject Practice',  icon: BookOpen },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                track('tab_switched', { from_tab: activeTab, to_tab: tab.id })
                if (tab.id === 'mock') { setActiveTab('mock'); setMockConfigSubject(null); setMockSelectedDifficulty('All'); setMockQuestionCount(20) }
                else if (tab.id === 'full') { setActiveTab('full'); setConfigSubject(null) }
                else { setActiveTab('subject'); setConfigSubject(null) }
              }}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-[#4A90E2] text-[#4A90E2]'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-10">

        {/* ────────────────── MOCK TEST TAB ────────────────── */}
        {activeTab === 'mock' && (
          <div className="space-y-10">

            {/* Full-Length Mocks */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Full-Length Mock Tests</h2>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">100 questions · 2 hours · −⅓ negative marking</p>
                </div>
                <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#4A90E2] text-[11px] font-black rounded-full uppercase tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5" /> UPSC Pattern
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {loadingMocks
                  ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
                  : mocks.filter(m => m.subject_weights.length > 1).length === 0
                    ? (
                      <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-10 text-center">
                        <Trophy className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-500">Full-length mocks coming soon</p>
                        <p className="text-xs text-gray-400 mt-1">Multi-subject mock tests will appear here once configured</p>
                      </div>
                    )
                    : mocks.filter(m => m.subject_weights.length > 1).map((mock, idx) => {
                        const isMock1 = idx === 0
                        const gradients = [
                          'from-[#4A90E2] to-[#6366f1]',
                          'from-gray-800 to-gray-900',
                          'from-slate-700 to-slate-800',
                        ]
                        const gradient = gradients[idx % gradients.length]
                        return (
                          <div
                            key={mock.$id}
                            className={`relative rounded-2xl overflow-hidden flex flex-col group transition-all hover:-translate-y-0.5 hover:shadow-xl ${highlighted && isMock1 ? 'ring-2 ring-[#4A90E2] ring-offset-2' : ''}`}
                            onMouseEnter={() => track('mock_card_viewed', { mock_name: mock.name, total_questions: mock.subject_weights?.reduce((sum: number, w: any) => sum + w.count, 0) ?? 0 })}
                          >
                            {/* gradient header */}
                            <div className={`bg-gradient-to-br ${gradient} p-5 md:p-6 relative overflow-hidden`}>
                              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
                              <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />
                              {highlighted && isMock1 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-white/80 uppercase tracking-wider mb-2">
                                  ✨ Recommended
                                </span>
                              )}
                              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1 relative">INDICORE MOCK</p>
                              <h3 className="text-base md:text-xl font-black text-white relative leading-snug">{mock.name}</h3>
                            </div>
                            {/* card body */}
                            <div className="bg-white flex-1 flex flex-col p-5 border border-gray-100 rounded-b-2xl border-t-0">
                              <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                  <p className="text-sm font-black text-gray-900">100</p>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Qs</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                  <p className="text-sm font-black text-gray-900">2 Hr</p>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Time</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                  <p className="text-sm font-black text-gray-900">200</p>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Marks</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleStartMock(mock)}
                                disabled={loadingMockId === mock.$id}
                                className="mt-auto h-11 w-full rounded-xl bg-[#4A90E2] text-white flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-md shadow-blue-100 disabled:opacity-60"
                              >
                                {loadingMockId === mock.$id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <>Attempt <ArrowRight className="h-4 w-4" /></>
                                }
                              </button>
                            </div>
                          </div>
                        )
                      })}
              </div>
            </section>

            {/* Previous Sessions */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="text-lg font-black text-gray-900 whitespace-nowrap">Previous Sessions</h2>
                <div className="h-px flex-1 bg-gray-100" />
                {mockSessions.length > 0 && (
                  <button onClick={() => router.push('/tests')} className="text-[11px] font-black text-[#4A90E2] uppercase tracking-wider whitespace-nowrap hover:underline">
                    View all
                  </button>
                )}
              </div>

              {loadingSessions ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                </div>
              ) : mockSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                  <TimerIcon className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">No sessions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Complete your first mock to see your history here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mockSessions.map(session => {
                    const marksScored = Math.max(0, parseFloat(((session.correct ?? 0) * 2 - (session.incorrect ?? 0) * (2 / 3)).toFixed(1)))
                    const totalMarks  = (session.total_questions ?? 0) * 2
                    const pct = totalMarks > 0 ? Math.round((marksScored / totalMarks) * 100) : 0
                    return (
                      <div key={session.$id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-[#4A90E2] uppercase tracking-widest">{formatDate(session.submitted_at)}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${pct >= 60 ? 'bg-green-50 text-green-600' : pct >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                            {pct}%
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">{session.paper_label}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-gray-900">{marksScored}</span>
                          <span className="text-xs font-bold text-gray-400">/ {totalMarks} marks</span>
                        </div>
                        <div className="flex gap-2 mt-auto pt-1">
                          <button
                            onClick={() => router.push('/results?session=' + session.$id)}
                            className="flex-1 h-9 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review
                          </button>
                          <button
                            onClick={() => handleRetake(session)}
                            disabled={loadingCardId === session.$id}
                            className="flex-1 h-9 rounded-xl bg-[#4A90E2] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                          >
                            {loadingCardId === session.$id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCcw className="h-3.5 w-3.5" /> Retake</>}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

          </div>
        )}

        {/* ────────────────── PYQ TAB ────────────────── */}
        {activeTab === 'full' && (
          <div className="space-y-10">

            {/* Year filter row */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Filter:</span>
              <div className="flex bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                <button className="text-[11px] font-black text-white bg-gray-900 rounded-lg px-4 py-1.5 uppercase tracking-widest">Prelims</button>
                <button className="text-[11px] font-black text-gray-400 px-4 py-1.5 uppercase tracking-widest">Mains</button>
              </div>
            </div>

            {/* PYQ cards */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-gray-900">UPSC Civil Services</h2>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Prelims · General Studies Paper I</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {PAPER_OPTIONS.map(paper => (
                  <div
                    key={paper.id}
                    className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-5 md:p-6 group hover:shadow-lg hover:border-blue-100 transition-all flex flex-col"
                  >
                    {/* watermark year */}
                    <div className="absolute top-3 right-4 text-[56px] md:text-[72px] font-black text-gray-50 select-none tracking-tighter group-hover:scale-105 transition-transform leading-none">
                      {paper.year}
                    </div>
                    <p className="text-[10px] font-black text-[#4A90E2] uppercase tracking-widest mb-1">UPSC PRELIMS</p>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <h3 className="text-lg font-black text-gray-900">{paper.label}</h3>
                      <span className="text-sm font-black text-gray-400">{paper.year}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-semibold mb-6">General Studies · Paper I</p>
                    <div className="grid grid-cols-3 gap-3 mb-5 mt-auto">
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-sm font-black text-gray-900">{paper.questions}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Qs</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-sm font-black text-gray-900">{paper.time}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Time</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-sm font-black text-gray-900">{paper.marks}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Marks</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartTest(paper)}
                      disabled={loadingCardId === paper.id}
                      className={`h-11 w-full rounded-xl flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-60 ${
                        paper.theme === 'black' ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-md shadow-gray-200'
                        : paper.theme === 'gray' ? 'bg-slate-700 text-white hover:bg-slate-600 shadow-md shadow-gray-200'
                        : 'bg-[#4A90E2] text-white hover:bg-blue-600 shadow-md shadow-blue-100'
                      }`}
                    >
                      {loadingCardId === paper.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start Test <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Promo banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-2xl overflow-hidden p-6 md:p-8 text-white relative flex flex-col">
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
                <span className="inline-block px-3 py-1 bg-[#4A90E2] text-[10px] font-black uppercase tracking-widest rounded-full mb-4 w-fit">Adaptive</span>
                <h3 className="text-xl md:text-2xl font-black leading-snug mb-2">Focus on your<br />weak subjects</h3>
                <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">Practise subject-wise to target weak areas and boost your score faster.</p>
                <button
                  onClick={() => setActiveTab('subject')}
                  className="mt-auto bg-white text-gray-900 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors w-fit"
                >
                  Go to Subjects
                </button>
              </div>
              <div className="bg-[#FFF8EF] rounded-2xl p-6 md:p-8 flex flex-col">
                <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-[#4A90E2]" />
                </div>
                <h4 className="text-xl font-black text-gray-900 mb-2">Previous Analysis</h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">Review your mistakes to improve your current score.</p>
                <button onClick={() => router.push('/tests')} className="mt-auto text-[11px] font-black text-[#4A90E2] uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all w-fit">
                  View My Tests <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────── SUBJECT PRACTICE TAB ────────────────── */}
        {activeTab === 'subject' && (
          <div className="space-y-10">
            {!configSubject ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Choose a Subject</h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Pick a subject, choose difficulty & count, then start a timed session</p>
                  </div>
                  <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 text-[11px] font-black rounded-full uppercase tracking-wider">
                    <Zap className="h-3.5 w-3.5" /> Timed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {loadingSubjects
                    ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)
                    : subjects.map(subj => {
                        const accent = getSubjectAccent(subj.Name)
                        return (
                          <button
                            key={subj.$id}
                            onClick={() => openConfig(subj)}
                            className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-5 hover:shadow-lg hover:border-blue-100 transition-all group flex flex-col text-left"
                          >
                            {/* top accent line */}
                            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: accent.color }} />
                            <div className="flex items-start justify-between mb-4">
                              <div className={`h-11 w-11 ${accent.bg} rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                                {accent.icon}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${accent.bg} ${accent.text}`}>
                                {subj.slug?.split('-')[0] ?? subj.Name.slice(0, 4)}
                              </span>
                            </div>
                            <h3 className="text-sm font-black text-gray-900 mb-1 leading-snug">{subj.Name}</h3>
                            <p className="text-[11px] text-gray-400 font-medium">{subj.count ?? 0} questions</p>
                            <div className="mt-4 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" style={{ color: accent.color }}>
                              Start Practice <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        )
                      })}
                </div>
              </>
            ) : (
              /* ── Config panel ── */
              <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  onClick={() => setConfigSubject(null)}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-900 mb-6 transition-colors"
                >
                  <X className="h-4 w-4" /> Back to subjects
                </button>

                {/* subject hero */}
                {(() => {
                  const accent = getSubjectAccent(configSubject.Name)
                  return (
                    <div className="rounded-2xl p-5 mb-5 flex items-center gap-4 border-2" style={{ backgroundColor: accent.color + '10', borderColor: accent.color + '25' }}>
                      <div className={`h-12 w-12 ${accent.bg} rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>{accent.icon}</div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: accent.color }}>Subject Practice</p>
                        <h2 className="text-xl font-black text-gray-900">{configSubject.Name}</h2>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">{configSubject.count ?? 0} questions available</p>
                      </div>
                    </div>
                  )
                })()}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 space-y-6">

                  {/* Question count */}
                  {selectedDifficulty === 'All' && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-9 w-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0"><Target className="h-4.5 w-4.5 text-blue-600 h-[18px] w-[18px]" /></div>
                        <div>
                          <p className="text-sm font-black text-gray-900">Number of Questions</p>
                          <p className="text-xs text-gray-400">How many to practice in this session</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 flex-wrap">
                        {QUESTION_COUNT_OPTIONS.map(n => (
                          <button key={n} onClick={() => setQuestionCount(n)}
                            className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all border-2 ${questionCount === n ? 'bg-[#4A90E2] border-[#4A90E2] text-white shadow-md shadow-blue-100 scale-105' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Difficulty */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0"><Zap className="h-[18px] w-[18px] text-purple-600" /></div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Difficulty Level</p>
                        <p className="text-xs text-gray-400">Filter questions by difficulty</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 flex-wrap">
                      {DIFFICULTY_OPTIONS.map(d => (
                        <button key={d} onClick={() => setSelectedDifficulty(d)} className={getDifficultyStyle(d, selectedDifficulty === d)}>
                          {d === 'Basic' ? '🟢' : d === 'Intermediate' ? '🟡' : d === 'Advanced' ? '🔴' : '⚡'} {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Session summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3.5 text-center">
                      <p className="text-xl font-black text-[#4A90E2]">{selectedDifficulty === 'All' ? questionCount : '—'}</p>
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">Questions</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5 text-center">
                      <p className="text-xl font-black text-gray-900">{formatTimerPreview(totalTimerSeconds)}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Timer</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5 text-center">
                      <p className={`text-xl font-black ${selectedDifficulty === 'Basic' ? 'text-green-600' : selectedDifficulty === 'Intermediate' ? 'text-amber-500' : selectedDifficulty === 'Advanced' ? 'text-red-500' : 'text-gray-700'}`}>
                        {selectedDifficulty === 'All' ? 'All' : selectedDifficulty.slice(0, 4)}
                      </p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Level</p>
                    </div>
                  </div>

                  <button
                    onClick={handleStartPractice}
                    disabled={startLoading}
                    className="w-full h-13 py-3.5 bg-[#4A90E2] text-white rounded-xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-600 hover:shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {startLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Begin Practice <ArrowRight className="h-5 w-5" /></>}
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

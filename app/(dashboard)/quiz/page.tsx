'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  listMocks,
  getSubjectsWithMockCounts,
  getQuestions,
  listTestSessions,
  getQuestionsByIds,
} from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth'
import { useQuizStore } from '@/store/quiz-store'
import { toast } from 'sonner'
import { Loader2, ArrowRight, LayoutGrid, RotateCcw, Eye, Zap } from 'lucide-react'
import type { Question, Mock, TestSession } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

// Inline shape — AnalyticsResult is not exported from engine.ts
interface SubjectStat {
  subject: string
  correct: number
  total: number
}
interface ParsedAnalytics {
  subjectStats?: SubjectStat[]
}

// ── Main component ────────────────────────────────────────────────────────────

type MockSubjectWithCount = { $id: string; Name: string; count: number }

function QuizSetupContent() {
  const router = useRouter()
  const { setQuestions, setTestMode, setPaperLabel, setPracticeTimerTotal } = useQuizStore()

  // Zone 3 — full-length mocks
  const [mocks, setMocks] = useState<Mock[]>([])
  const [loadingMocks, setLoadingMocks] = useState(true)

  // Needed for weak-drill name → UUID resolution
  const [mockSubjects, setMockSubjects] = useState<MockSubjectWithCount[]>([])

  // Per-card / per-chip loading id
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)

  // Zone 1 — previous sessions
  const [mockSessions, setMockSessions] = useState<TestSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Zone 2 — weak subjects (derived client-side)
  const [weakSubjects, setWeakSubjects] = useState<{ name: string; accuracy: number }[]>([])
  const [weakDrillLoading, setWeakDrillLoading] = useState<string | null>(null)

  useEffect(() => {
    // Fetch full-length mocks
    listMocks()
      .then(r => setMocks(r.documents))
      .catch(() => toast.error('Failed to load mocks'))
      .finally(() => setLoadingMocks(false))

    // Fetch mock subjects for name→UUID resolution in weak drill
    getSubjectsWithMockCounts()
      .then(r => setMockSubjects(r.documents as unknown as MockSubjectWithCount[]))
      .catch(() => {})

    // Fetch last 5 INDICORE_MOCK sessions + derive weak subjects
    getCurrentUser().then(user => {
      if (!user) { setLoadingSessions(false); return }
      listTestSessions({ userId: user.$id, examType: 'INDICORE_MOCK', sort: 'newest', limit: 5 })
        .then(r => {
          setMockSessions(r.documents)
          // Derive weak subjects client-side — no extra DB call
          const accMap: Record<string, { correct: number; total: number }> = {}
          for (const session of r.documents) {
            try {
              const analytics: ParsedAnalytics = JSON.parse(session.analytics)
              for (const stat of analytics.subjectStats ?? []) {
                if (!accMap[stat.subject]) accMap[stat.subject] = { correct: 0, total: 0 }
                accMap[stat.subject].correct += stat.correct
                accMap[stat.subject].total += stat.total
              }
            } catch {
              // skip malformed analytics
            }
          }
          const weak = Object.entries(accMap)
            .filter(([, v]) => v.total >= 5)
            .map(([name, v]) => ({ name, accuracy: Math.round((v.correct / v.total) * 100) }))
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 3)
          setWeakSubjects(weak)
        })
        .catch(() => toast.error('Failed to load sessions'))
        .finally(() => setLoadingSessions(false))
    })
  }, [])

  // ── Zone 1: Retake a previous session ──────────────────────────────────────
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
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start retake')
      setLoadingCardId(null)
    }
  }

  // ── Zone 2: Weak subject drill ─────────────────────────────────────────────
  const handleWeakSubjectDrill = async (subjectName: string) => {
    const subject = mockSubjects.find(s => s.Name === subjectName)
    if (!subject) { toast.error('Subject not found'); return }
    setWeakDrillLoading(subjectName)
    try {
      const result = await getQuestions({ examType: 'INDICORE_MOCK', subjectId: subject.$id, limit: 40 })
      if (!result.documents.length) { toast.error('No questions found for this subject.'); setWeakDrillLoading(null); return }
      useQuizStore.getState().resetQuiz()
      const shuffled = shuffleArray(result.documents as unknown as Question[])
      setQuestions(shuffled)
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel(`${subjectName} · Weak Area Drill · ${shuffled.length}Q`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start drill')
      setWeakDrillLoading(null)
    }
  }

  // ── Zone 3: Start a full-length mock ───────────────────────────────────────
  const handleStartMock = async (mock: Mock) => {
    setLoadingCardId(mock.$id)
    try {
      useQuizStore.getState().resetQuiz()
      const batches = await Promise.all(
        mock.subject_weights.map(weight =>
          getQuestions({
            examType: 'INDICORE_MOCK',
            subjectId: weight.subjectId,
            limit: weight.count * 2,
          }).then(result => {
            const batch = shuffleArray(result.documents as unknown as Question[])
            return batch.slice(0, weight.count)
          })
        )
      )
      const all = shuffleArray(batches.flat())
      if (!all.length) { toast.error('No mock questions available yet.'); setLoadingCardId(null); return }
      setQuestions(all)
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel(mock.name)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start mock test')
      setLoadingCardId(null)
    }
  }

  const fullLengthMocks = mocks.filter(m => m.subject_weights.length > 1)

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Mock Tests</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-16">

        {/* ── ZONE 1: PREVIOUS SESSIONS ── */}
        <section>
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Previous Sessions</h2>

          {loadingSessions ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 w-64 flex-none rounded-[2rem]" />
              ))}
            </div>
          ) : mockSessions.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 p-10 text-center">
              <p className="text-sm font-bold text-gray-500">
                Complete your first mock to see your history here.
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {mockSessions.map(session => (
                <div
                  key={session.$id}
                  className="flex-none w-64 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-3"
                >
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {formatDate(session.submitted_at)}
                  </p>
                  <p className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                    {session.paper_label}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900">{session.score}%</span>
                    <span className="text-xs font-bold text-gray-400">
                      {session.correct}/{session.total_questions} correct
                    </span>
                  </div>
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
                      {loadingCardId === session.$id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><RotateCcw className="h-3.5 w-3.5" /> Retake</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── ZONE 2: WEAK SUBJECT STRIP ── */}
        {mockSessions.length > 0 && weakSubjects.length > 0 && (
          <section>
            <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest">
                  Focus on Your Weak Areas
                </h2>
              </div>
              <p className="text-xs text-blue-600 font-semibold mb-4">
                Based on your last {mockSessions.length} mock session{mockSessions.length > 1 ? 's' : ''}
              </p>
              <div className="flex gap-3 flex-wrap">
                {weakSubjects.map(ws => (
                  <button
                    key={ws.name}
                    onClick={() => handleWeakSubjectDrill(ws.name)}
                    disabled={weakDrillLoading === ws.name}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-blue-200 text-sm font-black text-gray-900 hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-60"
                  >
                    {weakDrillLoading === ws.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {ws.name}
                        <span className="text-blue-600">{ws.accuracy}%</span>
                        <ArrowRight className="h-4 w-4 text-blue-400" />
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── ZONE 3: FULL LENGTH MOCKS ── */}
        <section>
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Full Length Mocks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingMocks ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)
            ) : fullLengthMocks.length === 0 ? (
              <div className="col-span-3 bg-white rounded-[2.5rem] border border-gray-100 p-10 text-center">
                <p className="text-sm font-bold text-gray-500">Full-length mocks coming soon</p>
                <p className="text-xs text-gray-400 mt-1">
                  Multi-subject mock tests will appear here once configured
                </p>
              </div>
            ) : (
              fullLengthMocks.map((mock, idx) => {
                const theme = idx === 0 ? 'blue' : idx === 1 ? 'black' : 'gray'
                return (
                  <div
                    key={mock.$id}
                    className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 group hover:shadow-xl hover:border-blue-100 transition-all flex flex-col"
                  >
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 font-mono">
                      INDICORE MOCK
                    </p>
                    <h3 className="text-2xl font-black text-gray-900 mb-6">{mock.name}</h3>
                    <div className="grid grid-cols-3 gap-4 mb-8 mt-auto">
                      <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Questions</p>
                        <p className="text-sm font-black text-gray-900">100</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Duration</p>
                        <p className="text-sm font-black text-gray-900">2 Hr</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Marks</p>
                        <p className="text-sm font-black text-gray-900">200</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartMock(mock)}
                      disabled={loadingCardId === mock.$id}
                      className={`h-16 w-full rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-60 ${
                        theme === 'black'
                          ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                          : theme === 'gray'
                            ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-lg shadow-gray-200'
                            : 'bg-[#4A90E2] text-white hover:bg-blue-600 shadow-lg shadow-blue-100'
                      }`}
                    >
                      {loadingCardId === mock.$id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>Attempt Test <ArrowRight className="h-5 w-5" /></>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-gray-400 text-sm flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      }
    >
      <QuizSetupContent />
    </Suspense>
  )
}

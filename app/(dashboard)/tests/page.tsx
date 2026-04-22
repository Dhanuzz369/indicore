'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { listTestSessions } from '@/lib/supabase/queries'
import type { TestSession } from '@/types'
import { TestSessionCard } from '@/components/tests/TestSessionCard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SlidersHorizontal, Plus, BookOpen,
  ChevronLeft, ChevronRight, ChevronDown, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

type TabType = 'all' | 'practice' | 'mock' | 'weak'
type SortType = 'newest' | 'oldest' | 'highest_score' | 'lowest_score'

const TABS: { id: TabType; label: string }[] = [
  { id: 'all',      label: 'All Results' },
  { id: 'practice', label: 'Practice'    },
  { id: 'mock',     label: 'Full Mock'   },
  { id: 'weak',     label: 'Weak Areas'  },
]

const SORT_LABELS: Record<SortType, string> = {
  newest:        'Date: Newest',
  oldest:        'Date: Oldest',
  highest_score: 'Highest Score',
  lowest_score:  'Lowest Score',
}

export default function TestsPage() {
  const router = useRouter()
  const [userId, setUserId]   = useState<string | null>(null)
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [sort, setSort]       = useState<SortType>('newest')
  const [sortOpen, setSortOpen] = useState(false)

  // Auth
  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) { router.push('/login'); return }
      setUserId(user.$id)
    })
  }, [router])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setPage(0)
  }

  const fetchSessions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const modeFilter =
        activeTab === 'practice' ? 'subject_practice' :
        activeTab === 'mock'     ? 'full_length' :
        'all'
      const result = await listTestSessions({
        userId,
        examType: 'all',
        mode: modeFilter,
        sort,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      setSessions(result.documents)
      setTotal(result.total)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load test history.')
    } finally {
      setLoading(false)
    }
  }, [userId, activeTab, sort, page])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  // For "Weak Areas" tab, client-side filter low-score sessions
  const displayed = activeTab === 'weak'
    ? sessions.filter(s => (s.score ?? s.accuracy ?? 0) < 50)
    : sessions

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Header stats (computed from current loaded page)
  const avgScore = sessions.length
    ? parseFloat((sessions.reduce((sum, s) => sum + (s.score ?? s.accuracy ?? 0), 0) / sessions.length).toFixed(1))
    : null

  const bestScore = sessions.length
    ? Math.round(Math.max(...sessions.map(s => s.score ?? s.accuracy ?? 0)))
    : null

  const improvement = (() => {
    if (sessions.length < 4) return null
    const half = Math.floor(sessions.length / 2)
    const recent = sessions.slice(0, half).reduce((s, x) => s + (x.score ?? x.accuracy ?? 0), 0) / half
    const older  = sessions.slice(half).reduce((s, x)  => s + (x.score ?? x.accuracy ?? 0), 0) / half
    return parseFloat((recent - older).toFixed(1))
  })()

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PERFORMANCE LEDGER</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Performance</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/tests/mistakes')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Advanced Filters
            </button>
            <button
              onClick={() => router.push('/quiz')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-black hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Start New Test
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Average Score */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">AVERAGE SCORE</p>
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-black text-gray-900">{avgScore ?? '—'}</span>
                {improvement !== null && (
                  <span className={`text-sm font-bold mb-0.5 ${improvement >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {improvement >= 0 ? '+' : ''}{improvement}%
                  </span>
                )}
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4A90E2] rounded-full transition-all"
                  style={{ width: `${Math.min(avgScore ?? 0, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Total Tests */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">TOTAL TESTS</p>
            <div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-black text-gray-900">{total}</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">tests completed</p>
            </div>
          </div>

          {/* Improvement */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">IMPROVEMENT</p>
            <div>
              {improvement !== null ? (
                <>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-3xl font-black text-gray-900">{Math.abs(improvement)}%</span>
                    <span className={`text-xl font-black mb-0.5 ${improvement >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {improvement >= 0 ? '↑' : '↓'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium">vs previous sessions</p>
                </>
              ) : (
                <>
                  <span className="text-3xl font-black text-gray-300">—</span>
                  <p className="text-xs text-gray-400 font-medium mt-1">Complete more tests</p>
                </>
              )}
            </div>
          </div>

          {/* Best Score – dark card */}
          <div className="bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between text-white">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">BEST SCORE</p>
            <div>
              <div className="flex items-end gap-0.5 mb-1">
                <span className="text-3xl font-black">{bestScore ?? '—'}</span>
                {bestScore && <span className="text-xl font-black text-gray-400 mb-0.5">%</span>}
              </div>
              <p className="text-xs text-gray-400 font-medium">
                {bestScore
                  ? bestScore >= 70 ? 'Outstanding!' : bestScore >= 50 ? 'Keep going!' : 'Room to grow'
                  : 'Start a test'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs + Sort ── */}
        <div className="flex items-end justify-between border-b border-gray-200">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 md:px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-all ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative pb-1">
            <button
              onClick={() => setSortOpen(v => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Sort by {SORT_LABELS[sort].replace('Date: ', '')}
              <ChevronDown className="h-4 w-4" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-20 min-w-[160px]">
                {(Object.entries(SORT_LABELS) as [SortType, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setSort(val); setSortOpen(false); setPage(0) }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                      sort === val ? 'text-[#4A90E2] font-bold bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sessions ── */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex gap-6 items-center">
                <Skeleton className="h-[88px] w-[88px] rounded-full shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <div className="grid grid-cols-4 gap-4 pt-2">
                    {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-8 rounded-lg" />)}
                  </div>
                </div>
                <Skeleton className="h-10 w-40 rounded-xl shrink-0 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">No tests found</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
              {activeTab === 'weak'
                ? 'Great — no low-score sessions found in this page!'
                : 'Complete a test to see your history here.'}
            </p>
            <button
              onClick={() => router.push('/quiz')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Start a Test
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(session => (
              <TestSessionCard key={session.$id} session={session} />
            ))}

            {totalPages > 1 && activeTab !== 'weak' && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-sm font-semibold text-gray-500">{page + 1} / {totalPages}</span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

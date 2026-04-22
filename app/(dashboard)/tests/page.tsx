'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase/auth'
import { listTestSessions } from '@/lib/supabase/queries'
import type { TestSession } from '@/types'
import { TestSessionCard } from '@/components/tests/TestSessionCard'
import { TestFilters, type TestFiltersState } from '@/components/tests/TestFilters'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList, ChevronLeft, ChevronRight, BookOpen, Zap, TrendingUp, Target } from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

export default function TestsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState<TestFiltersState>({
    search: '',
    examType: 'all',
    mode: 'all',
    sort: 'newest',
    from: '',
    to: '',
  })

  const handleFilterChange = (next: Partial<TestFiltersState>) => {
    setFilters(prev => ({ ...prev, ...next }))
    setPage(0)
  }

  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) { router.push('/login'); return }
      setUserId(user.$id)
    })
  }, [router])

  const fetchSessions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const result = await listTestSessions({
        userId,
        examType: filters.examType,
        mode: filters.mode,
        sort: filters.sort as 'newest' | 'oldest' | 'highest_score' | 'lowest_score',
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(filters.to + 'T23:59:59').toISOString() : undefined,
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
  }, [userId, filters, page])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const filtered = filters.search
    ? sessions.filter(s =>
        s.paper_label.toLowerCase().includes(filters.search.toLowerCase())
      )
    : sessions

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Compute quick stats from loaded sessions
  const avgScore = sessions.length
    ? Math.round(sessions.reduce((sum, s) => sum + (s.score ?? s.accuracy ?? 0), 0) / sessions.length)
    : null
  const bestScore = sessions.length
    ? Math.round(Math.max(...sessions.map(s => s.score ?? s.accuracy ?? 0)))
    : null

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#4A90E2] uppercase tracking-widest mb-1">History</p>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">My Tests</h1>
              <p className="text-sm text-gray-400 font-medium mt-1">Review all your previous attempts and progress</p>
            </div>
            <Link
              href="/tests/mistakes"
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-wider hover:bg-red-100 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">All Mistakes</span>
              <span className="sm:hidden">Mistakes</span>
            </Link>
          </div>

          {/* Quick stats */}
          {!loading && sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-[#4A90E2]" />
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900">{total}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tests Taken</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900">{avgScore ?? '—'}%</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Avg Score</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900">{bestScore ?? '—'}%</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Best Score</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 space-y-5">

        {/* ── Filters ── */}
        <TestFilters filters={filters} onChange={handleFilterChange} />

        {/* ── Sessions list ── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
                </div>
                <div className="grid grid-cols-4 gap-3 pt-1">
                  {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">No tests found</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
              {filters.search || filters.examType !== 'all' || filters.mode !== 'all'
                ? 'Try adjusting your filters.'
                : 'Complete a test or subject practice to see your history here.'}
            </p>
            <button
              onClick={() => router.push('/quiz')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4A90E2] text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-md shadow-blue-100"
            >
              <Zap className="h-4 w-4" /> Start a Test
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium px-1">
              Showing {filtered.length} of {total} test{total !== 1 ? 's' : ''}
            </p>

            {filtered.map(session => (
              <TestSessionCard key={session.$id} session={session} />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-300 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  id="prev-page-btn"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-sm font-semibold text-gray-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-300 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  id="next-page-btn"
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

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
import { Button } from '@/components/ui/button'
import { ClipboardList, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
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

  // ── Auth check ──
  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) { router.push('/login'); return }
      setUserId(user.$id)
    })
  }, [router])

  // ── Fetch sessions ──
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

  // Client-side search filter (on paper_label)
  const filtered = filters.search
    ? sessions.filter(s =>
        s.paper_label.toLowerCase().includes(filters.search.toLowerCase())
      )
    : sessions

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-md shadow-orange-100 shrink-0">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Tests</h1>
              <p className="text-sm text-gray-500 font-medium">
                Review your previous attempts and improvement areas.
              </p>
            </div>
          </div>
          <Link
            href="/tests/mistakes"
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            All Mistakes
          </Link>
        </div>

        {/* ── Filters ── */}
        <TestFilters filters={filters} onChange={handleFilterChange} />

        {/* ── Sessions list ── */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No tests found</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {filters.search || filters.examType !== 'all' || filters.mode !== 'all'
                ? 'Try adjusting your filters.'
                : 'Complete a test or subject practice to see your history here.'}
            </p>
            <Button
              onClick={() => router.push('/quiz')}
              className="bg-[#FF6B00] hover:bg-[#FF8C00] mt-2"
            >
              Start a Test
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Record count */}
            <p className="text-xs text-gray-400 font-medium px-1">
              Showing {filtered.length} of {total} test{total !== 1 ? 's' : ''}
            </p>

            {filtered.map(session => (
              <TestSessionCard key={session.$id} session={session} />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="gap-1"
                  id="prev-page-btn"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="text-sm font-semibold text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="gap-1"
                  id="next-page-btn"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

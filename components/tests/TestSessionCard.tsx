'use client'

import type { TestSession } from '@/types'
import { formatDuration, formatDateTime, formatAvgTime } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, XCircle, MinusCircle, BarChart2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface ParsedAnalytics {
  subjectStats?: { subject: string; accuracy: number }[]
}

function getWeakSubjects(analyticsData: string | any): string {
  try {
    const a: ParsedAnalytics = typeof analyticsData === 'string' ? JSON.parse(analyticsData) : analyticsData
    if (!a || !a.subjectStats) return ''
    const weak = a.subjectStats
      .filter(s => s.accuracy < 55)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)
      .map(s => `${s.subject.replace(/_/g, ' ')} (${s.accuracy}%)`)
    return weak.join(', ')
  } catch {
    return ''
  }
}

interface TestSessionCardProps {
  session: TestSession
}

export function TestSessionCard({ session }: TestSessionCardProps) {
  const weakSubjects = getWeakSubjects(session.results_history || session.analytics)
  const avgTime = formatAvgTime(session.total_time_seconds, session.total_questions)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Header row */}
      <div className="px-6 pt-5 pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base leading-tight">{session.paper_label}</h3>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide font-semibold border-[#FF6B00]/30 text-[#FF6B00]">
              {session.mode === 'full_length' ? 'Full Length' : 'Subject Practice'}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            {session.exam_type || 'UPSC'} · {session.year || 2024} · {session.paper || 'Prelims GS1'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Submitted on {formatDateTime(session.submitted_at || session.date || session.$createdAt || '')}
          </p>
        </div>

        {/* Score bubble */}
        <div className="shrink-0">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm
            ${(session.score ?? session.accuracy ?? 0) >= 60 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : (session.score ?? session.accuracy ?? 0) >= 40 ? 'bg-amber-50 text-amber-700 border border-amber-100'
              : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {(session.score ?? session.accuracy ?? 0).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-6 py-3 border-t border-gray-50 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>{session.correct} Correct</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
          <XCircle className="h-3.5 w-3.5" />
          <span>{session.incorrect} Wrong</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <MinusCircle className="h-3.5 w-3.5" />
          <span>{session.skipped} Skipped</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDuration(session.total_time_seconds)} · Avg {avgTime}/Q</span>
        </div>
      </div>

      {/* Weak subjects */}
      {weakSubjects && (
        <div className="px-6 py-2.5 bg-amber-50/60 border-t border-amber-100/60">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              <span className="font-bold">Weak: </span>{weakSubjects}
            </p>
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="px-6 py-4 border-t border-gray-50">
        <Link href={`/tests/${session.$id}?tab=overview`} className="block w-full">
          <Button size="sm" className="w-full gap-2 bg-[#FF6B00] hover:bg-[#FF8C00] font-semibold">
            <BarChart2 className="h-4 w-4" />
            View Analytics
          </Button>
        </Link>
      </div>
    </div>
  )
}

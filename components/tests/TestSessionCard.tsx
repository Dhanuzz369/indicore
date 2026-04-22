'use client'

import type { TestSession } from '@/types'
import { formatDuration, formatDateTime, formatAvgTime } from '@/lib/formatters'
import { Clock, CheckCircle2, XCircle, MinusCircle, BarChart2, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ParsedAnalytics {
  subjectStats?: { subject: string; accuracy: number }[]
}

function getWeakSubjects(analyticsData: string | any): { subject: string; accuracy: number }[] {
  try {
    const a: ParsedAnalytics = typeof analyticsData === 'string' ? JSON.parse(analyticsData) : analyticsData
    if (!a || !a.subjectStats) return []
    return a.subjectStats
      .filter(s => s.accuracy < 55)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)
  } catch {
    return []
  }
}

function getScoreColor(pct: number) {
  if (pct >= 60) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', bar: 'bg-emerald-400' }
  if (pct >= 40) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', bar: 'bg-amber-400' }
  return { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100', bar: 'bg-red-400' }
}

interface TestSessionCardProps {
  session: TestSession
}

export function TestSessionCard({ session }: TestSessionCardProps) {
  const weakSubjects = getWeakSubjects(session.results_history || session.analytics)
  const avgTime = formatAvgTime(session.total_time_seconds, session.total_questions)
  const scorePct = Math.round(session.score ?? session.accuracy ?? 0)
  const colors = getScoreColor(scorePct)
  const marksScored = Math.max(0, parseFloat(
    ((session.correct ?? 0) * 2 - (session.incorrect ?? 0) * (2 / 3)).toFixed(1)
  ))
  const totalMarks = (session.total_questions ?? 0) * 2

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">

      {/* ── Top section ── */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-4">

        {/* Score badge */}
        <div className={`shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${colors.bg} border ${colors.border}`}>
          <span className={`text-lg font-black leading-none ${colors.text}`}>{scorePct}%</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Score</span>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-black text-gray-900 text-sm leading-snug">{session.paper_label}</h3>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {session.mode === 'full_length' ? 'Full Length' : 'Subject Practice'}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1">
            {formatDateTime(session.submitted_at || session.date || session.$createdAt || '')}
          </p>
          {/* Score bar */}
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
            <div
              className={`h-full rounded-full transition-all ${colors.bar}`}
              style={{ width: `${Math.min(scorePct, 100)}%` }}
            />
          </div>
        </div>

        {/* Marks */}
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-xl font-black text-gray-900">{marksScored}</p>
          <p className="text-[10px] font-bold text-gray-400">/ {totalMarks} marks</p>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="px-5 py-3 border-t border-gray-50 grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-sm font-black">{session.correct ?? 0}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Correct</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-red-500">
            <XCircle className="h-3.5 w-3.5" />
            <span className="text-sm font-black">{session.incorrect ?? 0}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Wrong</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            <MinusCircle className="h-3.5 w-3.5" />
            <span className="text-sm font-black">{session.skipped ?? 0}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Skipped</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-sm font-black">{avgTime}</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Avg/Q</span>
        </div>
      </div>

      {/* ── Weak subjects strip ── */}
      {weakSubjects.length > 0 && (
        <div className="px-5 py-2.5 bg-amber-50/70 border-t border-amber-100/60 flex items-center gap-2 flex-wrap">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Weak:</span>
          {weakSubjects.map((w, i) => (
            <span key={i} className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {w.subject.replace(/_/g, ' ')} · {w.accuracy}%
            </span>
          ))}
        </div>
      )}

      {/* ── Action row ── */}
      <div className="px-5 py-3.5 border-t border-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">
          {formatDuration(session.total_time_seconds)} total time
        </span>
        <Link
          href={`/results?session=${session.$id}&replay=true`}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#4A90E2] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-sm shadow-blue-100"
        >
          <BarChart2 className="h-3.5 w-3.5" />
          View Analytics
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

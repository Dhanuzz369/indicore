'use client'

import type { TestSession } from '@/types'
import { formatDuration, formatDateTime, formatAvgTime } from '@/lib/formatters'
import { CheckCircle2, XCircle, MinusCircle, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ pct }: { pct: number }) {
  const r    = 32
  const circ = 2 * Math.PI * r          // ≈ 201.06
  const fill = Math.min((pct / 100) * circ, circ)
  const gap  = circ - fill
  const color = pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
      {/* SVG rotated so the arc starts at 12 o'clock */}
      <svg viewBox="0 0 88 88" width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9" />
        {/* Fill */}
        <circle
          cx="44" cy="44" r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={`${fill} ${gap}`}
          strokeLinecap="round"
        />
      </svg>
      {/* Label in centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-black text-gray-900 leading-none">{pct}</span>
        <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">PERCENT</span>
      </div>
    </div>
  )
}

// ── Badge helper ──────────────────────────────────────────────────────────────
function getModeBadge(mode: string | undefined, label: string) {
  if (mode === 'full_length')
    return { text: 'FULL LENGTH',   cls: 'bg-blue-100 text-blue-700'  }
  if (label?.toLowerCase().includes('weak'))
    return { text: 'WEAK AREA',     cls: 'bg-rose-100 text-rose-600'  }
  return   { text: 'PRACTICE SET',  cls: 'bg-gray-100 text-gray-500'  }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface TestSessionCardProps {
  session: TestSession
}

export function TestSessionCard({ session }: TestSessionCardProps) {
  const pct     = Math.round(session.score ?? session.accuracy ?? 0)
  const badge   = getModeBadge(session.mode, session.paper_label)
  const avgTime = formatAvgTime(session.total_time_seconds, session.total_questions)
  const isHigh  = pct >= 60

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className="flex items-center gap-5 md:gap-8 p-5 md:p-6">

        {/* ── Donut ── */}
        <DonutChart pct={pct} />

        {/* ── Content ── */}
        <div className="flex-1 min-w-0">

          {/* Title + badge */}
          <div className="flex items-start gap-3 flex-wrap mb-1">
            <h3 className="font-black text-gray-900 text-[15px] leading-snug">{session.paper_label}</h3>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shrink-0 ${badge.cls}`}>
              {badge.text}
            </span>
          </div>

          {/* Date */}
          <p className="text-xs text-gray-400 font-medium mb-4">
            Exam Date: {formatDateTime(session.submitted_at || session.date || session.$createdAt || '')}
          </p>

          {/* Time taken */}
          <div className="mb-4">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">TIME TAKEN</p>
            <p className="text-sm font-black text-gray-900 tabular-nums">{formatDuration(session.total_time_seconds)}</p>
          </div>

          {/* Stats row */}
          <div className="flex items-start gap-5 md:gap-8 flex-wrap">

            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#4A90E2]" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CORRECT</p>
              </div>
              <p className="text-sm font-black text-gray-900 tabular-nums">
                {session.correct ?? 0}/{session.total_questions ?? 0}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">WRONG</p>
              </div>
              <p className="text-sm font-black text-gray-900 tabular-nums">{session.incorrect ?? 0}</p>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <MinusCircle className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SKIPPED</p>
              </div>
              <p className="text-sm font-black text-gray-900 tabular-nums">{session.skipped ?? 0}</p>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">AVG TIME</p>
              </div>
              <p className="text-sm font-black text-gray-900 tabular-nums">{avgTime} / q</p>
            </div>

          </div>
        </div>

        {/* ── CTA button (desktop) ── */}
        <div className="shrink-0 hidden md:block">
          <Link
            href={`/results?session=${session.$id}&replay=true`}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black whitespace-nowrap transition-all ${
              isHigh
                ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-md'
                : 'border-2 border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900'
            }`}
          >
            View Detailed Analytics <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

      </div>

      {/* ── CTA button (mobile) ── */}
      <div className="md:hidden px-5 pb-5">
        <Link
          href={`/results?session=${session.$id}&replay=true`}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-gray-900 text-white hover:bg-gray-700 transition-all"
        >
          View Detailed Analytics <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

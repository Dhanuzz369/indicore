// app/(admin)/admin/_components/ExpandableSession.tsx
'use client'
import { useState } from 'react'
import type { TimelineEntry } from '@/types/admin'

function formatDuration(secs: number | null): string {
  if (!secs) return '—'
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function scorePct(entry: TimelineEntry): number {
  if (!entry.total_questions) return 0
  return Math.round((entry.correct / entry.total_questions) * 100)
}

const MODE_ICONS: Record<string, string> = {
  mock: '📋', practice: '🎯', full: '📄', retake: '🔁',
}

const DIFF_COLORS: Record<string, string> = {
  easy:   'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50   text-amber-700',
  hard:   'bg-red-50     text-red-700',
}

export default function ExpandableSession({ entry }: { entry: TimelineEntry }) {
  const [open, setOpen] = useState(false)
  const pct = scorePct(entry)

  const hasDetails =
    (entry.difficulty_breakdown && entry.difficulty_breakdown.length > 0) ||
    (entry.timing_stats && entry.timing_stats.length > 0) ||
    !!entry.confidence_stats ||
    (entry.subject_breakdown && entry.subject_breakdown.length > 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Collapsed row */}
      <div className="px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#4A90E2]/10 flex items-center justify-center shrink-0 text-lg">
            {MODE_ICONS[entry.mode] ?? '📋'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-black text-[#1A1C1C] text-sm">{entry.paper_label ?? entry.exam_type}</p>
              <p className="text-xs text-gray-400 shrink-0">
                {new Date(entry.submitted_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 items-center">
              <span className={`text-xs font-black ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                {pct}%
              </span>
              <span className="text-xs text-gray-400">{entry.correct}/{entry.total_questions} correct</span>
              <span className="text-xs text-gray-400">{formatDuration(entry.total_time_seconds)}</span>
              {hasDetails && (
                <button
                  onClick={() => setOpen(o => !o)}
                  className="ml-auto text-[10px] font-black uppercase tracking-wider text-[#4A90E2] hover:text-[#3a7fd4] transition-colors"
                >
                  {open ? '▲ Hide' : '▼ Details'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-gray-100 px-6 py-4 space-y-4 bg-gray-50/50">

          {/* Subject breakdown */}
          {entry.subject_breakdown && entry.subject_breakdown.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Subject Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {entry.subject_breakdown.map(s => {
                  const acc = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0
                  return (
                    <span key={s.subject} className="text-[11px] bg-white border border-gray-100 text-gray-700 rounded-xl px-3 py-1.5 font-medium shadow-sm">
                      {s.subject}: <strong>{s.correct}/{s.attempted}</strong>
                      <span className={`ml-1 font-black ${acc >= 60 ? 'text-emerald-600' : acc >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {acc}%
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Difficulty breakdown */}
          {entry.difficulty_breakdown && entry.difficulty_breakdown.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {entry.difficulty_breakdown.map(d => (
                  <span key={d.difficulty} className={`text-[11px] rounded-xl px-3 py-1.5 font-black capitalize ${DIFF_COLORS[d.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                    {d.difficulty}: {d.correct}/{d.total} · {d.accuracy}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence stats */}
          {entry.confidence_stats && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Confidence Stats</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '50/50 used', total: entry.confidence_stats.total5050,      correct: entry.confidence_stats.correct5050 },
                  { label: 'Guessed',    total: entry.confidence_stats.totalGuess,      correct: entry.confidence_stats.correctGuess },
                  { label: 'Sure',       total: entry.confidence_stats.totalAreYouSure, correct: entry.confidence_stats.correctAreYouSure },
                ].filter(c => c.total > 0).map(c => (
                  <span key={c.label} className="text-[11px] bg-white border border-gray-100 rounded-xl px-3 py-1.5 font-medium text-gray-600 shadow-sm">
                    {c.label}: <strong>{c.total}</strong>
                    <span className="text-gray-400 ml-1">({c.correct} correct)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Slowest 3 questions */}
          {entry.timing_stats && entry.timing_stats.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Slowest Questions (top 3)</p>
              <div className="space-y-2">
                {[...entry.timing_stats]
                  .sort((a, b) => b.timeTaken - a.timeTaken)
                  .slice(0, 3)
                  .map((t, i) => {
                    const over = t.timeTaken > t.targetTime
                    return (
                      <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 mt-0.5 shrink-0">#{i + 1}</span>
                        <p className="text-xs text-gray-600 flex-1 leading-relaxed">
                          {t.questionText.length > 80 ? t.questionText.slice(0, 80) + '…' : t.questionText}
                        </p>
                        <div className="shrink-0 text-right">
                          <p className={`text-xs font-black ${over ? 'text-red-500' : 'text-emerald-600'}`}>
                            {Math.round(t.timeTaken)}s
                          </p>
                          <p className="text-[10px] text-gray-400">target {Math.round(t.targetTime)}s</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

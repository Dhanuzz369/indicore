'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TestSession, TestAnalyticsV1 } from '@/types'

interface OverviewTabProps {
  session: TestSession
  analytics: TestAnalyticsV1 | null
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 text-center">
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export function OverviewTab({ session, analytics }: OverviewTabProps) {
  const [aiExpanded, setAiExpanded] = useState(false)

  const score = session.score ?? session.accuracy ?? 0
  const scoreColor =
    score >= 60 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'

  const avgTime =
    session.total_questions > 0
      ? Math.round(session.total_time_seconds / session.total_questions)
      : 0

  const totalMins = Math.floor(session.total_time_seconds / 60)
  const totalSecs = session.total_time_seconds % 60
  const totalTimeStr = `${totalMins}m ${totalSecs}s`

  return (
    <div className="space-y-6">
      {/* Score Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-2">
        <p className={`text-6xl font-black ${scoreColor}`}>{score.toFixed(0)}%</p>
        <p className="text-sm text-gray-500 font-medium">
          {session.correct} correct out of {session.total_questions} questions
        </p>
        <p className="text-xs text-gray-400">Total time: {totalTimeStr}</p>
      </div>

      {/* 4-stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Correct" value={session.correct} />
        <StatBox label="Wrong" value={session.incorrect} />
        <StatBox label="Skipped" value={session.skipped} />
        <StatBox label="Avg / Question" value={`${avgTime}s`} />
      </div>

      {/* Subject breakdown */}
      {analytics?.subjectBreakdown && analytics.subjectBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            Subject Breakdown
          </p>
          <div className="space-y-3">
            {analytics.subjectBreakdown.map(sub => (
              <div key={sub.subjectId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700 capitalize">
                    {sub.subjectId.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-500">
                    {sub.correct}/{sub.total} · {sub.accuracy.toFixed(0)}% · avg {sub.avgTimeSeconds.toFixed(0)}s
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sub.accuracy >= 60
                        ? 'bg-green-500'
                        : sub.accuracy >= 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${sub.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Behavior metrics */}
      {analytics?.behavior && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            Behavior Signals
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-black text-red-500">
                {analytics.behavior.sureButWrongCount}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                Sure But Wrong
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-amber-500">
                {(analytics.behavior.sureButWrongRate * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                Overconfidence Rate
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-blue-500">
                {analytics.behavior.answerChangeAvg.toFixed(1)}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                Avg Answer Changes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Feedback */}
      {session.ai_feedback && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <button
            onClick={() => setAiExpanded(e => !e)}
            className="w-full flex items-center justify-between"
          >
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">
              AI Feedback
            </p>
            {aiExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {aiExpanded && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {session.ai_feedback}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

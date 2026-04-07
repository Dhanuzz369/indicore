// app/(admin)/admin/_components/UserCharts.tsx
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import type { TimelineEntry } from '@/types/admin'
import type { AdminUser } from '@/types/admin'

function scoreColor(trend: 'up' | 'down' | 'flat') {
  if (trend === 'up')   return '#10b981'
  if (trend === 'down') return '#ef4444'
  return '#94a3b8'
}

function getTrend(data: { score: number }[]): 'up' | 'down' | 'flat' {
  if (data.length < 3) return 'flat'
  // data is newest-first (from timeline desc order reversed to asc)
  const first3 = data.slice(0, 3).reduce((s, d) => s + d.score, 0) / 3
  const last3  = data.slice(-3).reduce((s, d) => s + d.score, 0) / 3
  if (last3 > first3 + 3) return 'up'
  if (last3 < first3 - 3) return 'down'
  return 'flat'
}

function barColor(accuracy: number) {
  if (accuracy >= 60) return '#10b981'
  if (accuracy >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function UserCharts({ user, timeline }: { user: AdminUser; timeline: TimelineEntry[] }) {
  // Score trend — timeline comes in desc order, reverse for chronological display
  const trendData = [...timeline]
    .reverse()
    .map(e => ({
      date: new Date(e.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      score: e.total_questions > 0 ? Math.round((e.correct / e.total_questions) * 100) : 0,
      label: `${e.correct}/${e.total_questions}`,
    }))
  const trend = getTrend(trendData)

  // Subject accuracy — aggregate across all sessions
  const subjectMap = new Map<string, { correct: number; attempted: number }>()
  for (const entry of timeline) {
    for (const s of entry.subject_breakdown ?? []) {
      const cur = subjectMap.get(s.subject) ?? { correct: 0, attempted: 0 }
      cur.correct   += s.correct
      cur.attempted += s.attempted
      subjectMap.set(s.subject, cur)
    }
  }
  const subjectData = Array.from(subjectMap.entries())
    .map(([subject, { correct, attempted }]) => ({
      subject,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)  // weakest first

  // Feature usage chips
  const mockCount     = timeline.filter(e => e.exam_type === 'INDICORE_MOCK').length
  const practiceCount = timeline.filter(e => e.mode === 'practice').length
  const validTimes    = timeline.map(e => e.total_time_seconds).filter((t): t is number => t !== null && t > 0)
  const avgMins       = validTimes.length > 0
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length / 60)
    : 0
  const daysSinceJoined = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)

  const chips = [
    { icon: '📋', label: `${mockCount} Mock tests` },
    { icon: '🎯', label: `${practiceCount} Practice sessions` },
    { icon: '⏱', label: `Avg ${avgMins}m / session` },
    { icon: '📅', label: `${daysSinceJoined}d since joined` },
    { icon: '🔥', label: `${user.streak_days}d streak` },
  ]

  return (
    <div className="space-y-4">
      {/* Usage chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map(c => (
          <span key={c.label} className="inline-flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            {c.icon} {c.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Trend */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
              Score Trend
              <span className={`ml-2 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                {trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : '→ Steady'}
              </span>
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, _name: any, props: any) => [
                    `${value ?? 0}% (${props?.payload?.label ?? ''})`, 'Accuracy'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={scoreColor(trend)}
                  strokeWidth={2}
                  dot={{ r: 3, fill: scoreColor(trend) }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Accuracy */}
        {subjectData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Subject Accuracy</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value ?? 0}%`, 'Accuracy']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                  {subjectData.map((entry, i) => (
                    <Cell key={i} fill={barColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

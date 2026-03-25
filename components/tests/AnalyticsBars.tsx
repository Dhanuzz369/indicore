'use client'

interface SubjectBar {
  subject: string
  accuracy: number
  correct: number
  total: number
}

interface AnalyticsBarsProps {
  data: SubjectBar[]
}

export function AnalyticsBars({ data }: AnalyticsBarsProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">No subject data available.</p>
    )
  }

  const sorted = [...data].sort((a, b) => b.accuracy - a.accuracy)

  return (
    <div className="space-y-3">
      {sorted.map(s => {
        const label = s.subject.replace(/_/g, ' ')
        const color = s.accuracy >= 70
          ? 'bg-emerald-500'
          : s.accuracy >= 50
          ? 'bg-amber-400'
          : 'bg-red-500'

        return (
          <div key={s.subject}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700 capitalize">{label}</span>
              <span className="text-xs font-bold text-gray-500">
                {s.correct}/{s.total} · {s.accuracy}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${s.accuracy}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

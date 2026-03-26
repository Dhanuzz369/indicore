'use client'

import { useRouter } from 'next/navigation'
import type { TestAnalyticsV1, Question, QuizAttempt } from '@/types'

interface SubtopicDrillTabProps {
  analytics: TestAnalyticsV1 | null
  questions: Question[]
  attemptMap: Record<string, QuizAttempt>
}

interface DrillGroup {
  name: string
  subjectId: string
  total: number
  correct: number
  accuracy: number
  confusionScore: number
  subtopicId?: string
}

export function SubtopicDrillTab({ analytics, questions, attemptMap }: SubtopicDrillTabProps) {
  const router = useRouter()

  let groups: DrillGroup[] = []

  if (analytics?.subtopicBreakdown && analytics.subtopicBreakdown.length > 0) {
    groups = analytics.subtopicBreakdown.map(sub => ({
      name: sub.subtopicId || sub.subjectId,
      subjectId: sub.subjectId,
      subtopicId: sub.subtopicId || undefined,
      total: sub.total,
      correct: sub.correct,
      accuracy: sub.accuracy,
      confusionScore: sub.confusionScore,
    }))
  } else {
    const map = new Map<string, DrillGroup>()
    for (const q of questions) {
      const key = q.subtopic || q.subject_id || 'General'
      const attempt = attemptMap[q.$id]
      const isCorrect = attempt?.is_correct ?? false
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          subjectId: q.subject_id || 'General',
          subtopicId: q.subtopic || undefined,
          total: 0,
          correct: 0,
          accuracy: 0,
          confusionScore: 0,
        })
      }
      const g = map.get(key)!
      g.total++
      if (isCorrect) g.correct++
    }
    for (const g of map.values()) {
      g.accuracy = g.total > 0 ? (g.correct / g.total) * 100 : 0
    }
    groups = Array.from(map.values())
  }

  groups.sort((a, b) => a.accuracy - b.accuracy)

  if (groups.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-gray-400">
        Not enough data to show subtopic breakdown.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium px-1">
        Sorted by weakest first — practice the ones at the top
      </p>
      {groups.map(group => (
        <div
          key={group.name}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 capitalize truncate">
                {(group.name ?? 'General').replace(/_/g, ' ')}
              </p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 shrink-0">
                {(group.subjectId ?? 'General').replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{group.correct}/{group.total} correct</span>
              <span
                className={`font-bold ${
                  group.accuracy >= 60
                    ? 'text-green-600'
                    : group.accuracy >= 40
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {group.accuracy.toFixed(0)}%
              </span>
              {group.confusionScore > 0 && (
                <span className="text-gray-400">
                  confusion: {group.confusionScore.toFixed(0)}
                </span>
              )}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  group.accuracy >= 60
                    ? 'bg-green-500'
                    : group.accuracy >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${group.accuracy}%` }}
              />
            </div>
          </div>
          <button
            onClick={() =>
              router.push(
                `/quiz?${group.subtopicId ? `subtopic=${encodeURIComponent(group.subtopicId)}` : `subjectId=${encodeURIComponent(group.subjectId)}`}`
              )
            }
            className="shrink-0 px-3 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8C00] text-white text-xs font-bold transition-colors"
          >
            Practice
          </button>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { QuestionReviewCard } from '@/components/tests/QuestionReviewCard'
import type { Question, Subject } from '@/types'

export interface ReviewItem {
  question: Question
  userAnswer: string | null
  isCorrect: boolean
  wasSkipped: boolean
  confidenceTag?: 'sure' | 'fifty_fifty' | 'guess' | 'normal' | null
  timeTaken?: number | null
  subjectName: string
}

type FilterChip = 'all' | 'correct' | 'wrong' | 'skipped'

const PAGE_SIZE = 20

interface ReviewAllTabProps {
  items: ReviewItem[]
  subjects: Subject[]
}

export function ReviewAllTab({ items, subjects }: ReviewAllTabProps) {
  const [filter, setFilter] = useState<FilterChip>('all')
  const [page, setPage] = useState(0)

  const filtered = items.filter(item => {
    if (filter === 'correct') return item.isCorrect && !item.wasSkipped
    if (filter === 'wrong') return !item.isCorrect && !item.wasSkipped
    if (filter === 'skipped') return item.wasSkipped
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const chips: { key: FilterChip; label: string }[] = [
    { key: 'all', label: `All (${items.length})` },
    { key: 'correct', label: `Correct (${items.filter(i => i.isCorrect && !i.wasSkipped).length})` },
    { key: 'wrong', label: `Wrong (${items.filter(i => !i.isCorrect && !i.wasSkipped).length})` },
    { key: 'skipped', label: `Skipped (${items.filter(i => i.wasSkipped).length})` },
  ]

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <button
            key={chip.key}
            onClick={() => { setFilter(chip.key); setPage(0) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === chip.key
                ? 'bg-[#FF6B00] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Question cards */}
      {paged.length === 0 ? (
        <p className="text-center py-12 text-sm text-gray-400">No questions match this filter.</p>
      ) : (
        <>
          {paged.map(item => (
            <QuestionReviewCard
              key={item.question.$id}
              question={item.question}
              userAnswer={item.userAnswer}
              isCorrect={item.isCorrect}
              wasSkipped={item.wasSkipped}
              confidenceTag={item.confidenceTag}
              timeTaken={item.timeTaken}
              subjectName={item.subjectName}
              subjects={subjects}
              showSaveNote={!item.isCorrect}
            />
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

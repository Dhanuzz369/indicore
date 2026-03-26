'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { NoteEditor } from '@/components/notes/NoteEditor'
import type { Question, Subject } from '@/types'

interface QuestionReviewCardProps {
  question: Question
  userAnswer: string | null   // null = skipped
  isCorrect: boolean
  wasSkipped: boolean
  confidenceTag?: 'sure' | 'fifty_fifty' | 'guess' | 'normal' | null
  timeTaken?: number | null
  subjectName?: string        // human-readable name, falls back to question.subject_id
  subjects?: Subject[]        // for NoteEditor
  showSaveNote?: boolean
}

const CONFIDENCE_LABELS: Record<string, string> = {
  sure: 'Sure',
  fifty_fifty: '50/50',
  guess: 'Guess',
}

export function QuestionReviewCard({
  question,
  userAnswer,
  isCorrect,
  wasSkipped,
  confidenceTag,
  timeTaken,
  subjectName,
  subjects = [],
  showSaveNote = false,
}: QuestionReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showNoteEditor, setShowNoteEditor] = useState(false)

  const borderClass = wasSkipped
    ? 'border-l-gray-300'
    : isCorrect
    ? 'border-l-green-500'
    : 'border-l-red-500'

  const optionText = (opt: string): string => {
    const map: Record<string, string> = {
      A: question.option_a,
      B: question.option_b,
      C: question.option_c,
      D: question.option_d,
    }
    return map[opt] ? `${opt}. ${map[opt]}` : opt
  }

  if (process.env.NODE_ENV === 'development' && showSaveNote && subjects.length === 0) {
    console.warn('[QuestionReviewCard] showSaveNote is true but subjects array is empty — Save as Note button will be hidden')
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${borderClass} shadow-sm p-5 space-y-3`}
    >
      {/* Badges row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
          {subjectName || question.subject_id}
        </span>
        {question.subtopic && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            {question.subtopic}
          </span>
        )}
        {wasSkipped && (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            Skipped
          </span>
        )}
        {confidenceTag && confidenceTag !== 'normal' && CONFIDENCE_LABELS[confidenceTag] && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            {CONFIDENCE_LABELS[confidenceTag]}
          </span>
        )}
        {timeTaken != null && timeTaken > 0 && (
          <span className="text-[10px] text-gray-400 ml-auto">{timeTaken}s</span>
        )}
      </div>

      {/* Question text */}
      <p className="text-sm font-semibold text-gray-900 leading-relaxed">
        {question.question_text}
      </p>

      {/* Answer pills */}
      <div className="flex flex-wrap gap-2">
        {!wasSkipped && userAnswer && !isCorrect && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
            Your answer: {optionText(userAnswer)}
          </span>
        )}
        <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-bold">
          Correct: {optionText(question.correct_option)}
        </span>
      </div>

      {/* Explanation toggle */}
      {question.explanation && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] hover:text-[#FF8C00] transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? 'Hide' : 'Show'} Explanation
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-orange-50/50 rounded-xl p-3">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Save as Note */}
      {showSaveNote && subjects.length > 0 && (
        <button
          onClick={() => setShowNoteEditor(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-xl bg-white transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" /> Save as Note
        </button>
      )}

      {showNoteEditor && (
        <NoteEditor
          prefillFront={question.question_text}
          sourceQuestionId={question.$id}
          subjects={subjects}
          onClose={() => setShowNoteEditor(false)}
        />
      )}
    </div>
  )
}

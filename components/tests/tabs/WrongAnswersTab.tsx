'use client'

import { Trophy } from 'lucide-react'
import { QuestionReviewCard } from '@/components/tests/QuestionReviewCard'
import type { Question, QuizAttempt, Subject } from '@/types'

export interface WrongItem {
  question: Question
  attempt: QuizAttempt
  subjectName: string
}

interface WrongAnswersTabProps {
  wrongItems: WrongItem[]
  subjects: Subject[]
}

export function WrongAnswersTab({ wrongItems, subjects }: WrongAnswersTabProps) {
  if (wrongItems.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="h-10 w-10 text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">You got everything right! 🎉</h3>
        <p className="text-sm text-gray-500">No wrong answers in this session.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 font-medium px-1">
        {wrongItems.length} wrong answer{wrongItems.length !== 1 ? 's' : ''}
      </p>
      {wrongItems.map(({ question, attempt, subjectName }) => (
        <QuestionReviewCard
          key={question.$id}
          question={question}
          userAnswer={attempt.selected_option || null}
          isCorrect={false}
          wasSkipped={false}
          confidenceTag={attempt.confidence_tag}
          timeTaken={attempt.time_taken_seconds}
          subjectName={subjectName}
          subjects={subjects}
          showSaveNote
        />
      ))}
    </div>
  )
}

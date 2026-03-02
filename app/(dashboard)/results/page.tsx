'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Trophy, Target, BookOpen } from 'lucide-react'
import type { Question } from '@/types'

export default function ResultsPage() {
  const router = useRouter()
  const { questions, answers, getScore, reset } = useQuizStore()
  const score = getScore()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // ─────────────────────────────────────────────────────────────────
  // NO QUIZ DATA
  // ─────────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">No Quiz Data</h2>
          <p className="text-muted-foreground">Start a new practice session to see results.</p>
          <Button onClick={() => router.push('/quiz')} className="bg-[#FF6B00] hover:bg-[#FF8C00]">
            Start Practice
          </Button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────
  const getScoreMessage = () => {
    if (score.percentage >= 90) return 'Outstanding! 🏆'
    if (score.percentage >= 70) return 'Great Work! 🎯'
    if (score.percentage >= 50) return 'Good Effort! 📚'
    return 'Keep Practising! 💪'
  }

  const getScoreGradient = () => {
    return score.percentage >= 70
      ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C00]'
      : 'bg-gradient-to-r from-blue-500 to-blue-600'
  }

  const handlePracticeAgain = () => {
    reset()
    router.push('/quiz')
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        {/* SECTION 1: Score Hero Card */}
        <Card className={`${getScoreGradient()} text-white border-none shadow-lg`}>
          <CardContent className="p-8 text-center space-y-4">
            <Trophy className="h-16 w-16 mx-auto opacity-90" />
            <h1 className="text-5xl font-bold">
              {score.correct} / {questions.length}
            </h1>
            <p className="text-2xl font-semibold">{score.percentage}% Accuracy</p>
            <p className="text-xl opacity-90">{getScoreMessage()}</p>
          </CardContent>
        </Card>

        {/* SECTION 2: Stats Cards Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{score.correct}</p>
              <p className="text-sm text-green-600">Correct</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-700">{score.wrong}</p>
              <p className="text-sm text-red-600">Wrong</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">{score.total}</p>
              <p className="text-sm text-blue-600">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 3: Question Review List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Question Review</h2>

          {questions.map((question, index) => {
            const answer = answers[question.$id]
            const isCorrect = answer?.isCorrect ?? false
            const isExpanded = expandedIndex === index
            const truncatedText =
              question.question_text.length > 70
                ? question.question_text.slice(0, 70) + '...'
                : question.question_text

            return (
              <Card
                key={question.$id}
                className={`border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'
                  } cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => toggleExpand(index)}
              >
                <CardContent className="p-4">
                  {/* Collapsed View */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="font-mono">
                        Q{index + 1}
                      </Badge>
                      <p className="text-sm font-medium">{truncatedText}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Full Question */}
                      <p className="text-base font-medium leading-relaxed">
                        {question.question_text}
                      </p>

                      {/* All Options */}
                      <div className="space-y-2">
                        {['A', 'B', 'C', 'D'].map((optionKey) => {
                          const optionText = question[`option_${optionKey.toLowerCase()}` as keyof Question] as string
                          const isSelectedOption = answer?.selectedOption === optionKey
                          const isCorrectOption = question.correct_option === optionKey

                          return (
                            <div
                              key={optionKey}
                              className={`p-3 rounded-lg border-2 ${isCorrectOption
                                  ? 'bg-green-50 border-green-500 text-green-800'
                                  : isSelectedOption && !isCorrectOption
                                    ? 'bg-red-50 border-red-500 text-red-800'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{optionKey}.</span>
                                  <span>{optionText}</span>
                                </div>
                                {isCorrectOption && (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                )}
                                {isSelectedOption && !isCorrectOption && (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Explanation:</p>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* SECTION 4: Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sticky bottom-0 bg-gray-50 py-4 sm:relative sm:bg-transparent">
          <Button
            onClick={handlePracticeAgain}
            className="flex-1 bg-[#FF6B00] hover:bg-[#FF8C00]"
            size="lg"
          >
            Practice Again
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

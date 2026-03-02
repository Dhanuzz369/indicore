'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { saveAttempt, incrementStats } from '@/lib/appwrite/queries'
import { QuizProgressBar } from '@/components/quiz/QuizProgressBar'
import { QuestionCard } from '@/components/quiz/QuestionCard'
import { OptionButton } from '@/components/quiz/OptionButton'
import { ExplanationBox } from '@/components/quiz/ExplanationBox'

export default function QuizSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('id')

  const questions = useQuizStore((state) => state.questions)
  const currentIndex = useQuizStore((state) => state.currentIndex)
  const answers = useQuizStore((state) => state.answers)
  const isAnswered = useQuizStore((state) => state.isAnswered)
  const submitAnswer = useQuizStore((state) => state.submitAnswer)
  const nextQuestion = useQuizStore((state) => state.nextQuestion)

  // ─────────────────────────────────────────────────────────────────
  // REDIRECT IF NO QUESTIONS
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (questions.length === 0) {
      router.push('/quiz')
    }
  }, [questions.length, router])

  if (questions.length === 0) {
    return null
  }

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentQuestion.$id]
  const isLastQuestion = currentIndex === questions.length - 1

  // Calculate correct count
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length

  // ─────────────────────────────────────────────────────────────────
  // HANDLE OPTION CLICK
  // ─────────────────────────────────────────────────────────────────
  const handleOptionClick = async (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (isAnswered) return

    const isCorrect = optionKey === currentQuestion.correct_option

    // Update store
    submitAnswer(currentQuestion.$id, optionKey, currentQuestion.correct_option)

    // Save to database
    try {
      const user = await getCurrentUser()
      if (user) {
        await saveAttempt({
          user_id: user.$id,
          question_id: currentQuestion.$id,
          selected_option: optionKey,
          is_correct: isCorrect,
        })
        await incrementStats(user.$id, isCorrect)
      }
    } catch (error) {
      console.error('Failed to save attempt:', error)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // HANDLE NEXT QUESTION / SEE RESULTS
  // ─────────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (isLastQuestion) {
      router.push('/results?session=' + sessionId)
    } else {
      nextQuestion()
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DETERMINE OPTION STATES
  // ─────────────────────────────────────────────────────────────────
  const getOptionState = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (!isAnswered) return 'default'

    const selectedOption = currentAnswer?.selectedOption
    const correctOption = currentQuestion.correct_option

    if (optionKey === selectedOption && optionKey === correctOption) {
      return 'correct'
    }
    if (optionKey === selectedOption && optionKey !== correctOption) {
      return 'incorrect'
    }
    if (optionKey === correctOption && selectedOption !== correctOption) {
      return 'revealed'
    }
    return 'default'
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        {/* Progress Bar */}
        <QuizProgressBar
          current={currentIndex + 1}
          total={questions.length}
          correctCount={correctCount}
        />

        {/* Question Card */}
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
        />

        {/* Options */}
        <div className="space-y-3">
          <OptionButton
            optionKey="A"
            text={currentQuestion.option_a}
            state={getOptionState('A')}
            onClick={() => handleOptionClick('A')}
            disabled={isAnswered}
          />
          <OptionButton
            optionKey="B"
            text={currentQuestion.option_b}
            state={getOptionState('B')}
            onClick={() => handleOptionClick('B')}
            disabled={isAnswered}
          />
          <OptionButton
            optionKey="C"
            text={currentQuestion.option_c}
            state={getOptionState('C')}
            onClick={() => handleOptionClick('C')}
            disabled={isAnswered}
          />
          <OptionButton
            optionKey="D"
            text={currentQuestion.option_d}
            state={getOptionState('D')}
            onClick={() => handleOptionClick('D')}
            disabled={isAnswered}
          />
        </div>

        {/* Explanation Box (shown after answer) */}
        {isAnswered && (
          <ExplanationBox
            explanation={currentQuestion.explanation}
            correctOption={currentQuestion.correct_option}
            onNext={handleNext}
            isLastQuestion={isLastQuestion}
          />
        )}
      </div>
    </div>
  )
}

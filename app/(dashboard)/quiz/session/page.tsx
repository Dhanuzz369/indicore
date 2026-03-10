'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { saveAttempt, incrementStats } from '@/lib/appwrite/queries'
import { QuestionCard } from '@/components/quiz/QuestionCard'
import { OptionButton } from '@/components/quiz/OptionButton'
import { ExplanationBox } from '@/components/quiz/ExplanationBox'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from 'lucide-react'

export default function TestSessionPage() {
  const router = useRouter()

  const {
    questions,
    currentIndex,
    answers,
    testMode,
    paperLabel,
    startTime,
    elapsedSeconds,
    isSubmitted,
    setElapsed,
    startTimer,
    submitTest,
    submitAnswer
  } = useQuizStore()

  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 1. Redirect if no questions
  useEffect(() => {
    if (questions.length === 0) {
      router.push('/quiz')
    }
  }, [questions.length, router])

  // 2. Timer setup
  useEffect(() => {
    if (questions.length === 0 || isSubmitted) return

    if (!startTime) {
      startTimer()
    }

    const interval = setInterval(() => {
      if (startTime) {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [questions.length, isSubmitted, startTime, startTimer, setElapsed])

  if (questions.length === 0) return null

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentQuestion.$id]
  const answeredCount = Object.keys(answers).length
  const total = questions.length
  const unanswered = total - answeredCount

  // Format time
  const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')
  const secs = (elapsedSeconds % 60).toString().padStart(2, '0')

  // Handle option click
  const handleOptionClick = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return
    submitAnswer(currentQuestion.$id, optionKey, currentQuestion.correct_option)
  }

  // Handle final submit
  const handleConfirmSubmit = async () => {
    setShowSubmitDialog(false)
    setIsSaving(true)
    submitTest()

    try {
      const user = await getCurrentUser()
      if (user) {
        // Save all answers sequentially
        for (const [qId, ans] of Object.entries(answers)) {
          await saveAttempt({
            user_id: user.$id,
            question_id: qId,
            selected_option: ans.selectedOption,
            is_correct: ans.isCorrect,
          })
          await incrementStats(user.$id, ans.isCorrect)
        }
      }
      router.push('/results')
    } catch (e) {
      console.error('Failed to save attempts:', e)
      router.push('/results')
    }
  }

  const getOptionState = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    const selectedOption = currentAnswer?.selectedOption
    const correctOption = currentQuestion.correct_option

    if (isSubmitted) {
      if (optionKey === selectedOption && optionKey === correctOption) return 'correct'
      if (optionKey === selectedOption && optionKey !== correctOption) return 'incorrect'
      if (optionKey === correctOption && selectedOption !== correctOption) return 'revealed'
      return 'default'
    } else {
      // Not submitted yet
      if (optionKey === selectedOption) return 'selected'
      return 'default'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP NAVIGATION BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-semibold text-gray-800 line-clamp-1 max-w-[40%]">
            {paperLabel || 'Full Length Test'}
          </div>
          <div className="font-medium text-gray-500">
            Q {currentIndex + 1} / {total}
          </div>
          <div className="font-mono font-medium text-[#FF6B00]">
            ⏱ {mins}:{secs}
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT AREA */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row relative">

        {/* Left: Question Area */}
        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
          <div className="flex items-center gap-3">
            <span className="bg-[#FF6B00] text-white px-3 py-1 rounded-md font-bold shadow-sm">
              Q.{currentIndex + 1}
            </span>
          </div>

          <div className="text-lg leading-relaxed font-medium text-gray-900 bg-white p-6 rounded-xl border shadow-sm whitespace-pre-wrap">
            {currentQuestion.question_text}
          </div>

          <div className="space-y-3">
            {(['A', 'B', 'C', 'D'] as const).map(key => (
              <OptionButton
                key={key}
                optionKey={key}
                text={currentQuestion[`option_${key.toLowerCase()}` as keyof typeof currentQuestion] as string}
                state={getOptionState(key)}
                onClick={() => handleOptionClick(key)}
                disabled={isSubmitted}
              />
            ))}
          </div>

          {/* Explanation if submitted */}
          {isSubmitted && (
            <ExplanationBox
              explanation={currentQuestion.explanation}
              correctOption={currentQuestion.correct_option}
              onNext={() => { }}
              isLastQuestion={currentIndex === total - 1}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t mt-8">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => useQuizStore.setState({ currentIndex: currentIndex - 1 })}
            >
              &larr; Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentIndex === total - 1}
              onClick={() => useQuizStore.setState({ currentIndex: currentIndex + 1 })}
            >
              Next &rarr;
            </Button>
          </div>
        </div>

        {/* Right: Navigation Grid (Desktop) */}
        <div className="hidden md:block w-72 border-l bg-white p-6 shrink-0 relative">
          <div className="sticky top-24">
            <h3 className="font-bold text-gray-800 mb-4">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const qAns = answers[q.$id];
                const isCurrent = idx === currentIndex;
                const isAnswered = !!qAns;

                let btnClass = "h-10 w-10 flex items-center justify-center rounded-md font-medium text-sm transition-colors ";

                if (isCurrent) {
                  btnClass += "ring-2 ring-offset-1 ring-[#FF6B00] ";
                }

                if (isAnswered) {
                  btnClass += "bg-green-100 text-green-800 border-green-200 border cursor-pointer";
                } else {
                  btnClass += "bg-white border text-gray-600 hover:bg-gray-50 cursor-pointer";
                }

                return (
                  <button
                    key={q.$id}
                    onClick={() => useQuizStore.setState({ currentIndex: idx })}
                    className={btnClass}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BOTTOM FIXED BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white border-t px-4 py-4 md:px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-green-600 font-semibold">
            {answeredCount}/{total} Answered
          </div>

          <Button
            className="bg-[#FF6B00] hover:bg-[#FF8C00] text-white px-8"
            disabled={answeredCount === 0 || isSubmitted || isSaving}
            onClick={() => setShowSubmitDialog(true)}
          >
            {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'Submit Test'}
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBMIT CONFIRMATION DIALOG */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {total} questions.<br />
              {unanswered > 0 && <span><strong>{unanswered} questions are unanswered.</strong><br /></span>}
              Are you sure you want to submit? You cannot change your answers after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); handleConfirmSubmit(); }}
              className="bg-[#FF6B00] hover:bg-[#FF8C00]"
            >
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

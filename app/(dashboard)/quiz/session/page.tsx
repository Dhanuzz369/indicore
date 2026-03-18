'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { saveAttempt, incrementStats } from '@/lib/appwrite/queries'
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
import { Loader2, ChevronLeft, ChevronRight, Bookmark, PanelRight, X, House } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// Question palette color logic for Full Length Test
// Priority: marked-for-review > answered > visited-unanswered > not-visited
// ─────────────────────────────────────────────────────────────────
type PaletteStatus = 'not-visited' | 'answered' | 'visited-unanswered' | 'marked-review' | 'answered-marked'

function getPaletteStatus(
  questionId: string,
  answers: Record<string, { selectedOption: string; isCorrect: boolean }>,
  visited: Set<string>,
  marked: Set<string>
): PaletteStatus {
  const isAnswered = !!answers[questionId]
  const isMarked = marked.has(questionId)
  const isVisited = visited.has(questionId)

  if (isMarked && isAnswered) return 'answered-marked'
  if (isMarked) return 'marked-review'
  if (isAnswered) return 'answered'
  if (isVisited) return 'visited-unanswered'
  return 'not-visited'
}

function PaletteButton({
  index,
  questionId,
  isCurrent,
  answers,
  visited,
  marked,
  onClick,
}: {
  index: number
  questionId: string
  isCurrent: boolean
  answers: Record<string, { selectedOption: string; isCorrect: boolean }>
  visited: Set<string>
  marked: Set<string>
  onClick: () => void
}) {
  const status = getPaletteStatus(questionId, answers, visited, marked)

  const baseClass = 'h-9 w-9 flex items-center justify-center rounded-lg font-semibold text-xs transition-all relative'
  const ringClass = isCurrent ? 'ring-2 ring-offset-1 ring-gray-700' : ''

  let colorClass = ''
  switch (status) {
    case 'answered':
      colorClass = 'bg-green-500 text-white'
      break
    case 'visited-unanswered':
      colorClass = 'bg-red-100 text-red-700 border border-red-400'
      break
    case 'marked-review':
      colorClass = 'bg-purple-500 text-white'
      break
    case 'answered-marked':
      colorClass = 'bg-purple-500 text-white'
      break
    default: // not-visited
      colorClass = 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
  }

  return (
    <button onClick={onClick} className={`${baseClass} ${colorClass} ${ringClass}`}>
      {index + 1}
      {/* Small dot indicator for answered-marked */}
      {status === 'answered-marked' && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
      )}
    </button>
  )
}

export default function TestSessionPage() {
  const router = useRouter()

  const {
    questions,
    currentIndex,
    answers,
    visitedQuestions,
    markedForReview,
    testMode,
    paperLabel,
    startTime,
    elapsedSeconds,
    isSubmitted,
    isAnswered,
    setElapsed,
    startTimer,
    submitTest,
    submitAnswer,
    nextQuestion,
    goToQuestion,
    markVisited,
    toggleMarkForReview,
    timers,
    buttonStats,
    startTimerForQuestion,
    stopTimerForQuestion,
    getTimeForQuestion,
    incrementButtonUsage,
  } = useQuizStore()

  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // Mobile palette drawer
  const [showMobilePalette, setShowMobilePalette] = useState(false)
  const [disabledOptions, setDisabledOptions] = useState<Set<string>>(new Set())
  const [showAreYouSureDialog, setShowAreYouSureDialog] = useState(false)
  const [pendingOption, setPendingOption] = useState<'A'|'B'|'C'|'D'|null>(null)
  const [isGuess, setIsGuess] = useState(false)

  // ── 1. Redirect if no questions ──
  useEffect(() => {
    if (questions.length === 0) router.push('/quiz')
  }, [questions.length, router])

  // ── 2a. Mark first question as visited on load ──
  useEffect(() => {
    if (questions.length > 0) markVisited(questions[0].$id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length])

  // ── 2b. Start timer once ──
  useEffect(() => {
    if (questions.length === 0 || isSubmitted) return
    startTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length])

  // ── 2c. Tick using ref to prevent stale closure ──
  const startTimeRef = useRef<number | null>(null)
  useEffect(() => { startTimeRef.current = startTime }, [startTime])
  useEffect(() => {
    if (questions.length === 0 || isSubmitted) return
    const interval = setInterval(() => {
      if (startTimeRef.current) setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [questions.length, isSubmitted, setElapsed])

  if (questions.length === 0) return null

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentQuestion.$id]
  const answeredCount = Object.keys(answers).length
  const total = questions.length
  const isMarkedCurrent = markedForReview.has(currentQuestion.$id)
  const isLastQuestion = currentIndex === total - 1
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length
  const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')
  const secs = (elapsedSeconds % 60).toString().padStart(2, '0')

  // Counts for summary
  const visitedUnanswered = Array.from(visitedQuestions).filter(
    id => !answers[id] && !markedForReview.has(id)
  ).length
  const markedCount = markedForReview.size

  // ── Start timer for question ──
  useEffect(() => {
    if (currentQuestion) {
      startTimerForQuestion(currentQuestion.$id)
      setDisabledOptions(new Set())
      setIsGuess(false)
    }
  }, [currentIndex, currentQuestion, startTimerForQuestion])

  // ── Option click ──
  const handleOptionClick = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (disabledOptions.has(optionKey)) return
    setPendingOption(optionKey)
    if (testMode) {
      setShowAreYouSureDialog(true)
    } else {
      handleConfirmOption()
    }
  }

  // ── Confirm option ──
  const handleConfirmOption = async () => {
    if (!pendingOption) return
    setShowAreYouSureDialog(false)
    stopTimerForQuestion(currentQuestion.$id)
    const timeTaken = Math.floor(getTimeForQuestion(currentQuestion.$id) / 1000)
    const usedAreYouSure = testMode
    submitAnswer(currentQuestion.$id, pendingOption, currentQuestion.correct_option, timeTaken, disabledOptions.size > 0, isGuess, usedAreYouSure)
    setPendingOption(null)
    if (!testMode) {
      try {
        const user = await getCurrentUser()
        if (user) {
          await saveAttempt({ 
            user_id: user.$id, 
            question_id: currentQuestion.$id, 
            selected_option: pendingOption, 
            is_correct: pendingOption === currentQuestion.correct_option,
            time_taken_seconds: timeTaken,
            used_5050: disabledOptions.size > 0,
            used_guess: isGuess,
            used_areyousure: usedAreYouSure,
            is_guess: isGuess
          })
          await incrementStats(user.$id, pendingOption === currentQuestion.correct_option)
        }
      } catch (e) { console.error('Failed to save attempt:', e) }
    }
  }

  // ── Button handlers ──
  const handle5050 = () => {
    if (disabledOptions.size > 0) return
    const options = ['A', 'B', 'C', 'D'].filter(o => !disabledOptions.has(o))
    const correct = currentQuestion.correct_option
    const wrongs = options.filter(o => o !== correct)
    const toDisable = wrongs.sort(() => Math.random() - 0.5).slice(0, 2)
    setDisabledOptions(new Set([...disabledOptions, ...toDisable]))
    incrementButtonUsage('used5050')
  }

  const handleGuess = () => {
    setIsGuess(true)
    incrementButtonUsage('guessed')
  }

  // ── Navigate: Save & Next (test mode) ──
  const handleSaveAndNext = () => {
    if (currentIndex < total - 1) {
      nextQuestion()  // also marks next as visited in store
    }
  }

  // ── Navigate: Mark for Review & Next ──
  const handleMarkForReviewAndNext = () => {
    toggleMarkForReview(currentQuestion.$id)
    if (currentIndex < total - 1) {
      nextQuestion()
    }
  }

  // ── Navigate: Previous ──
  const handlePrev = () => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1)
  }

  // ── Submit (test mode) ──
  const handleConfirmSubmit = async () => {
    setShowSubmitDialog(false)
    setIsSaving(true)
    submitTest()
    try {
      const user = await getCurrentUser()
      if (user) {
        for (const [qId, ans] of Object.entries(answers)) {
          await saveAttempt({ 
            user_id: user.$id, 
            question_id: qId, 
            selected_option: ans.selectedOption, 
            is_correct: ans.isCorrect,
            time_taken_seconds: ans.timeTaken,
            used_5050: ans.used5050,
            used_guess: ans.isGuess,
            used_areyousure: ans.usedAreYouSure,
            is_guess: ans.isGuess
          })
          await incrementStats(user.$id, ans.isCorrect)
        }
      }
    } catch (e) { console.error('Failed to save attempts:', e) }
    router.push('/results')
  }

  // ── Practice: Next ──
  const handleNextInPractice = () => {
    if (isLastQuestion) router.push('/results')
    else nextQuestion()
  }

  // ── Option display state ──
  const getOptionState = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    const sel = currentAnswer?.selectedOption
    const correct = currentQuestion.correct_option
    if (testMode) {
      if (isSubmitted) {
        if (optionKey === sel && optionKey === correct) return 'correct'
        if (optionKey === sel && optionKey !== correct) return 'incorrect'
        if (optionKey === correct && sel !== correct) return 'revealed'
        return 'default'
      }
      return optionKey === sel ? 'selected' : 'default'
    } else {
      if (!isAnswered) return 'default'
      if (optionKey === sel && optionKey === correct) return 'correct'
      if (optionKey === sel && optionKey !== correct) return 'incorrect'
      if (optionKey === correct && sel !== correct) return 'revealed'
      return 'default'
    }
  }

  // ── Shared palette render ──
  const PaletteContent = () => (
    <div className="space-y-4">
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-green-500 shrink-0" />Answered</div>
        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-100 border border-red-400 shrink-0" />Visited, Not Answered</div>
        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-purple-500 shrink-0" />Marked for Review</div>
        <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white border border-gray-300 shrink-0" />Not Visited</div>
      </div>
      {/* Note for answered+marked */}
      <p className="text-[11px] text-gray-400">Purple with green dot = Answered & Marked for Review</p>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, idx) => (
          <PaletteButton
            key={q.$id}
            index={idx}
            questionId={q.$id}
            isCurrent={idx === currentIndex}
            answers={answers}
            visited={visitedQuestions}
            marked={markedForReview}
            onClick={() => { goToQuestion(idx); setShowMobilePalette(false) }}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="border-t pt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="font-bold text-green-700 text-base">{answeredCount}</p>
          <p className="text-green-600">Answered</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="font-bold text-red-700 text-base">{visitedUnanswered}</p>
          <p className="text-red-600">Not Answered</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <p className="font-bold text-purple-700 text-base">{markedCount}</p>
          <p className="text-purple-600">For Review</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="font-bold text-gray-700 text-base">{total - answeredCount - visitedUnanswered - markedCount}</p>
          <p className="text-gray-500">Not Visited</p>
        </div>
      </div>

      {/* Submit button inside palette */}
      <button
        onClick={() => { setShowMobilePalette(false); setShowSubmitDialog(true) }}
        disabled={answeredCount === 0 || isSubmitted || isSaving}
        className="w-full bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Test'}
      </button>
    </div>
  )

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* ─── TOP BAR ─── */}
      <header className="shrink-0 bg-white border-b shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center gap-2">
          {/* Home button (practice mode) */}
          {!testMode && (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors shrink-0"
              title="Return to Home"
            >
              <House className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Home</span>
            </button>
          )}
          {/* Paper label */}
          <div className="flex-1 font-semibold text-gray-800 text-sm truncate">
            {paperLabel || (testMode ? 'Full Length Test' : 'Subject Practice')}
          </div>
          {/* Q counter */}
          <div className="text-sm font-medium text-gray-500 shrink-0">
            Q {currentIndex + 1} / {total}
          </div>
          {/* Timer */}
          <div className="font-mono font-bold text-[#FF6B00] shrink-0 text-sm md:text-base">
            ⏱ {mins}:{secs}
          </div>
          {/* Mobile palette toggle (test mode only) */}
          {testMode && (
            <button
              onClick={() => setShowMobilePalette(true)}
              className="md:hidden flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 transition-colors shrink-0"
            >
              <PanelRight className="h-4 w-4" />
              <span className="hidden xs:inline">Panel</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── MAIN AREA ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── QUESTION AREA (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5 pb-32">

            {/* Practice mode progress bar */}
            {!testMode && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Question {currentIndex + 1} of {total}</span>
                  <span className="text-green-600 font-semibold">{correctCount} correct</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF6B00] rounded-full transition-all duration-500"
                    style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Question number + mark tag */}
            <div className="flex items-center justify-between">
              <span className="bg-[#FF6B00] text-white px-3 py-1 rounded-lg font-bold text-sm shadow-sm">
                Q.{currentIndex + 1}
              </span>
              {testMode && isMarkedCurrent && (
                <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                  <Bookmark className="h-3 w-3 fill-purple-500" />
                  Marked for Review
                </span>
              )}
            </div>

            {/* Question text */}
            <div className="text-base md:text-lg leading-relaxed font-medium text-gray-900 bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-sm whitespace-pre-wrap">
              {currentQuestion.question_text}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map(key => (
                <OptionButton
                  key={key}
                  optionKey={key}
                  text={currentQuestion[`option_${key.toLowerCase()}` as keyof typeof currentQuestion] as string}
                  state={getOptionState(key)}
                  onClick={() => handleOptionClick(key)}
                  disabled={testMode ? isSubmitted || disabledOptions.has(key) : isAnswered || disabledOptions.has(key)}
                />
              ))}
            </div>

            {/* Buttons */}
            {!isAnswered && !isSubmitted && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={handle5050} disabled={disabledOptions.size > 0}>
                  50:50
                </Button>
                <Button variant="outline" onClick={handleGuess} disabled={isGuess}>
                  Guess
                </Button>
                {testMode && (
                  <Button variant="outline" onClick={() => setShowAreYouSureDialog(true)} disabled={!pendingOption}>
                    Are You Sure?
                  </Button>
                )}
              </div>
            )}

            {/* Explanation (practice mode after answering, or test mode after submit) */}
            {(testMode ? isSubmitted : isAnswered) && (
              <ExplanationBox
                explanation={currentQuestion.explanation}
                correctOption={currentQuestion.correct_option}
                onNext={!testMode ? handleNextInPractice : () => { }}
                isLastQuestion={isLastQuestion}
              />
            )}

            {/* ─── TEST MODE: Action buttons ─── */}
            {testMode && !isSubmitted && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                {/* Row 1: Mark for Review + Save & Next */}
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkForReviewAndNext}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${isMarkedCurrent
                      ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                      : 'bg-white text-purple-600 border-purple-400 hover:bg-purple-50'
                      }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isMarkedCurrent ? 'fill-white' : ''}`} />
                    {isMarkedCurrent ? 'Unmark & Next' : 'Mark for Review & Next'}
                  </button>
                </div>

                {/* Row 2: Previous + Save & Next */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={handlePrev}
                    className="gap-1 font-semibold"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    onClick={handleSaveAndNext}
                    disabled={currentIndex === total - 1}
                    className="flex-1 bg-gray-800 hover:bg-gray-900 text-white gap-1 font-semibold"
                  >
                    Save & Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Question Palette (desktop, test mode only) ─── */}
        {testMode && (
          <aside className="hidden md:flex w-72 bg-white border-l border-gray-100 shrink-0 overflow-y-auto">
            <div className="p-5 w-full space-y-4">
              <h3 className="font-bold text-gray-800 text-sm">Question Palette</h3>
              <PaletteContent />
            </div>
          </aside>
        )}
      </div>

      {/* ─── BOTTOM BAR (test mode, desktop) ─── */}
      {testMode && (
        <div className="shrink-0 bg-white border-t px-4 py-3 z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600 font-semibold">{answeredCount} Answered</span>
              <span className="text-gray-300">|</span>
              <span className="text-red-500 font-semibold">{visitedUnanswered} Not Answered</span>
              {markedCount > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-purple-600 font-semibold">{markedCount} For Review</span>
                </>
              )}
            </div>
            <button
              className="bg-[#FF6B00] hover:bg-[#FF8C00] text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
              disabled={answeredCount === 0 || isSubmitted || isSaving}
              onClick={() => setShowSubmitDialog(true)}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Test'}
            </button>
          </div>
        </div>
      )}

      {/* ─── MOBILE PALETTE DRAWER (test mode) ─── */}
      {testMode && showMobilePalette && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobilePalette(false)} />
          {/* Drawer from right */}
          <div className="relative ml-auto w-80 max-w-[90vw] h-full bg-white overflow-y-auto animate-in slide-in-from-right-4 duration-200">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Question Palette</h3>
                <button onClick={() => setShowMobilePalette(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <PaletteContent />
            </div>
          </div>
        </div>
      )}

      {/* ─── SUBMIT DIALOG ─── */}
      {testMode && (
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Test?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">You have answered <strong>{answeredCount}</strong> out of <strong>{total}</strong> questions.</span>
                {visitedUnanswered > 0 && <span className="block text-red-600 font-semibold">{visitedUnanswered} questions visited but not answered.</span>}
                {markedCount > 0 && <span className="block text-purple-600 font-semibold">{markedCount} question(s) marked for review.</span>}
                <span className="block text-gray-500 text-sm">You cannot change answers after submitting.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Review Answers</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); handleConfirmSubmit() }}
                className="bg-[#FF6B00] hover:bg-[#FF8C00]"
              >
                Submit Test
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ─── ARE YOU SURE DIALOG ─── */}
      <AlertDialog open={showAreYouSureDialog} onOpenChange={setShowAreYouSureDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You selected option {pendingOption}. Confirm to submit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingOption(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOption}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

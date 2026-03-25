'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { 
  saveAttempt, incrementStats, saveUserTestSummary, createTestSession, 
  reportIssue 
} from '@/lib/appwrite/queries'
import { generateTestAnalytics } from '@/lib/analytics/engine'
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
import { Loader2, ChevronLeft, ChevronRight, Bookmark, PanelRight, X, House, Flag } from 'lucide-react'
import { toast } from 'sonner'

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
    practiceTimerTotal,
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
    confidenceMap,
    startTimerForQuestion,
    stopTimerForQuestion,
    getTimeForQuestion,
    incrementButtonUsage,
    setConfidenceForQuestion,
    clearResponse,
    updateTimeForAnswer,
  } = useQuizStore()

  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // Mobile palette drawer
  const [showMobilePalette, setShowMobilePalette] = useState(false)

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

  // ── 2d. Auto-submit when countdown hits zero ──
  const autoSubmittedRef = useRef(false)
  useEffect(() => {
    if (!testMode || isSubmitted || autoSubmittedRef.current) return
    const total = practiceTimerTotal > 0 ? practiceTimerTotal : 120 * 60
    const left = Math.max(total - elapsedSeconds, 0)
    if (left === 0) {
      autoSubmittedRef.current = true
      toast.info("Time's up! Submitting your test…")
      setShowSubmitDialog(false)
      setTimeout(() => handleConfirmSubmit(), 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, testMode, isSubmitted, practiceTimerTotal])

  if (questions.length === 0) return null

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentQuestion.$id]
  const answeredCount = Object.keys(answers).length
  const total = questions.length
  const isMarkedCurrent = markedForReview.has(currentQuestion.$id)
  const isLastQuestion = currentIndex === total - 1
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length
  // Determine total seconds for countdown:
  // - Full-length (testMode + practiceTimerTotal=0): 120 min
  // - Subject practice (testMode + practiceTimerTotal>0): practiceTimerTotal
  // - Free practice (testMode=false): count up
  const countdownTotal = testMode ? (practiceTimerTotal > 0 ? practiceTimerTotal : 120 * 60) : 0
  const timeLeft = countdownTotal > 0 ? Math.max(countdownTotal - elapsedSeconds, 0) : 0
  let timerDisplay = ''
  if (countdownTotal > 0) {
    const mTotal = Math.floor(timeLeft / 60).toString().padStart(2, '0')
    const s = (timeLeft % 60).toString().padStart(2, '0')
    timerDisplay = `${mTotal}:${s}`
  } else {
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')
    const s = (elapsedSeconds % 60).toString().padStart(2, '0')
    timerDisplay = `${m}:${s}`
  }
  const isTimeCritical = countdownTotal > 0 && timeLeft <= 60

  // Counts for summary
  const visitedUnanswered = Array.from(visitedQuestions).filter(
    id => !answers[id] && !markedForReview.has(id)
  ).length
  const markedCount = markedForReview.size

  // ── Start/Stop timer for question ──
  useEffect(() => {
    if (currentQuestion && !isSubmitted) {
      startTimerForQuestion(currentQuestion.$id)
    }
    return () => {
      if (currentQuestion) {
        stopTimerForQuestion(currentQuestion.$id)
      }
    }
  }, [currentIndex, currentQuestion, startTimerForQuestion, stopTimerForQuestion, isSubmitted])

  // ── Option click ──
  const handleOptionClick = async (optionKey: 'A' | 'B' | 'C' | 'D') => {
    // In practice mode, prevent re-answering once they have answered
    if (!testMode && isAnswered) return
    
    // We don't stop the timer here. The useEffect cleanup handles it when navigating away!
    const timeTaken = Math.floor(getTimeForQuestion(currentQuestion.$id) / 1000)
    
    // Capture confidence BEFORE submitAnswer (which overwrites answers)
    const currentConfidence = confidenceMap[currentQuestion.$id]
    const isSure = currentConfidence === 'sure'
    const is5050 = currentConfidence === 'fifty_fifty'
    const isGuess = currentConfidence === 'guess'
    // Derive tag from current confidence state
    const confidenceTag: 'sure' | 'fifty_fifty' | 'guess' | null = 
      isSure ? 'sure' : is5050 ? 'fifty_fifty' : isGuess ? 'guess' : null
    
    submitAnswer(
      currentQuestion.$id, 
      optionKey, 
      currentQuestion.correct_option, 
      timeTaken, 
      is5050, 
      isGuess, 
      isSure
    )
    if (!testMode) {
      try {
        const user = await getCurrentUser()
        if (user) {
          await saveAttempt({ 
            user_id: user.$id, 
            question_id: currentQuestion.$id, 
            selected_option: optionKey, 
            is_correct: optionKey === currentQuestion.correct_option,
            time_taken_seconds: timeTaken,
            used_5050: is5050,
            used_guess: isGuess,
            used_areyousure: isSure,
            is_guess: isGuess,
            confidence_tag: confidenceTag,
            selection_history: JSON.stringify({
              q_id: currentQuestion.$id,
              selections: [],
              final_answer: optionKey,
              correct_answer: currentQuestion.correct_option
            })
          })
          await incrementStats(user.$id, optionKey === currentQuestion.correct_option)
        }
      } catch (e) { console.error('Failed to save attempt:', e) }
      // Navigate
      if (isLastQuestion) {
        router.push('/results')
      } else {
        nextQuestion()
      }
    }
  }

  // ── Confidence Handlers — uses store so tags persist across navigation ──
  const toggleConfidence = (tag: 'fifty_fifty' | 'guess' | 'sure') => {
    const current = confidenceMap[currentQuestion.$id]
    const next = current === tag ? undefined : tag
    setConfidenceForQuestion(currentQuestion.$id, next)
    // Track usage counts in store (only on first activation, not toggle-off)
    if (next !== undefined) {
      if (tag === 'fifty_fifty') incrementButtonUsage('used5050')
      if (tag === 'guess') incrementButtonUsage('guessed')
      if (tag === 'sure') incrementButtonUsage('areYouSure')
    }
  }

  // ── Navigate: Save & Next (test mode) ──
  const handleSaveAndNext = () => {
    if (currentQuestion) {
      const currentTime = Math.floor(getTimeForQuestion(currentQuestion.$id) / 1000)
      updateTimeForAnswer(currentQuestion.$id, currentTime)
    }
    if (currentIndex < total - 1) {
      nextQuestion()  // also marks next as visited in store
    }
  }

  // ── Navigate: Mark for Review & Next ──
  const handleMarkForReviewAndNext = () => {
    if (currentQuestion) {
      const currentTime = Math.floor(getTimeForQuestion(currentQuestion.$id) / 1000)
      updateTimeForAnswer(currentQuestion.$id, currentTime)
    }
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
        // Get snapshot of confidenceMap at submit time (this is the real source of truth)
        const { confidenceMap: finalConfidenceMap } = useQuizStore.getState()

        // Make sure all times are fresh before submitting
        for (const qId of Object.keys(answers)) {
          const finalTimeTaken = Math.floor(getTimeForQuestion(qId) / 1000)
          updateTimeForAnswer(qId, finalTimeTaken)
        }

        // Compute analytics
        const { confidenceMap: cm } = useQuizStore.getState()
        const attemptsToAnalyze = Object.entries(answers).map(([qId, ans]) => {
          const finalTag: 'sure' | 'fifty_fifty' | 'guess' | null = cm[qId] || ans.confidenceTag || null
          return {
            $id: '', user_id: user.$id, question_id: qId,
            selected_option: ans.selectedOption, is_correct: ans.isCorrect,
            time_taken_seconds: Math.floor(getTimeForQuestion(qId) / 1000),
            used_5050: finalTag === 'fifty_fifty',
            used_guess: finalTag === 'guess', used_areyousure: finalTag === 'sure',
            is_guess: finalTag === 'guess', confidence_tag: finalTag,
            selection_history: JSON.stringify({ q_id: qId, selections: ans.selectionHistory || [], final_answer: ans.selectedOption, correct_answer: questions.find(q => q.$id === qId)?.correct_option })
          }
        })
        const analytics = generateTestAnalytics({ questions, attempts: attemptsToAnalyze, totalTestTime: elapsedSeconds })
        const totalCorrect = analytics.subjectStats.reduce((sum, s) => sum + s.correct, 0)
        const totalWrong = Object.values(answers).filter(a => !a.isCorrect).length
        const numAttempted = Object.keys(answers).length
        const scorePercent = numAttempted > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0
        const submittedAt = new Date().toISOString()
        const startedAt = startTime ? new Date(startTime).toISOString() : submittedAt

        // ── 1. Create test_session document ──
        let sessionDocId = ''
        try {
          const firstQuestion = questions[0]
          const { practiceTimerTotal: ptt } = useQuizStore.getState()
          const sessDoc = await createTestSession({
            user_id: user.$id,
            exam_type: firstQuestion?.exam_type ?? 'UPSC',
            year: firstQuestion?.year ?? new Date().getFullYear(),
            paper: firstQuestion?.paper ?? 'Prelims GS1',
            paper_label: paperLabel || 'Full Length Test',
            mode: ptt > 0 ? 'subject_practice' : 'full_length',
            started_at: startedAt,
            submitted_at: submittedAt,
            total_time_seconds: elapsedSeconds,
            total_questions: questions.length,
            attempted: numAttempted,
            correct: totalCorrect,
            incorrect: totalWrong,
            skipped: questions.length - numAttempted,
            score: scorePercent,
            analytics: JSON.stringify(analytics),
            snapshot: JSON.stringify({
              questions,
              answers: Object.fromEntries(
                Object.entries(answers).map(([qId, ans]) => {
                  const finalTag: 'sure' | 'fifty_fifty' | 'guess' | null = finalConfidenceMap[qId] || ans.confidenceTag || null
                  return [qId, { ...ans, confidenceTag: finalTag }]
                })
              ),
              confidenceMap: finalConfidenceMap,
              elapsedSeconds,
              paperLabel,
            }),
            ai_feedback: '',
            question_ids: JSON.stringify(questions.map(q => q.$id)),
          })
          sessionDocId = sessDoc.$id
        } catch (e) {
          console.error('Failed to save test session:', e)
          // Continue saving attempts even if session doc fails
        }

        // ── 2. Save all quiz_attempts with session_id ──
        for (const [qId, ans] of Object.entries(answers)) {
          const finalTimeTaken = Math.floor(getTimeForQuestion(qId) / 1000)
          const finalConfTag: 'sure' | 'fifty_fifty' | 'guess' | null =
            finalConfidenceMap[qId] || ans.confidenceTag || null

          try {
            await saveAttempt({
              user_id: user.$id,
              question_id: qId,
              selected_option: ans.selectedOption,
              is_correct: ans.isCorrect,
              session_id: sessionDocId || undefined,
              time_taken_seconds: finalTimeTaken,
              used_5050: finalConfTag === 'fifty_fifty',
              used_guess: finalConfTag === 'guess',
              used_areyousure: finalConfTag === 'sure',
              is_guess: finalConfTag === 'guess',
              confidence_tag: finalConfTag,
              selection_history: JSON.stringify({
                q_id: qId,
                selections: ans.selectionHistory || [],
                final_answer: ans.selectedOption,
                correct_answer: questions.find(q => q.$id === qId)?.correct_option
              })
            })
            await incrementStats(user.$id, ans.isCorrect)
          } catch (e) {
            console.error('Failed to save attempt for', qId, e)
          }
        }

        // ── 3. Save legacy user_test_summary ──
        try {
          await saveUserTestSummary({
            user_id: user.$id,
            test_id: sessionDocId || `test_${Date.now()}`,
            date: submittedAt,
            total_score: Math.max(0, parseFloat(((totalCorrect * 2) - (totalWrong * 0.66)).toFixed(1))),
            subject_scores: JSON.stringify(analytics.subjectStats),
            difficulty_scores: JSON.stringify(analytics.difficultyStats),
            accuracy: scorePercent,
            attempts_count: numAttempted,
            confidence_stats: JSON.stringify(analytics.confidenceStats)
          })
        } catch (e) {
          console.error('Failed to save test summary:', e)
        }

        toast.success('Test submitted and saved! 🎉')
        router.push(sessionDocId ? `/results?session=${sessionDocId}` : '/results')
        return
      }
    } catch (e) {
      console.error('Failed to save attempts:', e)
      toast.error('Submission saved locally. Some data may not have synced.')
    }
    router.push('/results')
  }

  // ── Report Issue ──
  const handleReportIssue = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        toast.error('Please log in to report issues.')
        return
      }
      
      const promise = reportIssue({
        user_id: user.$id,
        question_id: currentQuestion.$id,
        mode: testMode ? 'full_length' : 'subject'
      })

      toast.promise(promise, {
        loading: 'Reporting question...',
        success: 'Thank you! Issue logged for review.',
        error: (err) => `Failed to report: ${err.message || 'Unknown error'}`
      })
    } catch (e) {
      console.error(e)
      toast.error('An error occurred while reporting.')
    }
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
          {/* Home button (free practice mode) OR Back button (subject practice) */}
          {!testMode ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors shrink-0"
              title="Return to Home"
            >
              <House className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Home</span>
            </button>
          ) : practiceTimerTotal > 0 && !isSubmitted ? (
            <button
              onClick={() => router.push('/quiz?tab=subject')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors shrink-0"
              title="Back to Subject Selection"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Subjects</span>
            </button>
          ) : null}
          {/* Paper label */}
          <div className="flex-1 font-semibold text-gray-800 text-sm truncate">
            {paperLabel || (testMode ? 'Full Length Test' : 'Subject Practice')}
          </div>
          {/* Q counter */}
          <div className="text-sm font-medium text-gray-500 shrink-0">
            Q {currentIndex + 1} / {total}
          </div>
          {/* Timer */}
          <div className={`font-mono font-black shrink-0 text-sm md:text-base flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm transition-colors ${
            isTimeCritical ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-white border-gray-200'
          }`}>
            <span className={countdownTotal > 0 ? (isTimeCritical ? 'text-red-600' : 'text-[#FF6B00]') : 'text-[#FF6B00]'}>⏱</span>
            <span className={countdownTotal > 0 ? (isTimeCritical ? 'text-red-700 font-black' : 'text-red-600') : 'text-[#FF6B00]'}>{timerDisplay}</span>
            {countdownTotal > 0 && (
              <span className={`text-[10px] uppercase font-bold tracking-widest ml-0.5 px-1.5 py-0.5 rounded ${isTimeCritical ? 'text-red-600 bg-red-100' : 'text-red-500 bg-red-50'}`}>Left</span>
            )}
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

            {/* Question number + mark tag + Report Flag */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-[#FF6B00] text-white px-3 py-1 rounded-lg font-bold text-sm shadow-sm">
                  Q.{currentIndex + 1}
                </span>
                {testMode && isMarkedCurrent && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                    <Bookmark className="h-3 w-3 fill-purple-500" />
                    Marked
                  </span>
                )}
              </div>
              <button
                onClick={handleReportIssue}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm"
                title="Report issue with this question"
              >
                <Flag className="h-3 w-3" />
                Report
              </button>
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
                  disabled={testMode ? isSubmitted : isAnswered}
                />
              ))}
            </div>

            {/* Confidence Tracking — shown AFTER option is selected in both modes */}
            {(!!currentAnswer && !isSubmitted) && (
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl mt-4">
                <p className="text-sm font-semibold text-gray-800 text-center mb-3">
                  {testMode && currentAnswer
                    ? 'How confident were you about this answer?'
                    : 'How confident are you about this question?'}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => toggleConfidence('sure')}
                    className={`flex-1 max-w-[120px] py-2 px-2 rounded-lg font-semibold text-xs md:text-sm transition-all border ${
                      confidenceMap[currentQuestion.$id] === 'sure'
                        ? 'bg-green-600 text-white border-green-600 shadow-sm'
                        : 'bg-white text-green-700 border-green-200 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    100% Sure
                  </button>
                  <button
                    onClick={() => toggleConfidence('fifty_fifty')}
                    className={`flex-1 max-w-[120px] py-2 px-2 rounded-lg font-semibold text-xs md:text-sm transition-all border ${
                      confidenceMap[currentQuestion.$id] === 'fifty_fifty'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-purple-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  >
                    50:50
                  </button>
                  <button
                    onClick={() => toggleConfidence('guess')}
                    className={`flex-1 max-w-[120px] py-2 px-2 rounded-lg font-semibold text-xs md:text-sm transition-all border ${
                      confidenceMap[currentQuestion.$id] === 'guess'
                        ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                        : 'bg-white text-yellow-700 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50'
                    }`}
                  >
                    It's a Guess
                  </button>
                </div>
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
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-4">
                <Button
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="px-2 md:px-3 text-xs md:text-sm font-semibold shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Prev</span>
                </Button>

                <button
                  onClick={handleMarkForReviewAndNext}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 md:px-3 rounded-lg border-2 font-bold text-[11px] md:text-sm transition-all ${isMarkedCurrent
                    ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                    : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50 hover:border-purple-400'
                    }`}
                >
                  <Bookmark className={`h-3 w-3 md:h-4 md:w-4 shrink-0 ${isMarkedCurrent ? 'fill-white' : ''}`} />
                  <span className="hidden lg:inline">{isMarkedCurrent ? 'Unmark & Next' : 'Review & Next'}</span>
                  <span className="lg:hidden">{isMarkedCurrent ? 'Unmark' : 'Review'}</span>
                </button>

                <Button
                  onClick={handleSaveAndNext}
                  className="flex-1 bg-gray-800 hover:bg-gray-900 text-white gap-1.5 font-bold text-[11px] md:text-sm py-2 px-2 md:px-3 rounded-lg"
                >
                  <span className="hidden lg:inline">Save & Next</span>
                  <span className="lg:hidden">Save</span>
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                </Button>

                <button
                  onClick={() => clearResponse(currentQuestion.$id)}
                  className="flex-1 bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50 flex items-center justify-center gap-1.5 font-bold text-[11px] md:text-sm py-2 px-2 md:px-3 rounded-lg transition-colors"
                >
                  <span className="hidden lg:inline">Clear Response</span>
                  <span className="lg:hidden">Clear</span>
                </button>
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

    </div>
  )
}

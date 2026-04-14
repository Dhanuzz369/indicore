import { create } from 'zustand'
import { Question } from '@/types'

interface AnswerRecord {
  selectedOption: string
  isCorrect: boolean
  timeTaken: number
  used5050: boolean
  isGuess: boolean
  usedAreYouSure: boolean
  confidenceTag: 'guess' | 'sure' | 'fifty_fifty' | 'normal'
  selectionHistory: { events: { t: number; type: string; option?: string; from?: string; to?: string }[]; change_count: number }
  questionViewedAt?: number  // timestamp when question was first viewed (ms)
}

interface QuizStore {
  questions: Question[]
  currentIndex: number
  answers: Record<string, AnswerRecord>   // questionId → answer
  visitedQuestions: Set<string>            // questionIds that were navigated to
  markedForReview: Set<string>             // questionIds marked for review
  isAnswered: boolean
  sessionId: string

  testMode: boolean
  practiceTimerTotal: number   // 0 = no countdown; >0 = subject practice total seconds
  paperLabel: string
  startTime: number | null
  elapsedSeconds: number
  isSubmitted: boolean

  timers: Record<string, number>
  activeStartTimes: Record<string, number>
  confidenceMap: Record<string, 'fifty_fifty' | 'guess' | 'sure'>  // persisted per question
  buttonStats: {
    areYouSure: number
    used5050: number
    guessed: number
  }

  isReattempt: boolean
  reattemptSourceSessionId: string | null
  pendingReattempt: { questions: Question[]; sourceSessionId: string } | null

  setQuestions: (questions: Question[]) => void
  submitAnswer: (questionId: string, selected: string, correct: string, timeTaken: number, used5050: boolean, isGuess: boolean, usedAreYouSure: boolean) => void
  nextQuestion: () => void
  reset: () => void
  resetQuiz: () => void
  getScore: () => { correct: number; wrong: number; total: number; percentage: number; marksScored: number; totalMarks: number }

  setTestMode: (val: boolean) => void
  setPracticeTimerTotal: (seconds: number) => void
  setPaperLabel: (label: string) => void
  startTimer: () => void
  setElapsed: (seconds: number) => void
  submitTest: () => void
  goToQuestion: (index: number) => void
  toggleMarkForReview: (questionId: string) => void
  markVisited: (questionId: string) => void

  // New actions
  startTimerForQuestion: (questionId: string) => void
  stopTimerForQuestion: (questionId: string) => void
  getTimeForQuestion: (questionId: string) => number
  setConfidenceForQuestion: (questionId: string, tag: 'fifty_fifty' | 'guess' | 'sure' | undefined) => void
  incrementButtonUsage: (type: 'areYouSure' | 'used5050' | 'guessed') => void
  clearResponse: (questionId: string) => void
  updateTimeForAnswer: (questionId: string, timeTaken: number) => void
  setAnswers: (answers: Record<string, AnswerRecord>) => void
  setConfidenceMap: (map: Record<string, 'fifty_fifty' | 'guess' | 'sure'>) => void
  recordQuestionViewed: (questionId: string) => void
  recordAnswerChange: (questionId: string, from: string, to: string) => void
  startReattempt: (questions: Question[], sourceSessionId: string) => void
  setPendingReattempt: (questions: Question[], sourceSessionId: string) => void
  clearPendingReattempt: () => void
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: {},
  visitedQuestions: new Set<string>(),
  markedForReview: new Set<string>(),
  isAnswered: false,
  sessionId: '',
  isReattempt: false,
  reattemptSourceSessionId: null,
  pendingReattempt: null,

  testMode: false,
  practiceTimerTotal: 0,
  paperLabel: '',
  startTime: null,
  elapsedSeconds: 0,
  isSubmitted: false,

  timers: {},
  activeStartTimes: {},
  confidenceMap: {},
  buttonStats: {
    areYouSure: 0,
    used5050: 0,
    guessed: 0,
  },

  setQuestions: (questions) =>
    set({
      questions,
      currentIndex: 0,
      answers: {},
      visitedQuestions: new Set<string>(),
      markedForReview: new Set<string>(),
      isAnswered: false,
      sessionId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    }),

  submitAnswer: (questionId, selected, correct, timeTaken, used5050, isGuess, usedAreYouSure) => {
    const isCorrect = selected === correct
    set((state) => {
      const existingAns = state.answers[questionId]
      const now = Math.floor(Date.now() / 1000)
      const viewedAt = state.answers[questionId]?.questionViewedAt
        ? Math.floor(state.answers[questionId].questionViewedAt! / 1000)
        : now - timeTaken

      // Build new event-stream history
      const existingEvents = existingAns?.selectionHistory?.events ?? []
      const prevSelected = existingAns?.selectedOption
      const t = now - viewedAt

      const newEvents = [...existingEvents]
      if (prevSelected && prevSelected !== selected) {
        newEvents.push({ t, type: 'change', from: prevSelected, to: selected })
      } else if (!prevSelected) {
        newEvents.push({ t, type: 'select', option: selected })
      }
      newEvents.push({ t: t + 1, type: 'submit', option: selected })

      const prevChangeCount = existingAns?.selectionHistory?.change_count ?? 0
      const newChangeCount = prevSelected && prevSelected !== selected
        ? prevChangeCount + 1
        : prevChangeCount

      // Priority: sure > fifty_fifty > guess > normal
      let confidenceTag: 'guess' | 'sure' | 'fifty_fifty' | 'normal' = 'normal'
      const hadSure = usedAreYouSure || existingAns?.usedAreYouSure || false
      const hadFF = used5050 || existingAns?.used5050 || false
      const hadGuess = isGuess || existingAns?.isGuess || false
      if (hadSure) confidenceTag = 'sure'
      else if (hadFF) confidenceTag = 'fifty_fifty'
      else if (hadGuess) confidenceTag = 'guess'

      return {
        answers: {
          ...state.answers,
          [questionId]: {
            selectedOption: selected,
            isCorrect,
            timeTaken,
            used5050: hadFF,
            isGuess: hadGuess,
            usedAreYouSure: hadSure,
            confidenceTag,
            selectionHistory: { events: newEvents, change_count: newChangeCount },
            questionViewedAt: existingAns?.questionViewedAt,
          },
        },
        isAnswered: false,
      }
    })
  },

  nextQuestion: () =>
    set((state) => {
      const nextIndex = Math.min(state.currentIndex + 1, state.questions.length - 1)
      const nextQId = state.questions[nextIndex]?.$id
      const newVisited = new Set(state.visitedQuestions)
      if (nextQId) newVisited.add(nextQId)
      return {
        currentIndex: nextIndex,
        isAnswered: state.testMode ? state.isSubmitted : false,
        visitedQuestions: newVisited,
      }
    }),

  goToQuestion: (index: number) =>
    set((state) => {
      const qId = state.questions[index]?.$id
      const newVisited = new Set(state.visitedQuestions)
      if (qId) newVisited.add(qId)
      return {
        currentIndex: index,
        visitedQuestions: newVisited,
      }
    }),

  markVisited: (questionId: string) =>
    set((state) => {
      const newVisited = new Set(state.visitedQuestions)
      newVisited.add(questionId)
      return { visitedQuestions: newVisited }
    }),

  toggleMarkForReview: (questionId: string) =>
    set((state) => {
      const newMarked = new Set(state.markedForReview)
      if (newMarked.has(questionId)) {
        newMarked.delete(questionId)
      } else {
        newMarked.add(questionId)
      }
      return { markedForReview: newMarked }
    }),

  reset: () => set({
    questions: [],
    currentIndex: 0,
    answers: {},
    visitedQuestions: new Set<string>(),
    markedForReview: new Set<string>(),
    isAnswered: false,
    sessionId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    testMode: false,
    practiceTimerTotal: 0,
    paperLabel: '',
    startTime: null,
    elapsedSeconds: 0,
    isSubmitted: false,
    timers: {},
    activeStartTimes: {},
    confidenceMap: {},
    buttonStats: { areYouSure: 0, used5050: 0, guessed: 0 },
    isReattempt: false,
    reattemptSourceSessionId: null,
    pendingReattempt: null,
  }),

  resetQuiz: () => set({
    questions: [],
    currentIndex: 0,
    answers: {},
    visitedQuestions: new Set<string>(),
    markedForReview: new Set<string>(),
    isAnswered: false,
    sessionId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    testMode: false,
    practiceTimerTotal: 0,
    paperLabel: '',
    startTime: null,
    elapsedSeconds: 0,
    isSubmitted: false,
    timers: {},
    activeStartTimes: {},
    confidenceMap: {},
    buttonStats: { areYouSure: 0, used5050: 0, guessed: 0 },
    isReattempt: false,
    reattemptSourceSessionId: null,
    pendingReattempt: null,
  }),

  getScore: () => {
    const { answers, testMode, questions } = get()
    const values = Object.values(answers)
    // Only count answers where user actually selected an option (not viewed-not-answered)
    const answered = values.filter((a) => !!a.selectedOption)
    const correct  = answered.filter((a) => a.isCorrect).length
    const wrong    = answered.filter((a) => !a.isCorrect).length
    // Full-length: total = all questions (UPSC totalMarks base)
    // Practice: total = attempted questions
    const total    = testMode ? questions.length : answered.length
    const MARKS_PER_Q = 2
    const NEGATIVE    = 2 / 3
    const marksScored = Number((correct * MARKS_PER_Q - wrong * NEGATIVE).toFixed(2))
    const totalMarks  = total * MARKS_PER_Q
    // Accuracy = correct / attempted × 100 for all quiz types
    const percentage = answered.length > 0 ? Number(((correct / answered.length) * 100).toFixed(2)) : 0
    return { correct, wrong, total, percentage, marksScored, totalMarks }
  },

  setTestMode: (val: boolean) => set({ testMode: val }),
  setPracticeTimerTotal: (seconds: number) => set({ practiceTimerTotal: seconds }),
  setPaperLabel: (label: string) => set({ paperLabel: label }),
  startTimer: () => set({ startTime: Date.now() }),
  setElapsed: (seconds: number) => set({ elapsedSeconds: seconds }),
  submitTest: () => set(() => ({ isSubmitted: true, isAnswered: true })),

  startTimerForQuestion: (questionId: string) =>
    set((state) => ({
      activeStartTimes: {
        ...state.activeStartTimes,
        [questionId]: Date.now(),
      },
    })),

  stopTimerForQuestion: (questionId: string) =>
    set((state) => {
      const startTime = state.activeStartTimes[questionId]
      if (!startTime) return state
      
      const sessionElapsed = Date.now() - startTime
      const previousTotal = state.timers[questionId] || 0
      
      // Clean up start time so we don't double count if called again
      const newActiveStarts = { ...state.activeStartTimes }
      delete newActiveStarts[questionId]

      return {
        activeStartTimes: newActiveStarts,
        timers: {
          ...state.timers,
          [questionId]: previousTotal + sessionElapsed,
        },
      }
    }),

  getTimeForQuestion: (questionId: string) => {
    const { timers, activeStartTimes } = get()
    const accumulated = timers[questionId] || 0
    const currentStart = activeStartTimes[questionId]
    const currentSession = currentStart ? (Date.now() - currentStart) : 0
    return accumulated + currentSession
  },

  incrementButtonUsage: (type: 'areYouSure' | 'used5050' | 'guessed') =>
    set((state) => ({
      buttonStats: {
        ...state.buttonStats,
        [type]: state.buttonStats[type] + 1,
      },
    })),

  setConfidenceForQuestion: (questionId: string, tag: 'fifty_fifty' | 'guess' | 'sure' | undefined) =>
    set((state) => {
      const newMap = { ...state.confidenceMap }
      if (tag === undefined) {
        delete newMap[questionId]
      } else {
        newMap[questionId] = tag
      }
      return { confidenceMap: newMap }
    }),
  clearResponse: (questionId: string) =>
    set((state) => {
      const newAnswers = { ...state.answers }
      delete newAnswers[questionId]
      const newConfidenceMap = { ...state.confidenceMap }
      delete newConfidenceMap[questionId]
      return { 
        answers: newAnswers,
        confidenceMap: newConfidenceMap
      }
    }),
  updateTimeForAnswer: (questionId: string, timeTaken: number) =>
    set((state) => {
      const answer = state.answers[questionId]
      if (!answer) return state
      return {
        answers: {
          ...state.answers,
          [questionId]: {
            ...answer,
            timeTaken,
          }
        }
      }
    }),
  setAnswers: (answers) => set({ answers }),
  setConfidenceMap: (confidenceMap) => set({ confidenceMap }),

  recordQuestionViewed: (questionId: string) =>
    set((state) => {
      if (state.answers[questionId]?.questionViewedAt) return state  // already recorded
      const now = Date.now()
      const existingAns = state.answers[questionId]
      return {
        answers: {
          ...state.answers,
          [questionId]: existingAns
            ? { ...existingAns, questionViewedAt: now }
            : {
                selectedOption: '',
                isCorrect: false,
                timeTaken: 0,
                used5050: false,
                isGuess: false,
                usedAreYouSure: false,
                confidenceTag: 'normal' as const,
                selectionHistory: { events: [{ t: 0, type: 'view' }], change_count: 0 },
                questionViewedAt: now,
              },
        },
      }
    }),

  recordAnswerChange: (questionId: string, from: string, to: string) =>
    set((state) => {
      const existingAns = state.answers[questionId]
      if (!existingAns) return state
      const viewedAt = existingAns.questionViewedAt
        ? Math.floor(existingAns.questionViewedAt / 1000)
        : Math.floor(Date.now() / 1000)
      const t = Math.floor(Date.now() / 1000) - viewedAt
      const events = [...(existingAns.selectionHistory?.events ?? []), { t, type: 'change', from, to }]
      const prevCount = existingAns.selectionHistory?.change_count ?? 0
      return {
        answers: {
          ...state.answers,
          [questionId]: {
            ...existingAns,
            selectionHistory: { events, change_count: prevCount + 1 },
          },
        },
      }
    }),

  startReattempt: (questions: Question[], sourceSessionId: string) => {
    if (questions.length === 0) return
    set({
      // full reset
      questions,
      currentIndex: 0,
      answers: {},
      visitedQuestions: new Set<string>(),
      markedForReview: new Set<string>(),
      isAnswered: false,
      sessionId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      testMode: false,
      practiceTimerTotal: 0,
      paperLabel: '',
      startTime: null,
      elapsedSeconds: 0,
      isSubmitted: false,
      timers: {},
      activeStartTimes: {},
      confidenceMap: {},
      buttonStats: { areYouSure: 0, used5050: 0, guessed: 0 },
      // reattempt flags
      isReattempt: true,
      reattemptSourceSessionId: sourceSessionId,
    })
  },

  setPendingReattempt: (questions, sourceSessionId) => {
    set({ pendingReattempt: { questions, sourceSessionId } })
  },
  clearPendingReattempt: () => {
    set({ pendingReattempt: null })
  },
}))
import { create } from 'zustand'
import { Question } from '@/types'

interface AnswerRecord {
  selectedOption: string
  isCorrect: boolean
  timeTaken: number
  used5050: boolean
  isGuess: boolean
  usedAreYouSure: boolean
  confidenceTag?: 'guess' | 'sure' | 'fifty_fifty' | null
  selectionHistory?: { option: string, timestamp: string }[]
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

  setQuestions: (questions: Question[]) => void
  submitAnswer: (questionId: string, selected: string, correct: string, timeTaken: number, used5050: boolean, isGuess: boolean, usedAreYouSure: boolean) => void
  nextQuestion: () => void
  reset: () => void
  resetQuiz: () => void
  getScore: () => { correct: number; wrong: number; total: number; percentage: number }

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
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: {},
  visitedQuestions: new Set<string>(),
  markedForReview: new Set<string>(),
  isAnswered: false,
  sessionId: '',

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
      const newHistory = existingAns?.selectionHistory ? [...existingAns.selectionHistory] : []
      newHistory.push({ option: selected, timestamp: new Date().toISOString() })
      
      let confidenceTag: 'guess' | 'sure' | 'fifty_fifty' | null = null
      if (used5050 || existingAns?.used5050) confidenceTag = 'fifty_fifty'
      else if (isGuess || existingAns?.isGuess) confidenceTag = 'guess'
      else if (usedAreYouSure || existingAns?.usedAreYouSure) confidenceTag = 'sure'
      
      return {
        answers: {
          ...state.answers,
          [questionId]: { 
            selectedOption: selected, 
            isCorrect, 
            timeTaken, 
            used5050: used5050 || existingAns?.used5050 || false, 
            isGuess: isGuess || existingAns?.isGuess || false, 
            usedAreYouSure: usedAreYouSure || existingAns?.usedAreYouSure || false,
            confidenceTag,
            selectionHistory: newHistory
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
  }),

  getScore: () => {
    const { answers } = get()
    const values = Object.values(answers)
    const correct = values.filter((a) => a.isCorrect).length
    const total = values.length
    return {
      correct,
      wrong: total - correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
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
}))
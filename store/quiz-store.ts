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
  paperLabel: string
  startTime: number | null
  elapsedSeconds: number
  isSubmitted: boolean

  timers: Record<string, number> // Object to track start times per question
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
  incrementButtonUsage: (type: 'areYouSure' | 'used5050' | 'guessed') => void
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
  paperLabel: '',
  startTime: null,
  elapsedSeconds: 0,
  isSubmitted: false,

  timers: {},
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
    testMode: false,
    paperLabel: '',
    startTime: null,
    elapsedSeconds: 0,
    isSubmitted: false,
    timers: {},
    buttonStats: {
      areYouSure: 0,
      used5050: 0,
      guessed: 0,
    },
  }),

  resetQuiz: () => set({
    questions: [],
    currentIndex: 0,
    answers: {},
    visitedQuestions: new Set<string>(),
    markedForReview: new Set<string>(),
    isAnswered: false,
    testMode: false,
    paperLabel: '',
    startTime: null,
    elapsedSeconds: 0,
    isSubmitted: false,
    timers: {},
    buttonStats: {
      areYouSure: 0,
      used5050: 0,
      guessed: 0,
    },
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
  setPaperLabel: (label: string) => set({ paperLabel: label }),
  startTimer: () => set({ startTime: Date.now() }),
  setElapsed: (seconds: number) => set({ elapsedSeconds: seconds }),
  submitTest: () => set(() => ({ isSubmitted: true, isAnswered: true })),

  startTimerForQuestion: (questionId: string) =>
    set((state) => ({
      timers: {
        ...state.timers,
        [questionId]: Date.now(),
      },
    })),

  stopTimerForQuestion: (questionId: string) =>
    set((state) => {
      const startTime = state.timers[questionId]
      if (!startTime) return state
      const elapsed = Date.now() - startTime
      return {
        timers: {
          ...state.timers,
          [questionId]: elapsed,
        },
      }
    }),

  getTimeForQuestion: (questionId: string) => {
    const { timers } = get()
    return timers[questionId] || 0
  },

  incrementButtonUsage: (type: 'areYouSure' | 'used5050' | 'guessed') =>
    set((state) => ({
      buttonStats: {
        ...state.buttonStats,
        [type]: state.buttonStats[type] + 1,
      },
    })),
}))
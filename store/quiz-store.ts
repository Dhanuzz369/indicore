import { create } from 'zustand'
import { Question } from '@/types'

interface AnswerRecord {
  selectedOption: string
  isCorrect: boolean
}

interface QuizStore {
  questions: Question[]
  currentIndex: number
  answers: Record<string, AnswerRecord>  // questionId → answer
  isAnswered: boolean
  sessionId: string

  // New fields for Full Length Test Mode
  testMode: boolean
  paperLabel: string
  startTime: number | null
  elapsedSeconds: number
  isSubmitted: boolean

  setQuestions: (questions: Question[]) => void
  submitAnswer: (questionId: string, selected: string, correct: string) => void
  nextQuestion: () => void
  reset: () => void
  resetQuiz: () => void
  getScore: () => { correct: number; wrong: number; total: number; percentage: number }

  // New actions
  setTestMode: (val: boolean) => void
  setPaperLabel: (label: string) => void
  startTimer: () => void
  setElapsed: (seconds: number) => void
  submitTest: () => void
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: {},
  isAnswered: false,
  sessionId: '',

  testMode: false,
  paperLabel: '',
  startTime: null,
  elapsedSeconds: 0,
  isSubmitted: false,

  setQuestions: (questions) =>
    set({ questions, currentIndex: 0, answers: {}, isAnswered: false }),

  submitAnswer: (questionId, selected, correct) => {
    const isCorrect = selected === correct
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { selectedOption: selected, isCorrect },
      },
      isAnswered: state.testMode ? state.isSubmitted : true, // Only true instantly if not in test mode, or if submitted
    }))
  },

  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
      isAnswered: state.testMode ? state.isSubmitted : false,
    })),

  reset: () => set({
    questions: [],
    currentIndex: 0,
    answers: {},
    isAnswered: false,
    testMode: false,
    paperLabel: '',
    startTime: null,
    elapsedSeconds: 0,
    isSubmitted: false
  }),

  resetQuiz: () => set({
    questions: [],
    currentIndex: 0,
    answers: {},
    isAnswered: false,
    testMode: false,
    paperLabel: '',
    startTime: null,
    elapsedSeconds: 0,
    isSubmitted: false
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
  submitTest: () => set((state) => ({ isSubmitted: true, isAnswered: true }))
}))
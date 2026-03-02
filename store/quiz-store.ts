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

  setQuestions: (questions: Question[]) => void
  submitAnswer: (questionId: string, selected: string, correct: string) => void
  nextQuestion: () => void
  reset: () => void
  resetQuiz: () => void
  getScore: () => { correct: number; wrong: number; total: number; percentage: number }
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: {},
  isAnswered: false,
  sessionId: '',

  setQuestions: (questions) =>
    set({ questions, currentIndex: 0, answers: {}, isAnswered: false }),

  submitAnswer: (questionId, selected, correct) => {
    const isCorrect = selected === correct
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { selectedOption: selected, isCorrect },
      },
      isAnswered: true,
    }))
  },

  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
      isAnswered: false,
    })),

  reset: () => set({ questions: [], currentIndex: 0, answers: {}, isAnswered: false }),

  resetQuiz: () => set({ questions: [], currentIndex: 0, answers: {}, isAnswered: false }),

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
}))
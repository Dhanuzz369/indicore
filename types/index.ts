export interface Profile {
  $id: string
  full_name: string
  avatar_url?: string
  target_exam: 'UPSC' | 'TNPSC' | 'KPSC' | 'MPPSC' | 'UPPSC' | 'OTHER' | null
  target_year: number | null
}

export interface Subject {
  $id: string
  Name: string   // Appwrite field is capital N
  slug: string
  icon?: string
  color?: string
}

export interface Question {
  $id: string
  subject_id: string
  exam_type: string
  year: number
  paper: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'A' | 'B' | 'C' | 'D'
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  is_active: boolean
}

export interface QuizAttempt {
  $id: string
  user_id: string
  question_id: string
  selected_option: string
  is_correct: boolean
  time_taken_seconds?: number
  used_5050?: boolean
  used_guess?: boolean
  used_areyousure?: boolean
  is_guess?: boolean
}

export interface UserStats {
  $id: string
  user_id: string
  total_attempted: number
  total_correct: number
  total_wrong: number
  streak_days: number
}

export interface QuizFilters {
  examType?: string
  subjectId?: string
  year?: number
  limit?: number
}
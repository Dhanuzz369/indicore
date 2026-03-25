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
  subtopic?: string
  tags: string[]
  is_active: boolean
  expected_time_seconds?: number
}

export interface QuizAttempt {
  $id: string
  user_id: string
  question_id: string
  selected_option: string
  is_correct: boolean
  session_id?: string
  time_taken_seconds?: number
  used_5050?: boolean
  used_guess?: boolean
  used_areyousure?: boolean
  is_guess?: boolean
  confidence_tag?: 'guess' | 'sure' | 'fifty_fifty' | null
  selection_history?: string
  revision_summary?: string
}

export interface TestSession {
  $id: string
  $createdAt?: string
  user_id: string
  exam_type: string
  year: number
  paper: string
  paper_label: string
  mode: 'full_length' | 'subject_practice'
  started_at: string
  submitted_at: string
  date?: string // Fallback for some history collectors
  total_time_seconds: number
  total_questions: number
  attempted: number
  correct: number
  incorrect: number
  skipped: number
  score: number
  accuracy?: number // Fallback for some history collectors
  total_score?: number // Fallback for some history collectors
  analytics: string    // JSON string of AnalyticsResult
  results_history?: string // Fallback column name mentioned by user!
  snapshot?: string    // JSON string of full replay snapshot (questions, answers, confidenceMap, etc.)
  ai_feedback: string  // AI generated feedback or empty string
  question_ids?: string // JSON array of question IDs in order
}

export interface UserTestSummary {
  $id: string
  user_id: string
  test_id: string
  date: string
  total_score: number
  subject_scores: string
  difficulty_scores: string
  accuracy: number
  attempts_count: number
  confidence_stats: string
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

export interface Note {
  $id: string
  $createdAt?: string
  user_id: string
  front: string
  back: string
  subject: string
  topic: string
  source_question_id?: string
  next_review_at: string
  interval_days: number
  ease_factor: number
  review_count: number
  created_at: string
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy'
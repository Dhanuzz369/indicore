// types/admin.ts

export interface AdminUser {
  id: string
  full_name: string | null
  email: string
  target_exam: string | null
  target_year: number | null
  created_at: string
  total_sessions: number
  avg_score: number        // 0–100 percentage (accuracy: correct/total*100)
  last_active: string | null
  streak_days: number
  has_profile: boolean     // true if user completed onboarding
}

export interface TimelineEntry {
  id: string
  submitted_at: string
  exam_type: string
  paper_label: string | null
  mode: string
  total_questions: number
  correct: number
  incorrect: number
  skipped: number
  score: number            // 0–100 accuracy percentage stored in DB
  total_time_seconds: number | null
  subject_breakdown: Array<{
    subject: string
    correct: number
    attempted: number
  }> | null
  // Parsed from analytics JSON — may be null if session predates analytics storage
  difficulty_breakdown: Array<{
    difficulty: string   // 'easy' | 'medium' | 'hard'
    correct: number
    total: number
    accuracy: number
  }> | null
  timing_stats: Array<{
    questionText: string
    timeTaken: number    // seconds
    targetTime: number   // seconds
  }> | null
  confidence_stats: {
    totalGuess: number
    correctGuess: number
    total5050: number
    correct5050: number
    totalAreYouSure: number
    correctAreYouSure: number
  } | null
}

export interface PlatformMetrics {
  total_users: number    // always full auth user count, never filtered
  tests_in_period: number
  avg_score_period: number  // 0–100 percentage
  dau: number
}

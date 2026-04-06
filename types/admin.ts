// types/admin.ts

export interface AdminUser {
  id: string
  full_name: string | null
  email: string
  target_exam: string | null
  target_year: number | null
  created_at: string
  total_sessions: number
  avg_score: number        // 0–100 percentage
  last_active: string | null  // ISO timestamp of most recent submitted_at
  streak_days: number
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
  score: number            // raw UPSC score
  total_time_seconds: number | null
  // Parsed from analytics.subjectStats (may be null)
  subject_breakdown: Array<{
    subject: string
    correct: number
    attempted: number
  }> | null
}

export interface PlatformMetrics {
  total_users: number
  tests_today: number
  avg_score_week: number   // 0–100 percentage
  dau: number              // distinct users active in last 24h
}

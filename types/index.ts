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

export interface MockSubjectTopicGroup {
  label: string
  keywords: string[]
  count: number
}

export interface MockSubjectWeight {
  subjectId: string
  count: number
  // Optional per-difficulty breakdown; if absent, selection is random
  easy_count?: number
  medium_count?: number
  hard_count?: number
  // Optional subtopic groups (e.g. History: ancient / medieval / modern)
  subtopic_groups?: MockSubjectTopicGroup[]
}

export interface Mock {
  $id: string
  name: string
  description: string | null
  subject_weights: MockSubjectWeight[]
  time_minutes: number
  is_active: boolean
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
  source_session_id?: string | null  // set when this session is a reattempt of another
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

// ─── INTELLIGENCE ENGINE ─────────────────────────────────────────

export type ConfidenceTag = 'sure' | 'fifty_fifty' | 'guess' | 'normal'

export interface SelectionEvent {
  t: number            // seconds since question viewed
  type: 'view' | 'select' | 'change' | 'submit' | 'used_5050' | 'used_guess' | 'used_sure' | 'clear'
  option?: string
  from?: string
  to?: string
}

export interface SelectionHistory {
  events: SelectionEvent[]
  change_count: number
}

// ── Analytics Engine V1 ──

export interface SubjectBreakdown {
  subjectId: string
  total: number
  correct: number
  incorrect: number
  skipped: number
  accuracy: number
  avgTimeSeconds: number
  sureWrongRate: number
  guessRate: number
  fiftyFiftyRate: number
}

export interface SubtopicBreakdown {
  subtopicId: string
  subjectId: string
  total: number
  correct: number
  incorrect: number
  skipped: number
  accuracy: number
  avgTimeSeconds: number
  confusionScore: number
}

export interface TimeSink {
  questionId: string
  subjectId: string
  subtopicId: string
  timeTakenSeconds: number
  wasCorrect: boolean
}

export interface BehaviorMetrics {
  sureButWrongCount: number
  sureButWrongRate: number
  guessButCorrectCount: number
  answerChangeAvg: number
}

export interface Recommendation {
  type: 'revise' | 'practice' | 'speed_drill'
  target: { subjectId?: string; subtopicId?: string }
  reason: string
  priority: 1 | 2 | 3
}

export interface TestAnalyticsV1 {
  sessionId: string
  scorePercent: number
  totalTimeSeconds: number
  avgTimePerQuestionSeconds: number
  subjectBreakdown: SubjectBreakdown[]
  subtopicBreakdown: SubtopicBreakdown[]
  timeSinks: TimeSink[]
  behavior: BehaviorMetrics
  recommendations: Recommendation[]
}

// ── Skill Model ──

export interface SubtopicRating {
  subtopicId: string
  subjectId: string
  rating: number          // ELO rating, starts at 1200
  attempts: number
  correct_count?: number  // cumulative correct answers across all sessions
  wrong_count?: number    // cumulative wrong answers across all sessions
  lastUpdated: string     // ISO
}

export interface SubjectScore {
  subjectId: string
  avgRating: number
  accuracy: number
  attempts: number
}

export interface BehaviorSignals {
  sureButWrongRate: number
  guessRate: number
  avgTimePerQuestion: number
  totalSessions: number
}

export interface SkillProfile {
  $id?: string
  user_id: string
  updated_at: string
  model_version: string
  subject_scores_json: string      // JSON: SubjectScore[]
  subtopic_scores_json: string     // JSON: SubtopicRating[]
  behavior_signals_json: string    // JSON: BehaviorSignals
  recommendations_json: string     // JSON: Recommendation[]
  narrative_feedback?: string
}
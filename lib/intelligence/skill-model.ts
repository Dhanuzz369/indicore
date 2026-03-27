import type { TestAnalyticsV1, SubtopicRating, SubjectScore, BehaviorSignals, SkillProfile, Recommendation } from '@/types'

const K_FACTOR = 24
const DEFAULT_RATING = 1200
const SURE_WRONG_PENALTY = 10

export interface SkillUpdateInput {
  userId: string
  analytics: TestAnalyticsV1
  existingProfile: SkillProfile | null
}

export interface SkillUpdateResult {
  subtopicRatings: SubtopicRating[]
  subjectScores: SubjectScore[]
  behaviorSignals: BehaviorSignals
  recommendations: Recommendation[]
}

function expectedScore(userRating: number, questionRating = DEFAULT_RATING): number {
  return 1 / (1 + Math.pow(10, (questionRating - userRating) / 400))
}

function actualScore(isCorrect: boolean, tag: string): number {
  if (isCorrect) {
    if (tag === 'fifty_fifty') return 0.8
    if (tag === 'guess') return 0.6
    return 1.0  // sure, normal
  }
  return 0.0
}

export function updateSkillProfile(input: SkillUpdateInput): SkillUpdateResult {
  const { analytics, existingProfile } = input

  // ── Parse existing ratings ────────────────────────────────────
  let existingRatings: SubtopicRating[] = []
  let existingBehavior: BehaviorSignals = {
    sureButWrongRate: 0,
    guessRate: 0,
    avgTimePerQuestion: 0,
    totalSessions: 0,
  }

  if (existingProfile) {
    try { existingRatings = JSON.parse(existingProfile.subtopic_scores_json) } catch {}
    try { existingBehavior = JSON.parse(existingProfile.behavior_signals_json) } catch {}
  }

  const ratingMap = new Map<string, SubtopicRating>(
    existingRatings.map(r => [r.subtopicId, { ...r }])
  )

  // ── Apply ELO updates per subtopic ────────────────────────────
  for (const st of analytics.subtopicBreakdown) {
    if (st.subtopicId === '__unknown__') continue

    const existing = ratingMap.get(st.subtopicId) ?? {
      subtopicId: st.subtopicId,
      subjectId: st.subjectId,
      rating: DEFAULT_RATING,
      attempts: 0,
      correct_count: 0,
      wrong_count: 0,
      lastUpdated: new Date().toISOString(),
    }

    let rating = existing.rating

    // We approximate per-attempt ELO by using subtopic aggregate stats
    // Each correct gets +K*(S-E), each wrong gets +K*(0-E)
    const answered = st.correct + st.incorrect
    if (answered === 0) continue

    // Use accuracy to infer average score contribution
    const accuracyScore = st.accuracy / 100  // 0 to 1
    // Simple: treat this session's subtopic performance as one "meta-attempt"
    const E = expectedScore(rating)
    const S = accuracyScore  // weighted average of individual S values

    let delta = K_FACTOR * (S - E) * Math.min(answered, 5)  // scale by question count, cap at 5

    // Apply sure-wrong penalty at subtopic level
    if (st.confusionScore > 4) {
      delta -= SURE_WRONG_PENALTY * 0.5
    }

    rating = Math.max(400, Math.min(2800, Math.round(rating + delta)))

    ratingMap.set(st.subtopicId, {
      subtopicId: st.subtopicId,
      subjectId: st.subjectId,
      rating,
      attempts: existing.attempts + answered,
      correct_count: (existing.correct_count ?? 0) + st.correct,
      wrong_count: (existing.wrong_count ?? 0) + st.incorrect,
      lastUpdated: new Date().toISOString(),
    })
  }

  const subtopicRatings = Array.from(ratingMap.values())

  // ── Aggregate to subject scores ───────────────────────────────
  const subjMap = new Map<string, { totalRating: number; count: number; correct: number; total: number }>()
  for (const r of subtopicRatings) {
    const existing = subjMap.get(r.subjectId) ?? { totalRating: 0, count: 0, correct: 0, total: 0 }
    existing.totalRating += r.rating
    existing.count++
    subjMap.set(r.subjectId, existing)
  }
  // Merge attempt counts from analytics
  for (const sb of analytics.subjectBreakdown) {
    const s = subjMap.get(sb.subjectId)
    if (s) { s.correct += sb.correct; s.total += sb.total }
  }

  const subjectScores: SubjectScore[] = Array.from(subjMap.entries()).map(([subjectId, s]) => ({
    subjectId,
    avgRating: s.count > 0 ? Math.round(s.totalRating / s.count) : DEFAULT_RATING,
    accuracy: s.total > 0 ? parseFloat((s.correct / s.total * 100).toFixed(1)) : 0,
    attempts: s.total,
  }))

  // ── Update behavior signals ───────────────────────────────────
  const prevSessions = existingBehavior.totalSessions
  const totalSessions = prevSessions + 1
  const blend = (prev: number, cur: number) =>
    parseFloat(((prev * prevSessions + cur) / totalSessions).toFixed(2))

  const behaviorSignals: BehaviorSignals = {
    sureButWrongRate: blend(existingBehavior.sureButWrongRate, analytics.behavior.sureButWrongRate),
    guessRate: blend(existingBehavior.guessRate, analytics.subjectBreakdown.reduce((s, b) => s + b.guessRate, 0) / Math.max(1, analytics.subjectBreakdown.length)),
    avgTimePerQuestion: blend(existingBehavior.avgTimePerQuestion, analytics.avgTimePerQuestionSeconds),
    totalSessions,
  }

  // ── Carry through recommendations from this session ───────────
  const recommendations = analytics.recommendations

  return { subtopicRatings, subjectScores, behaviorSignals, recommendations }
}

export function computeReadinessScore(profile: SkillProfile): number {
  // Readiness: weighted average of (ELO normalised 0-100) + accuracy + speed factor
  try {
    const ratings: SubtopicRating[] = JSON.parse(profile.subtopic_scores_json)
    const behavior: BehaviorSignals = JSON.parse(profile.behavior_signals_json)

    if (ratings.length === 0) return 0

    const avgRating = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    // ELO 800-1800 → 0-100
    const eloScore = Math.max(0, Math.min(100, ((avgRating - 800) / 1000) * 100))

    const subjects: SubjectScore[] = JSON.parse(profile.subject_scores_json)
    const avgAccuracy = subjects.length > 0
      ? subjects.reduce((s, sub) => s + sub.accuracy, 0) / subjects.length
      : 50

    // Speed: 120s target; if avg < 120 = good
    const speedScore = Math.max(0, Math.min(100, (1 - (behavior.avgTimePerQuestion - 60) / 120) * 100))

    // Weighted: 50% ELO, 35% accuracy, 15% speed
    return Math.round(eloScore * 0.5 + avgAccuracy * 0.35 + speedScore * 0.15)
  } catch {
    return 0
  }
}

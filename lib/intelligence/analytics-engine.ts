import type {
  Question,
  QuizAttempt,
  TestAnalyticsV1,
  SubjectBreakdown,
  SubtopicBreakdown,
  TimeSink,
  BehaviorMetrics,
  Recommendation,
  SelectionHistory,
} from '@/types'

const TARGET_TIME_SECONDS = 120

function parseSelectionHistory(raw?: string): SelectionHistory | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    // Support new event-stream format
    if (parsed?.events) return parsed as SelectionHistory
    // Legacy format fallback — treat selections array length as change_count
    const selections = parsed?.selections ?? []
    return { events: [], change_count: Math.max(0, selections.length - 1) }
  } catch {
    return null
  }
}

function getChangeCount(raw?: string): number {
  const hist = parseSelectionHistory(raw)
  return hist?.change_count ?? 0
}

type AttemptInput = Pick<
  QuizAttempt,
  'question_id' | 'selected_option' | 'is_correct' | 'time_taken_seconds' | 'confidence_tag' | 'selection_history'
>

export function computeAnalyticsV1({
  sessionId,
  questions,
  attempts,
  totalTimeSeconds,
}: {
  sessionId: string
  questions: Question[]
  attempts: AttemptInput[]
  totalTimeSeconds: number
}): TestAnalyticsV1 {
  const qMap = new Map(questions.map(q => [q.$id, q]))
  const attemptMap = new Map(attempts.map(a => [a.question_id, a]))

  // ── Per-subject accumulators ──────────────────────────────────
  const subjAcc = new Map<string, {
    total: number; correct: number; incorrect: number; skipped: number
    totalTime: number; sureWrong: number; sureTotal: number; guesses: number; ff: number
  }>()

  // ── Per-subtopic accumulators ─────────────────────────────────
  const subtopicAcc = new Map<string, {
    subtopicId: string; subjectId: string
    total: number; correct: number; incorrect: number; skipped: number
    totalTime: number; confusionScore: number
  }>()

  const timeSinks: TimeSink[] = []

  // Behavior aggregates
  let sureButWrong = 0
  let sureTotal = 0
  let guessButCorrect = 0
  let totalChanges = 0
  let answeredCount = 0

  for (const q of questions) {
    const attempt = attemptMap.get(q.$id)
    const subjectId = q.subject_id
    const subtopicId = q.subtopic ?? '__unknown__'

    // ── Subject init ──
    if (!subjAcc.has(subjectId)) {
      subjAcc.set(subjectId, { total: 0, correct: 0, incorrect: 0, skipped: 0, totalTime: 0, sureWrong: 0, sureTotal: 0, guesses: 0, ff: 0 })
    }
    const sa = subjAcc.get(subjectId)!
    sa.total++

    // ── Subtopic init ──
    const stKey = `${subjectId}::${subtopicId}`
    if (!subtopicAcc.has(stKey)) {
      subtopicAcc.set(stKey, { subtopicId, subjectId, total: 0, correct: 0, incorrect: 0, skipped: 0, totalTime: 0, confusionScore: 0 })
    }
    const sta = subtopicAcc.get(stKey)!
    sta.total++

    if (!attempt) {
      sa.skipped++
      sta.skipped++
      continue
    }

    const timeTaken = attempt.time_taken_seconds ?? 0
    const tag = attempt.confidence_tag ?? 'normal'
    const changeCount = getChangeCount(attempt.selection_history)
    const targetTime = q.expected_time_seconds ?? TARGET_TIME_SECONDS

    // ── Subject stats ──
    if (attempt.is_correct) sa.correct++
    else sa.incorrect++
    sa.totalTime += timeTaken
    if (tag === 'sure') { sa.sureTotal++; if (!attempt.is_correct) sa.sureWrong++ }
    if (tag === 'guess') sa.guesses++
    if (tag === 'fifty_fifty') sa.ff++

    // ── Subtopic stats ──
    if (attempt.is_correct) sta.correct++
    else sta.incorrect++
    sta.totalTime += timeTaken

    // ── Confusion score ──
    let confusion = 0
    if (!attempt.is_correct) confusion += 2
    if (tag === 'fifty_fifty') confusion += 1
    if (tag === 'guess') confusion += 1
    if (tag === 'sure' && !attempt.is_correct) confusion += 2
    if (timeTaken > targetTime) confusion += 1
    if (changeCount >= 2) confusion += 1
    sta.confusionScore += confusion

    // ── Behavior signals ──
    if (tag === 'sure') { sureTotal++; if (!attempt.is_correct) sureButWrong++ }
    if (tag === 'guess' && attempt.is_correct) guessButCorrect++
    totalChanges += changeCount
    answeredCount++

    // ── Time sinks ──
    if (timeTaken > targetTime) {
      timeSinks.push({ questionId: q.$id, subjectId, subtopicId, timeTakenSeconds: timeTaken, wasCorrect: attempt.is_correct })
    }
  }

  // ── Build subjectBreakdown ────────────────────────────────────
  const subjectBreakdown: SubjectBreakdown[] = []
  for (const [subjectId, sa] of subjAcc.entries()) {
    const answered = sa.correct + sa.incorrect
    subjectBreakdown.push({
      subjectId,
      total: sa.total,
      correct: sa.correct,
      incorrect: sa.incorrect,
      skipped: sa.skipped,
      accuracy: answered > 0 ? parseFloat((sa.correct / answered * 100).toFixed(1)) : 0,
      avgTimeSeconds: answered > 0 ? parseFloat((sa.totalTime / answered).toFixed(1)) : 0,
      sureWrongRate: sa.sureTotal > 0 ? parseFloat((sa.sureWrong / sa.sureTotal * 100).toFixed(1)) : 0,
      guessRate: sa.total > 0 ? parseFloat((sa.guesses / sa.total * 100).toFixed(1)) : 0,
      fiftyFiftyRate: sa.total > 0 ? parseFloat((sa.ff / sa.total * 100).toFixed(1)) : 0,
    })
  }

  // ── Build subtopicBreakdown ───────────────────────────────────
  const subtopicBreakdown: SubtopicBreakdown[] = []
  for (const sta of subtopicAcc.values()) {
    const answered = sta.correct + sta.incorrect
    subtopicBreakdown.push({
      subtopicId: sta.subtopicId,
      subjectId: sta.subjectId,
      total: sta.total,
      correct: sta.correct,
      incorrect: sta.incorrect,
      skipped: sta.skipped,
      accuracy: answered > 0 ? parseFloat((sta.correct / answered * 100).toFixed(1)) : 0,
      avgTimeSeconds: answered > 0 ? parseFloat((sta.totalTime / answered).toFixed(1)) : 0,
      confusionScore: sta.confusionScore,
    })
  }

  // ── Time sinks — top 10 ───────────────────────────────────────
  const topTimeSinks: TimeSink[] = timeSinks
    .sort((a, b) => b.timeTakenSeconds - a.timeTakenSeconds)
    .slice(0, 10)

  // ── Behavior ─────────────────────────────────────────────────
  const behavior: BehaviorMetrics = {
    sureButWrongCount: sureButWrong,
    sureButWrongRate: sureTotal > 0 ? parseFloat((sureButWrong / sureTotal * 100).toFixed(1)) : 0,
    guessButCorrectCount: guessButCorrect,
    answerChangeAvg: answeredCount > 0 ? parseFloat((totalChanges / answeredCount).toFixed(2)) : 0,
  }

  // ── Recommendations ───────────────────────────────────────────
  const recommendations: Recommendation[] = []

  // Top 3 weakest subtopics by accuracy + confusion
  const weakSubtopics = subtopicBreakdown
    .filter(s => s.total >= 2 && s.subtopicId !== '__unknown__')
    .map(s => ({ ...s, score: (100 - s.accuracy) + s.confusionScore * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  for (const st of weakSubtopics) {
    recommendations.push({
      type: st.accuracy < 40 ? 'revise' : 'practice',
      target: { subjectId: st.subjectId, subtopicId: st.subtopicId },
      reason: `${st.accuracy}% accuracy across ${st.total} questions (confusion score: ${st.confusionScore})`,
      priority: recommendations.length === 0 ? 1 : recommendations.length === 1 ? 2 : 3,
    })
  }

  // Speed drill if avg time is over threshold
  const avgTime = answeredCount > 0 ? totalTimeSeconds / answeredCount : 0
  if (avgTime > TARGET_TIME_SECONDS) {
    recommendations.push({
      type: 'speed_drill',
      target: {},
      reason: `Average time per question is ${Math.round(avgTime)}s (target: ${TARGET_TIME_SECONDS}s)`,
      priority: recommendations.length === 0 ? 1 : 3,
    })
  }

  const scorePercent = questions.length > 0
    ? parseFloat(((attempts.filter(a => a.is_correct).length / questions.length) * 100).toFixed(1))
    : 0

  return {
    sessionId,
    scorePercent,
    totalTimeSeconds,
    avgTimePerQuestionSeconds: answeredCount > 0 ? parseFloat((totalTimeSeconds / answeredCount).toFixed(1)) : 0,
    subjectBreakdown,
    subtopicBreakdown,
    timeSinks: topTimeSinks,
    behavior,
    recommendations,
  }
}

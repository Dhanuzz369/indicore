import type { TestAnalyticsV1, SkillProfile, Recommendation } from '@/types'

export interface CoachInput {
  analytics: TestAnalyticsV1
  skillProfile: SkillProfile | null
  sessionCount: number
}

export interface CoachOutput {
  bullets: string[]
  sevenDayPlan: string[]
}

// ── Template-based fallback (no API key required) ────────────────

function templateBullets(analytics: TestAnalyticsV1): string[] {
  const bullets: string[] = []
  const { behavior, subjectBreakdown, subtopicBreakdown, timeSinks, scorePercent } = analytics

  bullets.push(`Overall score: ${scorePercent.toFixed(1)}% (${analytics.subjectBreakdown.reduce((s, b) => s + b.correct, 0)} correct out of ${analytics.subjectBreakdown.reduce((s, b) => s + b.total, 0)} questions)`)

  // Confidence mistakes
  if (behavior.sureButWrongRate > 20) {
    bullets.push(`⚠️ High overconfidence: ${behavior.sureButWrongRate.toFixed(0)}% of "Sure" answers were wrong — focus on factual clarity before marking confident`)
  }
  if (behavior.guessButCorrectCount > 0) {
    bullets.push(`🎲 You guessed correctly ${behavior.guessButCorrectCount} times — these areas may need reinforcement to convert guesses into confident answers`)
  }

  // Weakest subjects
  const sorted = [...subjectBreakdown].sort((a, b) => a.accuracy - b.accuracy)
  const weakest = sorted.slice(0, 2)
  for (const sub of weakest) {
    if (sub.accuracy < 60) {
      bullets.push(`📉 Subject needs work: ${sub.subjectId} (${sub.accuracy}% accuracy, avg ${sub.avgTimeSeconds}s/question)`)
    }
  }

  // Time sinks
  if (timeSinks.length > 0) {
    const avgSink = timeSinks.reduce((s, t) => s + t.timeTakenSeconds, 0) / timeSinks.length
    bullets.push(`⏱️ ${timeSinks.length} time-sink questions averaging ${Math.round(avgSink)}s — practice speed drills on these topics`)
  }

  // Top confused subtopics
  const confusedSubs = [...subtopicBreakdown]
    .filter(s => s.subtopicId !== '__unknown__' && s.confusionScore > 3)
    .sort((a, b) => b.confusionScore - a.confusionScore)
    .slice(0, 2)
  for (const s of confusedSubs) {
    bullets.push(`🔴 High confusion in "${s.subtopicId}" (confusion score: ${s.confusionScore}) — review core concepts`)
  }

  if (bullets.length < 3) {
    bullets.push(`✅ Overall performance looks stable — keep up consistent practice to improve retention`)
  }

  return bullets.slice(0, 8)
}

function templatePlan(recs: Recommendation[], sessionCount: number): string[] {
  const plan: string[] = []

  const revise = recs.filter(r => r.type === 'revise')
  const practice = recs.filter(r => r.type === 'practice')
  const speed = recs.filter(r => r.type === 'speed_drill')

  plan.push(`Day 1: Review all incorrect answers from this session with explanations`)
  plan.push(`Day 2: ${revise.length > 0 ? `Deep revision of ${revise[0].target.subtopicId ?? revise[0].target.subjectId ?? 'weak areas'}` : 'Revise the weakest subject from this test'}`)
  plan.push(`Day 3: ${practice.length > 0 ? `Practice 20 questions on ${practice[0].target.subtopicId ?? practice[0].target.subjectId ?? 'weak subtopics'}` : 'Take a 30-question subject practice test'}`)
  plan.push(`Day 4: ${speed.length > 0 ? 'Speed drill — aim to answer each question within 90 seconds' : 'Mixed practice test covering all subjects'}`)
  plan.push(`Day 5: Focus on confidence calibration — use "Are You Sure?" on every question`)
  plan.push(`Day 6: ${revise.length > 1 ? `Revision of ${revise[1].target.subtopicId ?? 'second weakest area'}` : 'Full-length mock test or subject test'}`)
  plan.push(`Day 7: Light review of all flashcards + rest before next full test`)

  return plan
}

export async function generateNarrativeFeedback(input: CoachInput): Promise<CoachOutput> {
  const { analytics, sessionCount } = input

  // AI API integration point — currently using template fallback
  // To enable real AI: check for NEXT_PUBLIC_CLAUDE_API_KEY or similar
  // and call the AI API here, falling back to templates on error

  const bullets = templateBullets(analytics)
  const sevenDayPlan = templatePlan(analytics.recommendations, sessionCount)

  return { bullets, sevenDayPlan }
}

export function formatCoachOutput(output: CoachOutput): string {
  const bulletText = output.bullets.map(b => `• ${b}`).join('\n')
  const planText = output.sevenDayPlan.map(d => `${d}`).join('\n')
  return `${bulletText}\n\n**7-Day Action Plan:**\n${planText}`
}

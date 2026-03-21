import { Question, QuizAttempt } from '@/types'

interface AnalyticsResult {
  overallTime: { targetTime: number; actualTime: number }
  subjectStats: { subject: string; correct: number; total: number; accuracy: number }[]
  timingStats: { questionText: string; timeTaken: number; targetTime: number }[]
  buttonUsageStats: {
    totalGuess: number
    correctGuess: number
    total5050: number
    correct5050: number
    totalAreYouSure: number
    correctAreYouSure: number
  }
  difficultyStats: { difficulty: string; correct: number; total: number; accuracy: number }[]
  confidenceStats: { tag: string; correct: number; total: number; accuracy: number }[]
  revisionSummary: {
    totalRevised: number
    changedCorrectToWrong: number
    changedWrongToCorrect: number
  }
  suggestions: string[]
}

type PartialAttempt = Omit<QuizAttempt, '$id' | 'user_id'> & { $id?: string; user_id?: string }

export function generateTestAnalytics({
  questions,
  attempts,
  totalTestTime,
}: {
  questions: Question[]
  attempts: PartialAttempt[]
  totalTestTime: number
}): AnalyticsResult {
  const subjectStats = new Map<string, { correct: number; total: number }>()
  const timingStats: {
    questionText: string
    timeTaken: number
    targetTime: number
  }[] = []

  const buttonUsageStats = {
    totalGuess: 0,
    correctGuess: 0,
    total5050: 0,
    correct5050: 0,
    totalAreYouSure: 0,
    correctAreYouSure: 0,
  }

  const difficultyStatsMap = new Map<string, { correct: number; total: number }>()
  const confidenceStatsMap = new Map<string, { correct: number; total: number }>()
  const revisionSummary = {
    totalRevised: 0,
    changedCorrectToWrong: 0,
    changedWrongToCorrect: 0,
  }

  // Iterate through attempts and calculate analytics
  for (const attempt of attempts) {
    const question = questions.find((q) => q.$id === attempt.question_id)
    if (!question) continue

    // Subject-based performance
    const subjectId = question.subject_id
    if (!subjectStats.has(subjectId)) {
      subjectStats.set(subjectId, { correct: 0, total: 0 })
    }
    const subjectStat = subjectStats.get(subjectId)!
    subjectStat.total += 1
    if (attempt.is_correct) subjectStat.correct += 1

    // Timing stats
    timingStats.push({
      questionText: question.question_text,
      timeTaken: attempt.time_taken_seconds || 0,
      targetTime: question.expected_time_seconds || 120,
    })

    // ── Confidence / Button Usage Stats ──
    // Determine the confidence tag — prefer explicit confidence_tag, fallback to boolean flags
    const confTag = attempt.confidence_tag 
      || (attempt.is_guess ? 'guess' : null) 
      || (attempt.used_5050 ? 'fifty_fifty' : null) 
      || (attempt.used_areyousure ? 'sure' : null)

    if (confTag === 'guess') {
      buttonUsageStats.totalGuess++
      if (attempt.is_correct) buttonUsageStats.correctGuess++
    }
    if (confTag === 'fifty_fifty' || attempt.used_5050) {
      buttonUsageStats.total5050++
      if (attempt.is_correct) buttonUsageStats.correct5050++
    }
    if (confTag === 'sure' || attempt.used_areyousure) {
      buttonUsageStats.totalAreYouSure++
      if (attempt.is_correct) buttonUsageStats.correctAreYouSure++
    }

    // Difficulty Stats
    const diff = question.difficulty || 'medium'
    if (!difficultyStatsMap.has(diff)) difficultyStatsMap.set(diff, { correct: 0, total: 0 })
    const diffStat = difficultyStatsMap.get(diff)!
    diffStat.total++
    if (attempt.is_correct) diffStat.correct++

    // Confidence Stats (for breakdown table)
    const confKey = confTag || 'unmarked'
    if (!confidenceStatsMap.has(confKey)) confidenceStatsMap.set(confKey, { correct: 0, total: 0 })
    const confStat = confidenceStatsMap.get(confKey)!
    confStat.total++
    if (attempt.is_correct) confStat.correct++

    // Revision Summary
    if (attempt.selection_history) {
      try {
        const hist = JSON.parse(attempt.selection_history)
        if (hist.selections && hist.selections.length > 1) {
          revisionSummary.totalRevised++
          const firstSelection = hist.selections[0].option
          const lastSelection = hist.final_answer
          const isFirstCorrect = firstSelection === hist.correct_answer
          const isLastCorrect = lastSelection === hist.correct_answer
          if (isFirstCorrect && !isLastCorrect) revisionSummary.changedCorrectToWrong++
          if (!isFirstCorrect && isLastCorrect) revisionSummary.changedWrongToCorrect++
        }
      } catch (e) {}
    }
  }

  // Process aggregated stats for recommendations
  const subjectInsights = Array.from(subjectStats.entries()).map(
    ([subjectId, data]) => ({
      subject: subjectId,
      correct: data.correct,
      total: data.total,
      accuracy: Math.round((data.correct / data.total) * 100),
    })
  )

  const suggestions: string[] = []
  for (const insight of subjectInsights) {
    if (insight.accuracy < 50) {
      suggestions.push(
        `Your accuracy in ${insight.subject} is ${insight.accuracy}%. Focus on improving your preparation in this subject.`
      )
    }
  }

  return {
    overallTime: {
      targetTime: questions.length * 120,
      actualTime: totalTestTime,
    },
    subjectStats: subjectInsights,
    buttonUsageStats,
    timingStats,
    difficultyStats: Array.from(difficultyStatsMap.entries()).map(([k, v]) => ({
      difficulty: k,
      correct: v.correct,
      total: v.total,
      accuracy: Math.round((v.correct / v.total) * 100),
    })),
    confidenceStats: Array.from(confidenceStatsMap.entries()).map(([k, v]) => ({
      tag: k,
      correct: v.correct,
      total: v.total,
      accuracy: Math.round((v.correct / v.total) * 100),
    })),
    revisionSummary,
    suggestions,
  }
}
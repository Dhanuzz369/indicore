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
  suggestions: string[]
}

export function generateTestAnalytics({
  questions,
  attempts,
  totalTestTime,
}: {
  questions: Question[]
  attempts: QuizAttempt[]
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
    if (attempt.is_correct) {
      subjectStat.correct += 1

      // If buttons are used and correct, count them
      if (attempt.is_guess) buttonUsageStats.correctGuess++
      if (attempt.used_5050) buttonUsageStats.correct5050++
      if (attempt.used_areyousure) buttonUsageStats.correctAreyousure++
    }

    // Timing and poorly managed questions analytics
    timingStats.push({
      questionText: question.question_text,
      timeTaken: attempt.time_taken_seconds || 0,
      targetTime: question.expected_time_seconds || 120, // Default: 2 minutes
    })

    // Button stats
    if (attempt.is_guess) buttonUsageStats.totalGuess++
    if (attempt.used_5050) buttonUsageStats.total5050++
    if (attempt.used_areyousure) buttonUsageStats.totalAreYouSure++
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
    timingStats,
    buttonUsageStats,
    suggestions,
  }
}
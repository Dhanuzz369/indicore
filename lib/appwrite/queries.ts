import { databases, DATABASE_ID, COLLECTIONS } from './config'
import { ID, Query } from 'appwrite'

// ─── PROFILES ───────────────────────────────────────
export async function createProfile(userId: string, name: string) {
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROFILES,
    userId,   // use userId as document ID
    { full_name: name, target_exam: null, target_year: null }
  )
}

export async function getProfile(userId: string) {
  return await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId)
}

export async function updateProfile(userId: string, data: Record<string, unknown>) {
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, data)
}

// ─── SUBJECTS ───────────────────────────────────────
export async function getSubjects() {
  return await databases.listDocuments(DATABASE_ID, COLLECTIONS.SUBJECTS)
}

export async function getQuestions(filters: {
  examType?: string
  subjectId?: string
  year?: number
  years?: number[]
  difficulty?: string
  limit?: number
}) {
  const queries = [Query.equal('is_active', true)]
  if (filters.examType) queries.push(Query.equal('exam_type', filters.examType))
  if (filters.subjectId) queries.push(Query.equal('subject_id', filters.subjectId))
  if (filters.year) queries.push(Query.equal('year', filters.year))
  if (filters.difficulty && filters.difficulty !== 'all')
    queries.push(Query.equal('difficulty', filters.difficulty))
  queries.push(Query.limit(filters.limit ?? 20))
  // Removing OrderAsc for now because it might need index in Appwrite. If you had it in the prompt, let's keep it.
  queries.push(Query.orderAsc('year'))

  return await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUESTIONS, queries)
}

export async function getQuestionCountBySubject(subjectId: string): Promise<number> {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.QUESTIONS,
      [
        Query.equal('subject_id', subjectId),
        Query.equal('is_active', true),
        Query.limit(1),
      ]
    )
    return result.total
  } catch {
    return 0
  }
}

// ─── ATTEMPTS ───────────────────────────────────────
export async function saveAttempt(data: {
  user_id: string
  question_id: string
  selected_option: string
  is_correct: boolean
  time_taken_seconds?: number
  used_5050?: boolean
  used_guess?: boolean
  used_areyousure?: boolean
  is_guess?: boolean
}) {
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.ATTEMPTS,
    ID.unique(),
    data
  )
}

// ─── ATTEMPTS HISTORY ───────────────────────────────
export async function getUserAttempts(userId: string, limit = 50) {
  return await databases.listDocuments(DATABASE_ID, COLLECTIONS.ATTEMPTS, [
    Query.equal('user_id', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(limit),
  ])
}

// ─── STATS ──────────────────────────────────────────
export async function getUserStats(userId: string) {
  return await databases.getDocument(DATABASE_ID, COLLECTIONS.STATS, userId)
}

export async function createUserStats(userId: string) {
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.STATS,
    userId,
    { total_attempted: 0, total_correct: 0, total_wrong: 0, streak_days: 0 }
  )
}

export async function incrementStats(userId: string, isCorrect: boolean) {
  const stats = await getUserStats(userId)
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.STATS, userId, {
    total_attempted: stats.total_attempted + 1,
    total_correct: isCorrect ? stats.total_correct + 1 : stats.total_correct,
    total_wrong: !isCorrect ? stats.total_wrong + 1 : stats.total_wrong,
  })
}
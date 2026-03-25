import { databases, storage, DATABASE_ID, COLLECTIONS, STORAGE_BUCKET_ID } from './config'
import { ID, Query, ImageGravity } from 'appwrite'
import type { TestSession } from '@/types'

// ─── AVATAR STORAGE ─────────────────────────────────
export async function uploadAvatar(file: File): Promise<string> {
  if (!STORAGE_BUCKET_ID) throw new Error('Storage bucket not configured')
  const result = await storage.createFile({ bucketId: STORAGE_BUCKET_ID, fileId: ID.unique(), file })
  return result.$id
}

export function getAvatarUrl(fileId: string): string {
  if (!STORAGE_BUCKET_ID) return ''
  return storage.getFilePreview({
    bucketId: STORAGE_BUCKET_ID,
    fileId,
    width: 256,
    height: 256,
    gravity: ImageGravity.Center,
    quality: 80,
  }).toString()
}

export async function deleteAvatarFile(fileId: string): Promise<void> {
  if (!STORAGE_BUCKET_ID) return
  try {
    await storage.deleteFile({ bucketId: STORAGE_BUCKET_ID, fileId })
  } catch {
    // Ignore deletion errors (file may not exist)
  }
}

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
  queries.push(Query.orderAsc('year'))

  return await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUESTIONS, queries)
}

export async function getQuestionsByIds(ids: string[]) {
  if (ids.length === 0) return { documents: [], total: 0 }
  return await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUESTIONS, [
    Query.equal('$id', ids),
    Query.limit(500),
  ])
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
  session_id?: string
  time_taken_seconds?: number
  used_5050?: boolean
  used_guess?: boolean
  used_areyousure?: boolean
  is_guess?: boolean
  confidence_tag?: 'guess' | 'sure' | 'fifty_fifty' | null
  selection_history?: string
  revision_summary?: string
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

export async function listAttemptsBySession(sessionId: string) {
  return await databases.listDocuments(DATABASE_ID, COLLECTIONS.ATTEMPTS, [
    Query.equal('session_id', sessionId),
    Query.limit(500),
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

// ─── USER TEST SUMMARY ──────────────────────────────
export async function saveUserTestSummary(data: {
  user_id: string
  test_id: string
  date: string
  total_score: number
  subject_scores: string
  difficulty_scores: string
  accuracy: number
  attempts_count: number
  confidence_stats: string
}) {
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.USER_TEST_SUMMARY,
    ID.unique(),
    data
  )
}

export async function getUserTestSummaries(userId: string) {
  return await databases.listDocuments(DATABASE_ID, COLLECTIONS.USER_TEST_SUMMARY, [
    Query.equal('user_id', userId),
    Query.orderDesc('date'),
    Query.limit(50),
  ])
}

// ─── TEST SESSIONS ──────────────────────────────────

export async function createTestSession(data: Omit<TestSession, '$id'>): Promise<TestSession> {
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.TEST_SESSIONS,
    ID.unique(),
    data
  )
  return doc as unknown as TestSession
}

export async function getTestSession(sessionId: string): Promise<TestSession> {
  const doc = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.TEST_SESSIONS,
    sessionId
  )
  return doc as unknown as TestSession
}

export async function listTestSessions(params: {
  userId: string
  from?: string          // ISO date string
  to?: string            // ISO date string
  examType?: string
  mode?: string
  sort?: 'newest' | 'oldest' | 'highest_score' | 'lowest_score'
  limit?: number
  offset?: number
}): Promise<{ documents: TestSession[]; total: number }> {
  const { userId, from, to, examType, mode, sort = 'newest', limit = 10, offset = 0 } = params
  const queries: string[] = [Query.equal('user_id', userId)]

  if (from) queries.push(Query.greaterThanEqual('submitted_at', from))
  if (to) queries.push(Query.lessThanEqual('submitted_at', to))
  if (examType && examType !== 'all') queries.push(Query.equal('exam_type', examType))
  if (mode && mode !== 'all') queries.push(Query.equal('mode', mode))

  switch (sort) {
    case 'oldest':
      queries.push(Query.orderAsc('submitted_at'))
      break
    case 'highest_score':
      queries.push(Query.orderDesc('score'))
      break
    case 'lowest_score':
      queries.push(Query.orderAsc('score'))
      break
    case 'newest':
    default:
      queries.push(Query.orderDesc('submitted_at'))
  }

  queries.push(Query.limit(limit))
  queries.push(Query.offset(offset))

  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEST_SESSIONS, queries)
  return {
    documents: result.documents as unknown as TestSession[],
    total: result.total,
  }
}

// ─── REPORTED ISSUES ────────────────────────────────

export async function reportIssue(data: {
  user_id: string
  question_id: string
  mode: string
}) {
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.REPORTED_ISSUES,
    ID.unique(),
    {
      ...data,
      reported_at: new Date().toISOString(),
      status: 'pending'
    }
  )
}
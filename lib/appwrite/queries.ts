import { databases, storage, DATABASE_ID, COLLECTIONS, STORAGE_BUCKET_ID } from './config'
import { ID, Query, ImageGravity } from 'appwrite'
import type { TestSession, Note, SkillProfile } from '@/types'

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
  const payload: Record<string, unknown> = {
    ...data,
    results_history: data.analytics, // Map to the user's specific column name
  }
  try {
    const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.TEST_SESSIONS, ID.unique(), payload)
    return doc as unknown as TestSession
  } catch (e: any) {
    // If snapshot attribute doesn't exist in collection yet, retry without it
    if (e?.message?.includes('snapshot') || e?.code === 400) {
      const { snapshot: _snap, ...payloadWithoutSnapshot } = payload
      const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.TEST_SESSIONS, ID.unique(), payloadWithoutSnapshot)
      return doc as unknown as TestSession
    }
    throw e
  }
}

// Extracted so it can be used by both listTestSessions and getTestSession fallback
function mapSummaryToSession(s: any): TestSession {
  const isTimestampId = /^test_\d+$/.test(s.test_id || '')
  return {
    $id: s.$id,
    $createdAt: s.$createdAt || s.date,
    user_id: s.user_id,
    exam_type: 'UPSC',
    year: 2024,
    paper: 'Practice',
    paper_label: isTimestampId ? 'Subject Practice Session' : (s.test_id || 'Practice Session'),
    mode: (s.test_id?.toLowerCase().includes('full') || s.attempts_count > 50) ? 'full_length' : 'subject_practice',
    started_at: s.date,
    submitted_at: s.date,
    date: s.date,
    total_time_seconds: 0,
    total_questions: s.attempts_count || 0,
    attempted: s.attempts_count || 0,
    correct: Math.floor(((s.accuracy || 0) / 100) * (s.attempts_count || 0)),
    incorrect: (s.attempts_count || 0) - Math.floor(((s.accuracy || 0) / 100) * (s.attempts_count || 0)),
    skipped: 0,
    score: s.total_score || s.accuracy || 0,
    accuracy: s.accuracy,
    analytics: s.subject_scores || s.confidence_stats || '{}',
    results_history: s.confidence_stats || '{}',
    ai_feedback: '',
    question_ids: '[]',
  }
}

export async function getTestSession(sessionId: string): Promise<TestSession> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.TEST_SESSIONS, sessionId)
    return doc as unknown as TestSession
  } catch (e: any) {
    // If not in TEST_SESSIONS, try USER_TEST_SUMMARY (legacy sessions)
    if (e?.code === 404 || e?.type === 'document_not_found') {
      try {
        const summaryDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.USER_TEST_SUMMARY, sessionId)
        return mapSummaryToSession(summaryDoc)
      } catch { /* not in summary either */ }
    }
    throw e
  }
}

export async function listTestSessions(params: {
  userId: string
  from?: string
  to?: string
  examType?: string
  mode?: string
  sort?: 'newest' | 'oldest' | 'highest_score' | 'lowest_score'
  limit?: number
  offset?: number
}): Promise<{ documents: TestSession[]; total: number }> {
  const { userId, from, to, examType, mode, sort = 'newest', limit = 10, offset = 0 } = params

  const buildQueries = (includeFilters: boolean) => {
    const q: string[] = [Query.equal('user_id', userId)]
    if (includeFilters) {
      if (from) q.push(Query.greaterThanEqual('submitted_at', from))
      if (to) q.push(Query.lessThanEqual('submitted_at', to))
      if (examType && examType !== 'all') q.push(Query.equal('exam_type', examType))
      if (mode && mode !== 'all') q.push(Query.equal('mode', mode))
    }
    switch (sort) {
      case 'oldest': q.push(Query.orderAsc('submitted_at')); break
      case 'highest_score': q.push(Query.orderDesc('score')); break
      case 'lowest_score': q.push(Query.orderAsc('score')); break
      default: q.push(Query.orderDesc('submitted_at'))
    }
    q.push(Query.limit(limit))
    q.push(Query.offset(offset))
    return q
  }

  // mapSummaryToSession is defined at module level above

  try {
    // 1. Fetch from main collection (Test Sessions / results_history)
    let mainResults: any = { documents: [], total: 0 }
    try {
      mainResults = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEST_SESSIONS, buildQueries(true))
    } catch (e: any) {
      console.warn('Main sessions query failed, trying fallback...', e.message)
      mainResults = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEST_SESSIONS, [
        Query.equal('user_id', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit)
      ])
    }

    // 2. Fetch from Summary collection (Older history system)
    let summaryResults: any = { documents: [], total: 0 }
    try {
      summaryResults = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USER_TEST_SUMMARY, [
        Query.equal('user_id', userId),
        Query.orderDesc('date'),
        Query.limit(limit)
      ])
    } catch (e: any) {
      console.warn('Summary sessions query failed:', e.message)
    }

    // 3. Merge and deduplicate (skip summary records that are already in TEST_SESSIONS)
    const mainIds = new Set((mainResults.documents as TestSession[]).map(d => d.$id))
    const merged = [
      ...(mainResults.documents as TestSession[]),
      ...(summaryResults.documents
        .filter((s: any) => !mainIds.has(s.test_id)) // skip if TEST_SESSIONS already has it
        .map(mapSummaryToSession))
    ]

    // Sort by date newest first
    merged.sort((a, b) => {
      const dateA = new Date(a.submitted_at || a.date || a.$createdAt || 0).getTime()
      const dateB = new Date(b.submitted_at || b.date || b.$createdAt || 0).getTime()
      return dateB - dateA
    })

    return { 
      documents: merged.slice(0, limit), 
      total: mainResults.total + summaryResults.total 
    }

  } catch (err) {
    console.error('Final listTestSessions failed:', err)
    return { documents: [], total: 0 }
  }
}

// ─── REPORTED ISSUES ────────────────────────────────

export async function reportIssue(data: {
  user_id: string
  question_id: string
  mode: string
  description?: string
}) {
  const reportedAt = new Date().toISOString().split('.')[0] + 'Z'

  // Try with description field first; fall back to mode+description concat if attribute missing
  const payloads = [
    { user_id: data.user_id, question_id: data.question_id, mode: data.mode, description: data.description || '', reported_at: reportedAt, status: 'pending' },
    { user_id: data.user_id, question_id: data.question_id, mode: `${data.mode}${data.description ? ' | ' + data.description : ''}`, reported_at: reportedAt, status: 'pending' },
    { user_id: data.user_id, question_id: data.question_id, mode: data.mode, reported_at: reportedAt, status: 'pending' },
  ]

  for (const payload of payloads) {
    try {
      return await databases.createDocument(DATABASE_ID, COLLECTIONS.REPORTED_ISSUES, ID.unique(), payload)
    } catch (err: any) {
      const isSchemaError = err?.code === 400 || err?.message?.includes('Unknown attribute') || err?.message?.includes('description') || err?.message?.includes('Invalid document structure')
      if (isSchemaError) continue
      console.error('Report issue failed:', err)
      throw err
    }
  }

  throw new Error('Failed to save report after all retries')
}

// ─── NOTES (Flashcards) ─────────────────────────────

export async function createNote(data: {
  user_id: string
  front: string
  back: string
  subject: string
  topic: string
  source_question_id?: string
}): Promise<Note> {
  const now = new Date().toISOString()
  // Only include optional fields when they have actual values — Appwrite can reject empty strings
  const payload: Record<string, unknown> = {
    user_id: data.user_id,
    front: data.front,
    back: data.back,
    subject: data.subject,
    next_review_at: now,
    interval_days: 1,
    ease_factor: 2.5,
    review_count: 0,
    created_at: now,
  }
  if (data.topic) payload.topic = data.topic
  if (data.source_question_id) payload.source_question_id = data.source_question_id
  try {
    const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.NOTES, ID.unique(), payload)
    return doc as unknown as Note
  } catch (err: any) {
    console.error('[createNote] Appwrite error:', err?.code, err?.message, err)
    throw err
  }
}

export async function getNotesByUser(params: {
  userId: string
  subject?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ documents: Note[]; total: number }> {
  const { userId, subject, limit = 50, offset = 0 } = params
  const q: string[] = [Query.equal('user_id', userId), Query.orderDesc('created_at'), Query.limit(limit), Query.offset(offset)]
  if (subject && subject !== 'all') q.push(Query.equal('subject', subject))
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NOTES, q)
  return result as unknown as { documents: Note[]; total: number }
}

export async function getDueNotes(userId: string): Promise<Note[]> {
  const now = new Date().toISOString()
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NOTES, [
    Query.equal('user_id', userId),
    Query.lessThanEqual('next_review_at', now),
    Query.orderAsc('next_review_at'),
    Query.limit(200),
  ])
  return result.documents as unknown as Note[]
}

export async function getDueNotesCount(userId: string): Promise<number> {
  const due = await getDueNotes(userId)
  return due.length
}

export async function updateNote(noteId: string, data: Partial<Note>): Promise<Note> {
  const { $id, $createdAt, user_id, created_at, ...rest } = data as any
  const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId, rest)
  return doc as unknown as Note
}

export async function deleteNote(noteId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId)
}

export async function getNoteById(noteId: string): Promise<Note> {
  const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId)
  return doc as unknown as Note
}

// ─── USER SKILL PROFILES ─────────────────────────────────────────

export async function getSkillProfile(userId: string): Promise<SkillProfile | null> {
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USER_SKILL_PROFILES, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ])
    if (result.documents.length === 0) return null
    return result.documents[0] as unknown as SkillProfile
  } catch {
    return null
  }
}

export async function upsertSkillProfile(data: Omit<SkillProfile, '$id'>): Promise<SkillProfile> {
  // Try to find existing profile first
  const existing = await getSkillProfile(data.user_id)
  if (existing?.$id) {
    const { user_id, ...rest } = data
    const doc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.USER_SKILL_PROFILES,
      existing.$id,
      rest
    )
    return doc as unknown as SkillProfile
  }
  // Create new
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.USER_SKILL_PROFILES,
    ID.unique(),
    data
  )
  return doc as unknown as SkillProfile
}

export async function getSessionCount(userId: string): Promise<number> {
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEST_SESSIONS, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ])
    return result.total
  } catch {
    return 0
  }
}
// lib/supabase/queries.ts
import { createClient } from './client'
import type { Profile, Subject, Question, QuizAttempt, UserStats, UserTestSummary, TestSession, Note } from '@/types'

// ── AVATAR STORAGE ────────────────────────────────────────────────────────────

// Returns the full public URL of the uploaded avatar.
// Accepts just the file (gets userId from current session internally).
export async function uploadAvatar(file: File): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = sb.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

// In Supabase we store the full URL directly — this is an identity function.
export function getAvatarUrl(urlOrPath: string): string {
  return urlOrPath
}

export async function deleteAvatarFile(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return
  const sb = createClient()
  // Extract storage path from Supabase public URL
  const match = urlOrPath.match(/\/storage\/v1\/object\/public\/avatars\/(.+)/)
  if (match) {
    await sb.storage.from('avatars').remove([match[1]])
  }
  // Silently ignore old Appwrite URLs (format doesn't match)
}

// ── PROFILES ──────────────────────────────────────────────────────────────────

export async function createProfile(userId: string, name: string): Promise<Profile> {
  const sb = createClient()
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, full_name: name }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return { ...data, $id: data.id } as unknown as Profile
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const sb = createClient()
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (!data) return null
  return { ...data, $id: data.id } as unknown as Profile
}

export async function updateProfile(userId: string, updates: Record<string, unknown>): Promise<Profile> {
  const sb = createClient()
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return { ...data, $id: data.id } as unknown as Profile
}

// ── SUBJECTS ──────────────────────────────────────────────────────────────────

export async function getSubjects() {
  const sb = createClient()
  const { data, error } = await sb.from('subjects').select('*').order('name')
  if (error) throw error
  // Map `name` → `Name` to match existing Subject type
  return {
    documents: (data ?? []).map(d => ({ ...d, $id: d.id, Name: d.name })),
  }
}

// ── QUESTIONS ─────────────────────────────────────────────────────────────────

export async function getQuestions(params: {
  examType?: string
  subjectId?: string
  year?: number
  difficulty?: string
  limit?: number
  offset?: number
}) {
  const sb = createClient()
  let q = sb.from('questions').select('*').eq('is_active', true)
  if (params.examType && params.examType !== 'all') q = q.eq('exam_type', params.examType)
  if (params.subjectId) q = q.eq('subject_id', params.subjectId)
  if (params.year) q = q.eq('year', params.year)
  if (params.difficulty) q = q.eq('difficulty', params.difficulty)
  if (params.limit) {
    const offset = params.offset ?? 0
    q = q.range(offset, offset + params.limit - 1)
  }
  const { data, error } = await q
  if (error) throw error
  return { documents: (data ?? []).map(d => ({ ...d, $id: d.id })) }
}

export async function getQuestionsByIds(ids: string[]) {
  if (ids.length === 0) return { documents: [], total: 0 }
  const sb = createClient()
  const { data, error } = await sb.from('questions').select('*').in('id', ids)
  if (error) throw error
  return { documents: (data ?? []).map(d => ({ ...d, $id: d.id })) }
}

export async function getQuestionCountBySubject(subjectId: string): Promise<number> {
  const sb = createClient()
  const { count, error } = await sb
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subjectId)
    .eq('is_active', true)
  if (error) return 0
  return count ?? 0
}

// ── QUIZ ATTEMPTS ─────────────────────────────────────────────────────────────

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
  const sb = createClient()
  let selectionHistory: object | null = null
  if (data.selection_history) {
    try { selectionHistory = JSON.parse(data.selection_history) } catch {}
  }
  const { error } = await sb.from('quiz_attempts').insert({
    user_id: data.user_id,
    question_id: data.question_id,
    selected_option: data.selected_option,
    is_correct: data.is_correct,
    session_id: data.session_id ?? null,
    time_taken_seconds: data.time_taken_seconds ?? null,
    used_5050: data.used_5050 ?? false,
    used_guess: data.used_guess ?? false,
    used_areyousure: data.used_areyousure ?? false,
    selection_history: selectionHistory,
  })
  if (error) throw error
}

export async function getUserAttempts(userId: string, limit = 50) {
  const sb = createClient()
  const { data, error } = await sb
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return {
    documents: (data ?? []).map(d => ({
      ...d,
      $id: d.id,
      selection_history: d.selection_history ? JSON.stringify(d.selection_history) : null,
    })),
  }
}

export async function listAttemptsBySession(sessionId: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('quiz_attempts')
    .select('*')
    .eq('session_id', sessionId)
    .limit(500)
  if (error) throw error
  return {
    documents: (data ?? []).map(d => ({
      ...d,
      $id: d.id,
      selection_history: d.selection_history ? JSON.stringify(d.selection_history) : null,
    })),
  }
}

// ── USER STATS ────────────────────────────────────────────────────────────────

export async function getUserStats(userId: string) {
  const sb = createClient()
  const { data } = await sb.from('user_stats').select('*').eq('user_id', userId).single()
  if (!data) return null
  return { ...data, $id: data.id }
}

export async function createUserStats(userId: string) {
  const sb = createClient()
  const { error } = await sb.from('user_stats').upsert(
    { user_id: userId, total_attempted: 0, total_correct: 0, total_wrong: 0, streak_days: 0 },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function incrementStats(userId: string, isCorrect: boolean) {
  const sb = createClient()
  const stats = await getUserStats(userId)
  if (!stats) return
  await sb.from('user_stats').update({
    total_attempted: (stats.total_attempted ?? 0) + 1,
    total_correct: (stats.total_correct ?? 0) + (isCorrect ? 1 : 0),
    total_wrong: (stats.total_wrong ?? 0) + (isCorrect ? 0 : 1),
  }).eq('user_id', userId)
}

// ── TEST SUMMARIES (legacy compat) ────────────────────────────────────────────

export async function saveUserTestSummary(data: Omit<UserTestSummary, '$id'>) {
  const sb = createClient()
  const { error } = await sb.from('user_test_summary').insert({
    user_id: data.user_id,
    test_id: data.test_id,
    date: data.date,
    total_score: data.total_score,
    subject_scores: typeof data.subject_scores === 'string'
      ? JSON.parse(data.subject_scores) : (data.subject_scores ?? {}),
    accuracy: data.accuracy,
    attempts_count: data.attempts_count,
    confidence_stats: typeof data.confidence_stats === 'string'
      ? JSON.parse(data.confidence_stats) : (data.confidence_stats ?? {}),
  })
  if (error) console.error('[saveUserTestSummary] non-critical:', error.message)
}

export async function getUserTestSummaries(userId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('user_test_summary')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(50)
  return { documents: (data ?? []).map(d => ({ ...d, $id: d.id })) }
}

// ── TEST SESSIONS ─────────────────────────────────────────────────────────────

function parseIfString(v: unknown): unknown {
  if (typeof v === 'string') { try { return JSON.parse(v) } catch {} }
  return v ?? null
}

function mapSession(doc: Record<string, any>): TestSession {
  return {
    ...doc,
    $id: doc.id,
    $createdAt: doc.submitted_at,
    // Serialize jsonb back to strings for backward compat with pages
    analytics: doc.analytics ? JSON.stringify(doc.analytics) : '{}',
    results_history: doc.analytics ? JSON.stringify(doc.analytics) : '{}',
    snapshot: doc.snapshot ? JSON.stringify(doc.snapshot) : undefined,
    // Serialize question_ids array back to JSON string
    question_ids: doc.question_ids ? JSON.stringify(doc.question_ids) : undefined,
  } as unknown as TestSession
}

export async function createTestSession(data: Omit<TestSession, '$id'>): Promise<TestSession> {
  const sb = createClient()
  const { data: doc, error } = await sb
    .from('test_sessions')
    .insert({
      user_id: data.user_id,
      exam_type: data.exam_type,
      year: data.year,
      paper: data.paper,
      paper_label: data.paper_label,
      mode: data.mode,
      started_at: data.started_at,
      submitted_at: data.submitted_at,
      total_time_seconds: data.total_time_seconds,
      total_questions: data.total_questions,
      attempted: data.attempted,
      correct: data.correct,
      incorrect: data.incorrect,
      skipped: data.skipped,
      score: data.score,
      analytics: parseIfString(data.analytics),
      snapshot: parseIfString(data.snapshot),
      ai_feedback: data.ai_feedback,
      question_ids: data.question_ids
        ? (typeof data.question_ids === 'string' ? JSON.parse(data.question_ids) : data.question_ids)
        : null,
    })
    .select()
    .single()
  if (error) throw error
  return mapSession(doc)
}

export async function getTestSession(sessionId: string): Promise<TestSession> {
  const sb = createClient()
  const { data, error } = await sb
    .from('test_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error) throw error
  return mapSession(data)
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
  const sb = createClient()
  let q = sb
    .from('test_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
  if (from) q = q.gte('submitted_at', from)
  if (to) q = q.lte('submitted_at', to)
  if (examType && examType !== 'all') q = q.eq('exam_type', examType)
  if (mode && mode !== 'all') q = q.eq('mode', mode)
  switch (sort) {
    case 'oldest': q = q.order('submitted_at', { ascending: true }); break
    case 'highest_score': q = q.order('score', { ascending: false }); break
    case 'lowest_score': q = q.order('score', { ascending: true }); break
    default: q = q.order('submitted_at', { ascending: false })
  }
  q = q.range(offset, offset + limit - 1)
  const { data, error, count } = await q
  if (error) throw error
  return { documents: (data ?? []).map(mapSession), total: count ?? 0 }
}

// ── REPORTED ISSUES ───────────────────────────────────────────────────────────

export async function reportIssue(data: {
  user_id: string
  question_id: string
  mode: string
  description?: string
}) {
  const sb = createClient()
  const { error } = await sb.from('reported_issues').insert({
    user_id: data.user_id,
    question_id: data.question_id,
    mode: data.mode,
    description: data.description || '',
    status: 'pending',
    reported_at: new Date().toISOString(),
  })
  if (error) throw error
}

// ── NOTES ─────────────────────────────────────────────────────────────────────

function mapNote(d: Record<string, any>): Note {
  return { ...d, $id: d.id, $createdAt: d.created_at } as unknown as Note
}

export async function createNote(data: Pick<Note, 'user_id' | 'front' | 'back' | 'subject' | 'topic'> & Partial<Note>) {
  const sb = createClient()
  const { data: doc, error } = await sb.from('notes').insert(data).select().single()
  if (error) throw error
  return mapNote(doc)
}

export async function getNotesByUser(params: {
  userId: string
  subjectFilter?: string
  limit?: number
  offset?: number
}) {
  const sb = createClient()
  let q = sb
    .from('notes')
    .select('*', { count: 'exact' })
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
  if (params.subjectFilter) q = q.eq('subject', params.subjectFilter)
  if (params.limit) {
    const off = params.offset ?? 0
    q = q.range(off, off + params.limit - 1)
  }
  const { data, error, count } = await q
  if (error) throw error
  return { documents: (data ?? []).map(mapNote), total: count ?? 0 }
}

export async function getDueNotes(userId: string, limit = 20) {
  const sb = createClient()
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return { documents: (data ?? []).map(mapNote) }
}

export async function getDueNotesCount(userId: string): Promise<number> {
  const sb = createClient()
  const now = new Date().toISOString()
  const { count, error } = await sb
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review_at', now)
  if (error) return 0
  return count ?? 0
}

export async function updateNote(noteId: string, updates: Partial<Note>) {
  const sb = createClient()
  const { data, error } = await sb
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return mapNote(data)
}

export async function deleteNote(noteId: string) {
  const sb = createClient()
  const { error } = await sb.from('notes').delete().eq('id', noteId)
  if (error) throw error
}

export async function getNoteById(noteId: string) {
  const sb = createClient()
  const { data } = await sb.from('notes').select('*').eq('id', noteId).single()
  if (!data) return null
  return mapNote(data)
}

// ── SKILL PROFILES ────────────────────────────────────────────────────────────

export async function getSkillProfile(userId: string): Promise<any | null> {
  const sb = createClient()
  const { data } = await sb
    .from('user_skill_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (!data) return null
  return {
    ...data,
    $id: data.id,
    // Serialize jsonb back to strings (_json string fields convention)
    subject_scores_json: JSON.stringify(data.subject_scores ?? {}),
    subtopic_scores_json: JSON.stringify(data.subtopic_scores ?? {}),
    behavior_signals_json: JSON.stringify(data.behavior_signals ?? {}),
    recommendations_json: JSON.stringify(data.recommendations ?? []),
  }
}

export async function upsertSkillProfile(data: any) {
  const sb = createClient()
  const { error } = await sb.from('user_skill_profiles').upsert(
    {
      user_id: data.user_id,
      updated_at: data.updated_at,
      model_version: data.model_version,
      subject_scores: parseIfString(data.subject_scores_json),
      subtopic_scores: parseIfString(data.subtopic_scores_json),
      behavior_signals: parseIfString(data.behavior_signals_json),
      recommendations: parseIfString(data.recommendations_json),
      narrative_feedback: data.narrative_feedback,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function getSessionCount(userId: string): Promise<number> {
  const sb = createClient()
  const { count, error } = await sb
    .from('test_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) return 0
  return count ?? 0
}

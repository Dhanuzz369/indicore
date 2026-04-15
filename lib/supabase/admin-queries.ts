// lib/supabase/admin-queries.ts
// IMPORTANT: Uses service role key — never import from client components.
// This file is only used inside the server-side guarded admin layout (RSC).
// The service role key lives in SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix)
// and is never exposed to the client bundle.

import { createClient } from '@supabase/supabase-js'
import type { AdminUser, TimelineEntry, PlatformMetrics } from '@/types/admin'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── All users with aggregated stats ───────────────────────────────────────────
export async function getAllUsersWithStats(from?: string, to?: string): Promise<AdminUser[]> {
  const sb = adminClient()

  // 1. Auth users — source of truth for all signups
  const { data: authData, error: aErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (aErr) throw aErr

  // 2. Profiles — only present for users who completed onboarding
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, target_exam, target_year')
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // 3. Session aggregates — filtered by date range when provided
  let sessionQuery = sb
    .from('test_sessions')
    .select('user_id, score, total_questions, submitted_at')
  if (from) sessionQuery = sessionQuery.gte('submitted_at', from)
  if (to)   sessionQuery = sessionQuery.lte('submitted_at', to + 'T23:59:59')
  const { data: sessions, error: sErr } = await sessionQuery
  if (sErr) throw sErr

  // score column already stores 0–100 accuracy percentage — use directly
  const sessionMap = new Map<string, { count: number; scoreSum: number; lastActive: string }>()
  for (const s of sessions ?? []) {
    const entry = sessionMap.get(s.user_id) ?? { count: 0, scoreSum: 0, lastActive: '' }
    entry.count++
    entry.scoreSum += s.score ?? 0   // already 0–100, no conversion needed
    if (!entry.lastActive || s.submitted_at > entry.lastActive) entry.lastActive = s.submitted_at
    sessionMap.set(s.user_id, entry)
  }

  // 4. Streak
  const { data: stats } = await sb.from('user_stats').select('user_id, streak_days')
  const streakMap = new Map((stats ?? []).map(s => [s.user_id, s.streak_days ?? 0]))

  const users = authData.users.map(u => {
    const profile = profileMap.get(u.id)
    const agg = sessionMap.get(u.id)
    return {
      id: u.id,
      full_name: profile?.full_name ?? null,
      email: u.email ?? '',
      target_exam: profile?.target_exam ?? null,
      target_year: profile?.target_year ?? null,
      created_at: u.created_at,
      total_sessions: agg?.count ?? 0,
      avg_score: agg ? Math.round(agg.scoreSum / agg.count) : 0,
      last_active: agg?.lastActive ?? null,
      streak_days: streakMap.get(u.id) ?? 0,
      has_profile: !!profile,
    }
  })

  // When a date filter is active, hide users with no sessions in that range
  const filtered = (from || to)
    ? users.filter(u => u.total_sessions > 0)
    : users

  return filtered.sort((a, b) => {
    if (!a.last_active) return 1
    if (!b.last_active) return -1
    return b.last_active.localeCompare(a.last_active)
  })
}

// ── Full timeline for one user ─────────────────────────────────────────────────
export async function getUserTimeline(userId: string): Promise<TimelineEntry[]> {
  const sb = adminClient()
  const { data, error } = await sb
    .from('test_sessions')
    .select('id, submitted_at, exam_type, paper_label, mode, total_questions, correct, incorrect, skipped, score, total_time_seconds, analytics')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(200)
  if (error) throw error

  return (data ?? []).map(row => {
    let subject_breakdown: TimelineEntry['subject_breakdown'] = null
    let difficulty_breakdown: TimelineEntry['difficulty_breakdown'] = null
    let timing_stats: TimelineEntry['timing_stats'] = null
    let confidence_stats: TimelineEntry['confidence_stats'] = null

    try {
      const analytics = typeof row.analytics === 'string'
        ? JSON.parse(row.analytics)
        : row.analytics

      if (analytics?.subjectStats) {
        subject_breakdown = analytics.subjectStats.map((s: { subject: string; correct: number; attempted: number }) => ({
          subject: s.subject,
          correct: s.correct,
          attempted: s.attempted,
        }))
      }
      if (analytics?.difficultyStats) {
        difficulty_breakdown = analytics.difficultyStats.map((d: { difficulty: string; correct: number; total: number; accuracy: number }) => ({
          difficulty: d.difficulty,
          correct: d.correct,
          total: d.total,
          accuracy: d.accuracy,
        }))
      }
      if (analytics?.timingStats) {
        timing_stats = analytics.timingStats.map((t: { questionText: string; timeTaken: number; targetTime: number }) => ({
          questionText: t.questionText,
          timeTaken: t.timeTaken,
          targetTime: t.targetTime,
        }))
      }
      if (analytics?.buttonUsageStats) {
        const b = analytics.buttonUsageStats
        confidence_stats = {
          totalGuess: b.totalGuess ?? 0,
          correctGuess: b.correctGuess ?? 0,
          total5050: b.total5050 ?? 0,
          correct5050: b.correct5050 ?? 0,
          totalAreYouSure: b.totalAreYouSure ?? 0,
          correctAreYouSure: b.correctAreYouSure ?? 0,
        }
      }
    } catch { /* analytics parse failure — leave null */ }

    return {
      id: row.id,
      submitted_at: row.submitted_at,
      exam_type: row.exam_type,
      paper_label: row.paper_label,
      mode: row.mode,
      total_questions: row.total_questions,
      correct: row.correct,
      incorrect: row.incorrect,
      skipped: row.skipped,
      score: row.score,
      total_time_seconds: row.total_time_seconds,
      subject_breakdown,
      difficulty_breakdown,
      timing_stats,
      confidence_stats,
    }
  })
}

// ── Platform-level metrics ─────────────────────────────────────────────────────
export async function getPlatformMetrics(from?: string, to?: string): Promise<PlatformMetrics> {
  const sb = adminClient()

  // total_users = always full auth count, never filtered
  const { data: authData, error: aErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (aErr) throw aErr
  const total_users = authData.users.length

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const scoreFrom   = from ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const scoreTo     = to ? to + 'T23:59:59' : now.toISOString()
  const periodFrom  = from ?? defaultFrom
  const periodTo    = to ? to + 'T23:59:59' : now.toISOString()

  const [{ data: periodSessions }, { data: scoreSessions }] = await Promise.all([
    sb.from('test_sessions')
      .select('user_id, score')
      .gte('submitted_at', periodFrom)
      .lte('submitted_at', periodTo),
    sb.from('test_sessions')
      .select('score')
      .gte('submitted_at', scoreFrom)
      .lte('submitted_at', scoreTo),
  ])

  const tests_in_period = periodSessions?.length ?? 0
  const dau = new Set((periodSessions ?? []).map(s => s.user_id)).size

  // score column is already 0–100 — use directly
  const validScores = (scoreSessions ?? [])
    .map(s => s.score ?? 0)
    .filter(n => n > 0)
  const avg_score_period = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0

  return { total_users, tests_in_period, avg_score_period, dau }
}

// lib/supabase/admin-queries.ts
// IMPORTANT: This file uses the service role key and must NEVER be imported
// by any client component. Only import from server components / server actions.

import { createClient } from '@supabase/supabase-js'
import type { AdminUser, TimelineEntry, PlatformMetrics } from '@/types/admin'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── All users with aggregated stats ───────────────────────────────
export async function getAllUsersWithStats(): Promise<AdminUser[]> {
  const sb = adminClient()

  // 1. Auth users are the source of truth (captures all signups, not just onboarded users)
  const { data: authData, error: aErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (aErr) throw aErr

  // 2. Profiles (only exists for users who completed onboarding — may be missing for some)
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, target_exam, target_year')
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // 3. Session aggregates per user
  const { data: sessions, error: sErr } = await sb
    .from('test_sessions')
    .select('user_id, score, total_questions, submitted_at')
  if (sErr) throw sErr

  const sessionMap = new Map<string, { count: number; scoreSum: number; lastActive: string }>()
  for (const s of sessions ?? []) {
    const entry = sessionMap.get(s.user_id) ?? { count: 0, scoreSum: 0, lastActive: '' }
    entry.count++
    // score is raw UPSC marks; convert to percentage
    const scorePct = s.total_questions > 0
      ? Math.round(((s.score ?? 0) / (s.total_questions * 2)) * 100)
      : 0
    entry.scoreSum += scorePct
    if (!entry.lastActive || s.submitted_at > entry.lastActive) entry.lastActive = s.submitted_at
    sessionMap.set(s.user_id, entry)
  }

  // 4. Streak from user_stats
  const { data: stats } = await sb.from('user_stats').select('user_id, streak_days')
  const streakMap = new Map((stats ?? []).map(s => [s.user_id, s.streak_days ?? 0]))

  return authData.users.map(u => {
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
    }
  }).sort((a, b) => {
    if (!a.last_active) return 1
    if (!b.last_active) return -1
    return b.last_active.localeCompare(a.last_active)
  })
}

// ── Full timeline for one user ─────────────────────────────────────
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
    }
  })
}

// ── Platform-level metrics ─────────────────────────────────────────
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const sb = adminClient()
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo   = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: total_users },
    { data: todaySessions },
    { data: weekSessions },
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('test_sessions').select('user_id, score, total_questions').gte('submitted_at', yesterday),
    sb.from('test_sessions').select('score, total_questions').gte('submitted_at', weekAgo),
  ])

  const tests_today = todaySessions?.length ?? 0
  const dau = new Set((todaySessions ?? []).map(s => s.user_id)).size

  const weekScores = (weekSessions ?? [])
    .map(s => s.total_questions > 0 ? Math.round(((s.score ?? 0) / (s.total_questions * 2)) * 100) : 0)
    .filter(n => n > 0)
  const avg_score_week = weekScores.length > 0
    ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
    : 0

  return { total_users: total_users ?? 0, tests_today, avg_score_week, dau }
}

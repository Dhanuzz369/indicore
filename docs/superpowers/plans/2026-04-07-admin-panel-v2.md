# Admin Panel V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken avg-score calculation, add a global date-range filter, enrich the user list with status/exam/sort, and add per-user trend charts + expandable session detail with difficulty/timing/confidence breakdowns.

**Architecture:** URL search params carry the date range so the server component re-fetches filtered data on change. Charts are pure client components (recharts, already installed) fed server data as props. Expandable sessions use local useState — no extra queries needed since the analytics JSON is already fetched.

**Tech Stack:** Next.js 15 App Router (server + client components), Supabase JS v2 service-role client, recharts ^3, TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `types/admin.ts` | Modify | Add 3 new optional fields to `TimelineEntry`; add `has_profile` to `AdminUser` |
| `lib/supabase/admin-queries.ts` | Modify | Fix score formula; add `from/to` params; expand analytics parsing in `getUserTimeline` |
| `app/(admin)/admin/page.tsx` | Modify | Await `searchParams`; pass date range to queries; render `AdminDateFilter` |
| `app/(admin)/admin/_components/AdminDateFilter.tsx` | Create | Client component — preset pills + custom date inputs; pushes to URL params |
| `app/(admin)/admin/_components/AdminUserTable.tsx` | Modify | Add Status + Exam columns; sortable column headers |
| `app/(admin)/admin/[userId]/page.tsx` | Modify | Render `UserCharts` above timeline; replace timeline cards with `ExpandableSession` |
| `app/(admin)/admin/_components/UserCharts.tsx` | Create | recharts LineChart (score trend) + BarChart (subject accuracy) + usage chips row |
| `app/(admin)/admin/_components/ExpandableSession.tsx` | Create | Expandable timeline card with difficulty, timing, confidence breakdowns |

---

## Task 1: Fix Types — admin.ts

**Files:**
- Modify: `types/admin.ts`

- [ ] **Step 1: Replace `types/admin.ts` with the updated version**

```typescript
// types/admin.ts

export interface AdminUser {
  id: string
  full_name: string | null
  email: string
  target_exam: string | null
  target_year: number | null
  created_at: string
  total_sessions: number
  avg_score: number        // 0–100 percentage (accuracy: correct/total*100)
  last_active: string | null
  streak_days: number
  has_profile: boolean     // true if user completed onboarding
}

export interface TimelineEntry {
  id: string
  submitted_at: string
  exam_type: string
  paper_label: string | null
  mode: string
  total_questions: number
  correct: number
  incorrect: number
  skipped: number
  score: number            // 0–100 accuracy percentage stored in DB
  total_time_seconds: number | null
  subject_breakdown: Array<{
    subject: string
    correct: number
    attempted: number
  }> | null
  // Parsed from analytics JSON — may be null if session predates analytics storage
  difficulty_breakdown: Array<{
    difficulty: string   // 'easy' | 'medium' | 'hard'
    correct: number
    total: number
    accuracy: number
  }> | null
  timing_stats: Array<{
    questionText: string
    timeTaken: number    // seconds
    targetTime: number   // seconds
  }> | null
  confidence_stats: {
    totalGuess: number
    correctGuess: number
    total5050: number
    correct5050: number
    totalAreYouSure: number
    correctAreYouSure: number
  } | null
}

export interface PlatformMetrics {
  total_users: number    // always full auth user count, never filtered
  tests_in_period: number
  avg_score_period: number  // 0–100 percentage
  dau: number
}
```

- [ ] **Step 2: Commit**

```bash
git add types/admin.ts
git commit -m "feat(admin-v2): update AdminUser and TimelineEntry types"
```

---

## Task 2: Fix admin-queries.ts — Score, Date Filter, Analytics Parsing

**Files:**
- Modify: `lib/supabase/admin-queries.ts`

- [ ] **Step 1: Replace `lib/supabase/admin-queries.ts` with the corrected version**

```typescript
// lib/supabase/admin-queries.ts
// IMPORTANT: Uses service role key — never import from client components.

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

  // Default range: last 24h for tests/dau, last 7 days for avg score — overridden by params
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/admin-queries.ts
git commit -m "fix(admin-v2): correct score formula, add date filter params, expand analytics parsing"
```

---

## Task 3: Create AdminDateFilter Component

**Files:**
- Create: `app/(admin)/admin/_components/AdminDateFilter.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/(admin)/admin/_components/AdminDateFilter.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

type Preset = 'today' | '7d' | '30d' | '90d' | 'all'

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function presetRange(preset: Preset): { from: string; to: string } | null {
  const now = new Date()
  const to = toDateStr(now)
  if (preset === 'today')  return { from: to, to }
  if (preset === '7d')     return { from: toDateStr(new Date(now.getTime() - 6  * 86400000)), to }
  if (preset === '30d')    return { from: toDateStr(new Date(now.getTime() - 29 * 86400000)), to }
  if (preset === '90d')    return { from: toDateStr(new Date(now.getTime() - 89 * 86400000)), to }
  return null // 'all'
}

export default function AdminDateFilter() {
  const router = useRouter()
  const params = useSearchParams()
  const currentFrom = params.get('from') ?? ''
  const currentTo   = params.get('to')   ?? ''

  const [customFrom, setCustomFrom] = useState(currentFrom)
  const [customTo,   setCustomTo]   = useState(currentTo)

  function activePreset(): Preset | null {
    if (!currentFrom && !currentTo) return 'all'
    const now = toDateStr(new Date())
    if (currentFrom === now && currentTo === now) return 'today'
    const ranges: Preset[] = ['7d', '30d', '90d']
    for (const p of ranges) {
      const r = presetRange(p)!
      if (r.from === currentFrom && r.to === currentTo) return p
    }
    return null // custom
  }

  function applyPreset(preset: Preset) {
    const range = presetRange(preset)
    if (!range) {
      router.push('/admin')
    } else {
      router.push(`/admin?from=${range.from}&to=${range.to}`)
    }
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    router.push(`/admin?from=${customFrom}&to=${customTo}`)
  }

  const active = activePreset()
  const presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d',    label: '7 days' },
    { key: '30d',   label: '30 days' },
    { key: '90d',   label: '90 days' },
    { key: 'all',   label: 'All time' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(p => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
            active === p.key
              ? 'bg-[#4A90E2] text-white'
              : 'bg-white border border-gray-200 text-gray-500 hover:border-[#4A90E2] hover:text-[#4A90E2]'
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-2">
        <input
          type="date"
          value={customFrom}
          onChange={e => setCustomFrom(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
        />
        <span className="text-gray-400 text-xs">–</span>
        <input
          type="date"
          value={customTo}
          onChange={e => setCustomTo(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
        />
        <button
          onClick={applyCustom}
          disabled={!customFrom || !customTo}
          className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#1A1C1C] text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(admin)/admin/_components/AdminDateFilter.tsx"
git commit -m "feat(admin-v2): AdminDateFilter with preset pills and custom date range"
```

---

## Task 4: Update Admin Page — searchParams + Date Filter UI

**Files:**
- Modify: `app/(admin)/admin/page.tsx`

- [ ] **Step 1: Replace `app/(admin)/admin/page.tsx`**

```tsx
// app/(admin)/admin/page.tsx
import { getAllUsersWithStats, getPlatformMetrics } from '@/lib/supabase/admin-queries'
import AdminUserTable from './_components/AdminUserTable'
import AdminAutoRefresh from './_components/AdminAutoRefresh'
import AdminDateFilter from './_components/AdminDateFilter'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-[#1A1C1C]">{value}</p>
    </div>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from, to } = await searchParams

  const [users, metrics] = await Promise.all([
    getAllUsersWithStats(from, to),
    getPlatformMetrics(from, to),
  ])

  const dateLabel = from && to
    ? `${new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'All time'

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-[#0f172a] px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Indicore</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-gray-400 font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <AdminAutoRefresh />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-6">
        {/* Date filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">Period</p>
            <Suspense fallback={null}>
              <AdminDateFilter />
            </Suspense>
            {(from || to) && (
              <span className="ml-auto text-xs text-gray-500 font-medium">{dateLabel}</span>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"       value={metrics.total_users} />
          <StatCard label="Tests in Period"   value={metrics.tests_in_period} />
          <StatCard label="Avg Score"         value={`${metrics.avg_score_period}%`} />
          <StatCard label="Active Users"      value={metrics.dau} />
        </div>

        {/* User table */}
        <AdminUserTable users={users} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(admin)/admin/page.tsx"
git commit -m "feat(admin-v2): wire date filter into admin page server component"
```

---

## Task 5: Enhance AdminUserTable — Status, Exam, Sort

**Files:**
- Modify: `app/(admin)/admin/_components/AdminUserTable.tsx`

- [ ] **Step 1: Replace `app/(admin)/admin/_components/AdminUserTable.tsx`**

```tsx
// app/(admin)/admin/_components/AdminUserTable.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@/types/admin'

type SortKey = 'full_name' | 'total_sessions' | 'avg_score' | 'streak_days' | 'last_active' | 'created_at'

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN')
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>
  return <span className="text-[#4A90E2] ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function AdminUserTable({ users }: { users: AdminUser[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('last_active')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = users
    .filter(u =>
      !query ||
      (u.full_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      let av: string | number | null = a[sortKey]
      let bv: string | number | null = b[sortKey]
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

  const headers: { label: string; key?: SortKey }[] = [
    { label: 'Status' },
    { label: 'Name',        key: 'full_name' },
    { label: 'Email' },
    { label: 'Exam' },
    { label: 'Tests',       key: 'total_sessions' },
    { label: 'Avg Score',   key: 'avg_score' },
    { label: 'Streak',      key: 'streak_days' },
    { label: 'Last Active', key: 'last_active' },
    { label: 'Joined',      key: 'created_at' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
        <h2 className="font-black text-[#1A1C1C] text-base flex-1">Users ({users.length})</h2>
        <input
          type="text"
          placeholder="Search name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {headers.map(h => (
                <th
                  key={h.label}
                  onClick={h.key ? () => handleSort(h.key!) : undefined}
                  className={`text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${h.key ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
                >
                  {h.label}
                  {h.key && <SortIcon active={sortKey === h.key} dir={sortDir} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr
                key={u.id}
                onClick={() => router.push(`/admin/${u.id}`)}
                className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  {u.has_profile
                    ? <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 rounded-lg px-2 py-1">Onboarded</span>
                    : <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 rounded-lg px-2 py-1">Signed Up</span>
                  }
                </td>
                <td className="px-6 py-4 font-bold text-[#1A1C1C] whitespace-nowrap">{u.full_name ?? '—'}</td>
                <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{u.email}</td>
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                  {u.target_exam ? `${u.target_exam}${u.target_year ? ' ' + u.target_year : ''}` : '—'}
                </td>
                <td className="px-6 py-4 font-bold">{u.total_sessions}</td>
                <td className="px-6 py-4">
                  <span className={`font-black ${u.avg_score >= 60 ? 'text-emerald-600' : u.avg_score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                    {u.avg_score > 0 ? `${u.avg_score}%` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{u.streak_days > 0 ? `🔥 ${u.streak_days}d` : '—'}</td>
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{timeAgo(u.last_active)}</td>
                <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-sm">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(admin)/admin/_components/AdminUserTable.tsx"
git commit -m "feat(admin-v2): Status + Exam columns, sortable headers in user table"
```

---

## Task 6: Create UserCharts Component

**Files:**
- Create: `app/(admin)/admin/_components/UserCharts.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/(admin)/admin/_components/UserCharts.tsx
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import type { TimelineEntry } from '@/types/admin'
import type { AdminUser } from '@/types/admin'

function scoreColor(trend: 'up' | 'down' | 'flat') {
  if (trend === 'up')   return '#10b981'  // emerald
  if (trend === 'down') return '#ef4444'  // red
  return '#94a3b8'                         // gray
}

function getTrend(data: { score: number }[]): 'up' | 'down' | 'flat' {
  if (data.length < 3) return 'flat'
  const first3 = data.slice(-3).reduce((s, d) => s + d.score, 0) / 3  // oldest 3 (data is desc)
  const last3  = data.slice(0, 3).reduce((s, d) => s + d.score, 0)  / 3  // newest 3
  if (last3 > first3 + 3) return 'up'
  if (last3 < first3 - 3) return 'down'
  return 'flat'
}

function barColor(accuracy: number) {
  if (accuracy >= 60) return '#10b981'
  if (accuracy >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function UserCharts({ user, timeline }: { user: AdminUser; timeline: TimelineEntry[] }) {
  // ── Score trend (chronological order for line chart) ──
  const trendData = [...timeline]
    .reverse()
    .map(e => ({
      date: new Date(e.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      score: e.total_questions > 0 ? Math.round((e.correct / e.total_questions) * 100) : 0,
      label: `${e.correct}/${e.total_questions}`,
    }))
  const trend = getTrend([...trendData].reverse())

  // ── Subject accuracy (aggregate across all sessions) ──
  const subjectMap = new Map<string, { correct: number; attempted: number }>()
  for (const entry of timeline) {
    for (const s of entry.subject_breakdown ?? []) {
      const cur = subjectMap.get(s.subject) ?? { correct: 0, attempted: 0 }
      cur.correct   += s.correct
      cur.attempted += s.attempted
      subjectMap.set(s.subject, cur)
    }
  }
  const subjectData = Array.from(subjectMap.entries())
    .map(([subject, { correct, attempted }]) => ({
      subject,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)  // weakest first

  // ── Feature usage chips ──
  const mockCount     = timeline.filter(e => e.exam_type === 'INDICORE_MOCK').length
  const practiceCount = timeline.filter(e => e.mode === 'practice').length
  const validTimes    = timeline.map(e => e.total_time_seconds).filter((t): t is number => t !== null && t > 0)
  const avgMins       = validTimes.length > 0
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length / 60)
    : 0
  const daysSinceJoined = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)

  const chips = [
    { icon: '📋', label: `${mockCount} Mock tests` },
    { icon: '🎯', label: `${practiceCount} Practice sessions` },
    { icon: '⏱', label: `Avg ${avgMins}m / session` },
    { icon: '📅', label: `${daysSinceJoined}d since joined` },
    { icon: '🔥', label: `${user.streak_days}d streak` },
  ]

  return (
    <div className="space-y-4">
      {/* Usage chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map(c => (
          <span key={c.label} className="inline-flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            {c.icon} {c.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Trend */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
              Score Trend
              <span className={`ml-2 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                {trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : '→ Steady'}
              </span>
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(value: number, _: string, props: { payload?: { label: string } }) => [
                    `${value}% (${props.payload?.label ?? ''})`, 'Accuracy'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={scoreColor(trend)}
                  strokeWidth={2}
                  dot={{ r: 3, fill: scoreColor(trend) }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Accuracy */}
        {subjectData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Subject Accuracy</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Accuracy']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                  {subjectData.map((entry, i) => (
                    <Cell key={i} fill={barColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(admin)/admin/_components/UserCharts.tsx"
git commit -m "feat(admin-v2): UserCharts with score trend, subject accuracy, usage chips"
```

---

## Task 7: Create ExpandableSession Component

**Files:**
- Create: `app/(admin)/admin/_components/ExpandableSession.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/(admin)/admin/_components/ExpandableSession.tsx
'use client'
import { useState } from 'react'
import type { TimelineEntry } from '@/types/admin'

function formatDuration(secs: number | null): string {
  if (!secs) return '—'
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function scorePct(entry: TimelineEntry): number {
  if (!entry.total_questions) return 0
  return Math.round((entry.correct / entry.total_questions) * 100)
}

const MODE_ICONS: Record<string, string> = {
  mock: '📋', practice: '🎯', full: '📄', retake: '🔁',
}

const DIFF_COLORS: Record<string, string> = {
  easy:   'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50   text-amber-700',
  hard:   'bg-red-50     text-red-700',
}

export default function ExpandableSession({ entry }: { entry: TimelineEntry }) {
  const [open, setOpen] = useState(false)
  const pct = scorePct(entry)

  const hasDetails =
    (entry.difficulty_breakdown && entry.difficulty_breakdown.length > 0) ||
    (entry.timing_stats && entry.timing_stats.length > 0) ||
    (entry.confidence_stats) ||
    (entry.subject_breakdown && entry.subject_breakdown.length > 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Collapsed row */}
      <div className="px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#4A90E2]/10 flex items-center justify-center shrink-0 text-lg">
            {MODE_ICONS[entry.mode] ?? '📋'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-black text-[#1A1C1C] text-sm">{entry.paper_label ?? entry.exam_type}</p>
              <p className="text-xs text-gray-400 shrink-0">
                {new Date(entry.submitted_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 items-center">
              <span className={`text-xs font-black ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                {pct}%
              </span>
              <span className="text-xs text-gray-400">{entry.correct}/{entry.total_questions} correct</span>
              <span className="text-xs text-gray-400">{formatDuration(entry.total_time_seconds)}</span>
              {hasDetails && (
                <button
                  onClick={() => setOpen(o => !o)}
                  className="ml-auto text-[10px] font-black uppercase tracking-wider text-[#4A90E2] hover:text-[#3a7fd4] transition-colors"
                >
                  {open ? '▲ Hide' : '▼ Details'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-gray-100 px-6 py-4 space-y-4 bg-gray-50/50">

          {/* Subject breakdown */}
          {entry.subject_breakdown && entry.subject_breakdown.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Subject Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {entry.subject_breakdown.map(s => {
                  const acc = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0
                  return (
                    <span key={s.subject} className="text-[11px] bg-white border border-gray-100 text-gray-700 rounded-xl px-3 py-1.5 font-medium shadow-sm">
                      {s.subject}: <strong>{s.correct}/{s.attempted}</strong>
                      <span className={`ml-1 font-black ${acc >= 60 ? 'text-emerald-600' : acc >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {acc}%
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Difficulty breakdown */}
          {entry.difficulty_breakdown && entry.difficulty_breakdown.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {entry.difficulty_breakdown.map(d => (
                  <span key={d.difficulty} className={`text-[11px] rounded-xl px-3 py-1.5 font-black capitalize ${DIFF_COLORS[d.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                    {d.difficulty}: {d.correct}/{d.total} · {d.accuracy}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence stats */}
          {entry.confidence_stats && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Confidence Stats</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '50/50 used',   total: entry.confidence_stats.total5050,        correct: entry.confidence_stats.correct5050 },
                  { label: 'Guessed',      total: entry.confidence_stats.totalGuess,        correct: entry.confidence_stats.correctGuess },
                  { label: 'Sure',         total: entry.confidence_stats.totalAreYouSure,   correct: entry.confidence_stats.correctAreYouSure },
                ].filter(c => c.total > 0).map(c => (
                  <span key={c.label} className="text-[11px] bg-white border border-gray-100 rounded-xl px-3 py-1.5 font-medium text-gray-600 shadow-sm">
                    {c.label}: <strong>{c.total}</strong>
                    <span className="text-gray-400 ml-1">({c.correct} correct)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Slowest 3 questions */}
          {entry.timing_stats && entry.timing_stats.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Slowest Questions (top 3)</p>
              <div className="space-y-2">
                {[...entry.timing_stats]
                  .sort((a, b) => b.timeTaken - a.timeTaken)
                  .slice(0, 3)
                  .map((t, i) => {
                    const over = t.timeTaken > t.targetTime
                    return (
                      <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 mt-0.5 shrink-0">#{i + 1}</span>
                        <p className="text-xs text-gray-600 flex-1 leading-relaxed">
                          {t.questionText.length > 80 ? t.questionText.slice(0, 80) + '…' : t.questionText}
                        </p>
                        <div className="shrink-0 text-right">
                          <p className={`text-xs font-black ${over ? 'text-red-500' : 'text-emerald-600'}`}>
                            {Math.round(t.timeTaken)}s
                          </p>
                          <p className="text-[10px] text-gray-400">target {Math.round(t.targetTime)}s</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(admin)/admin/_components/ExpandableSession.tsx"
git commit -m "feat(admin-v2): ExpandableSession with difficulty, confidence, timing breakdown"
```

---

## Task 8: Update User Detail Page

**Files:**
- Modify: `app/(admin)/admin/[userId]/page.tsx`

- [ ] **Step 1: Replace `app/(admin)/admin/[userId]/page.tsx`**

```tsx
// app/(admin)/admin/[userId]/page.tsx
import { getAllUsersWithStats, getUserTimeline } from '@/lib/supabase/admin-queries'
import Link from 'next/link'
import UserCharts from '../_components/UserCharts'
import ExpandableSession from '../_components/ExpandableSession'

export const dynamic = 'force-dynamic'

const POSTHOG_PROJECT = 'https://us.posthog.com/project/your_project_id'

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [allUsers, timeline] = await Promise.all([
    getAllUsersWithStats(),
    getUserTimeline(userId),
  ])
  const user = allUsers.find(u => u.id === userId)
  if (!user) return <div className="p-10 text-gray-500">User not found.</div>

  const posthogLink = `${POSTHOG_PROJECT}/persons?search=${encodeURIComponent(user.email)}`

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-[#0f172a] px-6 md:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin" className="text-blue-400 text-xs font-black uppercase tracking-widest hover:text-blue-300 mb-4 inline-block">
            ← All Users
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-white">{user.full_name ?? 'Unnamed'}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
              <p className="text-gray-500 text-xs mt-1">
                Joined {new Date(user.created_at).toLocaleDateString('en-IN')}
                {user.target_exam ? ` · ${user.target_exam}` : ''}
                {user.target_year ? ` ${user.target_year}` : ''}
                {' · '}{user.total_sessions} tests
                {' · '}
                <span className={user.has_profile ? 'text-emerald-400' : 'text-gray-500'}>
                  {user.has_profile ? 'Onboarded' : 'Not onboarded'}
                </span>
              </p>
            </div>
            <a
              href={posthogLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#4A90E2] text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-[#3a7fd4] transition-colors shrink-0"
            >
              View in PostHog ↗
            </a>
          </div>
          {/* Quick stats */}
          <div className="mt-5 flex flex-wrap gap-4">
            {[
              { label: 'Avg Score',   value: user.avg_score > 0 ? `${user.avg_score}%` : '—' },
              { label: 'Streak',      value: user.streak_days > 0 ? `${user.streak_days} days` : '—' },
              { label: 'Total Tests', value: user.total_sessions },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-lg font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {/* Charts — only show if there are sessions */}
        {timeline.length > 0 && (
          <UserCharts user={user} timeline={timeline} />
        )}

        {/* Timeline */}
        <div>
          <h2 className="font-black text-[#1A1C1C] text-base mb-5">Activity Timeline</h2>
          {timeline.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              No test sessions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map(entry => (
                <ExpandableSession key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
node_modules/.bin/tsc --noEmit 2>&1
```

Expected: no output (zero errors). If there are errors, fix them before committing.

- [ ] **Step 3: Commit and push**

```bash
git add "app/(admin)/admin/[userId]/page.tsx"
git commit -m "feat(admin-v2): user detail page with charts and expandable sessions"
git push origin HEAD:main
```

---

## Self-Review

**Spec coverage:**
- ✅ Score fix — Task 2 uses `s.score ?? 0` directly, `getPlatformMetrics` fixed
- ✅ `total_users` = auth user count — Task 2 uses `authData.users.length`
- ✅ Date filter — Tasks 3 + 4 wire URL params through to server queries
- ✅ Status + Exam columns — Task 5
- ✅ Sortable headers — Task 5
- ✅ Score trend chart — Task 6
- ✅ Subject accuracy bar chart — Task 6
- ✅ Usage chips — Task 6
- ✅ Difficulty breakdown in expanded session — Task 7
- ✅ Confidence stats in expanded session — Task 7 (uses `buttonUsageStats` actual keys from engine)
- ✅ Slowest questions in expanded session — Task 7
- ✅ `UserCharts` rendered on user detail — Task 8
- ✅ `ExpandableSession` replaces static cards — Task 8
- ✅ `has_profile` added to `AdminUser` — Task 1

**Type consistency:**
- `AdminUser.has_profile: boolean` — defined Task 1, used Tasks 2, 5, 8 ✅
- `TimelineEntry.difficulty_breakdown` — field name `difficulty` (matches engine output `difficultyStats[].difficulty`) ✅
- `TimelineEntry.confidence_stats` — uses `buttonUsageStats` keys (`totalGuess`, `total5050`, `totalAreYouSure`) not `confidenceStats` array ✅
- `PlatformMetrics` — renamed `tests_today → tests_in_period`, `avg_score_week → avg_score_period`, `dau → dau` — updated in Task 4 stat card labels ✅

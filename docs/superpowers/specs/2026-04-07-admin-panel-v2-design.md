# Admin Panel V2 — Design Spec

**Date:** 2026-04-07
**Scope:** Fix score calculation bug, add global date filter, enhance user list, add per-user charts and expandable session detail.

---

## 1. Score Fix

### Root Cause
`score` column in `test_sessions` stores a **0–100 accuracy percentage** (`correct / total_questions * 100`). Both `getAllUsersWithStats` and `getPlatformMetrics` in `admin-queries.ts` incorrectly wrap it as `(score / (total_questions * 2)) * 100`, treating an already-computed percentage as raw UPSC marks. This produces values like 115% for a user with 45% actual accuracy.

### Fixes
- `getAllUsersWithStats`: replace `Math.round(((s.score ?? 0) / (s.total_questions * 2)) * 100)` with `s.score ?? 0` (already 0–100)
- `getPlatformMetrics`: same — `avg_score_week` calculation uses the same wrong formula; use `score` directly
- `getPlatformMetrics` `total_users`: currently counts `profiles` rows (only onboarded users); change to return the auth user count to match the user list

---

## 2. Global Date Filter

### UI
A `AdminDateFilter` client component rendered above the stat cards. Contains:
- Preset pills: **Today · 7 days · 30 days · 90 days · All time** (default)
- Two date inputs for custom `from` / `to` range
- Active preset highlighted in blue; custom range deactivates presets

### Mechanism
Date range stored in URL search params (`?from=YYYY-MM-DD&to=YYYY-MM-DD`). `AdminDateFilter` calls `router.push` on selection. `AdminPage` (server component) reads `searchParams`, passes `{ from, to }` to query functions.

### What Gets Filtered
| Element | Filtered? |
|---|---|
| Total Users stat card | ❌ Always full auth user count |
| Tests in Period stat card | ✅ Sessions within date range |
| Avg Score stat card | ✅ Sessions within date range |
| DAU stat card | ✅ Active users within date range |
| User list | ✅ Only users with ≥1 session in range (All time shows everyone) |

### Query Changes
- `getAllUsersWithStats(from?: string, to?: string)` — filters session query with `.gte('submitted_at', from).lte('submitted_at', to)` when provided
- `getPlatformMetrics(from?: string, to?: string)` — replaces hardcoded `yesterday`/`weekAgo` with the passed range

---

## 3. User List Enhancements

### New Columns
| Column | Data | Position |
|---|---|---|
| Status | `Onboarded` (green pill, has profile row) or `Signed Up` (gray pill, no profile) | First column |
| Exam | `target_exam + target_year` from profile, e.g. "UPSC 2026" | After Email |

### Sort Controls
All column headers become clickable sort toggles (asc/desc). Default sort: Last Active descending. Sortable by: Name, Tests, Avg Score, Streak, Last Active, Joined.

**No new data fetched** — all fields already returned by `getAllUsersWithStats`.

### Component Change
`AdminUserTable` (client component) gains `sortKey` + `sortDir` state and a `handleSort(col)` function that re-sorts `filtered` array in place.

---

## 4. User Detail — Charts

A `UserCharts` client component rendered at the top of the user detail page, above the timeline. Receives `timeline: TimelineEntry[]` as prop — no additional queries.

### Chart 1 — Score Trend (LineChart)
- Library: `recharts`
- X-axis: `submitted_at` formatted as `DD MMM`
- Y-axis: accuracy % (0–100), domain `[0, 100]`
- Data derived from `timeline.map(e => ({ date, score: (e.correct / e.total_questions) * 100 }))`
- Line color: emerald if last-3 average > first-3 average, red if lower, gray if flat or < 3 sessions
- Tooltip: date + score % + correct/total

### Chart 2 — Subject Accuracy (HorizontalBarChart)
- Library: `recharts`
- Data: aggregate `subject_breakdown` across all timeline entries — sum correct and attempted per subject, compute accuracy %
- Sorted by accuracy ascending (weakest first)
- Bar color: emerald ≥60%, amber 40–59%, red <40%

### Chart 3 — Feature Usage Chips (stat row)
Computed from timeline, no chart library needed:
- `📋 X Mock tests` — sessions where `exam_type === 'INDICORE_MOCK'`
- `🎯 X Practice sessions` — sessions where `mode === 'practice'`
- `⏱ Avg Xm per session` — mean of `total_time_seconds / 60`
- `📅 X days since joined` — derived from `user.created_at`
- `🔥 X day streak` — from `user.streak_days`

---

## 5. Expandable Session Detail

### UI
Each session card in the timeline gets a `▼ Details` / `▲ Hide` toggle button (bottom-right of card). Expand/collapse is local `useState` — no new data fetch.

### Expanded Panel Sections

**Subject Breakdown** (already partially shown as chips)
Full row: subject name · correct/attempted · accuracy % per subject. From `entry.subject_breakdown`.

**Difficulty Breakdown**
Three pills: `Easy X/Y` · `Medium X/Y` · `Hard X/Y`. From `entry.difficulty_breakdown` (new field on `TimelineEntry`).

**Slowest Questions** (top 3)
From `entry.timing_stats` (new field). Each row: truncated question text (80 chars) · time taken · target time · over/under indicator. Only shown when data is present.

**Confidence Stats**
Four chips: `50/50 used: X` · `Guessed: X` · `Sure: X` · `Marked for review: X`. From `entry.confidence_stats` (new field).

### Type Changes
`TimelineEntry` in `types/admin.ts` gains three new optional fields:
```typescript
difficulty_breakdown: Array<{ level: string; correct: number; attempted: number }> | null
timing_stats: Array<{ questionText: string; timeTaken: number; targetTime: number }> | null
confidence_stats: { fifty_fifty: number; guessed: number; sure: number; marked_review: number } | null
```

### Query Change
`getUserTimeline` currently discards `analytics` after parsing `subjectStats`. Update to also parse and return `difficultyStats`, `timingStats`, `confidenceStats` from the same `analytics` JSON column — no new DB columns or queries needed.

---

## File Map

| File | Action |
|---|---|
| `types/admin.ts` | Add 3 new optional fields to `TimelineEntry` |
| `lib/supabase/admin-queries.ts` | Fix score formula; add `from/to` params; expand analytics parsing |
| `app/(admin)/admin/page.tsx` | Read `searchParams`; pass date range to queries; render `AdminDateFilter` |
| `app/(admin)/admin/_components/AdminDateFilter.tsx` | New — date range picker client component |
| `app/(admin)/admin/_components/AdminUserTable.tsx` | Add Status + Exam columns; add sort controls |
| `app/(admin)/admin/[userId]/page.tsx` | Render `UserCharts` above timeline |
| `app/(admin)/admin/_components/UserCharts.tsx` | New — recharts score trend + subject bar + usage chips |
| `app/(admin)/admin/_components/ExpandableSession.tsx` | New — expandable session card with difficulty/timing/confidence |

---

## Implementation Notes
- `confidence_stats` field names must be verified against `lib/analytics/engine.ts` output during implementation — use actual keys from `analytics.confidenceStats`
- `AdminPage` in Next.js 15 must `await searchParams` (same pattern as `await params` in the user detail page)

---

## Non-Goals
- No PostHog integration on this page (read-only Supabase data only)
- No real-time subscriptions (auto-refresh every 30s already handles freshness)
- No export/CSV functionality
- No per-question correct/wrong breakdown (question text is in timing stats only)

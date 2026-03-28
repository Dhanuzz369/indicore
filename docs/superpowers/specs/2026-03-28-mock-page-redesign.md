# Mock Test Page Redesign — Design Spec

**Date:** 2026-03-28
**File:** `app/(dashboard)/quiz/page.tsx`
**Scope:** Remove subject-wise mock, subject practice, and PYQ tabs. Replace with a single-page layout: Previous Sessions → Weak Subject Strip → Full Length Mocks.

---

## Goals

1. Focus the Mock Test page entirely on INDICORE_MOCK questions — no PYQ/UPSC_PRE content.
2. Surface actionable history (last 5 sessions) and smart weak-area shortcuts at the top.
3. Reduce cognitive load — no tabs, no config modals for subject selection.

---

## Page Layout (Option A — Linear, No Tabs)

Three vertical zones rendered on a single scrollable page:

```
┌─────────────────────────────────┐
│  Zone 1: Previous Sessions      │  ← horizontal scroll row
├─────────────────────────────────┤
│  Zone 2: Weak Subject Strip     │  ← derived from sessions
├─────────────────────────────────┤
│  Zone 3: Full Length Mocks      │  ← multi-subject mocks only
└─────────────────────────────────┘
```

---

## Zone 1 — Previous Sessions

### Data Fetch
```typescript
listTestSessions({
  userId: user.$id,
  examType: 'INDICORE_MOCK',
  sort: 'newest',
  limit: 5,
})
```
Stored in state: `mockSessions: TestSession[]`, `loadingSessions: boolean`

### Card Design (horizontal scroll row)
Each card shows:
- **Label** — `session.paper_label` (e.g. "History · Full Mock · 40Q")
- **Date** — formatted `session.submitted_at` (e.g. "Mar 28")
- **Score %** — `session.score`
- **Correct count** — `session.correct` / `session.total_questions`
- **Review button** — `router.push('/results?session=' + session.$id)`
- **Retake button** — parses `session.question_ids` (JSON array), re-fetches those exact question IDs, shuffles, starts new session at `/quiz/session?id=UUID`

### Empty State
When `mockSessions.length === 0` after loading:
> "Complete your first mock to see your history here."

### Loading State
3 skeleton placeholder cards (same width/height as real cards, animated pulse).

---

## Zone 2 — Weak Subject Strip

### Visibility
Hidden when `mockSessions.length === 0`. Shown once at least 1 session exists.

### Data Derivation (client-side only, no extra DB call)
```typescript
// After sessions load:
const subjectAccMap: Record<string, { correct: number; total: number }> = {}

for (const session of mockSessions) {
  const analytics: AnalyticsResult = JSON.parse(session.analytics)
  for (const stat of analytics.subjectStats) {
    if (!subjectAccMap[stat.subject]) subjectAccMap[stat.subject] = { correct: 0, total: 0 }
    subjectAccMap[stat.subject].correct += stat.correct
    subjectAccMap[stat.subject].total += stat.total
  }
}

const weakSubjects = Object.entries(subjectAccMap)
  .filter(([, v]) => v.total >= 5)           // min sample size
  .map(([name, v]) => ({
    name,
    accuracy: Math.round((v.correct / v.total) * 100),
  }))
  .sort((a, b) => a.accuracy - b.accuracy)
  .slice(0, 3)
```

### Strip UI
```
┌──────────────────────────────────────────────────────┐
│  ⚡ Focus on Your Weak Areas                         │
│  Based on your last 5 mock sessions                  │
│                                                      │
│  [History  42% →]  [Polity  55% →]  [Env  61% →]    │
└──────────────────────────────────────────────────────┘
```

### Chip Click Handler
```typescript
const handleWeakSubjectDrill = async (subjectName: string) => {
  // Resolve name → UUID using already-loaded mockSubjects
  const subject = mockSubjects.find(s => s.Name === subjectName)
  if (!subject) return
  setWeakDrillLoading(subjectName)
  const result = await getQuestions({
    examType: 'INDICORE_MOCK',
    subjectId: subject.$id,
    limit: 40,
  })
  const shuffled = [...result.documents].sort(() => Math.random() - 0.5)
  setQuestions(shuffled)
  setTestMode('subject_practice')
  setPracticeTimerTotal(0)
  setPaperLabel(`${subjectName} · Weak Area Drill · ${shuffled.length}Q`)
  router.push('/quiz/session?id=' + crypto.randomUUID())
}
```

State: `weakDrillLoading: string | null` — holds the subject name currently loading (for per-chip spinner).

---

## Zone 3 — Full Length Mocks

### Filter
```typescript
mocks.filter(m => m.subject_weights.length > 1)
```
Only multi-subject mocks shown. Single-subject mock cards removed.

### Card Design
Unchanged from current implementation — same visual style, same start handler.

### Section Header
```
Full Length Mocks
```
Simple heading, no tab switcher.

---

## State Removed

| State variable | Removed? | Reason |
|---|---|---|
| `activeTab` | ✅ | No more tabs |
| `subjects` | ✅ | PYQ subject list no longer needed |
| `configSubject` | ✅ | Subject practice removed |
| `selectedDifficulty` | ✅ | Subject practice removed |
| `questionCount` | ✅ | Subject practice removed |
| `mockConfigSubject` | ✅ | Subject-wise mock config removed |
| `mockSelectedDifficulty` | ✅ | Subject-wise mock config removed |
| `mockStartLoading` | ✅ | Replaced by per-session/per-chip loaders |

## State Added

| State variable | Type | Purpose |
|---|---|---|
| `mockSessions` | `TestSession[]` | Last 5 INDICORE_MOCK sessions |
| `loadingSessions` | `boolean` | Sessions fetch loading |
| `weakSubjects` | `{ name: string; accuracy: number }[]` | Derived from sessions |
| `weakDrillLoading` | `string \| null` | Which chip is loading |

## State Kept

| State variable | Kept? | Purpose |
|---|---|---|
| `mocks` | ✅ | Full-length mock list |
| `loadingMocks` | ✅ | Mocks fetch loading |
| `mockSubjects` | ✅ | Needed for name→UUID resolution in weak drill |
| `loadingCardId` | ✅ | Per-card start button loading state |

---

## Data Calls Removed

- `getSubjectsWithCounts()` — PYQ subject list, no longer needed
- Hardcoded PYQ paper definitions (2024, 2023, 2022 arrays)

## Data Calls Added

- `listTestSessions({ examType: 'INDICORE_MOCK', limit: 5, sort: 'newest' })` — on mount
- `getQuestions({ ids: string[] })` — new `ids` param added to existing function; adds `.in('id', ids)` Supabase filter when provided; used by retake handler

---

## Retake Flow

```typescript
const handleRetake = async (session: TestSession) => {
  setLoadingCardId(session.$id)
  const questionIds: string[] = JSON.parse(session.question_ids ?? '[]')
  // getQuestions receives new optional ids param → adds .in('id', ids) to Supabase query
  const result = await getQuestions({ ids: questionIds })
  const shuffled = [...result.documents].sort(() => Math.random() - 0.5)
  setQuestions(shuffled)
  setTestMode('full_length')
  setPracticeTimerTotal(0) // untimed retake
  setPaperLabel(session.paper_label + ' · Retake')
  router.push('/quiz/session?id=' + crypto.randomUUID())
}
```

`getQuestions` needs an `ids?: string[]` param added to filter `question_id IN (...)`.

---

## Success Criteria

1. Quiz page renders with zero tabs — single vertical scroll
2. Previous sessions load from DB (INDICORE_MOCK only), show as horizontal scroll
3. Weak subject chips derived from session analytics (no extra DB call)
4. Clicking a weak subject chip starts a session with INDICORE_MOCK questions only
5. Retake correctly re-fetches the original question set
6. Full-length multi-subject mocks still work as before
7. No PYQ questions are ever loaded on this page
8. TypeScript check passes with zero errors

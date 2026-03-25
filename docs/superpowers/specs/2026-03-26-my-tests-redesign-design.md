# My Tests — Complete Redesign
**Date:** 2026-03-26
**Approach:** A — Single-page tabbed detail, flat routes
**Status:** Approved

---

## Problem

The existing `/tests` feature is broken and non-functional. Sub-pages (`[sessionId]/results`, `[sessionId]/analytics`, `[sessionId]/review`) are inconsistent and unreliable. The entire feature is being replaced greenfield — no existing code is assumed reusable.

---

## Goals

1. Users can see all their past test sessions with at-a-glance performance data
2. Users can deep-dive into any session via a 4-tab detail page
3. Users can review cross-session mistakes in one dedicated place
4. Users can save any wrong answer as a flashcard note from within the tests UI

---

## Architecture

### Routes

```
app/(dashboard)/tests/
  page.tsx                  ← session list  (replaces existing broken page)
  [sessionId]/page.tsx      ← 4-tab detail  (replaces results/ analytics/ review/)
  mistakes/page.tsx         ← cross-session aggregator (new)
```

The old sub-pages are deleted:
- `tests/[sessionId]/results/page.tsx` → deleted
- `tests/[sessionId]/analytics/page.tsx` → deleted
- `tests/[sessionId]/review/page.tsx` → deleted

### Data Flow

The `[sessionId]` page fetches all required data in a single `Promise.all` on mount:
1. `getTestSession(sessionId)` — session metadata + analytics_json + snapshot_json + ai_feedback
2. `listAttemptsBySession(sessionId)` — individual attempt records
3. `getQuestionsByIds(ids)` — question objects (sourced from snapshot first, DB fallback)

All 4 tabs read from this shared in-memory state. No re-fetching on tab switch.

### Data Queries

| Query | Used by |
|---|---|
| `listTestSessions(userId, filters)` | `/tests` list |
| `getTestSession(sessionId)` | `[sessionId]` page |
| `listAttemptsBySession(sessionId)` | `[sessionId]` page |
| `getQuestionsByIds(ids)` | `[sessionId]` page |
| `listTestSessions` + snapshot parsing | `/tests/mistakes` aggregation |

---

## Page Designs

### 1. `/tests` — Session List

**Header:** "My Tests" title + "All Mistakes" button (links to `/tests/mistakes`).

**Filters:**
- Text search (paper label)
- Exam type dropdown
- Mode dropdown: All / Full Length / Subject Practice
- Sort: Newest / Oldest / Highest Score / Lowest Score

**Session cards** (1-col mobile, 2-col desktop grid):
- Paper label (bold) + exam type + date
- Score % — large, color-coded: ≥60% green, 40–59% amber, <40% red
- Mode badge (Full Length / Subject Practice)
- Mini stats row: ✅ correct · ❌ wrong · ⏭ skipped · ⏱ total time
- Right chevron → navigates to `/tests/[sessionId]?tab=overview`

**Pagination:** Load-more button, PAGE_SIZE = 10.

**Empty state:** "No tests yet. Take your first test to see results here." + CTA to `/quiz`.

---

### 2. `/tests/[sessionId]` — 4-Tab Detail

**Page header:** Paper label + date + back button to `/tests`.
**Tab bar:** Overview · Wrong Answers · Review All · Subtopic Drill
**Tab state:** Persisted via `?tab=` query param.

#### Tab 1 — Overview
- Score hero: large score % + "X/Y correct" + total time
- 4-stat row: Correct · Wrong · Skipped · Avg time/question
- Subject breakdown table: name · accuracy bar · correct/total · avg time per subject
- Behavior card: Sure-but-wrong count · Guess rate · Answer change average
- AI feedback block: shown if `session.ai_feedback` exists; collapsed by default, expandable

#### Tab 2 — Wrong Answers
- Filtered list: only `is_correct === false` attempts
- Per card: question text · your answer (red pill) · correct answer (green pill) · explanation (collapsed, tap to expand) · subject + subtopic badges · "Save as Note" button
- "Save as Note" opens NoteEditor sheet with question pre-filled as front
- Empty state: "You got everything right! 🎉"

#### Tab 3 — Review All
- All questions, 20 per page
- Color-coded left border: green = correct, red = wrong, gray = skipped
- Filter chips: All · Correct · Wrong · Skipped
- Same card structure as Tab 2

#### Tab 4 — Subtopic Drill
- Questions grouped by subtopic (falls back to subject if subtopic absent)
- Per group: name · accuracy % · question count · confusion score (from analytics_json if present)
- "Practice this subtopic" CTA → `/quiz?subtopic=X`
- Graceful fallback to subject-level grouping if no subtopic data

---

### 3. `/tests/mistakes` — Cross-Session Aggregator

**Header:** "All Mistakes" + subtitle.

**Data loading:**
1. Fetch last 20 sessions via `listTestSessions`
2. For each session, extract wrong attempts from `snapshot_json` (or fall back to `listAttemptsBySession`)
3. Deduplicate by `question_id` — same question wrong in N sessions → show once with "Wrong N×" badge
4. Load in parallel batches of 5; show progress indicator: "Loading mistakes from X/20 sessions…"

**Filters:** Subject dropdown · Sort: Most Wrong First / Most Recent.

**Mistake cards:**
- Question text (2-line truncate, expand on tap)
- Last answer (red pill) · Correct answer (green pill)
- Subject + subtopic badges
- "Wrong X×" badge — red, prominent when X ≥ 3
- Last attempted date
- "Save as Note" button → NoteEditor sheet

**Empty state:** "No mistakes yet — keep it up! 🏆"

---

## Component Structure

```
app/(dashboard)/tests/
  page.tsx                         ← SessionListPage
  [sessionId]/page.tsx             ← SessionDetailPage (owns shared state + tab routing)
  mistakes/page.tsx                ← MistakesPage

components/tests/
  SessionCard.tsx                  ← card used in list
  SessionDetailTabs.tsx            ← tab bar + tab switcher
  tabs/
    OverviewTab.tsx
    WrongAnswersTab.tsx
    ReviewAllTab.tsx
    SubtopicDrillTab.tsx
  QuestionReviewCard.tsx           ← shared card used in Wrong Answers + Review All
  MistakeCard.tsx                  ← card used in /mistakes
```

---

## Error Handling

- If `getTestSession` fails → show error state with "Back to Tests" button
- If `listAttemptsBySession` fails → tabs that need attempts show "Could not load questions" with retry
- If snapshot_json is missing/malformed → fall back to reconstructing from attempts + `getQuestionsByIds`
- `/tests/mistakes` batch failures are silent per-session (skip failed sessions, show what loaded)

---

## Deletions

These files will be deleted as part of this implementation:
- `app/(dashboard)/tests/[sessionId]/results/page.tsx`
- `app/(dashboard)/tests/[sessionId]/analytics/page.tsx`
- `app/(dashboard)/tests/[sessionId]/review/page.tsx`

The root `tests/page.tsx` and all `tests/[sessionId]/` sub-pages are fully replaced.

---

## Out of Scope

- Editing or retaking a session
- Sharing results externally
- Comparing two sessions side-by-side
- Real-time data updates

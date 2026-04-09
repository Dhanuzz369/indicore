# Full-Length Mock Nudge — Design Spec

**Date:** 2026-04-09
**Scope:** After a subject practice session, show a data-driven modal nudging users to attempt Mock 1. Navigates to `/quiz?tab=mock&highlight=mock1` where Mock 1 card is visually highlighted.

---

## Problem

Users are completing subject-wise practice tests repeatedly but not attempting full-length mock tests. Subject practice gives limited insight — only a real mock simulates UPSC Prelims conditions across all subjects.

---

## 1. Trigger Logic

**Where:** `ResultsView` component (`app/(dashboard)/results/page.tsx` or the ResultsView component it renders).

**Conditions — both must be true:**
1. `session.mode === 'practice'` — the completed session was a subject practice test, not a mock or PYQ
2. User has zero completed `INDICORE_MOCK` sessions — they have never attempted a full-length mock

Condition 2 prevents showing the nudge to users who already take mocks. Once they've done even one mock, the modal never shows again permanently.

**Query:** On `ResultsView` mount, fetch:
```sql
count of test_sessions where user_id = current_user AND exam_type = 'INDICORE_MOCK'
```
Using existing Supabase client (anon key, RLS-protected). If count = 0 → eligible.

**Timing:** 1.5s delay after mount before the modal fires — lets the user absorb their score first.

**Cooldown:** If user dismisses ("Maybe Later"), store `mock_nudge_dismissed_at` in `localStorage` with the current ISO timestamp. On next subject session, check if < 24 hours have passed — if so, suppress the modal. Resets after 24 hours.

---

## 2. Modal UI

Uses the existing `AlertDialog` component (already used for quiz submission confirmations).

**Structure:**

```
┌─────────────────────────────────────────┐
│  📊 Your Practice Insight               │
│                                         │
│  You scored 65% in Polity               │  ← dynamic: user's actual score + subject
│                                         │
│  Subject practice gives you limited     │
│  insights. Simulate a real Prelims      │
│  experience with our full-length        │
│  mock test.                             │
│                                         │
│  [100 Questions] [2 Hours] [200 Marks]  │  ← stat chips
│                                         │
│  [        Try Mock 1 →        ]         │  ← primary CTA, blue
│  [         Maybe Later        ]         │  ← ghost text button
└─────────────────────────────────────────┘
```

**Score line:** `You scored X% in [Subject Name]` — X is `session.score` (already 0–100 accuracy %). Subject name resolved in priority order: (1) `session.paper_label` if set (e.g. "Polity Practice"), (2) first entry of `analytics.subjectStats[0].subject` parsed from the session's analytics JSON, (3) fallback to "this subject" if neither is available.

**Stat chips:** Static — `100 Questions`, `2 Hours`, `200 Marks`.

**Primary button:** `Try Mock 1 →` — navigates to `/quiz?tab=mock&highlight=mock1`, closes modal.

**Secondary button:** `Maybe Later` — closes modal, writes `mock_nudge_dismissed_at` to `localStorage`.

---

## 3. Mock 1 Highlight on Quiz Page

**Trigger:** Quiz page reads `highlight` from URL search params via `useSearchParams()` (already imported).

**Visual treatment on Mock 1 card:**
- `ring-2 ring-[#4A90E2] ring-offset-2` border ring
- Ring animates with `animate-pulse` (Tailwind built-in)
- Small banner tag above the card title: `✨ Recommended for you` in blue (`text-[#4A90E2]`, `text-[10px] font-black uppercase tracking-wider`)

**Auto-clear:** A `useEffect` sets a `setTimeout` of 5000ms that sets `highlighted` state to `false` — removes all highlight styling. Prevents the highlight persisting on later visits via browser back-navigation.

**No behavior change** — the card still works exactly the same when clicked.

---

## File Map

| File | Action | Change |
|---|---|---|
| `app/(dashboard)/results/page.tsx` (or `ResultsView` component) | Modify | Add mock count query on mount; add 1.5s delayed modal trigger |
| `components/modals/FullMockNudgeModal.tsx` | Create | The modal component |
| `app/(dashboard)/quiz/page.tsx` | Modify | Read `highlight` param; apply ring + badge + 5s auto-clear to Mock 1 card |

---

## Non-Goals
- No nudge for users who have already completed at least one mock
- No server-side tracking of nudge shown/dismissed (localStorage only)
- No A/B testing
- No changes to mock 2/3 cards — only Mock 1 is highlighted

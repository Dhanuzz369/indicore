# Mock Tests Feature — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Add a Mock Test tab to the Practice page. The tab has two sub-sections: Full Mocks (Mock 1/2/3 with defined subject weightings, 100 random questions per attempt) and Subject-wise Mock (per-subject config + start). Rename "Full Length Test" tab to "PYQ". Mock questions live in the existing `questions` table under `exam_type = 'INDICORE_MOCK'`. Mock definitions (name, description, subject weightings) live in a new `mocks` table.

---

## 1. Tab Structure

The quiz page (`app/(dashboard)/quiz/page.tsx`) gains a third tab. Tab order:

```
Mock Test  |  PYQ  |  Subject Practice
```

- **Mock Test** — new tab, shown first, selected by default
- **PYQ** — renamed from "Full Length Test"; content and behaviour unchanged
- **Subject Practice** — unchanged

Internal state type changes from `'full' | 'subject'` to `'mock' | 'full' | 'subject'`. Default active tab becomes `'mock'`.

---

## 2. Database

### 2a. `mocks` table (new)

Run in Supabase SQL editor:

```sql
create table mocks (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  subject_weights jsonb not null,
  time_minutes    int default 120,
  is_active       boolean default true
);
alter table mocks enable row level security;
create policy "public read mocks" on mocks for select using (true);
```

### 2b. Seed rows

```sql
insert into mocks (name, description, subject_weights) values
(
  'Mock 1',
  'Polity & History heavy — focus on static GS',
  '[
    {"subjectId":"__POLITY_ID__",      "count":25},
    {"subjectId":"__HISTORY_ID__",     "count":20},
    {"subjectId":"__GEOGRAPHY_ID__",   "count":20},
    {"subjectId":"__ECONOMY_ID__",     "count":15},
    {"subjectId":"__ENVIRONMENT_ID__", "count":10},
    {"subjectId":"__SCIENCE_ID__",     "count":10}
  ]'
),
(
  'Mock 2',
  'Economy & History focus — current affairs blend',
  '[
    {"subjectId":"__POLITY_ID__",      "count":20},
    {"subjectId":"__HISTORY_ID__",     "count":25},
    {"subjectId":"__GEOGRAPHY_ID__",   "count":15},
    {"subjectId":"__ECONOMY_ID__",     "count":20},
    {"subjectId":"__ENVIRONMENT_ID__", "count":10},
    {"subjectId":"__SCIENCE_ID__",     "count":10}
  ]'
),
(
  'Mock 3',
  'Geography & Environment focus — map-heavy paper',
  '[
    {"subjectId":"__POLITY_ID__",      "count":15},
    {"subjectId":"__HISTORY_ID__",     "count":15},
    {"subjectId":"__GEOGRAPHY_ID__",   "count":25},
    {"subjectId":"__ECONOMY_ID__",     "count":20},
    {"subjectId":"__ENVIRONMENT_ID__", "count":15},
    {"subjectId":"__SCIENCE_ID__",     "count":10}
  ]'
);
```

> **Note:** Replace `__POLITY_ID__` etc. with actual subject UUIDs from the `subjects` table before running. The implementation plan includes a helper query to retrieve these IDs.

### 2c. Mock questions

No schema change to `questions`. Mock questions are uploaded via CSV with `exam_type = 'INDICORE_MOCK'`. Required CSV columns: `subject_id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `explanation`, `difficulty` (`easy`/`medium`/`hard`), `subtopic`. The `year` and `paper` columns can be left null or set to `0`/`''` for mock questions.

---

## 3. Query Layer (`lib/supabase/queries.ts`)

### New: `listMocks()`

```typescript
export async function listMocks(): Promise<{ documents: Mock[] }> {
  // select * from mocks where is_active = true order by name asc
  // returns { documents: Mock[] } with $id shim
}
```

### New: `Mock` type (`types/index.ts`)

```typescript
export interface MockSubjectWeight {
  subjectId: string
  count: number
}

export interface Mock {
  $id: string
  name: string
  description: string | null
  subject_weights: MockSubjectWeight[]  // parsed from jsonb
  time_minutes: number
  is_active: boolean
}
```

### Modified: `getQuestions()`

Add `randomise?: boolean` param. When true, the query fetches `limit` rows. Client-side shuffle handles randomisation (see Section 4). No server-side `ORDER BY RANDOM()` needed.

---

## 4. Randomisation Logic (client-side)

Helper function `shuffleArray<T>(arr: T[]): T[]` — Fisher-Yates in-place shuffle. Lives at top of `app/(dashboard)/quiz/page.tsx` or extracted to `lib/utils/shuffle.ts`.

**Full mock question loading** (called on "Attempt Test" click):

```
for each { subjectId, count } in mock.subject_weights:
  fetch getQuestions({ examType: 'INDICORE_MOCK', subjectId, limit: count * 2 })
  shuffle result
  take first `count` questions

combine all subject batches into one array
shuffle combined array
pass to quiz store
```

If a subject has fewer questions than `count * 2`, take all available. If a subject has fewer than `count`, log a warning and take all available (test will be < 100 questions — acceptable for now).

**Subject-wise mock question loading** — same as current subject practice but with `examType: 'INDICORE_MOCK'` filter added.

---

## 5. Mock Test Tab UI

### 5a. Full Mock section

Header: large bold "Mock Tests" with orange "INDICORE" eyebrow label (mirrors PYQ section's "UPSC CSE." heading style).

Cards (one per active mock, fetched from `listMocks()`):
- Same card layout as PYQ cards
- Shows: mock name, description, subject breakdown pills (`Polity 25 · History 20 · ...`), stats row (100 Questions · 2 Hr · 200 Marks)
- Theme: first card orange, second black, third gray (same pattern as PYQ)
- Button: "Attempt Test →" — triggers randomise-and-start flow (no config screen)
- Loading spinner on button while questions are being fetched
- Paper label saved: `Mock 1` (just the mock name, matches existing `setPaperLabel` call)

### 5b. Subject-wise Mock section

Section divider with label "Subject-wise Mock".

Subject cards fetched from `getSubjectsWithCounts()` — same source as Subject Practice — but filtered to only show subjects that have `exam_type = 'INDICORE_MOCK'` questions (count > 0).

On click: opens config panel. Config panel is **identical** to the current Subject Practice config panel (`configSubject` state pattern), with one change: `getQuestions` call uses `examType: 'INDICORE_MOCK'` instead of no examType filter.

Paper label saved: `"${subject.Name} · Mock · ${difficulty === 'All' ? 'All' : difficulty} · ${qs.length}Q"`

### 5c. Empty / loading states

- Mocks loading: skeleton cards (same Skeleton pattern used in subjects grid)
- No mock questions yet: "Mock questions coming soon — check back after the next upload" empty state card

---

## 6. Session Integration

No changes to the quiz session page (`app/(dashboard)/quiz/session/page.tsx`). The quiz store receives questions + mode flags the same way. `setTestMode(true)` for full mocks, `setPracticeTimerTotal(0)` for full mocks (120-min full-length timer), `setPracticeTimerTotal(qs.length * 72)` for subject-wise mock (same as subject practice).

---

## 7. Files Changed

| File | Change |
|---|---|
| `app/(dashboard)/quiz/page.tsx` | Add `'mock'` tab, rename PYQ, add Mock Test tab content |
| `lib/supabase/queries.ts` | Add `listMocks()` |
| `types/index.ts` | Add `Mock`, `MockSubjectWeight` interfaces |
| Supabase SQL (manual) | Create `mocks` table + seed 3 rows |

No changes to: session page, quiz store, analytics engine, test sessions, profile page.

---

## 8. Out of Scope (future)

- Admin UI for editing mock weightings
- Mock attempt history / mock-specific analytics
- Adaptive mock generation based on user weak areas
- More than 3 full mocks

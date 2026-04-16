# Indicore — “My Tests” History + Results + Analytics (Exact Replay)

## Goal
Implement a **My Tests** page that lists **all completed test sessions** (Full Length + Subject-wise practice) as cards.  
When the user clicks a card (or buttons inside it), they can view:

1. **Results Replay** — Shows the **exact same UI and content** the user saw right after submitting the quiz. No changes in layout/behavior, only the data is loaded from DB.
2. **Analytics Replay** — Clicking “View Analytics” should show the **exact same analytics view** that appeared at completion time.

This must work for both:
- `mode = full_length`
- `mode = subject_practice`

The test sessions and analytics must be stored in the database linked to the user profile.

---

# Part 0 — Understand Current Code & Do Not Break It
Before coding:
1. Locate the current “immediate results” page shown after finishing the quiz. Typically one of:
   - `app/(dashboard)/results/page.tsx`
   - `app/(dashboard)/quiz/results/page.tsx`
2. Locate the analytics page currently shown after finishing a full test (if exists). If analytics is rendered inside results page, identify the component.

**Rule:** Do NOT redesign the UI. You must reuse the same components/pages used at completion time.

---

# Part 1 — Appwrite Data Model (New Collection)
Create a new collection (or confirm it exists):

## Collection: `test_sessions`
Attributes:
- `user_id` (string, required, indexed)
- `mode` (string, required, indexed)  
  Values: `"full_length"` or `"subject_practice"`
- `paper_label` (string, required)  
  Examples: `"UPSC Prelims GS-I 2024"` or `"Geography · UPSC PYQ"`
- `exam_type` (string, required, indexed)  
  Example: `"UPSC"`
- `year` (integer, optional, indexed)
- `paper` (string, optional)  
  Example: `"Prelims GS1"`
- `started_at` (datetime, required, indexed)
- `submitted_at` (datetime, required, indexed)
- `total_time_seconds` (integer, required)
- `total_questions` (integer, required)

- `summary` (string, required)  
  Store JSON string of: `{ attempted, correct, incorrect, skipped, scorePercent }`

- `analytics` (string, required)  
  Store JSON string from analytics engine output (the exact object used on completion screen)

- `snapshot` (string, required)  
  Store JSON string of everything needed to “replay” the results exactly. This should include:
  - questions array (or question IDs)
  - user answers map
  - correct answers
  - explanation text
  - timing per question
  - button usage per question (50:50, guess, are-you-sure)
  - anything else the results/analytics UI reads from Zustand store

**Important:** Snapshot is required so that even if questions change later, the replay remains identical.

---

# Part 2 — Persist Snapshot On Submit
When user clicks “Submit Test” (full length) or finishes a subject practice test:

1. Build a `snapshot` object from the current Zustand quiz store:
   Must include:
   - `questions` (full question objects as used in the UI)
   - `answers` (selected options per question)
   - `attempts` (if separate)
   - `elapsedSeconds`
   - `perQuestionTime`
   - `buttonUsagePerQuestion`
   - `paperLabel`, `mode`, `examType`, `year`, `paper`

2. Generate analytics using the same analytics function used at completion time.
3. Create a `test_sessions` document containing:
   - metadata
   - `summary` JSON
   - `analytics` JSON
   - `snapshot` JSON

4. After saving, continue navigation to the existing results page as currently implemented.

---

# Part 3 — Add “My Tests” Page
Create route:

## `app/(dashboard)/tests/page.tsx`

### UI requirements
- Page title: **My Tests**
- Subtitle: “Review your previous attempts anytime.”

### Cards list
Each `test_session` should render as a Card containing:
- `paper_label` (bold)
- mode badge: Full Length / Subject Practice
- Submitted date + time (pretty format)
- Score summary line from `summary` JSON:
  `Score: 62% · Correct: 62 · Incorrect: 28 · Skipped: 10`
- Time: `1h 32m` and avg time per question

Buttons on each card:
- **View Results** → `/tests/[sessionId]/results`
- **View Analytics** → `/tests/[sessionId]/analytics`

Card click can go to View Results too, but buttons must exist.

### Sorting and filters (minimal)
At top add:
- Sort dropdown: Newest (default), Oldest
- Mode filter dropdown: All, Full Length, Subject Practice

---

# Part 4 — Results Replay Page (Exact Same UI)
Create route:

## `app/(dashboard)/tests/[sessionId]/results/page.tsx`

### Requirement: Exact replay
This page must show **exactly the same** as the existing “results after submit” page.

Implementation approach:
1. Fetch `test_sessions` doc by `sessionId`.
2. Parse `snapshot` JSON.
3. Instead of creating a new UI, reuse the same components as the live results page:
   - If current results page reads from Zustand store, then:
     - Hydrate the store with snapshot data on mount (setQuestions, setAnswers, setElapsedSeconds, etc.)
     - Set a new store flag: `replayMode = true`
     - Render the SAME component used in results page.
4. Ensure no “submit” buttons or navigation changes appear; it must be read-only.

If the current results page already accepts props (recommended), refactor so both:
- `/results` (live)
- `/tests/[sessionId]/results` (replay)
render the same `<ResultsView data={...} />`.

---

# Part 5 — Analytics Replay Page (Exact Same UI)
Create route:

## `app/(dashboard)/tests/[sessionId]/analytics/page.tsx`

Same rules:
- Fetch the session doc
- Parse `analytics` JSON and/or snapshot
- Render the exact same analytics UI component used at completion time
- No redesign.

If analytics was embedded inside results page at completion, extract it into a component:
- `components/analytics/AnalyticsView.tsx`
Then use it in both:
- completion results flow
- replay analytics route

---

# Part 6 — Appwrite Queries
Add to `lib/appwrite/queries.ts` (or equivalent file):

- `createTestSession(data)`
- `listTestSessionsByUser(userId, filters)`
- `getTestSessionById(sessionId)`

Ensure queries are secure and only list sessions for the logged-in user.

---

# Part 7 — Navigation
Add a sidebar/nav entry:
- **My Tests** → `/tests`

---

# Part 8 — Testing Checklist
After implementing:

1. Take a Full Length test → Submit.
2. Confirm a `test_sessions` document is created with:
   - summary JSON
   - analytics JSON
   - snapshot JSON

3. Go to `/tests`:
   - Card appears with correct label, date/time, score, mode.

4. Click View Results:
   - Must match exactly what user saw when test was completed.

5. Click View Analytics:
   - Must match exactly what user saw when test was completed.

6. Repeat for Subject-wise practice mode.

---

# Hard Requirements
- No UI redesign.
- No analytics recalculation on replay (use stored analytics JSON).
- Results replay must use stored snapshot to ensure identical output even if questions change later.
- TypeScript clean, no runtime errors.

---

# Deliverables (Files Expected)
- `app/(dashboard)/tests/page.tsx`
- `app/(dashboard)/tests/[sessionId]/results/page.tsx`
- `app/(dashboard)/tests/[sessionId]/analytics/page.tsx`
- Updates to `store/quiz-store.ts` to support replay hydration (if needed)
- Updates to `lib/appwrite/queries.ts` for test_sessions CRUD
- Reusable components:
  - `components/tests/TestSessionCard.tsx`
  - `components/results/ResultsView.tsx` (if extracted)
  - `components/analytics/AnalyticsView.tsx` (if extracted)

End.
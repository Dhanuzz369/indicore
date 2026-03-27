# Revision Tracking Display — Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Overview

Surface the already-computed answer-revision data in the results screen. When a user changes their answer during a test, the selection history is already captured in `quiz_attempts.selection_history` (via `selectionHistory.events` in the quiz store). The analytics engine already computes revision counts. This feature makes that data visible: a banner below the score card and a small dot on revised question circles.

No new data collection, no schema changes, no new queries. One file changes: `components/results/ResultsView.tsx`.

---

## 1. Data Computation

Add a `useMemo` inside `ResultsView` that derives three counts from `displayQuestions` and `displayAnswers`:

```typescript
const revisionSummary = useMemo(() => {
  let totalRevised = 0
  let changedCorrectToWrong = 0
  let changedWrongToCorrect = 0

  for (const q of displayQuestions) {
    const answer = displayAnswers[q.$id]
    if (!answer) continue
    const changeCount = answer.selectionHistory?.change_count ?? 0
    if (changeCount === 0) continue

    totalRevised++

    // Find the first 'select' event to determine original choice
    const events: SelectionEvent[] = answer.selectionHistory?.events ?? []
    const firstSelect = events.find(e => e.type === 'select')
    if (firstSelect?.option) {
      const firstWasCorrect = firstSelect.option === q.correct_option
      if (firstWasCorrect && !answer.isCorrect) changedCorrectToWrong++
      if (!firstWasCorrect && answer.isCorrect) changedWrongToCorrect++
    }
  }

  return totalRevised > 0
    ? { totalRevised, changedCorrectToWrong, changedWrongToCorrect }
    : null  // null = banner hidden entirely
}, [displayQuestions, displayAnswers])
```

**Dependency on existing types:** `SelectionEvent` is already imported from `@/types`. `answer.selectionHistory` is already typed as `{ events: SelectionEvent[], change_count: number }` on `AnswerRecord` in the store. No new types needed.

**Backward compatibility:** Legacy sessions where `selectionHistory` was not saved return `change_count === 0` for every question → `revisionSummary` is `null` → banner is not rendered. No visible change for old sessions.

---

## 2. Revision Banner

**Position:** Between the score card and the Sure Items / 50:50 / Guesses dropdown section.

**Renders only when:** `revisionSummary !== null` (i.e., at least one answer was changed).

**Content:**

- Primary line: `"You revised {totalRevised} answer{s} during this test."`
- Secondary line (if `changedCorrectToWrong > 0`): `"In {changedCorrectToWrong} of those, you changed a correct answer to a wrong one."`
- Tertiary line (if `changedWrongToCorrect > 0`): `"You caught yourself and corrected {changedWrongToCorrect} wrong answer{s}."`

**Tone logic:**
- `changedCorrectToWrong > changedWrongToCorrect` → amber border (`border-amber-500`) — overthinker warning
- `changedWrongToCorrect >= changedCorrectToWrong` → emerald border (`border-emerald-500`) — positive self-correction
- Either way: dark background card (`bg-gray-900 text-white`), left 4px coloured border, rounded-2xl, px-6 py-4

**Example renders:**

*Overthinker case:*
> You revised **8 answers** during this test.
> In **6 of those**, you changed a correct answer to a wrong one. ⚠️

*Self-corrector case:*
> You revised **5 answers** during this test.
> You caught yourself and corrected **4 wrong answers**. ✓

*Mixed case:* Both secondary and tertiary lines shown together.

---

## 3. Question Circle Revised Indicator

**Location:** Inside `SubjectPerformanceCard` — the existing question number circles rendered per subject.

**Condition:** `(answers[q.$id]?.selectionHistory?.change_count ?? 0) > 0`

**Visual:** A `4×4px` filled orange dot (`bg-orange-400 rounded-full`) absolutely positioned at the top-right corner of the circle (`absolute -top-0.5 -right-0.5`). The circle itself gets `relative` positioning to contain the dot.

This is a different visual layer from the confidence rings (`ring-2 ring-emerald-400` etc.) so the two stack without conflict — revised + sure is a circle with a green ring and an orange dot.

**Legend:** Add one entry to the existing legend row below each subject's question grid:
```
🟠  <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />  Revised
```

---

## 4. Files Changed

| File | Change |
|---|---|
| `components/results/ResultsView.tsx` | Add `revisionSummary` useMemo, revision banner JSX, orange dot on question circles, legend entry |

No other files change. No database migrations. No new query functions. No changes to the quiz session or store.

---

## 5. Out of Scope

- Showing a detailed revision timeline per question ("changed from A→B at 2:15")
- Storing `revisionSummary` in `test_sessions.analytics` JSON (data is derived on the fly, not persisted separately)
- Revision stats on the `/tests/[sessionId]/review` individual question page (future)
- Performance tracking over time / `user_test_summary` table (separate spec)

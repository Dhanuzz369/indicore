# Reattempt Test — Design Spec

**Date:** 2026-04-13
**Feature:** Reattempt Test button on Results page — replays only wrong + skipped questions with instant answer reveal

---

## Overview

Add a "Reattempt Test" button at the top of the Results page (above all cards). Clicking it launches a new quiz session containing only the questions the user got wrong or skipped. During the reattempt session, selecting any option instantly reveals the correct answer and explanation — no submit step required. The reattempt is saved to the database as a full `TestSession` record linked to the original session.

---

## Scope

**In scope:**
- "Reattempt Test" CTA button at top of ResultsView
- Filtering wrong + skipped questions from the original attempt
- Two new store fields (`isReattempt`, `reattemptSourceSessionId`) + `startReattempt` action
- Instant-reveal UI in the quiz session page when `isReattempt === true`
- Saving reattempt as a new `TestSession` with `source_session_id` linked to the original

**Out of scope:**
- Reattempt from replay/past sessions (replay mode is read-only; button hidden)
- Chaining multiple reattempts (each reattempt is independent)
- Filtering by subject or difficulty within a reattempt

---

## Files Modified

| File | Change |
|---|---|
| `store/quiz-store.ts` | Add `isReattempt`, `reattemptSourceSessionId`, `startReattempt` action |
| `components/results/ResultsView.tsx` | Add centered "Reattempt Test" button above all cards |
| `app/(dashboard)/quiz/session/page.tsx` | Add instant-reveal branch when `isReattempt === true` |
| `lib/queries.ts` (or equivalent save function) | Add `source_session_id` field to `TestSession` insert |

No new files required.

---

## Store Changes

### New Fields

```typescript
isReattempt: boolean                      // default: false
reattemptSourceSessionId: string | null   // default: null
```

### New Action: `startReattempt`

```typescript
startReattempt(questions: Question[], sourceSessionId: string): void
```

Implementation:
1. Call `reset()` — clears all existing quiz state
2. Set `isReattempt = true`
3. Set `reattemptSourceSessionId = sourceSessionId`
4. Call `setQuestions(questions)` with the pre-filtered wrong+skipped question array
5. Generate a fresh `sessionId` (UUID)

The `reset()` action already zeros out answers, timer, currentIndex, etc. `startReattempt` layers the two reattempt fields on top after the reset.

---

## Results Page Button

### Placement

Centered, above all cards — first element inside the ResultsView content area.

### Filtering Logic

```typescript
const reattemptQuestions = displayQuestions.filter(q => {
  const ans = answers[q.$id]
  // wrong = answered but isCorrect is false; skipped = no answer record at all
  return !ans || !ans.isCorrect
})
```

### Click Handler

```typescript
const handleReattempt = () => {
  startReattempt(reattemptQuestions, sessionId)
  router.push('/quiz/session?mode=reattempt')
}
```

### JSX

```tsx
{!replayMode && (
  <div className="flex justify-center mb-6">
    <button
      onClick={handleReattempt}
      disabled={reattemptQuestions.length === 0}
      className="px-8 py-3 bg-[#4A90E2] text-white rounded-full font-black text-sm uppercase tracking-wider hover:bg-[#3a7fd4] hover:shadow-lg hover:shadow-[#4A90E2]/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <RefreshCw className="h-4 w-4 inline mr-2" />
      Reattempt Test
    </button>
  </div>
)}
```

### Edge Cases

- **Perfect score** (`reattemptQuestions.length === 0`): Button is rendered but disabled. No tooltip needed — context is clear.
- **Replay mode**: Button is hidden entirely (`!replayMode` guard).
- **Partial attempt** (many skipped): All skipped questions are included — consistent with "wrong + skipped = not correct".

---

## Quiz Session: Instant-Reveal Behavior

### Trigger

Only active when `isReattempt === true` in the store. Normal quiz sessions are unaffected.

### State

A local React state in the session page:

```typescript
const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(new Set())
```

### Option-Click Handler Branch

```typescript
if (isReattempt) {
  // 1. Record the answer to the store immediately
  recordAnswer(questionId, selectedOption, isCorrect, timeTaken, ...)
  // 2. Mark this question as revealed — triggers UI update
  setRevealedQuestions(prev => new Set(prev).add(questionId))
} else {
  // existing behaviour unchanged
}
```

### Revealed UI (when `revealedQuestions.has(currentQuestionId)`)

- **Selected option**: highlighted red (`bg-red-100 border-red-400`) if wrong, green (`bg-green-100 border-green-400`) if correct
- **Correct option**: always highlighted green, regardless of what user selected
- **Options are locked** — no further selection possible for this question
- **Explanation panel** expands automatically below the options (same component used in post-submit review, just triggered earlier)
- **"Next →" button** appears (or auto-advances if it's the last question)

### No Change To

- Timer (still runs)
- Confidence tags / AreYouSure button (still available before selecting)
- Progress bar
- Answer recording / Supabase save on submit

---

## Data Pipeline — Saving the Reattempt

### New TestSession Field

Add `source_session_id: string | null` to the `TestSession` insert payload. Value comes from `reattemptSourceSessionId` in the store.

```typescript
// In the save function (lib/queries.ts or session page submit handler):
source_session_id: isReattempt ? reattemptSourceSessionId : null,
```

This enables future queries like:
- "Show me all reattempts of session X"
- "How did the user improve between attempt 1 and reattempt?"

### Supabase Schema

Add column to `test_sessions` table:
```sql
source_session_id UUID REFERENCES test_sessions(id) NULL
```

### Everything Else

The reattempt session saves identically to a regular session — same `sessionId` (freshly generated), same `answers` JSONB, same scoring logic. No special handling in the save path beyond the one new field.

---

## URL

The reattempt session navigates to `/quiz/session?mode=reattempt`. The `mode` param is informational only — the session page does not read it. The store's `isReattempt` flag is the source of truth for behavior. The param exists purely for debugging/analytics clarity in browser history and network logs.

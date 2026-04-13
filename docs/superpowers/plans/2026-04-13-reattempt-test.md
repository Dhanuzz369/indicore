# Reattempt Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Reattempt Test" button on the Results page that launches a new quiz session containing only the questions the user got wrong or skipped, with instant answer reveal after each option click.

**Architecture:** Extend the Zustand store with two new fields (`isReattempt`, `reattemptSourceSessionId`) and a `startReattempt` action. ResultsView filters wrong+skipped questions and calls `startReattempt`, then pushes to `/quiz/session?mode=reattempt`. The session page detects `isReattempt` and immediately reveals the correct answer + explanation when any option is clicked. The reattempt session saves to Supabase as a normal `TestSession` with one extra `source_session_id` field.

**Tech Stack:** Next.js 15 App Router, Zustand, TypeScript, Tailwind CSS, Supabase (PostgreSQL), lucide-react

---

## File Map

| File | Change |
|---|---|
| `store/quiz-store.ts` | Add `isReattempt`, `reattemptSourceSessionId` fields + `startReattempt` action |
| `types/index.ts` | Add `source_session_id?: string \| null` to `TestSession` interface |
| `lib/supabase/queries.ts` | Add `source_session_id` to `createTestSession` insert |
| `components/results/ResultsView.tsx` | Add centered "Reattempt Test" button above all cards |
| `app/(dashboard)/quiz/session/page.tsx` | Read `isReattempt` from store; add instant-reveal branch in `handleOptionClick` + `getOptionState` |

---

## Task 1: Extend Zustand Store

**Files:**
- Modify: `store/quiz-store.ts`

### Context

The store is at `store/quiz-store.ts`. The `QuizStore` interface starts at line 16 and `useQuizStore` is created at line 72. The `reset()` action (line 204) clears everything back to defaults.

The current `setQuestions` action at line 97 already generates a fresh `sessionId` — `startReattempt` will call `reset()` then `setQuestions()` then set the two new flags. This keeps all the existing initialization logic intact.

- [ ] **Step 1: Add the two new fields to the `QuizStore` interface**

In `store/quiz-store.ts`, add these two lines to the `QuizStore` interface, after the `buttonStats` block (around line 39), and before the action signatures:

```typescript
  isReattempt: boolean
  reattemptSourceSessionId: string | null
```

- [ ] **Step 2: Add the `startReattempt` action signature to the interface**

Still in the `QuizStore` interface, add after the `setAnswers` line (around line 66):

```typescript
  startReattempt: (questions: Question[], sourceSessionId: string) => void
```

- [ ] **Step 3: Add initial values to `useQuizStore`**

In the `useQuizStore` initializer object (starting at line 72), add default values after `sessionId: ''`:

```typescript
  isReattempt: false,
  reattemptSourceSessionId: null,
```

- [ ] **Step 4: Add `isReattempt` and `reattemptSourceSessionId` to the `reset()` action**

In the `reset()` action (line 204), add these two fields to the `set({...})` call:

```typescript
  isReattempt: false,
  reattemptSourceSessionId: null,
```

Do the same for `resetQuiz()` (line 223).

- [ ] **Step 5: Implement the `startReattempt` action**

Add this action to `useQuizStore`, after `resetQuiz`:

```typescript
  startReattempt: (questions: Question[], sourceSessionId: string) => {
    get().reset()
    get().setQuestions(questions)
    set({
      isReattempt: true,
      reattemptSourceSessionId: sourceSessionId,
    })
  },
```

- [ ] **Step 6: Verify TypeScript compiles with no errors**

Run:
```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 7: Commit**

```bash
git add store/quiz-store.ts
git commit -m "feat(store): add isReattempt flag and startReattempt action"
```

---

## Task 2: Update TestSession Type and Supabase Insert

**Files:**
- Modify: `types/index.ts` (line 80–106)
- Modify: `lib/supabase/queries.ts` (lines 411–442)

### Context

`TestSession` interface is in `types/index.ts` at line 80. The `createTestSession` function is in `lib/supabase/queries.ts` at line 411. It constructs an insert payload — we need to add `source_session_id` as an optional column.

The Supabase `test_sessions` table needs a new nullable column. Since this is a client-side Next.js project with no migration runner, add the column via the Supabase dashboard SQL editor:

```sql
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS source_session_id UUID REFERENCES test_sessions(id) NULL;
```

> **Note to implementer:** Run this SQL in Supabase Studio > SQL Editor before deploying. If you don't have access, the insert will still succeed (Supabase ignores unknown columns in the insert payload by default), but the field won't be persisted. Add a TODO comment in the code if the migration can't be run immediately.

- [ ] **Step 1: Add `source_session_id` to the `TestSession` interface**

In `types/index.ts`, add after line 105 (`question_ids?: string`):

```typescript
  source_session_id?: string | null  // set when this session is a reattempt of another
```

- [ ] **Step 2: Add `source_session_id` to the `createTestSession` insert payload**

In `lib/supabase/queries.ts`, inside the `.insert({...})` call (after `question_ids:` on line ~434), add:

```typescript
      source_session_id: data.source_session_id ?? null,
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/supabase/queries.ts
git commit -m "feat(db): add source_session_id to TestSession type and insert"
```

---

## Task 3: Add Reattempt Button to ResultsView

**Files:**
- Modify: `components/results/ResultsView.tsx`

### Context

`ResultsView` is a client component. The component signature is at line 307:

```typescript
export function ResultsView({ sessionId, replayMode = false }: ResultsViewProps)
```

The `<main>` tag is at line 752:

```tsx
<main className="max-w-7xl mx-auto px-3 md:px-6 mt-5 md:mt-8 space-y-6 md:space-y-8">
```

The very next JSX inside `<main>` is the score cards grid. The reattempt button goes **between** `<main ...>` and that grid.

`displayQuestions` and `displayAnswers` are already computed at lines 342–343. `replayMode` comes from props. `sessionId` comes from props. The store's `startReattempt` needs to be imported from `useQuizStore`.

- [ ] **Step 1: Import `startReattempt` from the store**

The store is already imported at line 5:

```typescript
import { useQuizStore } from '@/store/quiz-store'
```

In the component body (after the existing store destructuring), add `startReattempt` and `isReattempt` to the destructured values. Find the block that reads from the store (around lines 112–135 in the session page pattern — in ResultsView it's a similar `useQuizStore` call). Add:

```typescript
const startReattempt = useQuizStore(s => s.startReattempt)
```

- [ ] **Step 2: Compute `reattemptQuestions` inside the component**

Add this computation after the `displayAnswers` / `displayQuestions` derivations (around line 346):

```typescript
const reattemptQuestions = displayQuestions.filter(q => {
  const ans = displayAnswers[q.$id]
  return !ans || !ans.isCorrect
})
```

- [ ] **Step 3: Add the `handleReattempt` function**

Add this function inside the component body, alongside the other handlers (e.g. near `handleQuestionClick`):

```typescript
const handleReattempt = () => {
  startReattempt(reattemptQuestions, sessionId)
  router.push('/quiz/session?mode=reattempt')
}
```

- [ ] **Step 4: Add the button JSX inside `<main>`, above the score cards grid**

Find the `<main>` tag (line 752). Immediately after the opening `<main ...>` tag, add:

```tsx
{/* ── Reattempt Test CTA ── */}
{!replayMode && (
  <div className="flex justify-center">
    <button
      onClick={handleReattempt}
      disabled={reattemptQuestions.length === 0}
      className="px-8 py-3 bg-[#4A90E2] text-white rounded-full font-black text-sm uppercase tracking-wider hover:bg-[#3a7fd4] hover:shadow-lg hover:shadow-[#4A90E2]/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      Reattempt Test
    </button>
  </div>
)}
```

`RefreshCw` is already imported at line 8.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Manual smoke test**

Start the dev server:
```bash
npm run dev
```

Navigate to a results page (complete or replay a quiz). Confirm:
- "Reattempt Test" button appears centered above the score cards
- Button is disabled when `reattemptQuestions.length === 0` (perfect score)
- Button is hidden in replay mode (`?replay=true`)
- Clicking the button navigates to `/quiz/session?mode=reattempt`

- [ ] **Step 7: Commit**

```bash
git add components/results/ResultsView.tsx
git commit -m "feat(results): add centered Reattempt Test CTA above score cards"
```

---

## Task 4: Instant-Reveal Behavior in Quiz Session

**Files:**
- Modify: `app/(dashboard)/quiz/session/page.tsx`

### Context

The session page is a client component at `app/(dashboard)/quiz/session/page.tsx`.

**Relevant existing code to understand:**

`handleOptionClick` starts at line 253. When an option is clicked in practice mode, it calls `submitAnswer(...)` and then saves to Supabase. The `isAnswered` flag becomes `true` after submitting, which triggers `ExplanationBox` to appear (line 895):

```tsx
{(testMode ? isSubmitted : isAnswered) && (
  <ExplanationBox ... />
)}
```

Options are disabled when `testMode ? isSubmitted : isAnswered` (line 846).

`getOptionState` at line 641 returns `'correct'`, `'incorrect'`, `'revealed'`, or `'default'` — these drive the green/red color on `OptionButton`.

**For reattempt mode**, we need:
1. A local `revealedQuestions` Set state — when a question's ID is in this set, treat it as "answered" for UI purposes (show explanation, lock options, colour options).
2. In `handleOptionClick`, if `isReattempt`, add the question ID to `revealedQuestions` immediately after `submitAnswer`.
3. In `getOptionState`, if `isReattempt` and this question is revealed, return the correct color states.
4. Pass `isReattempt && revealedQuestions.has(currentQuestion.$id)` to the explanation/disabled logic.

- [ ] **Step 1: Read `isReattempt` and `reattemptSourceSessionId` from the store**

In the store destructuring block (around lines 112–135), add:

```typescript
const isReattempt = useQuizStore(s => s.isReattempt)
const reattemptSourceSessionId = useQuizStore(s => s.reattemptSourceSessionId)
```

- [ ] **Step 2: Add `revealedQuestions` local state**

After the existing `useState` declarations in the component, add:

```typescript
const [revealedQuestions, setRevealedQuestions] = useState<Set<string>>(new Set())
```

- [ ] **Step 3: Add instant-reveal branch in `handleOptionClick`**

In `handleOptionClick` (line 253), immediately after the `submitAnswer(...)` call (line 278), add:

```typescript
    // Reattempt mode: reveal answer instantly
    if (isReattempt) {
      setRevealedQuestions(prev => {
        const next = new Set(prev)
        next.add(currentQuestion.$id)
        return next
      })
    }
```

- [ ] **Step 4: Update `getOptionState` to handle reattempt reveal**

`getOptionState` is at line 641. The current logic:

```typescript
const getOptionState = (optionKey: 'A' | 'B' | 'C' | 'D') => {
  const sel = currentAnswer?.selectedOption
  const correct = currentQuestion.correct_option
  if (testMode) {
    if (isSubmitted) {
      if (optionKey === sel && optionKey === correct) return 'correct'
      if (optionKey === sel && optionKey !== correct) return 'incorrect'
      if (optionKey === correct && sel !== correct) return 'revealed'
      return 'default'
    }
    return optionKey === sel ? 'selected' : 'default'
  } else {
    if (!isAnswered) return 'default'
    if (optionKey === sel && optionKey === correct) return 'correct'
    if (optionKey === sel && optionKey !== correct) return 'incorrect'
    if (optionKey === correct && sel !== correct) return 'revealed'
    return 'default'
  }
}
```

Replace it with:

```typescript
const getOptionState = (optionKey: 'A' | 'B' | 'C' | 'D') => {
  const sel = currentAnswer?.selectedOption
  const correct = currentQuestion.correct_option
  // Reattempt mode: reveal immediately after selection
  const isRevealed = isReattempt && revealedQuestions.has(currentQuestion.$id)
  if (isRevealed) {
    if (optionKey === sel && optionKey === correct) return 'correct'
    if (optionKey === sel && optionKey !== correct) return 'incorrect'
    if (optionKey === correct && sel !== correct) return 'revealed'
    return 'default'
  }
  if (testMode) {
    if (isSubmitted) {
      if (optionKey === sel && optionKey === correct) return 'correct'
      if (optionKey === sel && optionKey !== correct) return 'incorrect'
      if (optionKey === correct && sel !== correct) return 'revealed'
      return 'default'
    }
    return optionKey === sel ? 'selected' : 'default'
  } else {
    if (!isAnswered) return 'default'
    if (optionKey === sel && optionKey === correct) return 'correct'
    if (optionKey === sel && optionKey !== correct) return 'incorrect'
    if (optionKey === correct && sel !== correct) return 'revealed'
    return 'default'
  }
}
```

- [ ] **Step 5: Update the options `disabled` prop to lock on reveal**

At line 846, the options `disabled` prop is:

```tsx
disabled={testMode ? isSubmitted : isAnswered}
```

Replace with:

```tsx
disabled={
  (isReattempt && revealedQuestions.has(currentQuestion.$id)) ||
  (testMode ? isSubmitted : isAnswered)
}
```

- [ ] **Step 6: Update the ExplanationBox condition to show on reveal**

At line 895:

```tsx
{(testMode ? isSubmitted : isAnswered) && (
  <ExplanationBox ... />
)}
```

Replace with:

```tsx
{((isReattempt && revealedQuestions.has(currentQuestion.$id)) ||
  (testMode ? isSubmitted : isAnswered)) && (
  <ExplanationBox ... />
)}
```

- [ ] **Step 7: Pass `source_session_id` to `createTestSession`**

In the `createTestSession` call (line 471), add `source_session_id` to the payload:

```typescript
source_session_id: isReattempt ? reattemptSourceSessionId : null,
```

Add it after the `question_ids` line (~line 501).

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 9: Manual end-to-end test**

1. Complete a quiz with at least 2 wrong/skipped answers.
2. On the results page, click "Reattempt Test".
3. Confirm the session starts with only wrong+skipped questions.
4. Click an option — confirm:
   - Selected option immediately turns red (if wrong) or green (if correct)
   - Correct option is highlighted green
   - Explanation expands automatically
   - Options are locked (no further clicks on this question)
5. Navigate to next question — confirm it behaves the same.
6. Submit the reattempt session.
7. Check Supabase `test_sessions` table — confirm a new row exists with `source_session_id` pointing to the original session.

- [ ] **Step 10: Commit**

```bash
git add app/(dashboard)/quiz/session/page.tsx
git commit -m "feat(session): instant answer reveal in reattempt mode"
```

---

## Task 5: Push and Verify

- [ ] **Step 1: Push to main**

```bash
git push origin claude/pensive-turing:main
```

- [ ] **Step 2: Final type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

# Revision Tracking Display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the already-computed answer-revision data in the results screen — a banner below the score card showing "You revised N answers…" and a small orange dot on question circles where the answer was changed.

**Architecture:** All data needed (`selectionHistory.events`, `change_count`) is already present in `displayAnswers` which is loaded in `ResultsView`. A `useMemo` derives the counts; a banner component and a circle indicator use those counts. Zero new queries, zero schema changes. One file changes.

**Tech Stack:** Next.js 14, React 18 (`useMemo`), TypeScript, Tailwind CSS

---

## File Map

| File | Action | What changes |
|---|---|---|
| `components/results/ResultsView.tsx` | Modify | Add `SelectionEvent` import, `revisionSummary` useMemo, revision banner JSX, orange dot on question circles + legend entry |

---

### Task 1: Add `revisionSummary` computation

**Files:**
- Modify: `components/results/ResultsView.tsx`

**Context:** The file is at `/Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing/components/results/ResultsView.tsx`. Read it fully before editing.

- [ ] **Step 1: Add `SelectionEvent` to the type import**

Find line 11 (the type import from `@/types`):
```typescript
import type { Question } from '@/types'
```

Replace with:
```typescript
import type { Question, SelectionEvent } from '@/types'
```

- [ ] **Step 2: Add `revisionSummary` useMemo after `mergedAnswers`**

Find this block (around line 511):
```typescript
  // ─── Merged answers with confidence ──────────────────────────
  const mergedAnswers = Object.fromEntries(
    Object.entries(displayAnswers).map(([qId, ans]: [string, any]) => [
      qId,
      { ...ans, confidenceTag: displayConfMap[qId] || ans.confidenceTag || null }
    ])
  )
```

Add the following block DIRECTLY AFTER the closing `)` of `mergedAnswers` (before `// ─── Main render ───`):

```typescript
  // ─── Revision summary ──────────────────────────────────────
  const revisionSummary = useMemo(() => {
    let totalRevised = 0
    let changedCorrectToWrong = 0
    let changedWrongToCorrect = 0

    for (const q of displayQuestions) {
      const answer = displayAnswers[q.$id] as any
      if (!answer) continue
      const changeCount: number = answer.selectionHistory?.change_count ?? 0
      if (changeCount === 0) continue

      totalRevised++

      const events: SelectionEvent[] = answer.selectionHistory?.events ?? []
      const firstSelect = events.find((e: SelectionEvent) => e.type === 'select')
      if (firstSelect?.option) {
        const firstWasCorrect = firstSelect.option === q.correct_option
        if (firstWasCorrect && !answer.isCorrect) changedCorrectToWrong++
        if (!firstWasCorrect && answer.isCorrect) changedWrongToCorrect++
      }
    }

    return totalRevised > 0
      ? { totalRevised, changedCorrectToWrong, changedWrongToCorrect }
      : null
  }, [displayQuestions, displayAnswers])
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
git add components/results/ResultsView.tsx
git commit -m "feat: compute revisionSummary from selectionHistory in ResultsView"
```

---

### Task 2: Add revision banner JSX

**Files:**
- Modify: `components/results/ResultsView.tsx`

**Context:** The banner goes between the score/chart grid and the confidence panels. In the JSX, find the closing `</div>` of the score + subject bar chart grid (around line 708, after the subject performance card `</div>`), and the comment `{/* ── Confidence panels ── */}` that starts the next section (around line 710).

- [ ] **Step 1: Insert the revision banner between the two sections**

Find this exact sequence (around lines 708–711):
```tsx
        </div>
        </div>

        {/* ── Confidence panels ── */}
```

Replace it with:
```tsx
        </div>
        </div>

        {/* ── Revision banner ── */}
        {revisionSummary && (
          <div className={`rounded-2xl px-6 py-5 flex flex-col gap-2 border-l-4 bg-gray-900 text-white ${
            revisionSummary.changedCorrectToWrong > revisionSummary.changedWrongToCorrect
              ? 'border-amber-500'
              : 'border-emerald-500'
          }`}>
            <p className="text-sm font-black uppercase tracking-widest text-gray-300">
              Answer Revision
            </p>
            <p className="text-base font-bold text-white">
              You revised{' '}
              <span className="text-[#FF6B00] font-black">{revisionSummary.totalRevised}</span>{' '}
              answer{revisionSummary.totalRevised !== 1 ? 's' : ''} during this test.
            </p>
            {revisionSummary.changedCorrectToWrong > 0 && (
              <p className="text-sm font-medium text-amber-300">
                ⚠ In{' '}
                <span className="font-black">{revisionSummary.changedCorrectToWrong}</span>{' '}
                of those, you changed a correct answer to a wrong one.
              </p>
            )}
            {revisionSummary.changedWrongToCorrect > 0 && (
              <p className="text-sm font-medium text-emerald-300">
                ✓ You caught yourself and corrected{' '}
                <span className="font-black">{revisionSummary.changedWrongToCorrect}</span>{' '}
                wrong answer{revisionSummary.changedWrongToCorrect !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        )}

        {/* ── Confidence panels ── */}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
git add components/results/ResultsView.tsx
git commit -m "feat: add revision banner below score card in ResultsView"
```

---

### Task 3: Add orange dot indicator on revised question circles

**Files:**
- Modify: `components/results/ResultsView.tsx` — `SubjectPerformanceCard` component (lines 43–126)

**Context:** Inside `SubjectPerformanceCard`, each question renders as a button with a number. The render block starts around line 88. Each button currently looks like:

```tsx
<button
  key={q.$id}
  title={`Q${globalIndex + 1} — ...`}
  onClick={() => onQuestionClick(globalIndex)}
  className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 ${statusColor} ${confDot}`}
>
  {globalIndex + 1}
</button>
```

- [ ] **Step 1: Wrap each circle in a `relative` container and add the orange dot**

Find the full button element inside `SubjectPerformanceCard` (lines ~101–110):
```tsx
                return (
                  <button
                    key={q.$id}
                    title={`Q${globalIndex + 1} — ${isSkipped ? 'Not Answered' : isCorrect ? 'Correct' : 'Incorrect'}${confTag ? ` (${confLabel(confTag)})` : ''} — Took ${formatTime(answer?.timeTaken)}`}
                    onClick={() => onQuestionClick(globalIndex)}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 ${statusColor} ${confDot}`}
                  >
                    {globalIndex + 1}
                  </button>
                )
```

Replace with:
```tsx
                const wasRevised = (answer?.selectionHistory?.change_count ?? 0) > 0
                return (
                  <div key={q.$id} className="relative">
                    <button
                      title={`Q${globalIndex + 1} — ${isSkipped ? 'Not Answered' : isCorrect ? 'Correct' : 'Incorrect'}${confTag ? ` (${confLabel(confTag)})` : ''}${wasRevised ? ' · Revised' : ''} — Took ${formatTime(answer?.timeTaken)}`}
                      onClick={() => onQuestionClick(globalIndex)}
                      className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 ${statusColor} ${confDot}`}
                    >
                      {globalIndex + 1}
                    </button>
                    {wasRevised && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-400 rounded-full border border-white" />
                    )}
                  </div>
                )
```

Note: the `key` moves from the `<button>` to the outer `<div>`.

- [ ] **Step 2: Add "Revised" entry to the legend**

Find the legend block inside `SubjectPerformanceCard` (around lines 113–117):
```tsx
            <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />Correct</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Wrong</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />Not Answered</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-emerald-400" />Sure</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-purple-400" />50:50</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-yellow-400" />Guess</span>
            </div>
```

Replace with:
```tsx
            <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />Correct</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Wrong</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />Not Answered</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-emerald-400" />Sure</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-purple-400" />50:50</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-yellow-400" />Guess</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />Revised</span>
            </div>
```

- [ ] **Step 3: Run build**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing && npm run build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully`. Fix any TypeScript errors before committing.

- [ ] **Step 4: Commit**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
git add components/results/ResultsView.tsx
git commit -m "feat: add orange revised dot on question circles with legend entry"
```

---

### Task 4: Push to production

- [ ] **Step 1: Push**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
git push origin HEAD:main
```

- [ ] **Step 2: Verify**

Check `https://indicore-seven.vercel.app/results` after Vercel deploys. Confirm:
- For a test where answers were changed: revision banner appears between score card and confidence panels
- Banner has amber left border if more "changed correct → wrong" than "changed wrong → correct", emerald otherwise
- Question circles with a changed answer show a small orange dot in the top-right corner
- "Revised" legend entry appears in the SubjectPerformanceCard legend row
- For tests with no answer changes (or legacy sessions): no banner, no dots — clean

---

## Self-Review

**Spec coverage:**
- ✅ `revisionSummary` useMemo computing `totalRevised`, `changedCorrectToWrong`, `changedWrongToCorrect` — Task 1
- ✅ Banner positioned between score card and confidence panels — Task 2
- ✅ Banner hidden when `revisionSummary === null` (legacy sessions, no changes) — Task 2 (`revisionSummary && (`)
- ✅ Amber border when `changedCorrectToWrong > changedWrongToCorrect` — Task 2
- ✅ Emerald border when `changedWrongToCorrect >= changedCorrectToWrong` — Task 2
- ✅ Orange dot on revised circles — Task 3 Step 1
- ✅ "Revised" legend entry — Task 3 Step 2
- ✅ Dot uses `absolute -top-0.5 -right-0.5` positioned inside `relative` wrapper — Task 3 Step 1

**Placeholder scan:** None. All code blocks are complete.

**Type consistency:** `SelectionEvent` imported in Task 1 Step 1, used in Task 1 Step 2. `revisionSummary` defined in Task 1, consumed in Task 2. `wasRevised` local variable in Task 3 is self-contained. No cross-task type mismatches.

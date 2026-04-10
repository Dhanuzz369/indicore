# Potential Score Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side-by-side Potential Score card next to a reduced Marks Scored card, with a 3-state click interaction that permanently highlights the Sure Items and Answer Revision cards when the user asks to see where they lost marks.

**Architecture:** All changes are in `components/results/ResultsView.tsx`. Two new state booleans (`potentialRevealed`, `lostMarksHighlighted`) drive the card's 3 states and the highlight on the Sure + Revision cards. The layout is restructured so the marks + potential cards share a new 2-col row above the subject chart. The 3D flip uses CSS `preserve-3d` / `backface-visibility` via Tailwind arbitrary values.

**Tech Stack:** Next.js 15 App Router, React 18 (useState, useRef), Tailwind CSS v3 arbitrary values for 3D transforms, existing `components/results/ResultsView.tsx` patterns.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `components/results/ResultsView.tsx` | Modify | All changes: state, layout, reduced marks card, potential card, highlights |

---

## Task 1: Add State and Compute Potential Score

**Files:**
- Modify: `components/results/ResultsView.tsx`

**Context:** Read lines 570–620 to locate where `analytics`, `score`, and `revisionSummary` are derived. All new state and computed values go in the same area, after `revisionSummary` is defined (~line 620).

- [ ] **Step 1: Add two state variables**

Find the line `const handleQuestionClick = (index: number) => {` (~line 622) and insert BEFORE it:

```typescript
  // ── Potential Score state ──────────────────────────────────
  const [potentialRevealed, setPotentialRevealed] = useState(false)
  const [lostMarksHighlighted, setLostMarksHighlighted] = useState(false)
  const sureCardRef    = useRef<HTMLDivElement>(null)
  const revisionCardRef = useRef<HTMLDivElement>(null)
```

`useRef` is already imported at the top of the file — confirm before adding to imports.

- [ ] **Step 2: Compute potential score**

Directly after the four new lines above, add:

```typescript
  // ── Potential score calculation ──────────────────────────────
  const bu = analytics.buttonUsageStats || {}
  const sureWrong        = (bu.totalAreYouSure ?? 0) - (bu.correctAreYouSure ?? 0)
  const revisionWrong    = revisionSummary?.correctToWrong?.length ?? 0
  const marksLostSure    = sureWrong * 2.667
  const marksLostRevision = revisionWrong * 2.667
  const rawPotential     = (score.marksScored ?? 0) + marksLostSure + marksLostRevision
  const potentialScore   = Math.min(rawPotential, 200)
  const hasRecoverableMarks = sureWrong > 0 || revisionWrong > 0
```

- [ ] **Step 3: Add scroll handler**

Directly after the potential score block, add:

```typescript
  const handleShowLostMarks = () => {
    setLostMarksHighlighted(true)
    // Scroll to sure card if off-screen
    setTimeout(() => {
      sureCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing && /opt/homebrew/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors (only new variables, no JSX changes yet).

- [ ] **Step 5: Commit**

```bash
git add components/results/ResultsView.tsx
git commit -m "feat(potential-score): add state, refs, and potential score calculation"
```

---

## Task 2: Restructure Layout — Marks + Potential Row Above Subject Chart

**Files:**
- Modify: `components/results/ResultsView.tsx`

**Context:** The current layout at ~line 722 is a single `grid grid-cols-1 md:grid-cols-2 gap-6` containing the score card (left) and subject chart (right). We need to:
1. Pull the score card OUT of that grid
2. Add a NEW 2-col grid row (marks + potential) before the subject chart
3. Make the subject chart sit in its own full-width section

- [ ] **Step 1: Locate the outer grid wrapper**

Find this exact line (~line 722):
```tsx
        {/* ── Score + Subject bar chart ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

Replace it and its closing `</div>` (which comes after the subject chart block, around line 874) so the structure becomes:

```tsx
        {/* ── Marks Scored + Potential Score ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* MARKS CARD — reduced (Task 2 Step 2 fills this) */}
          {/* POTENTIAL CARD — (Task 3 fills this) */}
        </div>

        {/* ── Subject bar chart ── */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 md:p-8 flex flex-col">
          {/* paste the subject chart JSX here — unchanged */}
        </div>
```

To do this safely: cut the score card JSX (lines 724–786) and the subject chart JSX (lines 788–873) out of the wrapping grid, then restructure as above.

- [ ] **Step 2: Build the reduced Marks Scored card**

The reduced card keeps: paper label, marks number + denominator, accuracy %, the time elapsed + Review Test button. It removes the progress bar and the correct/wrong/skipped footer.

Replace the old score card JSX (lines 724–786) with this inside the first column of the new 2-col grid:

```tsx
          {/* Reduced Marks Scored card */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 md:p-6 flex-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 leading-tight">
                {displayPaperLabel || 'Analysis'} · {displayQuestions.length} Qs
              </p>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Marks Scored</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gray-900">
                      {score.marksScored ?? score.correct}
                    </span>
                    <span className="text-base font-bold text-gray-400">
                      /{score.totalMarks ?? displayQuestions.length * 2}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">
                    +{score.correct * 2} − {(score.wrong * (2 / 3)).toFixed(2)} neg
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-3xl font-black text-[#4A90E2]">{score.percentage}%</span>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">accuracy</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {Math.floor(displayElapsed / 3600)}h {Math.floor((displayElapsed % 3600) / 60)}m
              </div>
              <button
                onClick={() => handleQuestionClick(0)}
                className="bg-[#4A90E2]/10 hover:bg-[#4A90E2]/20 text-[#4A90E2] px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                <Clock className="h-3 w-3" /> Review
              </button>
            </div>
          </div>
```

- [ ] **Step 3: TypeScript check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/results/ResultsView.tsx
git commit -m "feat(potential-score): restructure layout — marks + potential row above subject chart"
```

---

## Task 3: Build the Potential Score Flip Card

**Files:**
- Modify: `components/results/ResultsView.tsx`

**Context:** The second column of the new 2-col grid (added in Task 2) is currently empty. This task fills it with the 3-state flip card. The 3D CSS flip uses Tailwind arbitrary values: `[transform-style:preserve-3d]`, `[backface-visibility:hidden]`, `[transform:rotateY(180deg)]`.

- [ ] **Step 1: Add the potential score card JSX**

Inside the 2-col grid, after the reduced marks card, add:

```tsx
          {/* Potential Score card — 3-state flip */}
          <div
            className="relative cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={() => !potentialRevealed && setPotentialRevealed(true)}
          >
            {/* Flip container */}
            <div
              className="relative w-full h-full transition-transform duration-500 ease-in-out [transform-style:preserve-3d]"
              style={{ transform: potentialRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '180px' }}
            >

              {/* ── FRONT FACE — default (unrevealed) ── */}
              <div className="absolute inset-0 [backface-visibility:hidden] bg-white rounded-[2rem] border-2 border-[#4A90E2]/30 shadow-sm overflow-hidden flex flex-col items-center justify-center gap-3 p-5 animate-pulse-ring">
                {/* Pulsing border overlay */}
                <div className="absolute inset-0 rounded-[2rem] ring-2 ring-[#4A90E2]/20 animate-pulse pointer-events-none" />
                <div className="w-10 h-10 rounded-2xl bg-[#4A90E2]/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#4A90E2]" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-[#4A90E2] uppercase tracking-widest mb-1">Potential Score</p>
                  <p className="text-4xl font-black text-gray-200 blur-[6px] select-none">???</p>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Tap to reveal your potential
                </p>
              </div>

              {/* ── BACK FACE — revealed ── */}
              <div
                className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-[#4A90E2]/5 to-[#4A90E2]/10 rounded-[2rem] border-2 border-[#4A90E2]/40 shadow-sm overflow-hidden flex flex-col items-center justify-center gap-4 p-5"
                onClick={e => e.stopPropagation()}
              >
                <div>
                  <p className="text-[10px] font-black text-[#4A90E2] uppercase tracking-widest text-center mb-1">Potential Score</p>
                  <div className="flex items-baseline gap-1 justify-center">
                    <span className="text-5xl font-black text-gray-900">{potentialScore.toFixed(1)}</span>
                    <span className="text-xl font-bold text-gray-400">/200</span>
                  </div>
                </div>

                {hasRecoverableMarks ? (
                  <button
                    onClick={lostMarksHighlighted ? undefined : handleShowLostMarks}
                    disabled={lostMarksHighlighted}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                      lostMarksHighlighted
                        ? 'bg-[#4A90E2]/10 border-[#4A90E2]/30 text-[#4A90E2] cursor-default'
                        : 'bg-[#4A90E2] border-[#4A90E2] text-white hover:bg-[#3a7fd4] active:scale-95'
                    }`}
                  >
                    {lostMarksHighlighted ? 'Showing lost marks ✓' : 'See where you lost marks →'}
                  </button>
                ) : (
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                    No recoverable marks found
                  </p>
                )}
              </div>

            </div>
          </div>
```

`Zap` is already imported from `lucide-react` — verify before running.

- [ ] **Step 2: Verify Zap is in imports**

Check the import line at the top of `ResultsView.tsx`:
```typescript
import {
  CheckCircle, XCircle, ChevronDown, BookOpen, Clock, RefreshCw, Home,
  Lightbulb, Brain, Target, Zap, Loader2, ArrowLeft
} from 'lucide-react'
```

If `Zap` is missing, add it to the import.

- [ ] **Step 3: TypeScript check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/results/ResultsView.tsx
git commit -m "feat(potential-score): add 3-state flip card with reveal and lost marks CTA"
```

---

## Task 4: Highlight Sure Items Card and Answer Revision Card

**Files:**
- Modify: `components/results/ResultsView.tsx`

**Context:**
- Sure Items card is at ~line 948: `<div className="bg-emerald-50/60 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 ...`
- Answer Revision card is at ~line 881: `<div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">`
- Both need: `ref` attached + conditional highlight classes added + transition so the highlight appears smoothly

The highlight classes to apply when `lostMarksHighlighted = true`:
```
ring-2 ring-[#4A90E2] ring-offset-2 shadow-[0_0_0_6px_rgba(74,144,226,0.15)]
```

- [ ] **Step 1: Add ref + highlight to Answer Revision card**

Find the revision card outer div (~line 881):
```tsx
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
```

Replace with:
```tsx
            <div
              ref={revisionCardRef}
              className={`rounded-2xl bg-white border shadow-sm overflow-hidden transition-all duration-300 ${
                lostMarksHighlighted
                  ? 'border-[#4A90E2] ring-2 ring-[#4A90E2] ring-offset-2 shadow-[0_0_0_6px_rgba(74,144,226,0.15)]'
                  : 'border-gray-200'
              }`}
            >
```

- [ ] **Step 2: Add ref + highlight to Sure Items card**

Find the Sure Items card outer div (~line 948):
```tsx
              <div className="bg-emerald-50/60 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 shadow-sm p-5 md:p-6 flex flex-col gap-4">
```

Replace with:
```tsx
              <div
                ref={sureCardRef}
                className={`bg-emerald-50/60 rounded-[1.5rem] md:rounded-[2rem] border shadow-sm p-5 md:p-6 flex flex-col gap-4 transition-all duration-300 ${
                  lostMarksHighlighted
                    ? 'border-[#4A90E2] ring-2 ring-[#4A90E2] ring-offset-2 shadow-[0_0_0_6px_rgba(74,144,226,0.15)]'
                    : 'border-emerald-100'
                }`}
              >
```

- [ ] **Step 3: TypeScript check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit and push**

```bash
git add components/results/ResultsView.tsx
git commit -m "feat(potential-score): permanent highlight on Sure + Revision cards when lost marks revealed"
git push origin claude/pensive-turing:main
```

---

## Self-Review

**Spec coverage:**
- ✅ Marks card reduced (progress bar + footer removed) → Task 2
- ✅ Two side-by-side cards, equal width, grid-cols-2 → Task 2
- ✅ State 1: blurred ?, pulsing border, "Tap to reveal" → Task 3
- ✅ State 2: flip animation, potentialScore /200 → Task 3
- ✅ State 2: "See where you lost marks →" pill button → Task 3
- ✅ State 3: button becomes "Showing lost marks ✓" (disabled) → Task 3
- ✅ Permanent highlight on Sure card → Task 4
- ✅ Permanent highlight on Revision card → Task 4
- ✅ Scroll to Sure card when highlight triggered → Task 1 (handleShowLostMarks)
- ✅ No math shown in card → Task 3 (only number shown on back face)
- ✅ Always /200 → Task 3 (hardcoded `/200`)
- ✅ Formula: marksScored + sureWrong×2.667 + revisionWrong×2.667, capped at 200 → Task 1
- ✅ Edge case: no recoverable marks → "No recoverable marks found" text → Task 3

**Type consistency:**
- `potentialRevealed`, `lostMarksHighlighted` — used consistently across Tasks 1, 3, 4 ✅
- `sureCardRef`, `revisionCardRef` — defined Task 1, consumed Task 4 ✅
- `handleShowLostMarks` — defined Task 1, consumed Task 3 ✅
- `hasRecoverableMarks` — defined Task 1, consumed Task 3 ✅
- `potentialScore` — defined Task 1, consumed Task 3 ✅

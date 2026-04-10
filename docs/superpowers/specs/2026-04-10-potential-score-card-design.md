# Potential Score Card — Design Spec

**Date:** 2026-04-10
**Feature:** Potential Score card on the Results page with permanent highlight of contributing cards

---

## Overview

Replace the current verbose Marks Scored card with a compact version, and add a side-by-side Potential Score card that reveals what the user could have scored if they had trusted their "Sure" answers and not revised correct answers to wrong ones. The potential score is revealed via a 3-state interaction with no math shown in the card — the visual connection is made by permanently highlighting the Sure Items card and Answer Revision card.

---

## Calculation

```
sureWrong          = buttonUsageStats.totalAreYouSure - buttonUsageStats.correctAreYouSure
revisionLost       = revisionSummary.changedCorrectToWrong
marksLostSure      = sureWrong × 2.667
marksLostRevision  = revisionLost × 2.667

potentialScore     = score.marksScored + marksLostSure + marksLostRevision
                     capped at score.totalMarks (max 200 for full mock)
```

`2.667` = `2 + 2/3` — the net UPSC marks swing per wrong answer (missed +2 gain + -2/3 penalty).

---

## Reduced Marks Scored Card

**Remove:**
- Attempt progress bar
- Correct / Wrong / Skipped footer row

**Keep:**
- `marksScored` large number
- `/ totalMarks` denominator
- Accuracy % top-right

Result: compact card, roughly half the current height, equal width to the new Potential card.

---

## Potential Score Card — 3 States

### State 1 — Default (unrevealed)
- Label: `⚡ Potential Score`
- Large blurred / dimmed `?` in place of the number
- Subtitle: `"Tap to reveal your potential"`
- Subtle pulsing border (`ring-2 ring-[#4A90E2]/40 animate-pulse`) to invite interaction

### State 2 — Revealed (after card click, 3D flip)
- 3D CSS flip animation: `rotateY(180deg)`, `perspective: 1000px`, `duration: 0.55s ease`
- Shows:
  - Heading: `Potential Score`
  - Large bold number: `{potentialScore} / 200`
  - Pill button below: `"See where you lost marks →"` (blue, outlined)
- No formula, no breakdown numbers shown

### State 3 — Lost marks highlighted (after pill button click)
- Pill button changes to `"Showing lost marks ✓"` — disabled state, no further clicks
- **Sure Items card** receives permanent highlight:
  `ring-2 ring-[#4A90E2] ring-offset-2 shadow-[0_0_0_4px_rgba(74,144,226,0.25)]`
- **Answer Revision card** receives the same permanent highlight
- Page auto-scrolls to the Sure Items card if it is off-screen
- Highlight persists for the entire session — no fade, no timeout, removed only when user navigates away

---

## Layout

```
┌─────────────────────┬─────────────────────┐
│   Marks Scored      │   Potential Score   │
│   (compact)         │   (3-state card)    │
└─────────────────────┴─────────────────────┘
```

- Desktop: `grid grid-cols-2 gap-4`
- Mobile: `grid grid-cols-1 gap-4` (stacked)
- Both cards same height via `h-full` on inner containers

---

## State Management

All state lives in `ResultsView.tsx` (already a client component):

```typescript
const [potentialRevealed, setPotentialRevealed] = useState(false)
const [lostMarksHighlighted, setLostMarksHighlighted] = useState(false)
```

- `potentialRevealed`: controls the card flip
- `lostMarksHighlighted`: controls the permanent ring on Sure + Revision cards

A `sureCardRef` and `revisionCardRef` are used for `scrollIntoView` when `lostMarksHighlighted` becomes true.

---

## Files Modified

| File | Change |
|---|---|
| `components/results/ResultsView.tsx` | Add state, reduce marks card, add potential card, wire highlight refs to Sure + Revision cards |

No new files required — the Potential Score card is inlined as a local sub-component or JSX block within `ResultsView.tsx`.

---

## Edge Cases

- **No sure items tagged AND no revisions:** `potentialScore === score.marksScored`. Card still shows but pill button is replaced with `"No recoverable marks found"` (disabled, grey).
- **potentialScore > totalMarks:** Cap at `score.totalMarks`.
- **Practice mode (not full mock):** `totalMarks` may be less than 200 — show `/ {score.totalMarks}` instead of hardcoded `/ 200`.

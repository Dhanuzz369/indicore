# Indicore Blue Rebrand + Landing Page Mobile Optimisation — Design Spec

**Date:** 2026-03-28
**Scope:** Two parallel workstreams — (1) full-app rebrand from orange/saffron to blue `#4A90E2`, (2) mobile-responsive fixes across all landing page components.

---

## Goals

1. Unify the visual identity: the landing page is blue/white; the logged-in app must match.
2. The app shell (sidebar, main bg) is already light — only accent colors need swapping.
3. The landing page renders well on all screen sizes from 375px upward.

---

## Strategy: Option C — Hybrid

CSS variable value swap for the majority of references, then targeted file edits for hardcoded hex values. No structural changes to layouts. No rename of the `saffron` CSS variable name (user-invisible).

---

## Section 1 — Color Token Changes (`app/globals.css`)

Update `@theme inline` block:

```css
/* Before */
--color-saffron: #FF6B00;

/* After */
--color-saffron: #4A90E2;
```

Add two new companion tokens:

```css
--color-saffron-hover: #3a7fd4;   /* hover / pressed state */
--color-saffron-light: #EBF2FC;   /* tinted background (was #FFF3EC) */
```

### Global hex find-replace across all 36 files

| Find | Replace | Semantic meaning |
|---|---|---|
| `#FF6B00` | `#4A90E2` | Primary accent |
| `#FF8C00` | `#3a7fd4` | Hover state |
| `#FFF3EC` | `#EBF2FC` | Light tinted bg |
| `bg-orange-50` | `bg-blue-50` | Tailwind light bg |
| `text-orange-600` | `text-blue-600` | Tailwind text accent |
| `from-orange-50` | `from-blue-50` | Gradient start |
| `hover:border-orange-100` | `hover:border-blue-100` | Hover border |
| `text-saffron` | `text-[#4A90E2]` | Where CSS var not picked up |

---

## Section 2 — Dashboard Shell & Navigation (`app/(dashboard)/layout.tsx`)

The shell is already light (`bg-white` sidebar, `bg-gray-50` main). Only accent swaps needed:

| Element | Before | After |
|---|---|---|
| Active nav item background | `bg-[#FF6B00]` | `bg-[#4A90E2]` |
| Active nav item text | `text-white` | `text-white` (no change) |
| Logo / brand text | orange | `text-[#4A90E2]` |
| Bottom profile card accent | orange border/badge | blue border/badge |
| Mobile bottom nav active icon | orange | `text-[#4A90E2]` |

No structural changes. No dark→light conversion needed (already light).

---

## Section 3 — App-wide Component Recoloring

All changes are pure color swaps. Zero layout or structural changes.

### Auth pages (`app/(auth)/`)
- signup, login, forgot-password, reset-password, onboarding
- Hero gradient: `from-orange-50 to-white` → `from-[#EBF2FC] to-white`
- Primary buttons: `bg-[#FF6B00]` → `bg-[#4A90E2]`, hover `#3a7fd4`
- Input focus rings: `ring-[#FF6B00]` → `ring-[#4A90E2]`
- Brand text: orange → `text-[#4A90E2]`

### Quiz & Practice
- `app/(dashboard)/quiz/page.tsx`, `quiz/session/page.tsx`
- `components/quiz/OptionButton.tsx`, `ExplanationBox.tsx`
- Selected option: bg `#FFF3EC` → `#EBF2FC`, border `#FF6B00` → `#4A90E2`
- Submit/Next/Start buttons: orange → blue
- Timer, progress bar accents: orange → blue
- Question palette status colors (green/red/purple/white) — **unchanged** (semantic, not brand)

### Results & Analytics
- `components/results/ResultsView.tsx`, `app/(dashboard)/results/review/page.tsx`
- Remaining `#FF6B00` references → `#4A90E2`
- Bar chart already blue from prior work — confirm no orange stragglers

### Notes & Flashcards
- `components/notes/NoteEditor.tsx`, `NoteCard.tsx`, `FlipCard.tsx`, `RatingButtons.tsx`
- `app/(dashboard)/notes/page.tsx`, `notes/[cardId]/page.tsx`, `notes/review/page.tsx`
- Save/add buttons: orange → blue
- Rating button active state: orange → blue
- Card highlight borders: orange → blue

### Tests
- `components/tests/TestSessionCard.tsx`, `QuestionReviewCard.tsx`, `TestFilters.tsx`
- `components/tests/tabs/SubtopicDrillTab.tsx`, `ReviewAllTab.tsx`
- `app/(dashboard)/tests/[sessionId]/page.tsx`, `tests/[sessionId]/review/page.tsx`, `tests/mistakes/page.tsx`
- Filter active pill: orange → blue
- Score badges: orange → blue

### Dashboard Components
- `components/dashboard/SubjectGrid.tsx`, `WelcomeBanner.tsx`
- WelcomeBanner gradient: `from-[#FF6B00] to-[#FF8C00]` → `from-[#4A90E2] to-[#3a7fd4]`
- Subject progress bars: orange → blue

### Profile
- `app/(dashboard)/profile/page.tsx`
- Avatar border accent, achievement badges: orange → blue

### Intelligence
- `app/(dashboard)/intelligence/page.tsx`
- Any orange accent: → blue

---

## Section 4 — Landing Page Mobile Optimisation

### `HeroSection.tsx`
- Headline: `text-6xl md:text-8xl lg:text-9xl` → `text-4xl sm:text-6xl md:text-8xl lg:text-9xl`
- Subtext: `text-lg md:text-xl` → `text-base sm:text-lg md:text-xl`

### All sections with `py-32`
- `py-32` → `py-16 sm:py-20 md:py-32`
- Applies to: ProcessSection, FeaturesSection, StatsSection, BentoSection, TestimonialsSection, CtaBanner (mt/mb)

### Section headings (`text-4xl`)
- `text-4xl` → `text-2xl sm:text-3xl md:text-4xl`
- Applies to: FeaturesSection, ProcessSection, TestimonialsSection, BentoSection, CtaBanner

### Grid gaps
- `gap-8` → `gap-5 sm:gap-6 md:gap-8` where relevant
- `gap-16 lg:gap-24` → `gap-8 sm:gap-12 lg:gap-24` in FeaturesSection

### `BentoSection.tsx`
- `gridAutoRows: '240px'` → removed on mobile; replaced with `minmax(180px, auto)` or inline style conditional
- Large bar chart card: already full-width on mobile via `grid-cols-1`

### `CtaBanner.tsx`
- Padding: `p-14 md:p-24` → `p-8 sm:p-12 md:p-24`
- Heading: `text-4xl md:text-6xl` → `text-2xl sm:text-3xl md:text-6xl`
- CTA button: `px-12 py-5` → `px-8 py-4 sm:px-12 sm:py-5`

### `FeaturesSection.tsx`
- Accordion tap targets: `p-7` → `p-5 sm:p-7`
- Dashboard tilt card: already disabled via `useReducedMotion`; on touch screens the `onMouseLeave` reset works correctly (no pointer events = no tilt drift)

### `Footer.tsx`
- Grid: `grid-cols-1 md:grid-cols-4` → `grid-cols-2 md:grid-cols-4` (2×2 on tablets)

### `StatsSection.tsx`
- Grid: `grid-cols-2 md:grid-cols-4` — already correct, no change needed
- Padding: `py-24` → `py-12 sm:py-16 md:py-24`

---

## File Count Summary

| Workstream | Files touched |
|---|---|
| globals.css token update | 1 |
| Global hex find-replace | ~36 |
| Landing page mobile fixes | 8 |
| **Total** | **~45** |

---

## Out of Scope

- Renaming the `--color-saffron` CSS variable (user-invisible, deferred)
- Dark mode support
- Question palette status colors (green/red/purple — semantic, not brand)
- Any layout or structural changes to app pages

---

## Success Criteria

1. Zero `#FF6B00` or `#FF8C00` remaining anywhere in the codebase after the rebrand
2. Landing page renders cleanly at 375px, 414px, 768px, 1280px viewport widths
3. `npx tsc --noEmit` exits with zero errors
4. Visual consistency: blue `#4A90E2` is the single accent color from landing → auth → dashboard → quiz → results

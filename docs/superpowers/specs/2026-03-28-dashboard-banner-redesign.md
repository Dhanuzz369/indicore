# Dashboard Banner Redesign Spec
Date: 2026-03-28

## Overview

Redesign the top of the dashboard page to:
1. Move streak inline with the greeting header
2. Remove the 5 stat cards (streak, accuracy, attempted, correct, incorrect)
3. Replace that space with a 3-slide auto-advancing product offerings carousel

---

## Section 1 — Layout Changes

### Greeting Header
**Current:** Two-line heading — "Good evening," on line 1, "Dhanush!" on line 2.

**New:** Same two-line heading, but add a streak pill on the same line as the name:
- Pill: `🔥 {streak_days} day streak`
- Style: small rounded-full pill, blue-50 background, blue-600 text, `text-xs font-black`
- Positioned: `flex items-end gap-3` wrapping the name + pill so they sit on the same baseline
- If `streak_days === 0` show "Start your streak" instead

### Stat Cards Removed
The following are completely removed from the JSX:
- Streak card (`Flame` icon, streak_days)
- Accuracy card (`Target` icon, accuracy%)
- Attempted card (`BookCheck` icon, total_attempted)
- Correct card (`CheckCircle` icon, total_correct)
- Incorrect full-width row (`XCircle` icon, total_wrong)

The `getUserStats` fetch call stays (stats still used by nothing else on page — remove it too to avoid dead fetches). Remove `stats` state, `getUserStats` import, `accuracy` derived value, `formatNumber` helper if unused elsewhere.

---

## Section 2 — Product Offerings Carousel

### Position
Replaces the removed stats grid. First section inside `<main>` / the content area, above "Core Practice".

### Dimensions
- Height: `h-52` (208px) on all screen sizes
- Full width within the content max-width
- `rounded-[2rem]` corners, `overflow-hidden`

### Component
Inline component `OfferingsCarousel` defined inside `dashboard/page.tsx` (no new file needed).

```
State:
  current: number (0–2), starts at 0
  paused: boolean, starts false

Effect:
  setInterval 4000ms → setIndex((i+1) % 3) when !paused
  clear on unmount

JSX:
  outer div: relative, overflow-hidden, rounded-[2rem], h-52
    - onMouseEnter → paused=true, onMouseLeave → paused=false
  inner track: flex, width 300%, translateX(-current*33.333%)
    transition: transform 500ms ease-in-out
  3 slide divs, each w-1/3 (33.333%), h-full
  dot indicators: absolute bottom-4, centered
```

### Slides

**Slide 1 — Mock Tests**
- Background: `#4A90E2` (brand blue)
- Badge (top-left pill): `MOCK TESTS` — white/20 bg, white text
- Headline: `Full-Length Mocks` — `text-3xl font-black text-white`
- Tagline: `Test yourself against real exam patterns` — `text-sm text-white/70 font-semibold`
- CTA button: white bg, `#4A90E2` text, `Start Mock →`, navigates to `/quiz`
- Decorative: large circle `w-48 h-48 bg-white/10 rounded-full absolute -right-8 -top-8`
- Second circle: `w-32 h-32 bg-white/10 rounded-full absolute -right-2 top-10`

**Slide 2 — Analytics**
- Background: `#6366f1` (indigo)
- Badge: `ANALYTICS`
- Headline: `Deep Analytics`
- Tagline: `See where you stand, know what to fix`
- CTA: `View Analytics →`, navigates to `/intelligence`
- Same decorative circles pattern, white/10

**Slide 3 — Notes**
- Background: `#10b981` (emerald)
- Badge: `SMART NOTES`
- Headline: `Smart Notes`
- Tagline: `Structured revision at your fingertips`
- CTA: `Open Notes →`, navigates to `/notes`
- Same decorative circles pattern, white/10

### Dot Indicators
- 3 dots, `absolute bottom-4`, centered horizontally
- Active dot: `w-5 h-2 bg-white rounded-full`
- Inactive dot: `w-2 h-2 bg-white/40 rounded-full`
- Transition on width: `transition-all duration-300`
- Clicking a dot jumps to that slide

### CTA Button Style
```
bg-white text-[slideColor] font-black text-sm px-6 py-2.5 rounded-2xl
hover:opacity-90 transition-opacity flex items-center gap-2
```

---

## Section 3 — Unchanged

Everything below the carousel stays exactly as-is:
- Core Practice (Full Length Mock Test + Subject-Wise Deep Dive cards)
- Focus on Weak Areas
- My Test History quick link

The `subjects` state and `getSubjectsWithCounts` fetch remain.
The `getProfile` fetch remains (name in greeting).

---

## Files Changed

- `app/(dashboard)/dashboard/page.tsx` — single file, inline changes only

## No New Files
No new component files. `OfferingsCarousel` is a function defined at the top of `page.tsx`.

---

## Stat Cleanup

Remove from `page.tsx`:
- `import { getUserStats } from '@/lib/supabase/queries'` (if stats no longer used)
- `const [stats, setStats] = useState<UserStats | null>(null)`
- `getUserStats(user.$id)` call in `fetchData`
- `const accuracy = ...` derived value
- `formatNumber` helper (if only used for stats)
- `import type { UserStats } from '@/types'`
- `Flame, Target, BookCheck, CheckCircle, XCircle` from lucide imports (if unused after removal)
- `TrendingUp, TrendingDown, Minus` from lucide imports (already unused)

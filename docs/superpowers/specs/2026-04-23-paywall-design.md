# Paywall Feature — Design Spec
**Date:** 2026-04-23  
**Status:** Approved, ready for implementation

---

## Overview

Introduce a Free vs Pro tier enforcement layer across three areas of the Indicore platform:
1. Subject Practice (question count + difficulty gating)
2. PYQ Results page (blur lock overlay)
3. Mock Tests (Mock 2 & 3 card lock)

The subscription infrastructure already exists (`subscriptions` table with `user_id`, `status`, `plan`, `expires_at`, Razorpay payment flow). This feature adds the enforcement layer on top.

---

## Architecture: Subscription Context (Option B)

### Why context over per-component hooks
`layout.tsx` already fetches the user profile on every dashboard load. We extend that single effect to also fetch subscription status — zero extra round trips. All child components consume a React context instead of making independent DB calls.

### New files

**`context/subscription-context.tsx`**
```tsx
interface SubscriptionContextValue {
  isPro: boolean
  loading: boolean
}
export const SubscriptionContext = createContext<SubscriptionContextValue>(...)
export function useSubscription() { return useContext(SubscriptionContext) }
```

**`lib/supabase/queries.ts`** — add:
```ts
export async function getSubscription(userId: string): Promise<boolean>
```
Queries `subscriptions` table for a row where `user_id = userId`, `status = 'active'`, and `expires_at > now()`. Returns `true` if found, `false` otherwise. On error, returns `false` (fail-safe — never accidentally unlock).

### Layout changes (`app/(dashboard)/layout.tsx`)
- Import `SubscriptionProvider`
- In `fetchUserData`, after `getProfile`, call `getSubscription(user.$id)` and pass result into the provider
- Wrap `{children}` with `<SubscriptionProvider isPro={isPro}>`
- No additional loading state — subscription fetch is concurrent with profile fetch

---

## Feature 1: Subject Practice Paywall

**File:** `app/(dashboard)/quiz/page.tsx`

### Question count selector
The 5 buttons (10 / 20 / 30 / 40 / 50) are always rendered. For free users:
- Only `10` is active/clickable
- `20`, `30`, `40`, `50` are rendered with `opacity-50 cursor-not-allowed pointer-events-none` + a `Lock` icon (Lucide, 12px) beside the number
- `questionCount` state is force-clamped to `10` when `!isPro` (guards against any state drift before the API call)

### Difficulty selector
The 4 buttons (All / Basic / Intermediate / Advanced) are always rendered. For free users:
- Only `All` is active/clickable
- `Basic`, `Intermediate`, `Advanced` are rendered with `opacity-50 cursor-not-allowed pointer-events-none` + a `Lock` icon
- `selectedDifficulty` state is force-set to `'All'` when `!isPro`

### Upgrade nudge
A single line of helper text rendered beneath the locked selectors (only shown when `!isPro`):
```
🔒 Unlock all difficulties and question counts with Pro → [Upgrade] (links /pricing)
```
No modal, no redirect on click of locked buttons — just this inline nudge.

### Free user session cap
No server-side daily tracking required. The cap is purely a UI gate — free users can run unlimited 10-question "All difficulty" sessions. This is intentional: generous enough to provide value, limited enough to incentivise upgrade.

---

## Feature 2: PYQ Results Paywall

**Files:** `components/results/ResultsView.tsx`

### Detecting PYQ sessions
`session?.exam_type === 'UPSC_PRE'` → `isPyq = true`. Mock sessions have `exam_type = 'INDICORE_MOCK'`. This flag is derived inside `ResultsView`.

### Paywall condition
Applied when `isPyq && !isPro`.

### Visible section (free users)
- ✅ Score card — fully visible, no change

### Locked section (free users)
Everything below the score card is wrapped in a single relative container:

```tsx
{isPyq && !isPro ? (
  <div className="relative mt-6">
    {/* Blurred content — renders as shapes, unreadable */}
    <div className="blur-sm pointer-events-none select-none opacity-80">
      <AnalyticalTrajectory />
      <StrategyProtocols />
      <AnswerRevision />
      <SubjectPerformance />
    </div>

    {/* Single centred lock overlay */}
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
      <Lock className="h-20 w-20 text-amber-400 drop-shadow-lg" />
      <Link href="/pricing"
        className="bg-[#4A90E2] text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl">
        Unlock complete analysis just ₹5/day
      </Link>
    </div>
  </div>
) : (
  // Normal full results for Pro users or non-PYQ sessions
  <>
    <AnalyticalTrajectory />
    <StrategyProtocols />
    <AnswerRevision />
    <SubjectPerformance />
  </>
)}
```

The blurred content gives visible shape/colour hints (Strategy Protocols dark card, subject rows, chart bars) without being readable — exactly matching the reference image.

---

## Feature 3: Mock Tests Paywall

**File:** `app/(dashboard)/quiz/page.tsx`

### Mock 1 (index 0) — free, full teaser
No changes. Free users can attempt Mock 1 and see the **complete results page** with all analytics unlocked. This is the primary conversion hook — users experience the full product before hitting the paywall.

### Mock 2 & 3 (index ≥ 1) — locked for free users
Card renders with these changes:
- `opacity-60 cursor-not-allowed` on the outer card div
- Gradient header gains a `🔒 Pro Only` amber pill badge (top-right, absolute positioned)
- "Attempt Test" button replaced with a non-functional "🔒 Unlock with Pro" button (`disabled`, grey style)
- `onClick` on the card fires an upgrade modal (see below)

### Upgrade modal (for locked mock cards)
A lightweight modal (reuses existing `WeakSubjectModal` pattern):
```
Title:   "Pro Feature"
Body:    "Mock 2 & 3 are available exclusively for Pro subscribers.
          Upgrade to attempt all full-length mocks and unlock complete analytics."
CTA:     [Upgrade to Pro →]  → router.push('/pricing')
Dismiss: "Maybe later"
```

### Determining which mocks are locked
`mocks.filter(m => m.subject_weights.length > 1)` is already sorted by creation order from the DB. `idx === 0` = Mock 1 (free). `idx >= 1` = locked for free users. No DB changes needed.

### Edge case — direct URL access to Mock 2/3 results
If a free user navigates directly to `/results?session=<id>` for a Mock 2/3 session they somehow completed (e.g., before the paywall was added), the results page will show full results. This is acceptable for the initial rollout — retroactive gating of historical sessions is out of scope.

---

## Pricing page
No changes needed. `/pricing` already exists with the Razorpay flow.

---

## What is NOT changing
- Mock 1 results page — fully unlocked for everyone
- Subject Practice session logic, API calls, timer — unchanged
- PYQ test attempt flow — unchanged (only results page is gated)
- `TestSession` type, Supabase schema — no changes
- Daily usage tracking — not implemented (UI gate only)

---

## File change summary

| File | Change |
|---|---|
| `context/subscription-context.tsx` | **New** — context + provider + hook |
| `lib/supabase/queries.ts` | Add `getSubscription(userId)` |
| `app/(dashboard)/layout.tsx` | Fetch subscription, wrap children in provider |
| `app/(dashboard)/quiz/page.tsx` | Subject practice locks + mock card locks + upgrade modal |
| `components/results/ResultsView.tsx` | PYQ blur overlay |

---

## Open questions (resolved)
- ✅ Subject Practice cap: UI-only session gate (10Q max), no daily DB tracking
- ✅ PYQ lock: single blur zone + centred padlock + ₹5/day CTA (matches reference image)
- ✅ Mock 1: fully open including full results — serves as conversion teaser
- ✅ Mock 2/3: visible but locked cards, upgrade modal on click
- ✅ Subscription check: context from layout, fail-safe defaults to free

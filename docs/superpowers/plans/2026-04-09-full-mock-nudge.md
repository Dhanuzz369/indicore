# Full-Length Mock Nudge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a subject practice session, show a data-driven modal nudging first-time mock users to attempt Mock 1, with a highlighted Mock 1 card on the quiz page.

**Architecture:** `FullMockNudgeModal` is a self-contained client component that fetches the user's mock count from Supabase on mount and triggers after 1.5s if count is 0. It is rendered inside the results page only when `session.mode === 'practice'`. The quiz page reads a `highlight` URL param to apply a 5s pulsing ring on Mock 1.

**Tech Stack:** Next.js 15 App Router, Supabase JS v2 (anon key, RLS), TypeScript, Tailwind CSS, existing AlertDialog component pattern

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `components/modals/FullMockNudgeModal.tsx` | Create | Fetches mock count, owns 1.5s delay + 24h cooldown logic, renders modal UI |
| `app/(dashboard)/results/page.tsx` | Modify | Conditionally render `FullMockNudgeModal` when session mode is practice |
| `app/(dashboard)/quiz/page.tsx` | Modify | Read `highlight` search param, apply ring + badge to Mock 1 card for 5s |

---

## Task 1: Create FullMockNudgeModal

**Files:**
- Create: `components/modals/FullMockNudgeModal.tsx`

**Context to read first:** Check `app/(dashboard)/results/page.tsx` to understand what session data is passed to results components — specifically the `mode`, `score`, `paper_label`, and `analytics` fields. Check `lib/supabase/client.ts` for the browser client import pattern.

- [ ] **Step 1: Create `components/modals/FullMockNudgeModal.tsx`**

```tsx
// components/modals/FullMockNudgeModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COOLDOWN_KEY = 'mock_nudge_dismissed_at'
const COOLDOWN_MS  = 24 * 60 * 60 * 1000  // 24 hours

function isCoolingDown(): boolean {
  try {
    const ts = localStorage.getItem(COOLDOWN_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < COOLDOWN_MS
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

interface Props {
  sessionScore: number          // 0–100 accuracy %
  sessionSubject: string        // e.g. "Polity"
}

export default function FullMockNudgeModal({ sessionScore, sessionSubject }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Skip if cooldown active
    if (isCoolingDown()) return

    // Check if user has ever completed a full-length mock
    const sb = createClient()
    let cancelled = false

    sb.from('test_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_type', 'INDICORE_MOCK')
      .then(({ count }) => {
        if (cancelled) return
        if ((count ?? 0) === 0) {
          // Fire after 1.5s delay so user can absorb their score first
          const timer = setTimeout(() => setOpen(true), 1500)
          return () => clearTimeout(timer)
        }
      })

    return () => { cancelled = true }
  }, [])

  function handleTryNow() {
    setOpen(false)
    router.push('/quiz?tab=mock&highlight=mock1')
  }

  function handleDismiss() {
    markDismissed()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header pill */}
        <div className="inline-flex items-center gap-1.5 bg-[#4A90E2]/10 text-[#4A90E2] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
          📊 Your Practice Insight
        </div>

        {/* Score line */}
        <p className="text-[#1A1C1C] font-black text-lg leading-snug">
          You scored <span className="text-[#4A90E2]">{sessionScore}%</span> in {sessionSubject}
        </p>

        {/* Message */}
        <p className="text-gray-500 text-sm leading-relaxed">
          Subject practice gives you limited insights. Simulate a real Prelims experience with our full-length mock test.
        </p>

        {/* Stat chips */}
        <div className="flex gap-2 flex-wrap">
          {['100 Questions', '2 Hours', '200 Marks'].map(chip => (
            <span key={chip} className="text-[11px] font-black bg-gray-100 text-gray-600 rounded-xl px-3 py-1.5">
              {chip}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleTryNow}
            className="w-full bg-[#4A90E2] hover:bg-[#3a7fd4] text-white font-black text-sm rounded-2xl py-3 transition-colors"
          >
            Try Mock 1 →
          </button>
          <button
            onClick={handleDismiss}
            className="w-full text-gray-400 hover:text-gray-600 text-sm font-medium py-2 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/modals/FullMockNudgeModal.tsx
git commit -m "feat(nudge): FullMockNudgeModal with 1.5s delay, 24h cooldown, mock count check"
```

---

## Task 2: Render Modal in Results Page

**Files:**
- Modify: `app/(dashboard)/results/page.tsx`

**Context:** Read the full results page to understand:
1. How the session is fetched (by `?session=` URL param)
2. What fields are available on the session object — specifically `mode`, `score`, `paper_label`, `analytics`
3. Where in the JSX to add the modal (it should be outside the main content flow, rendered at root level of the page component)

- [ ] **Step 1: Read `app/(dashboard)/results/page.tsx`** to understand current structure before editing.

- [ ] **Step 2: Derive the subject name**

In the results page component (or wherever the session data is available), add this helper to resolve the subject name for the modal:

```typescript
function resolveSubjectName(session: {
  paper_label?: string | null
  analytics?: string | Record<string, unknown> | null
}): string {
  // Priority 1: paper_label (e.g. "Polity Practice")
  if (session.paper_label) return session.paper_label

  // Priority 2: first subject from analytics.subjectStats
  try {
    const analytics = typeof session.analytics === 'string'
      ? JSON.parse(session.analytics)
      : session.analytics
    const firstSubject = analytics?.subjectStats?.[0]?.subject
    if (firstSubject) return firstSubject
  } catch { /* ignore */ }

  // Priority 3: fallback
  return 'this subject'
}
```

- [ ] **Step 3: Add import and conditional modal render**

Add the import at the top of the file:
```typescript
import FullMockNudgeModal from '@/components/modals/FullMockNudgeModal'
```

In the JSX return, add the modal **after** the main content div, conditionally rendered when `session.mode === 'practice'`:

```tsx
{session.mode === 'practice' && (
  <FullMockNudgeModal
    sessionScore={session.score ?? 0}
    sessionSubject={resolveSubjectName(session)}
  />
)}
```

The `session.score` field stores 0–100 accuracy percentage (same column fixed in admin panel v2).

- [ ] **Step 4: Run TypeScript check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no output. Fix any type errors before committing.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/results/page.tsx"
git commit -m "feat(nudge): trigger FullMockNudgeModal on subject practice results"
```

---

## Task 3: Highlight Mock 1 on Quiz Page

**Files:**
- Modify: `app/(dashboard)/quiz/page.tsx`

**Context:** Read the quiz page to find:
1. Where `useSearchParams()` is used (already imported)
2. Where mock cards are rendered — the grid/list of Mock 1, Mock 2, Mock 3 cards in the `activeTab === 'mock'` section
3. How each mock card is identified (likely by `mock.name` or index)

- [ ] **Step 1: Read `app/(dashboard)/quiz/page.tsx`** focusing on the mock tab section and how mock cards are rendered.

- [ ] **Step 2: Add `highlighted` state and auto-clear effect**

Inside the component (near other `useState` declarations), add:

```typescript
const searchParams = useSearchParams() // already exists — just read the value
const highlightParam = searchParams.get('highlight')
const [highlighted, setHighlighted] = useState(highlightParam === 'mock1')

useEffect(() => {
  if (!highlighted) return
  const timer = setTimeout(() => setHighlighted(false), 5000)
  return () => clearTimeout(timer)
}, [highlighted])
```

- [ ] **Step 3: Apply highlight to Mock 1 card**

Find the mock card render (the clickable div/button for each mock in the grid). Apply the highlight conditionally to the first mock (Mock 1) — check by index `i === 0` or by `mock.name.toLowerCase().includes('mock 1')` or `mock.id` — use whichever identifier is in the actual code:

```tsx
// On the Mock 1 card's outer div, add conditional ring classes:
className={`... existing classes ... ${highlighted && /* is mock 1 */ ? 'ring-2 ring-[#4A90E2] ring-offset-2 ring-offset-white' : ''}`}
```

Add the "Recommended for you" badge inside the Mock 1 card, conditionally shown:

```tsx
{highlighted && /* is mock 1 */ && (
  <p className="text-[10px] font-black uppercase tracking-wider text-[#4A90E2] mb-1">
    ✨ Recommended for you
  </p>
)}
```

Add `animate-pulse` to the ring — use Tailwind's `animate-pulse` on a wrapper or add it to the ring class:

```tsx
className={`... ${highlighted && isMock1 ? 'ring-2 ring-[#4A90E2] ring-offset-2 animate-pulse' : ''}`}
```

**Important:** `animate-pulse` pulses the entire element's opacity — if this looks wrong (pulses the whole card), apply it only to an absolutely-positioned ring overlay instead:

```tsx
{highlighted && isMock1 && (
  <span className="absolute inset-0 rounded-[inherit] ring-2 ring-[#4A90E2] ring-offset-2 animate-pulse pointer-events-none" />
)}
```

Use whichever approach looks right based on the card's existing structure.

- [ ] **Step 4: Run TypeScript check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 5: Commit and push**

```bash
git add "app/(dashboard)/quiz/page.tsx"
git commit -m "feat(nudge): highlight Mock 1 card for 5s when navigated from nudge modal"
git push origin HEAD:main
```

# Weak Area Practice Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a weak subject card on the Dashboard opens a modal that lets the user instantly launch a 10-question practice session for that subject.

**Architecture:** A new `WeakSubjectModal` component (`components/dashboard/WeakSubjectModal.tsx`) owns all modal logic — fetching questions, populating the Zustand store, and navigating to the quiz session. The dashboard page adds one state variable, updates the card click handler, and mounts the modal. No new routes are needed.

**Tech Stack:** Next.js 15 App Router, Zustand, TypeScript, Tailwind CSS, lucide-react, Supabase (`getQuestions`)

---

## File Map

| File | Change |
|---|---|
| `components/dashboard/WeakSubjectModal.tsx` | **Create** — self-contained modal component |
| `app/(dashboard)/dashboard/page.tsx` | **Modify** — add state, update click handler, mount modal |

---

## Task 1: Create `WeakSubjectModal` Component

**Files:**
- Create: `components/dashboard/WeakSubjectModal.tsx`

### Context

**Imports needed:**
- `useRouter` from `next/navigation`
- `useState`, `useEffect` from `react`
- `getQuestions` from `@/lib/supabase/queries`
- `useQuizStore` from `@/store/quiz-store`
- `Loader2` from `lucide-react`
- `Subject`, `Question` from `@/types`

**Store actions to call** (accessed via `useQuizStore.getState()` so no hook subscription needed):
- `resetQuiz()` — clears all previous state
- `setQuestions(qs)` — loads questions
- `setTestMode(true)` — enables test mode
- `setPracticeTimerTotal(qs.length * 72)` — 72 seconds per question
- `setPaperLabel(\`${subject.Name} · Weak Area Focus · 10Q\`)` — shown in session header

**Performance label helper** (mirrors `getPerformanceLabel` in dashboard page — duplicate it here so this component is self-contained):
- ≥ 75%: `{ label: 'Strong', color: 'text-emerald-600' }`
- ≥ 55%: `{ label: 'Moderate', color: 'text-amber-600' }`
- ≥ 35%: `{ label: 'Needs Work', color: 'text-orange-500' }`
- < 35%: `{ label: 'Critical', color: 'text-red-600' }`

- [ ] **Step 1: Create the file with the full component**

Create `/Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing/components/dashboard/WeakSubjectModal.tsx` with this exact content:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getQuestions } from '@/lib/supabase/queries'
import { useQuizStore } from '@/store/quiz-store'
import type { Subject, Question } from '@/types'

interface WeakSubjectModalProps {
  subject: Subject | null
  accuracy: number
  onClose: () => void
}

function getPerfLabel(accuracy: number): { label: string; color: string } {
  if (accuracy >= 75) return { label: 'Strong',     color: 'text-emerald-600' }
  if (accuracy >= 55) return { label: 'Moderate',   color: 'text-amber-600' }
  if (accuracy >= 35) return { label: 'Needs Work', color: 'text-orange-500' }
  return                     { label: 'Critical',   color: 'text-red-600' }
}

export function WeakSubjectModal({ subject, accuracy, onClose }: WeakSubjectModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset error/loading state whenever the modal opens for a new subject
  useEffect(() => {
    if (subject) {
      setLoading(false)
      setError(null)
    }
  }, [subject])

  // Close on Escape key
  useEffect(() => {
    if (!subject) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [subject, onClose])

  if (!subject) return null

  const perf = getPerfLabel(accuracy)

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getQuestions({
        subjectId: subject.$id,
        examType: 'INDICORE_MOCK',
        limit: 10,
      })
      if (!result.documents?.length) {
        setError('No questions available for this subject yet')
        setLoading(false)
        return
      }
      const qs = result.documents as unknown as Question[]
      useQuizStore.getState().resetQuiz()
      useQuizStore.getState().setQuestions(qs)
      useQuizStore.getState().setTestMode(true)
      useQuizStore.getState().setPracticeTimerTotal(qs.length * 72)
      useQuizStore.getState().setPaperLabel(`${subject.Name} · Weak Area Focus · ${qs.length}Q`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      setError('Failed to load questions. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <h2 className="text-xl font-black text-gray-900">{subject.Name}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-sm font-bold ${perf.color}`}>{accuracy}%</span>
            <span className={`text-xs font-semibold ${perf.color}`}>— {perf.label}</span>
          </div>
        </div>

        {/* Motivational line */}
        <p className="text-sm text-gray-500 font-medium">
          10 focused questions to push your score up
        </p>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3 bg-[#4A90E2] text-white rounded-full font-black text-sm uppercase tracking-wider hover:bg-[#3a7fd4] hover:shadow-lg hover:shadow-[#4A90E2]/30 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Start Practising Now'
          )}
        </button>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors text-center"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/WeakSubjectModal.tsx
git commit -m "feat(dashboard): add WeakSubjectModal component"
```

---

## Task 2: Wire Modal into Dashboard Page

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

### Context

The dashboard page is at `app/(dashboard)/dashboard/page.tsx`. Key locations:

**Existing state block** (around line 388–393):
```typescript
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [profile, setProfile] = useState<Profile | null>(null)
const [stats, setStats] = useState<UserStats | null>(null)
const [subjects, setSubjects] = useState<Subject[]>([])
const [subjectAccuracy, setSubjectAccuracy] = useState<Map<string, number>>(new Map())
```

**Existing weak subject card click handler** (around line 578):
```tsx
onClick={() => { track('weak_area_clicked', { subject_name: subject.Name, accuracy: acc }); router.push('/quiz') }}
```

**Bottom of the return JSX** (around line 595):
```tsx
        </div>  {/* end space-y-8 */}
      </div>    {/* end min-h-screen */}
    )
```

- [ ] **Step 1: Import `WeakSubjectModal` at the top of the file**

The existing imports end around line 15. Add after the last import line:

```typescript
import { WeakSubjectModal } from '@/components/dashboard/WeakSubjectModal'
```

- [ ] **Step 2: Add `weakPracticeSubject` state**

In the `DashboardPage` function, after the existing state declarations (after line 393), add:

```typescript
const [weakPracticeSubject, setWeakPracticeSubject] = useState<{ subject: Subject; accuracy: number } | null>(null)
```

- [ ] **Step 3: Update the weak subject card click handler**

Find the existing click handler on the weak subject cards:

```tsx
onClick={() => { track('weak_area_clicked', { subject_name: subject.Name, accuracy: acc }); router.push('/quiz') }}
```

Replace with:

```tsx
onClick={() => {
  track('weak_area_clicked', { subject_name: subject.Name, accuracy: acc })
  setWeakPracticeSubject({ subject, accuracy: acc })
}}
```

- [ ] **Step 4: Mount the modal in the JSX**

Find the closing tags at the very end of the return statement:

```tsx
        </div>
      </div>
    )
```

Replace with:

```tsx
        </div>
      </div>

      <WeakSubjectModal
        subject={weakPracticeSubject?.subject ?? null}
        accuracy={weakPracticeSubject?.accuracy ?? 0}
        onClose={() => setWeakPracticeSubject(null)}
      />
    )
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 6: Manual smoke test**

Start dev server:
```bash
npm run dev
```

Navigate to `/dashboard`. Confirm:
1. Clicking a weak subject card opens the modal with the subject name and accuracy
2. The modal shows the correct performance label and colour (e.g. "Critical" in red for < 35%)
3. Clicking backdrop closes the modal
4. Pressing Escape closes the modal
5. Clicking "Maybe later" closes the modal
6. Clicking "Start Practising Now" shows a loading spinner, then navigates to `/quiz/session`
7. The quiz session has 10 questions for the correct subject with label `"SubjectName · Weak Area Focus · 10Q"`
8. Opening modal for Subject A, closing, then opening for Subject B shows correct data (no stale error state)

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): wire WeakSubjectModal into weak areas section"
```

---

## Task 3: Push

- [ ] **Step 1: Push to main**

```bash
git push origin claude/pensive-turing:main
```

- [ ] **Step 2: Final type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

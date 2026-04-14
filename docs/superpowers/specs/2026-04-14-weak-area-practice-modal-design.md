# Weak Area Practice Modal — Design Spec

**Date:** 2026-04-14
**Feature:** Clicking a weak subject card on the Dashboard opens a modal to instantly launch a 10-question focused practice session

---

## Overview

The Dashboard "Focus on Weak Areas" section shows subject cards ordered by lowest accuracy. Currently clicking a card navigates to `/quiz`. This feature replaces that with a modal that appears inline, shows the subject's performance context, and launches a 10-question practice session directly — no intermediate pages.

---

## Scope

**In scope:**
- New `WeakSubjectModal` component
- Dashboard page state change + click handler update
- Direct quiz session launch (fetch → store → navigate) from the modal

**Out of scope:**
- Excluding previously-seen questions (random fetch only)
- Difficulty selection in the modal
- Progress tracking specific to weak-area sessions beyond what the existing `TestSession` record captures

---

## Files

| File | Change |
|---|---|
| `components/dashboard/WeakSubjectModal.tsx` | **Create** — self-contained modal component |
| `app/(dashboard)/dashboard/page.tsx` | **Modify** — add `weakPracticeSubject` state, update click handler, mount modal |

---

## Component: `WeakSubjectModal`

**File:** `components/dashboard/WeakSubjectModal.tsx`

### Props

```typescript
interface WeakSubjectModalProps {
  subject: Subject | null   // null = modal is closed/hidden
  accuracy: number          // current accuracy % for this subject
  onClose: () => void       // called on backdrop click, "Maybe later", or Escape key
}
```

`Subject` is imported from `@/types`.

### Render — closed state

When `subject === null`, render nothing (`return null`).

### Render — open state

Structure:
```
fixed inset-0 bg-black/40 backdrop-blur-sm z-50   ← backdrop (click to close)
  └─ centered white card (max-w-md, rounded-2xl, shadow-xl, p-6)
       ├─ Subject name (text-xl font-black)
       ├─ Accuracy pill: "{accuracy}% — {performanceLabel}" coloured by accuracy tier
       ├─ Motivational line: "10 focused questions to push your score up"
       ├─ "Start Practising Now" button (blue pill, full-width, shows Loader2 spinner when loading)
       └─ "Maybe later" text link (text-gray-400, centers below button)
```

**Performance label + colour** (same thresholds as `getPerformanceLabel` in dashboard page):
- ≥ 75%: "Strong" — emerald
- ≥ 55%: "Moderate" — amber
- ≥ 35%: "Needs Work" — orange
- < 35%: "Critical" — red

### Behaviour: "Start Practising Now"

```typescript
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
    useQuizStore.getState().setPaperLabel(`${subject.Name} · Weak Area Focus · 10Q`)
    router.push('/quiz/session?id=' + crypto.randomUUID())
  } catch {
    setError('Failed to load questions. Please try again.')
    setLoading(false)
  }
}
```

**Local state:**
```typescript
const [loading, setLoading] = useState(false)
const [error, setError]     = useState<string | null>(null)
```

**Error display:** Small red text below the "Start Practising Now" button, above "Maybe later".

### Behaviour: Close

- Clicking the backdrop calls `onClose()`
- Clicking "Maybe later" calls `onClose()`
- Pressing `Escape` key calls `onClose()` (useEffect on `keydown`)
- Clicking inside the card does NOT close (stopPropagation on card click)
- `onClose` resets `loading` and `error` state is reset when modal re-opens (via `useEffect` on `subject` changing)

---

## Dashboard Page Changes

**File:** `app/(dashboard)/dashboard/page.tsx`

### 1. New state

```typescript
const [weakPracticeSubject, setWeakPracticeSubject] = useState<{ subject: Subject; accuracy: number } | null>(null)
```

### 2. Updated click handler on weak subject cards

**Before:**
```tsx
onClick={() => {
  track('weak_area_clicked', { subject_name: subject.Name, accuracy: acc })
  router.push('/quiz')
}}
```

**After:**
```tsx
onClick={() => {
  track('weak_area_clicked', { subject_name: subject.Name, accuracy: acc })
  setWeakPracticeSubject({ subject, accuracy: acc })
}}
```

### 3. Modal mount

At the bottom of the dashboard JSX, before the closing root `</div>`:

```tsx
<WeakSubjectModal
  subject={weakPracticeSubject?.subject ?? null}
  accuracy={weakPracticeSubject?.accuracy ?? 0}
  onClose={() => setWeakPracticeSubject(null)}
/>
```

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Subject has no questions in DB | Inline error: "No questions available for this subject yet" |
| Network error during fetch | Inline error: "Failed to load questions. Please try again." |
| User clicks backdrop while loading | `onClose()` fires — modal closes, navigation does not happen |
| User opens modal for Subject A, closes, opens for Subject B | `error` and `loading` reset via `useEffect` on `subject` prop change |
| Subject has fewer than 10 questions | `getQuestions` returns whatever is available; session starts with that count |

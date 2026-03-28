# PostHog Analytics Integration — Design Spec
**Date:** 2026-03-28
**Scope:** Full-funnel analytics with user identity linking across the entire Indicore Next.js app

---

## 1. Goal

Connect Indicore to PostHog (Option B: Provider + `useAnalytics` hook) to get:
- Automatic pageview tracking across all App Router routes
- User identity linked to Supabase profile (email, name, exam_type)
- ~12 custom events covering every meaningful user action
- Per-user journeys and funnel analysis visible in PostHog dashboard

---

## 2. New Files

| File | Purpose |
|---|---|
| `components/providers/PostHogProvider.tsx` | Initialises PostHog, handles App Router pageview tracking |
| `hooks/useAnalytics.ts` | Typed wrapper exposing `track()` and `identify()` |

---

## 3. Modified Files

| File | Change |
|---|---|
| `app/layout.tsx` | Wrap children with `<PostHogProvider>` |
| `app/(dashboard)/layout.tsx` | Call `identify()` after user profile loads; `reset()` on logout |
| `app/(auth)/signup/page.tsx` | Track `user_signed_up` on success |
| `app/(auth)/auth/callback/route.ts` | Track `user_logged_in` on successful code exchange |
| `app/(auth)/login/page.tsx` | Track `user_logged_in` on email login success |
| `app/(dashboard)/quiz/page.tsx` | Track `mock_test_started`, `subject_practice_started`, `test_retaken` |
| `app/(dashboard)/quiz/session/page.tsx` | Track `quiz_submitted` |
| `app/(dashboard)/intelligence/page.tsx` | Track `intelligence_viewed` |
| `app/(dashboard)/tests/[sessionId]/page.tsx` | Track `test_reviewed` |
| `app/(dashboard)/notes/new/page.tsx` | Track `note_created` |
| `app/(dashboard)/notes/review/page.tsx` | Track `note_review_started`, `note_rated` |
| `app/(dashboard)/onboarding/page.tsx` | Track `onboarding_completed` |
| `.env.local` | Add `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |

---

## 4. Architecture

```
PostHogProvider (app/layout.tsx)
  └── initialises posthog-js once on mount (browser only)
  └── PageviewTracker (inner component in <Suspense>)
        └── usePathname + useSearchParams → posthog.capture('$pageview') on change

useAnalytics() hook
  └── track(eventName, properties?) → posthog.capture()
  └── identify(userId, traits)     → posthog.identify()
  └── reset()                      → posthog.reset()

Dashboard layout
  └── on user load → identify(user.$id, { email, name, exam_type })
  └── on logout    → reset()
```

---

## 5. PostHog Provider

```tsx
// components/providers/PostHogProvider.tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    posthog.capture('$pageview', { $current_url: window.location.href })
  }, [pathname, searchParams])
  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,   // manual via PageviewTracker
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
```

**SSR safety:** `posthog.init` is inside `useEffect` so it never runs on the server.

---

## 6. useAnalytics Hook

```ts
// hooks/useAnalytics.ts
import posthog from 'posthog-js'

type EventName =
  | 'user_signed_up'
  | 'user_logged_in'
  | 'onboarding_completed'
  | 'mock_test_started'
  | 'subject_practice_started'
  | 'quiz_submitted'
  | 'test_reviewed'
  | 'test_retaken'
  | 'note_created'
  | 'note_review_started'
  | 'note_rated'
  | 'intelligence_viewed'

export function useAnalytics() {
  return {
    track: (event: EventName, props?: Record<string, unknown>) =>
      posthog.capture(event, props),
    identify: (userId: string, traits: Record<string, unknown>) =>
      posthog.identify(userId, traits),
    reset: () => posthog.reset(),
  }
}
```

---

## 7. Events Reference

| Event | Trigger point | Properties |
|---|---|---|
| `user_signed_up` | Signup page — after `signUp()` succeeds | `method: 'email'` |
| `user_logged_in` | Auth callback — after `exchangeCodeForSession` succeeds | `method: 'google'` |
| `user_logged_in` | Login page — after `signInWithPassword` succeeds | `method: 'email'` |
| `onboarding_completed` | Onboarding page — on final submit | `exam_type` |
| `mock_test_started` | Quiz page — on start mock | `mock_id, mock_title` |
| `subject_practice_started` | Quiz page — on start subject practice | `subject_name, question_count` |
| `quiz_submitted` | Quiz session — on submit | `mode, total_questions, correct, score_pct` |
| `test_reviewed` | Tests `[sessionId]` page — on mount | `session_id, mode` |
| `test_retaken` | Quiz page — on retake click | `session_id` |
| `note_created` | Notes new page — on save | _(none)_ |
| `note_review_started` | Notes review page — on mount | `due_count` |
| `note_rated` | Notes review page — on rating select | `rating: 'good' \| 'ok' \| 'bad'` |
| `intelligence_viewed` | Intelligence page — on mount | _(none)_ |

---

## 8. User Identity

Called in `app/(dashboard)/layout.tsx` inside the existing `useEffect` that fetches the user profile — no extra network call:

```ts
const { identify } = useAnalytics()
identify(user.$id, {
  email: user.email,
  name: profile?.name ?? '',
  exam_type: profile?.examType ?? '',
})
```

On logout, `reset()` is called to unlink the device from the user.

---

## 9. Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_1Hx9jh7ABrzgWgU3XaGfQcjeBMUcaprXREAX0H4jU7T
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Also add to Vercel environment variables for both `main` (production) and `dev` (preview) environments.

---

## 10. Dependencies

```bash
npm install posthog-js
```

`@vercel/analytics` remains — PostHog and Vercel Analytics run in parallel without conflict.

---

## 11. What Is Not In Scope

- PostHog feature flags
- A/B testing / experiments
- Session recording (can be enabled later from PostHog dashboard with no code changes)
- GDPR consent banner (PostHog's cookie-less mode can be enabled later if needed)

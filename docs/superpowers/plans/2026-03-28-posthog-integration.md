# PostHog Analytics Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate PostHog into the Indicore Next.js app with pageview tracking, user identity linking, and 12 custom product events across all major user actions.

**Architecture:** A `PostHogProvider` initialises `posthog-js` on the client and tracks App Router page navigations via `usePathname`. A typed `useAnalytics()` hook wraps PostHog so components never import it directly. User identity is set in the dashboard layout once the Supabase user + profile loads, and reset on logout.

**Tech Stack:** `posthog-js` (new), Next.js 15 App Router, Supabase Auth, TypeScript

---

## File Map

| Action | File |
|---|---|
| Create | `components/providers/PostHogProvider.tsx` |
| Create | `hooks/useAnalytics.ts` |
| Modify | `app/layout.tsx` |
| Modify | `app/(dashboard)/layout.tsx` |
| Modify | `app/(auth)/signup/page.tsx` |
| Modify | `app/(auth)/auth/callback/route.ts` |
| Modify | `app/(auth)/login/page.tsx` |
| Modify | `app/(auth)/onboarding/page.tsx` |
| Modify | `app/(dashboard)/quiz/page.tsx` |
| Modify | `app/(dashboard)/quiz/session/page.tsx` |
| Modify | `app/(dashboard)/intelligence/page.tsx` |
| Modify | `app/(dashboard)/tests/[sessionId]/page.tsx` |
| Modify | `app/(dashboard)/notes/new/page.tsx` |
| Modify | `app/(dashboard)/notes/review/page.tsx` |
| Modify | `.env.local` |

---

## Task 1: Install posthog-js and add env vars

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Install the package**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
npm install posthog-js
```

Expected output: `added 1 package` (posthog-js has no deps)

- [ ] **Step 2: Add env vars to `.env.local`**

Append these two lines to the end of `.env.local`:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_1Hx9jh7ABrzgWgU3XaGfQcjeBMUcaprXREAX0H4jU7T
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 3: Verify the vars are readable**

```bash
grep POSTHOG .env.local
```

Expected output:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_1Hx9jh7ABrzgWgU3XaGfQcjeBMUcaprXREAX0H4jU7T
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install posthog-js"
```

---

## Task 2: Create PostHogProvider

**Files:**
- Create: `components/providers/PostHogProvider.tsx`

> **Context:** Next.js App Router does not fire `popstate` events that posthog-js listens for, so `capture_pageview: false` disables the built-in tracker and we fire `$pageview` manually inside `PageviewTracker` whenever `pathname` or `searchParams` change. `useSearchParams()` requires a `<Suspense>` boundary in Next.js 15 or the build will fail.

- [ ] **Step 1: Create the file**

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
      capture_pageview: false,  // handled manually by PageviewTracker
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `PostHogProvider.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/providers/PostHogProvider.tsx
git commit -m "feat(analytics): add PostHogProvider with App Router pageview tracking"
```

---

## Task 3: Create useAnalytics hook

**Files:**
- Create: `hooks/useAnalytics.ts`

> **Context:** This hook is the only place in the codebase that imports `posthog-js` for tracking calls. All other files import this hook instead. The `EventName` union type ensures event names are consistent and typo-proof across the codebase.

- [ ] **Step 1: Create the file**

```ts
// hooks/useAnalytics.ts
import posthog from 'posthog-js'

export type EventName =
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `hooks/useAnalytics.ts`

- [ ] **Step 3: Commit**

```bash
git add hooks/useAnalytics.ts
git commit -m "feat(analytics): add typed useAnalytics hook"
```

---

## Task 4: Wire PostHogProvider into root layout

**Files:**
- Modify: `app/layout.tsx`

> **Context:** Current layout wraps children with `ThemeProvider > QueryProvider`. We add `PostHogProvider` as the outermost wrapper so it's available to all routes including auth pages.

- [ ] **Step 1: Update `app/layout.tsx`**

Replace the entire file with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Indicore | UPSC & PSC Prelims Practice",
  description:
    "Practice UPSC and State PSC previous year questions with instant answers and detailed explanations",
  openGraph: {
    title: "Indicore | UPSC & PSC Prelims Practice",
    description:
      "Practice UPSC and State PSC previous year questions with instant answers and detailed explanations",
    type: "website",
    locale: "en_IN",
    siteName: "Indicore",
  },
  twitter: {
    card: "summary_large_image",
    title: "Indicore | UPSC & PSC Prelims Practice",
    description:
      "Practice UPSC and State PSC previous year questions with instant answers and detailed explanations",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
      >
        <PostHogProvider>
          <ThemeProvider>
            <QueryProvider>
              {children}
              <Toaster position="top-center" richColors />
              <Analytics />
            </QueryProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(analytics): wire PostHogProvider into root layout"
```

---

## Task 5: Add identify and reset in dashboard layout

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

> **Context:** The dashboard layout already fetches `getCurrentUser()` and `getProfile()` in a `useEffect`. We call `identify()` immediately after both succeed. We call `reset()` in `handleSignOut` before navigating away. The hook must be called at the top level of the component (React rules of hooks), not inside the async function.

- [ ] **Step 1: Add the import and hook call**

In `app/(dashboard)/layout.tsx`, add the import at the top of the imports block:

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call the hook inside DashboardLayout**

After the existing state declarations (after `const [dueCount, setDueCount] = useState(0)`), add:

```ts
const { identify, reset } = useAnalytics()
```

- [ ] **Step 3: Add identify() inside fetchUserData**

Inside the `fetchUserData` async function, after `setProfile(userProfile as unknown as Profile)`, add:

```ts
// Link this device to the authenticated user in PostHog
identify(user.$id, {
  email: user.email ?? '',
  name: (userProfile as any)?.full_name ?? '',
  exam_type: (userProfile as any)?.target_exam ?? '',
})
```

The `fetchUserData` block should now look like:

```ts
const fetchUserData = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) { router.push('/login'); return }
    const userProfile = await getProfile(user.$id)
    setProfile(userProfile as unknown as Profile)
    // Link this device to the authenticated user in PostHog
    identify(user.$id, {
      email: user.email ?? '',
      name: (userProfile as any)?.full_name ?? '',
      exam_type: (userProfile as any)?.target_exam ?? '',
    })
    try {
      const count = await getDueNotesCount(user.$id)
      setDueCount(count)
    } catch { /* non-critical */ }
  } catch {
    clearSessionCookie()
    router.push('/login')
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 4: Add reset() in handleSignOut**

Replace the `handleSignOut` function with:

```ts
const handleSignOut = async () => {
  reset()  // unlink this device from the user in PostHog
  try {
    await signOut()
    toast.success('Signed out successfully')
    router.push('/login')
  } catch {
    clearSessionCookie()
    router.push('/login')
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat(analytics): identify user and reset on logout in dashboard layout"
```

---

## Task 6: Track auth events — signup and email login

**Files:**
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(auth)/login/page.tsx`

### signup/page.tsx

> **Context:** `onSubmit` calls `signUp()` then redirects to `/onboarding`. Track `user_signed_up` after `signUp()` succeeds, before the redirect.

- [ ] **Step 1: Add import to signup/page.tsx**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call the hook inside SignupPage**

After `const [showConfirmPassword, setShowConfirmPassword] = useState(false)`, add:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 3: Add track call inside onSubmit**

After `toast.success('Account created successfully!')`, add:

```ts
track('user_signed_up', { method: 'email' })
```

The `onSubmit` try block should look like:

```ts
try {
  const user = await signUp(data.email, data.password, data.fullName)
  await createProfile(user.$id, data.fullName)
  await createUserStats(user.$id)
  toast.success('Account created successfully!')
  track('user_signed_up', { method: 'email' })
  router.push('/onboarding')
} catch (error) {
  toast.error(error instanceof Error ? error.message : 'Failed to create account. Please try again.')
  setLoading(false)
}
```

### login/page.tsx

> **Context:** `onSubmit` calls `signIn()` then does `window.location.href = '/dashboard'`. Track `user_logged_in` after `signIn()` succeeds, before the redirect.

- [ ] **Step 4: Add import to login/page.tsx**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 5: Call the hook inside LoginPage**

After `const [showPassword, setShowPassword] = useState(false)`, add:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 6: Add track call inside onSubmit**

After `toast.success('Welcome back!')`, add:

```ts
track('user_logged_in', { method: 'email' })
```

The `onSubmit` try block should look like:

```ts
try {
  await signIn(data.email, data.password)
  toast.success('Welcome back!')
  track('user_logged_in', { method: 'email' })
  await new Promise(resolve => setTimeout(resolve, 500))
  window.location.href = '/dashboard'
} catch (error) {
  // existing error handling unchanged
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add "app/(auth)/signup/page.tsx" "app/(auth)/login/page.tsx"
git commit -m "feat(analytics): track user_signed_up and user_logged_in (email)"
```

---

## Task 7: Track Google login via auth callback

**Files:**
- Modify: `app/(auth)/auth/callback/route.ts`

> **Context:** This is a **Route Handler** (server-side), not a client component, so `useAnalytics()` cannot be used here. Call `posthog-js` directly, but only after importing it as a plain module. However, posthog-js is a browser library and cannot run server-side. Instead, use the PostHog Node.js client approach: fire a server-side event via a direct HTTP POST to the PostHog capture endpoint. This is a lightweight one-liner — no extra package needed.

- [ ] **Step 1: Update the callback route**

Replace `app/(auth)/auth/callback/route.ts` with:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Validate next param: must be a relative path starting with /
  // to prevent open-redirect attacks
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Fire PostHog event server-side via HTTP (posthog-js is browser-only)
      const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
      if (phKey) {
        fetch(`${phHost}/capture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: phKey,
            event: 'user_logged_in',
            distinct_id: data.user.id,
            properties: { method: 'google', $current_url: `${origin}${next}` },
          }),
        }).catch(() => { /* non-critical, fire-and-forget */ })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed — send back to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/auth/callback/route.ts"
git commit -m "feat(analytics): track user_logged_in (google) via server-side PostHog capture"
```

---

## Task 8: Track onboarding_completed

**Files:**
- Modify: `app/(auth)/onboarding/page.tsx`

> **Context:** `handleSubmit` calls `updateProfile()` then does `router.push('/dashboard')`. Track `onboarding_completed` with the selected exam after the profile update succeeds.

- [ ] **Step 1: Add import**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call hook inside the component**

After the existing state declarations, add:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 3: Add track call in handleSubmit**

After `toast.success('Profile setup complete!')`, add:

```ts
track('onboarding_completed', { exam_type: selectedExam })
```

The relevant section of `handleSubmit` should now look like:

```ts
await updateProfile(user.$id, {
  target_exam: selectedExam,
  target_year: selectedYear,
})

toast.success('Profile setup complete!')
track('onboarding_completed', { exam_type: selectedExam })
router.push('/dashboard')
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/onboarding/page.tsx"
git commit -m "feat(analytics): track onboarding_completed"
```

---

## Task 9: Track quiz events — mock started, subject practice started, retaken

**Files:**
- Modify: `app/(dashboard)/quiz/page.tsx`

> **Context:** Three handlers need tracking:
> - `handleStartMock(mock)` — after questions are loaded, before `router.push`
> - `handleStartPractice()` — after questions are loaded, before `router.push`
> - `handleRetake(session)` — after questions are loaded, before `router.push`

- [ ] **Step 1: Add import**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call hook inside the component**

Near the top of the component (after the existing store destructure), add:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 3: Add track in handleStartMock**

Inside `handleStartMock`, after `setPaperLabel(mock.name)` and before `router.push(...)`, add:

```ts
track('mock_test_started', { mock_id: mock.$id, mock_title: mock.name })
```

- [ ] **Step 4: Add track in handleStartPractice**

Inside `handleStartPractice`, after `setPaperLabel(...)` and before `router.push(...)`, add:

```ts
track('subject_practice_started', {
  subject_name: configSubject.Name,
  question_count: qs.length,
})
```

- [ ] **Step 5: Add track in handleRetake**

Inside `handleRetake`, after `setPaperLabel(...)` and before `router.push(...)`, add:

```ts
track('test_retaken', { session_id: session.$id })
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/quiz/page.tsx"
git commit -m "feat(analytics): track mock_test_started, subject_practice_started, test_retaken"
```

---

## Task 10: Track quiz_submitted

**Files:**
- Modify: `app/(dashboard)/quiz/session/page.tsx`

> **Context:** `handleConfirmSubmit` computes analytics and creates a test session. `totalCorrect`, `questions.length`, and `testMode` are all in scope. Track after `submitTest()` is called and analytics are computed, before the save calls.

- [ ] **Step 1: Add import**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call hook at the top of the component**

Near the other hook calls, add:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 3: Add track in handleConfirmSubmit**

Inside `handleConfirmSubmit`, after `const analytics = generateTestAnalytics(...)` and after the `totalCorrect`/`scorePercent` variables are computed (around line 402), add:

```ts
track('quiz_submitted', {
  mode: testMode ? 'full_length' : 'practice',
  total_questions: questions.length,
  correct: totalCorrect,
  score_pct: scorePercent,
})
```

Place it immediately after this existing block (so all variables are already defined):

```ts
const totalCorrect = analytics.subjectStats.reduce((sum, s) => sum + s.correct, 0)
const totalWrong = Object.values(answers).filter(a => !a.isCorrect).length
const numAttempted = Object.keys(answers).length
const scorePercent = numAttempted > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0
// ↓ add here
track('quiz_submitted', {
  mode: testMode ? 'full_length' : 'practice',
  total_questions: questions.length,
  correct: totalCorrect,
  score_pct: scorePercent,
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/quiz/session/page.tsx"
git commit -m "feat(analytics): track quiz_submitted"
```

---

## Task 11: Track intelligence_viewed

**Files:**
- Modify: `app/(dashboard)/intelligence/page.tsx`

> **Context:** Fire once when the page mounts and data loads. The page already has a `useEffect` that calls `load()`. Add the track call inside `load()` after the data is set, so we only fire when the page successfully renders data.

- [ ] **Step 1: Add import**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call hook inside the component**

Near the top of the component, add:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 3: Add track in load()**

At the end of the `load()` async function, just before the `} catch` block, add:

```ts
track('intelligence_viewed')
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/intelligence/page.tsx"
git commit -m "feat(analytics): track intelligence_viewed"
```

---

## Task 12: Track test_reviewed

**Files:**
- Modify: `app/(dashboard)/tests/[sessionId]/page.tsx`

> **Context:** The page has a `useEffect` that fetches `getTestSession(sessionId)`. Track after the session loads successfully. `sessionId` comes from `params.sessionId` and `session.mode` is on the returned object.

- [ ] **Step 1: Add import**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call hook inside the component**

Near the top of the component, add:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 3: Add track inside the useEffect load**

In the `useEffect`, after `getTestSession(sessionId)` resolves and the session data is available, add:

```ts
track('test_reviewed', { session_id: sessionId, mode: session.mode ?? 'unknown' })
```

Place it immediately after the session is loaded and before the attempts are fetched:

```ts
const session = await getTestSession(sessionId)
track('test_reviewed', { session_id: sessionId, mode: session.mode ?? 'unknown' })
// rest of the existing useEffect logic...
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/tests/[sessionId]/page.tsx"
git commit -m "feat(analytics): track test_reviewed"
```

---

## Task 13: Track note events — created, review started, rated

**Files:**
- Modify: `app/(dashboard)/notes/new/page.tsx`
- Modify: `app/(dashboard)/notes/review/page.tsx`

### notes/new/page.tsx

> **Context:** `handleSave` saves the note then calls `router.push('/notes')`. Track after `toast.success('Note saved!')`.

- [ ] **Step 1: Add import to notes/new/page.tsx**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 2: Call hook inside the component**

Add near the top of the component:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 3: Add track in handleSave**

After `toast.success('Note saved!')`, add:

```ts
track('note_created')
```

The `handleSave` try block should look like:

```ts
try {
  // existing save logic...
  toast.success('Note saved!')
  track('note_created')
  router.push('/notes')
```

### notes/review/page.tsx

> **Context:** Two events needed:
> - `note_review_started` — fire once when `cards` are loaded (inside the existing `useEffect` load, after `setCards(due)`)
> - `note_rated` — fire in `handleRate` with the rating value, after `setRated(true)`

- [ ] **Step 4: Add import to notes/review/page.tsx**

```ts
import { useAnalytics } from '@/hooks/useAnalytics'
```

- [ ] **Step 5: Call hook inside the component**

Add near the top of the component:

```ts
const { track } = useAnalytics()
```

- [ ] **Step 6: Add note_review_started in the load useEffect**

In the existing `useEffect` that calls `getDueNotes()`, after `setCards(due)`, add:

```ts
track('note_review_started', { due_count: due.length })
```

- [ ] **Step 7: Add note_rated in handleRate**

In `handleRate`, after `setRated(true)`, add:

```ts
track('note_rated', { rating: rating as string })
```

The `handleRate` function should look like:

```ts
const handleRate = async (rating: SRSRating) => {
  // existing saving logic...
  setRated(true)
  track('note_rated', { rating: rating as string })
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add "app/(dashboard)/notes/new/page.tsx" "app/(dashboard)/notes/review/page.tsx"
git commit -m "feat(analytics): track note_created, note_review_started, note_rated"
```

---

## Task 14: Final push and Vercel env var setup

- [ ] **Step 1: Push all commits to main**

```bash
git push origin claude/pensive-turing:main
```

Expected: branch pushed, Vercel auto-deploy triggered

- [ ] **Step 2: Add env vars to Vercel (manual)**

Go to [vercel.com](https://vercel.com) → your Indicore project → **Settings → Environment Variables** and add:

| Name | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_1Hx9jh7ABrzgWgU3XaGfQcjeBMUcaprXREAX0H4jU7T` | Production, Preview |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | Production, Preview |

Click **Save** then **Redeploy** the latest deployment.

- [ ] **Step 3: Verify in PostHog dashboard**

1. Open [app.posthog.com](https://app.posthog.com) → your project
2. Go to **Live Events** tab
3. Visit `https://indicoreupsc.in` in an incognito window
4. Confirm `$pageview` events appear in the Live Events stream within 30 seconds
5. Log in with Google — confirm `user_logged_in` appears with `method: google`
6. Navigate to `/dashboard` — confirm `$pageview` fires for each route change
7. Check **Persons** tab — confirm your user appears with `email`, `name`, `exam_type` properties

---

## Self-Review Notes

**Spec coverage check:**
- ✅ PostHogProvider with App Router pageview tracking (Task 2)
- ✅ useAnalytics hook with typed EventName (Task 3)
- ✅ Root layout wired (Task 4)
- ✅ identify() on user load, reset() on logout (Task 5)
- ✅ user_signed_up (Task 6), user_logged_in email (Task 6), user_logged_in google (Task 7)
- ✅ onboarding_completed (Task 8)
- ✅ mock_test_started, subject_practice_started, test_retaken (Task 9)
- ✅ quiz_submitted (Task 10)
- ✅ intelligence_viewed (Task 11)
- ✅ test_reviewed (Task 12)
- ✅ note_created, note_review_started, note_rated (Task 13)
- ✅ Env vars in .env.local and Vercel (Tasks 1 + 14)

**Type consistency:** `useAnalytics()` returns `{ track, identify, reset }` — all tasks use exactly these names. `EventName` union covers all 12 events — all tasks pass only valid event names.

**Placeholder scan:** No TBDs, no "add error handling", all code blocks are complete.

# End-to-End Analytics & Admin Panel — Design Spec
**Date:** 2026-04-06
**Status:** Approved

---

## 1. Goal

Track every meaningful user action on the Indicore platform and surface it in two places:
1. **PostHog** — behavioural event stream, funnels, session replays
2. **`/admin` page** — in-app user-first panel for the founder to monitor any user's complete journey

---

## 2. Architecture

```
Client (Browser)
├── useAnalytics hook ──► PostHog US cloud (30+ typed events)
└── /admin page
    ├── Server component (service role) ──► Supabase (all users' data)
    └── PostHog deep-link per user ──► posthog.com person page
```

**Three components:**

- **`useAnalytics` hook** — extended with 25 new typed events. Fires `posthog.capture()` with consistent property shapes. PostHog binds events to the user automatically after `identify()` (already called on login).
- **`/admin` page** — Next.js server component. Email-gated: redirects to `/dashboard` if logged-in user is not `indicoredotai@gmail.com`. Reads all user data via Supabase service role key (bypasses RLS). Two views: User List and User Detail.
- **Supabase service-role queries** — new query functions in `lib/supabase/admin-queries.ts`. Never imported by any client component. Only used in the server component.

---

## 3. Event Instrumentation

All events follow this shape:
```typescript
posthog.capture(eventName, {
  // PostHog auto-attaches: distinct_id, timestamp, $current_url, $device
  ...contextProperties
})
```

### 3.1 Quiz & Test Events

| Event | Fired When | Properties |
|-------|-----------|------------|
| `question_answered` | User selects an option | `question_id`, `subject`, `difficulty`, `is_correct`, `time_taken_seconds`, `option_selected` |
| `question_skipped` | User moves past without answering | `question_id`, `subject`, `difficulty`, `question_index` |
| `question_flagged` | User taps flag/bookmark | `question_id`, `subject` |
| `answer_changed` | User changes a previously selected option | `question_id`, `from_option`, `to_option`, `was_correct_before` |
| `lifeline_used` | 50/50, Guess, or Are You Sure used | `type` (`fifty_fifty` / `guess` / `are_you_sure`), `question_id`, `subject` |
| `quiz_completed` | Quiz submitted | `mock_name`, `exam_type`, `total_questions`, `correct`, `wrong`, `skipped`, `score_pct`, `duration_seconds` |
| `results_tab_viewed` | User switches results tab | `tab` (`overview` / `subject` / `guesses` / `revision`) |

### 3.2 Navigation & Engagement

| Event | Fired When | Properties |
|-------|-----------|------------|
| `page_viewed` | Any dashboard page mounts | `page` (`dashboard` / `quiz` / `intelligence` / `notes` / `tests`) |
| `tab_switched` | Quiz page tab changes | `from_tab`, `to_tab` (`mock` / `pyq` / `subject`) |
| `mock_card_viewed` | Mock card scrolls into view / hovered | `mock_name`, `total_questions` |
| `weak_area_clicked` | User clicks a weak subject on dashboard | `subject_name`, `accuracy` |
| `dashboard_section_viewed` | Dashboard section enters viewport | `section` (`streak` / `weak_areas` / `recent_tests` / `flash_cards`) |

### 3.3 Flash Cards

| Event | Fired When | Properties |
|-------|-----------|------------|
| `flashcard_created` | New flash card saved | `has_front`, `has_back` |
| `flashcard_review_started` | Review session begins | `due_count` |
| `flashcard_rated` | User rates a card | `rating` (`again` / `hard` / `good` / `easy`), `card_id` |
| `flashcard_session_completed` | All due cards reviewed | `cards_reviewed`, `duration_seconds` |

### 3.4 Intelligence & Retention

| Event | Fired When | Properties |
|-------|-----------|------------|
| `intelligence_section_viewed` | Intelligence page section enters viewport | `section` (`confused_topics` / `action_plan` / `subject_chart`) |
| `session_ended` | Page leave (PostHog `capture_pageleave`) | `page`, `duration_seconds` |
| `streak_milestone` | Streak hits 3, 7, 14, 30 days | `days` |

### 3.5 Existing Events (keep, no change needed)

`user_signed_up`, `user_logged_in`, `onboarding_completed`, `mock_test_started`, `subject_practice_started`, `quiz_submitted`, `test_reviewed`, `test_retaken`, `note_created`, `note_review_started`, `note_rated`, `intelligence_viewed`, `$pageview`

---

## 4. Admin Panel

### 4.1 Route & Auth

- **Route:** `/app/(admin)/admin/page.tsx` — new route group `(admin)` with its own layout
- **Protection:** Server component reads current Supabase session. If `session.user.email !== 'indicoredotai@gmail.com'` → `redirect('/dashboard')`
- **No client-side auth check** — protection happens entirely server-side before any HTML is sent

### 4.2 Data Layer — `lib/supabase/admin-queries.ts`

New file, service-role client only. Three functions:

```typescript
// All users with aggregated stats
getAllUsersWithStats(): Promise<AdminUser[]>
// Returns: id, full_name, email, created_at, target_exam,
//          total_sessions, avg_score, last_active, subjects_practiced[]

// Full timeline for one user
getUserTimeline(userId: string): Promise<TimelineEntry[]>
// Returns: test_sessions ordered by submitted_at desc,
//          each with score, subjects, duration, question_count

// Top-level platform metrics
getPlatformMetrics(): Promise<PlatformMetrics>
// Returns: total_users, total_tests_today, avg_score_week, dau
```

`AdminUser` and `TimelineEntry` types defined in `types/admin.ts`.

### 4.3 View 1 — User List

**Layout:** Dark header with platform name + today's date. Four stat cards (Total Users, Tests Today, Avg Score This Week, DAU). Searchable, sortable table below.

**Stat cards** — computed from `getPlatformMetrics()`:
- Total Users
- Tests Today (sessions submitted in last 24h)
- Avg Score This Week
- DAU (distinct users with a session in last 24h)

**User table columns:**
- Name, Email, Total Tests, Avg Score, Last Active, Joined
- Default sort: Last Active descending
- Client-side search on name/email (no server round-trip for search)
- Click any row → User Detail view

### 4.4 View 2 — User Detail

Rendered as a full page at `/admin/[userId]`.

**Header:** Back button, name, email, join date, target exam, total tests. "View in PostHog ↗" button linking to `https://us.posthog.com/project/<project_id>/persons?search=<email>`.

**Stats row:** Subject accuracies (top 3), streak days, flash cards created/reviewed.

**Timeline:** Chronological list (newest first) from `getUserTimeline()`. Each entry shows:
- Date + time
- Entry type with icon (Mock Test / Subject Practice / Flash Cards / Intelligence / Signed Up)
- Key metric (score%, question count, cards reviewed)
- Expandable row for mock tests: shows per-subject breakdown

### 4.5 Styling

Matches dashboard aesthetic — white cards, `#1A1C1C` headings, `#4A90E2` accents, `rounded-2xl` cards. No new dependencies.

---

## 5. Files to Create / Modify

### New Files
- `app/(admin)/admin/page.tsx` — User list server component
- `app/(admin)/admin/[userId]/page.tsx` — User detail server component
- `app/(admin)/admin/layout.tsx` — Admin layout (email gate)
- `lib/supabase/admin-queries.ts` — Service-role query functions
- `types/admin.ts` — AdminUser, TimelineEntry, PlatformMetrics types

### Modified Files
- `hooks/useAnalytics.ts` — Add 20 new event names to `EventName` union
- `app/(dashboard)/quiz/session/page.tsx` — Add `question_answered`, `question_skipped`, `answer_changed`, `lifeline_used`
- `app/(dashboard)/quiz/page.tsx` — Add `tab_switched`, `mock_card_viewed`
- `app/(dashboard)/dashboard/page.tsx` — Add `dashboard_section_viewed`, `weak_area_clicked`, `streak_milestone`
- `app/(dashboard)/notes/page.tsx` — Add `flashcard_session_completed`
- `app/(dashboard)/notes/review/page.tsx` — Add `flashcard_session_completed`
- `app/(dashboard)/intelligence/page.tsx` — Add `intelligence_section_viewed`
- `components/providers/PostHogProvider.tsx` — Add `session_ended` duration tracking

---

## 6. Implementation Order

1. `types/admin.ts` + `lib/supabase/admin-queries.ts`
2. Admin route group + layout (email gate)
3. User List page
4. User Detail page
5. `useAnalytics` event type extensions
6. Event instrumentation across quiz session (highest value)
7. Event instrumentation across dashboard, flash cards, intelligence

---

## 7. Out of Scope

- Email alerts / Slack notifications on user milestones
- Exporting user data to CSV
- PostHog dashboard configuration (done manually in posthog.com)
- Any write operations from the admin panel

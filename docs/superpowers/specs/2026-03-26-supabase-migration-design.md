# Supabase Migration Design

## Goal

Replace the Appwrite backend entirely with Supabase (PostgreSQL + Auth + Storage). Motivation: Appwrite's attribute-missing bugs, cross-domain session workarounds, and stringified JSON fields have caused repeated reliability issues. Supabase provides native jsonb, proper JWT session management, and a SQL query model that eliminates the workarounds.

## Architecture

**Approach:** Direct client replacement (Approach A). The Supabase browser client runs in the same position Appwrite did — called directly from pages and components using the anon key + Row Level Security. No API routes introduced. Function names stay identical; only imports change.

**Tech Stack:** `@supabase/supabase-js`, `@supabase/ssr` (middleware), Supabase PostgreSQL, Supabase Auth, Supabase Storage.

---

## Section 1 — File Structure

### New files
```
lib/supabase/
  client.ts       — createBrowserClient(); single export used everywhere
  auth.ts         — all auth functions (1:1 with current appwrite/auth.ts)
  queries.ts      — all DB/storage functions (1:1 with current appwrite/queries.ts)

scripts/
  migrate-appwrite-to-supabase.ts  — one-time migration script
```

### Deleted files
```
lib/appwrite/config.ts
lib/appwrite/auth.ts
lib/appwrite/queries.ts
```

### Modified files (~22 files)
Every file currently importing from `@/lib/appwrite/*` has its imports updated to `@/lib/supabase/*`. No logic changes inside those files — only the import path and `user.$id` → `user.id`.

Files affected:
- `middleware.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/(auth)/onboarding/page.tsx`
- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/profile/page.tsx`
- `app/(dashboard)/quiz/page.tsx`
- `app/(dashboard)/quiz/session/page.tsx`
- `app/(dashboard)/tests/page.tsx`
- `app/(dashboard)/tests/[sessionId]/page.tsx`
- `app/(dashboard)/tests/mistakes/page.tsx`
- `app/(dashboard)/results/review/page.tsx`
- `app/(dashboard)/notes/page.tsx`
- `app/(dashboard)/notes/new/page.tsx`
- `app/(dashboard)/notes/[cardId]/page.tsx`
- `app/(dashboard)/notes/review/page.tsx`
- `app/(dashboard)/intelligence/page.tsx`
- `components/notes/NoteEditor.tsx`
- `components/results/ResultsView.tsx`

### Environment variables

Remove all `NEXT_PUBLIC_APPWRITE_*` and `NEXT_PUBLIC_COLLECTION_*` vars.

Add:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never NEXT_PUBLIC_
```

Update Vercel environment variables to match.

---

## Section 2 — PostgreSQL Schema

Run as SQL in Supabase dashboard → SQL editor. All user tables have RLS enabled with policy `user_id = auth.uid()`.

```sql
-- ── Static content (public read, no RLS) ──────────────────────────

create table subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text,
  icon        text,
  color       text
);
alter table subjects enable row level security;
create policy "public read" on subjects for select using (true);

create table questions (
  id                    uuid primary key default gen_random_uuid(),
  subject_id            uuid references subjects(id),
  exam_type             text,
  year                  int,
  paper                 text,
  paper_label           text,
  question_text         text not null,
  option_a              text,
  option_b              text,
  option_c              text,
  option_d              text,
  correct_option        text not null,
  explanation           text,
  difficulty            text,
  subtopic              text,
  tags                  text[],
  is_active             boolean default true,
  expected_time_seconds int
);
alter table questions enable row level security;
create policy "public read" on questions for select using (true);

-- ── User data (RLS: user_id = auth.uid()) ─────────────────────────

create table profiles (
  id           uuid primary key references auth.users(id),
  full_name    text,
  avatar_url   text,
  target_exam  text,
  target_year  int
);
alter table profiles enable row level security;
create policy "own profile" on profiles using (id = auth.uid());

create table user_stats (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id),
  total_attempted  int default 0,
  total_correct    int default 0,
  total_wrong      int default 0,
  streak_days      int default 0
);
alter table user_stats enable row level security;
create policy "own stats" on user_stats using (user_id = auth.uid());

create table quiz_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id),
  session_id          uuid,
  question_id         uuid references questions(id),
  selected_option     text,
  is_correct          boolean,
  confidence_tag      text,
  time_taken_seconds  int,
  used_5050           boolean default false,
  used_guess          boolean default false,
  used_areyousure     boolean default false,
  selection_history   jsonb,
  created_at          timestamptz default now()
);
alter table quiz_attempts enable row level security;
create policy "own attempts" on quiz_attempts using (user_id = auth.uid());
create index on quiz_attempts(session_id);
create index on quiz_attempts(user_id);

create table test_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id),
  exam_type          text,
  year               int,
  paper              text,
  paper_label        text,
  mode               text,
  started_at         timestamptz,
  submitted_at       timestamptz default now(),
  total_time_seconds int,
  total_questions    int,
  attempted          int,
  correct            int,
  incorrect          int,
  skipped            int,
  score              float,
  analytics          jsonb,
  snapshot           jsonb,
  ai_feedback        text,
  question_ids       text[]
);
alter table test_sessions enable row level security;
create policy "own sessions" on test_sessions using (user_id = auth.uid());
create index on test_sessions(user_id, submitted_at desc);

create table reported_issues (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id),
  question_id  uuid references questions(id),
  mode         text,
  description  text,
  status       text default 'pending',
  reported_at  timestamptz default now()
);
alter table reported_issues enable row level security;
create policy "own issues" on reported_issues using (user_id = auth.uid());

create table notes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id),
  front              text not null,
  back               text not null,
  subject            text,
  topic              text,
  source_question_id uuid,
  next_review_at     timestamptz default now(),
  interval_days      float default 1,
  ease_factor        float default 2.5,
  review_count       int default 0,
  created_at         timestamptz default now()
);
alter table notes enable row level security;
create policy "own notes" on notes using (user_id = auth.uid());
create index on notes(user_id, next_review_at);

create table user_skill_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) unique,
  updated_at        timestamptz default now(),
  model_version     text,
  subject_scores    jsonb,
  subtopic_scores   jsonb,
  behavior_signals  jsonb,
  recommendations   jsonb,
  narrative_feedback text
);
alter table user_skill_profiles enable row level security;
create policy "own skill profile" on user_skill_profiles using (user_id = auth.uid());
```

---

## Section 3 — Auth

`lib/supabase/auth.ts` replaces `lib/appwrite/auth.ts` with identical exported function names.

| Old function | New implementation |
|---|---|
| `signUp(email, password, name)` | `supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })` |
| `signIn(email, password)` | `supabase.auth.signInWithPassword({ email, password })` |
| `signInWithGoogle()` | `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: origin + '/onboarding' })` |
| `signOut()` | `supabase.auth.signOut()` |
| `getCurrentUser()` | `supabase.auth.getUser()` → returns `{ data: { user } }`, null on error |
| `sendPasswordRecovery(email)` | `supabase.auth.resetPasswordForEmail(email, { redirectTo })` |
| `confirmPasswordRecovery(...)` | `supabase.auth.updateUser({ password })` |

**Deleted:** `setSessionCookie()`, `clearSessionCookie()` — Supabase `@supabase/ssr` manages JWT cookies automatically on your domain. No custom cookie workaround needed.

**Middleware (`middleware.ts`):** Replaced with `@supabase/ssr` `createServerClient` pattern — reads/refreshes JWT from cookies automatically. Protects all `/dashboard` routes.

**`user.$id` → `user.id`:** All call sites updated (~10 files).

---

## Section 4 — Data Layer

`lib/supabase/queries.ts` replaces `lib/appwrite/queries.ts`. All exported function names and signatures stay identical.

**Query translation pattern:**
```typescript
// Before (Appwrite)
databases.listDocuments(DATABASE_ID, COLLECTIONS.ATTEMPTS, [
  Query.equal('session_id', sessionId),
  Query.limit(500),
])

// After (Supabase)
supabase.from('quiz_attempts')
  .select('*')
  .eq('session_id', sessionId)
  .limit(500)
```

**Key improvements:**
- `analytics` and `snapshot` stored as `jsonb` — `JSON.parse()` calls removed throughout; read as plain objects
- `question_ids` stored as `text[]` — `JSON.parse(sess.question_ids)` becomes `sess.question_ids` directly
- `upsertSkillProfile` uses Supabase native `.upsert({ onConflict: 'user_id' })` — no manual create-or-update logic
- `listTestSessions` becomes one clean query — no 3-attempt fallback needed
- `getTestSession` becomes one query — no legacy `user_test_summary` fallback needed
- Avatar storage: `supabase.storage.from('avatars').upload()` / `.getPublicUrl()`

**TypeScript types (`types/index.ts`):**
- `$id` → `id` on all types
- `$createdAt` → `created_at`
- `snapshot?: string` → `snapshot?: object`
- `analytics?: string` → `analytics?: object` (parsed at rest, not at read time)
- `question_ids?: string` → `question_ids?: string[]`

---

## Section 5 — Data Migration

**Script:** `scripts/migrate-appwrite-to-supabase.ts`

Run once locally: `npx ts-node scripts/migrate-appwrite-to-supabase.ts`

**Steps:**
1. Read existing `.env.local` for Appwrite credentials
2. Fetch all subjects from Appwrite (paginated, 100/page)
3. Transform: rename `$id` → `id`, map field names
4. Insert subjects into Supabase via service role key (bypasses RLS)
5. Fetch all questions from Appwrite (paginated, 100/page)
6. Transform: rename fields, resolve `subject_id` to new Supabase UUID
7. Bulk insert questions into Supabase in batches of 500
8. Log progress + verify final counts match

**Requirements:**
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (from Supabase → Settings → API → service_role)
- Existing `NEXT_PUBLIC_APPWRITE_*` vars still present during migration run

**Scope:** subjects + questions only. All user data (test sessions, attempts, notes, skill profiles) starts fresh.

---

## Implementation Order

1. Create Supabase project + run schema SQL
2. Add env vars to `.env.local` and Vercel
3. Create `lib/supabase/client.ts`
4. Create `lib/supabase/auth.ts`
5. Update `middleware.ts`
6. Create `lib/supabase/queries.ts`
7. Update `types/index.ts` ($id → id, jsonb fields)
8. Update all ~22 page/component imports
9. Run migration script (subjects + questions)
10. Delete `lib/appwrite/` directory
11. Test end-to-end: auth, quiz, test session, notes
12. Update Vercel env vars + redeploy

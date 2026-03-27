# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entire Appwrite backend with Supabase — auth, database, and storage — while keeping all page/component logic unchanged.

**Architecture:** Direct client swap in `lib/supabase/` (3 files). The query layer adds `$id` and `$createdAt` shims on all returned objects, serializes jsonb back to strings, and exports `STORAGE_BUCKET_ID` — so zero logic changes are needed in any page or component. Only import paths change.

**Tech Stack:** `@supabase/supabase-js`, `@supabase/ssr`, Supabase PostgreSQL + Auth + Storage (bucket: `avatars`)

---

### Task 1: Install packages + configure env vars

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected: packages added to `node_modules/`, no errors.

- [ ] **Step 2: Add Supabase env vars to `.env.local`**

Append these lines to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://wnbeuxmllrkczbbjcjyj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYmV1eG1sbHJrY3piYmpjanlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDUyMTUsImV4cCI6MjA5MDA4MTIxNX0.O4_A9tH0GeB7UlNAeBDZBwzelIVC1n8njKalRNPxuaU
SUPABASE_SERVICE_ROLE_KEY=<paste_service_role_key_from_supabase_dashboard>
```

Get `SUPABASE_SERVICE_ROLE_KEY` from: Supabase dashboard → Settings → API → service_role (secret key).

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: no output (no errors).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js and @supabase/ssr"
```

---

### Task 2: Run PostgreSQL schema in Supabase dashboard

**Files:** None (run in Supabase SQL editor)

- [ ] **Step 1: Open Supabase SQL editor**

Go to https://supabase.com/dashboard/project/wnbeuxmllrkczbbjcjyj → SQL Editor → New query.

- [ ] **Step 2: Run the schema SQL**

Paste and run this entire block:

```sql
-- ── Static content (public read) ────────────────────────────────────

create table subjects (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text,
  icon  text,
  color text
);
alter table subjects enable row level security;
create policy "public read subjects" on subjects for select using (true);

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
create policy "public read questions" on questions for select using (true);

-- ── User data (RLS: user_id = auth.uid()) ───────────────────────────

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  target_exam text,
  target_year int
);
alter table profiles enable row level security;
create policy "own profile" on profiles using (id = auth.uid());

create table user_stats (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade unique,
  total_attempted  int default 0,
  total_correct    int default 0,
  total_wrong      int default 0,
  streak_days      int default 0
);
alter table user_stats enable row level security;
create policy "own stats" on user_stats using (user_id = auth.uid());

create table quiz_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  session_id          uuid,
  question_id         uuid,
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
create index on quiz_attempts(user_id, created_at desc);

create table test_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade,
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
  user_id      uuid references auth.users(id) on delete cascade,
  question_id  uuid,
  mode         text,
  description  text,
  status       text default 'pending',
  reported_at  timestamptz default now()
);
alter table reported_issues enable row level security;
create policy "own issues" on reported_issues using (user_id = auth.uid());

create table notes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade,
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
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade unique,
  updated_at         timestamptz default now(),
  model_version      text,
  subject_scores     jsonb,
  subtopic_scores    jsonb,
  behavior_signals   jsonb,
  recommendations    jsonb,
  narrative_feedback text
);
alter table user_skill_profiles enable row level security;
create policy "own skill profile" on user_skill_profiles using (user_id = auth.uid());

create table user_test_summary (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  test_id          text,
  date             text,
  total_score      float,
  subject_scores   jsonb,
  accuracy         float,
  attempts_count   int,
  confidence_stats jsonb
);
alter table user_test_summary enable row level security;
create policy "own test summary" on user_test_summary using (user_id = auth.uid());
```

- [ ] **Step 3: Create avatars storage bucket**

In Supabase dashboard → Storage → New bucket → name: `avatars` → Public: ON → Create.

Then in Storage → Policies → Add policy for `avatars` bucket:
- Select "Full access" for authenticated users (or run this SQL):

```sql
create policy "avatar upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 4: Enable Google OAuth in Supabase**

Supabase dashboard → Authentication → Providers → Google → Enable.

Add your Google OAuth credentials (same Client ID + Secret you used in Appwrite). Set Redirect URL to what Supabase shows (copy it) and add it to Google Cloud Console → Authorized redirect URIs.

- [ ] **Step 5: No commit needed (schema runs in Supabase, not in git)**

---

### Task 3: Create `lib/supabase/client.ts`

**Files:**
- Create: `lib/supabase/client.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Exported so profile/page.tsx import doesn't need to change.
// 'avatars' is the Supabase storage bucket name (always configured).
export const STORAGE_BUCKET_ID = 'avatars'
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/client.ts
git commit -m "feat(supabase): add browser client"
```

---

### Task 4: Create `lib/supabase/auth.ts`

**Files:**
- Create: `lib/supabase/auth.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/supabase/auth.ts
import { createClient } from './client'

// ── SIGN UP ───────────────────────────────────────────────────────
export async function signUp(email: string, password: string, name: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })
  if (error) throw error
  // Return object shaped like Appwrite user (adds $id shim)
  const user = data.user!
  return { ...user, $id: user.id, name: user.user_metadata?.full_name || name }
}

// ── SIGN IN ───────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

// ── GOOGLE OAUTH ──────────────────────────────────────────────────
export function signInWithGoogle() {
  const supabase = createClient()
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/onboarding` },
  })
}

// ── SIGN OUT ──────────────────────────────────────────────────────
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── GET CURRENT USER ──────────────────────────────────────────────
// Returns null if not authenticated.
// Adds $id shim so all pages using user.$id continue to work.
export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    ...user,
    $id: user.id,
    name: user.user_metadata?.full_name || '',
  }
}

// ── PASSWORD RECOVERY ─────────────────────────────────────────────
export async function sendPasswordRecovery(email: string) {
  const supabase = createClient()
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

// Supabase reset-password flow: user clicks email link → lands on /reset-password
// with access_token in URL hash → Supabase SDK auto-sets session → call updateUser.
// userId and secret params are unused (kept for API compat with existing page).
export async function confirmPasswordRecovery(
  _userId: string,
  _secret: string,
  password: string
) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

// ── NO-OPS (Appwrite cookie workarounds — not needed in Supabase) ──
export function setSessionCookie() {}
export function clearSessionCookie() {}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/auth.ts
git commit -m "feat(supabase): add auth module"
```

---

### Task 5: Update `proxy.ts` (middleware)

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired — required by @supabase/ssr
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/results')

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat(supabase): update middleware to use Supabase SSR session"
```

---

### Task 6: Create `lib/supabase/queries.ts`

**Files:**
- Create: `lib/supabase/queries.ts`

This file replaces `lib/appwrite/queries.ts` with identical exported function signatures. The query layer adds `$id`/`$createdAt` shims and serializes jsonb fields back to strings so all pages continue to work without changes.

- [ ] **Step 1: Create the file**

```typescript
// lib/supabase/queries.ts
import { createClient } from './client'
import type { Profile, Subject, Question, QuizAttempt, UserStats, UserTestSummary, TestSession, Note, SkillProfile } from '@/types'

// ── AVATAR STORAGE ────────────────────────────────────────────────────────────

// Returns the full public URL of the uploaded avatar.
// Accepts just the file (gets userId from current session internally).
export async function uploadAvatar(file: File): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = sb.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

// In Supabase we store the full URL directly — this is an identity function.
export function getAvatarUrl(urlOrPath: string): string {
  return urlOrPath
}

export async function deleteAvatarFile(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return
  const sb = createClient()
  // Extract storage path from Supabase public URL
  const match = urlOrPath.match(/\/storage\/v1\/object\/public\/avatars\/(.+)/)
  if (match) {
    await sb.storage.from('avatars').remove([match[1]])
  }
  // Silently ignore old Appwrite URLs (format doesn't match)
}

// ── PROFILES ──────────────────────────────────────────────────────────────────

export async function createProfile(userId: string, name: string): Promise<Profile> {
  const sb = createClient()
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, full_name: name }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return { ...data, $id: data.id } as unknown as Profile
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const sb = createClient()
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (!data) return null
  return { ...data, $id: data.id } as unknown as Profile
}

export async function updateProfile(userId: string, updates: Record<string, unknown>): Promise<Profile> {
  const sb = createClient()
  const { data, error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return { ...data, $id: data.id } as unknown as Profile
}

// ── SUBJECTS ──────────────────────────────────────────────────────────────────

export async function getSubjects() {
  const sb = createClient()
  const { data, error } = await sb.from('subjects').select('*').order('name')
  if (error) throw error
  // Map `name` → `Name` to match existing Subject type
  return {
    documents: (data ?? []).map(d => ({ ...d, $id: d.id, Name: d.name })),
  }
}

// ── QUESTIONS ─────────────────────────────────────────────────────────────────

export async function getQuestions(params: {
  examType?: string
  subjectId?: string
  year?: number
  difficulty?: string
  limit?: number
  offset?: number
}) {
  const sb = createClient()
  let q = sb.from('questions').select('*').eq('is_active', true)
  if (params.examType && params.examType !== 'all') q = q.eq('exam_type', params.examType)
  if (params.subjectId) q = q.eq('subject_id', params.subjectId)
  if (params.year) q = q.eq('year', params.year)
  if (params.difficulty) q = q.eq('difficulty', params.difficulty)
  if (params.limit) {
    const offset = params.offset ?? 0
    q = q.range(offset, offset + params.limit - 1)
  }
  const { data, error } = await q
  if (error) throw error
  return { documents: (data ?? []).map(d => ({ ...d, $id: d.id })) }
}

export async function getQuestionsByIds(ids: string[]) {
  if (ids.length === 0) return { documents: [], total: 0 }
  const sb = createClient()
  const { data, error } = await sb.from('questions').select('*').in('id', ids)
  if (error) throw error
  return { documents: (data ?? []).map(d => ({ ...d, $id: d.id })) }
}

export async function getQuestionCountBySubject(subjectId: string): Promise<number> {
  const sb = createClient()
  const { count, error } = await sb
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subjectId)
    .eq('is_active', true)
  if (error) return 0
  return count ?? 0
}

// ── QUIZ ATTEMPTS ─────────────────────────────────────────────────────────────

export async function saveAttempt(data: {
  user_id: string
  question_id: string
  selected_option: string
  is_correct: boolean
  session_id?: string
  time_taken_seconds?: number
  used_5050?: boolean
  used_guess?: boolean
  used_areyousure?: boolean
  is_guess?: boolean
  confidence_tag?: 'guess' | 'sure' | 'fifty_fifty' | null
  selection_history?: string
  revision_summary?: string
}) {
  const sb = createClient()
  let selectionHistory: object | null = null
  if (data.selection_history) {
    try { selectionHistory = JSON.parse(data.selection_history) } catch {}
  }
  const { error } = await sb.from('quiz_attempts').insert({
    user_id: data.user_id,
    question_id: data.question_id,
    selected_option: data.selected_option,
    is_correct: data.is_correct,
    session_id: data.session_id ?? null,
    time_taken_seconds: data.time_taken_seconds ?? null,
    used_5050: data.used_5050 ?? false,
    used_guess: data.used_guess ?? false,
    used_areyousure: data.used_areyousure ?? false,
    selection_history: selectionHistory,
  })
  if (error) throw error
}

export async function getUserAttempts(userId: string, limit = 50) {
  const sb = createClient()
  const { data, error } = await sb
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return {
    documents: (data ?? []).map(d => ({
      ...d,
      $id: d.id,
      selection_history: d.selection_history ? JSON.stringify(d.selection_history) : null,
    })),
  }
}

export async function listAttemptsBySession(sessionId: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('quiz_attempts')
    .select('*')
    .eq('session_id', sessionId)
    .limit(500)
  if (error) throw error
  return {
    documents: (data ?? []).map(d => ({
      ...d,
      $id: d.id,
      selection_history: d.selection_history ? JSON.stringify(d.selection_history) : null,
    })),
  }
}

// ── USER STATS ────────────────────────────────────────────────────────────────

export async function getUserStats(userId: string) {
  const sb = createClient()
  const { data } = await sb.from('user_stats').select('*').eq('user_id', userId).single()
  if (!data) return null
  return { ...data, $id: data.id }
}

export async function createUserStats(userId: string) {
  const sb = createClient()
  const { error } = await sb.from('user_stats').upsert(
    { user_id: userId, total_attempted: 0, total_correct: 0, total_wrong: 0, streak_days: 0 },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function incrementStats(userId: string, isCorrect: boolean) {
  const sb = createClient()
  const stats = await getUserStats(userId)
  if (!stats) return
  await sb.from('user_stats').update({
    total_attempted: (stats.total_attempted ?? 0) + 1,
    total_correct: (stats.total_correct ?? 0) + (isCorrect ? 1 : 0),
    total_wrong: (stats.total_wrong ?? 0) + (isCorrect ? 0 : 1),
  }).eq('user_id', userId)
}

// ── TEST SUMMARIES (legacy compat) ────────────────────────────────────────────

export async function saveUserTestSummary(data: Omit<UserTestSummary, '$id'>) {
  const sb = createClient()
  const { error } = await sb.from('user_test_summary').insert({
    user_id: data.user_id,
    test_id: data.test_id,
    date: data.date,
    total_score: data.total_score,
    subject_scores: typeof data.subject_scores === 'string'
      ? JSON.parse(data.subject_scores) : (data.subject_scores ?? {}),
    accuracy: data.accuracy,
    attempts_count: data.attempts_count,
    confidence_stats: typeof data.confidence_stats === 'string'
      ? JSON.parse(data.confidence_stats) : (data.confidence_stats ?? {}),
  })
  if (error) console.error('[saveUserTestSummary] non-critical:', error.message)
}

export async function getUserTestSummaries(userId: string) {
  const sb = createClient()
  const { data } = await sb
    .from('user_test_summary')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(50)
  return { documents: (data ?? []).map(d => ({ ...d, $id: d.id })) }
}

// ── TEST SESSIONS ─────────────────────────────────────────────────────────────

function parseIfString(v: unknown): unknown {
  if (typeof v === 'string') { try { return JSON.parse(v) } catch {} }
  return v ?? null
}

function mapSession(doc: Record<string, any>): TestSession {
  return {
    ...doc,
    $id: doc.id,
    $createdAt: doc.submitted_at,
    // Serialize jsonb back to strings for backward compat with pages
    analytics: doc.analytics ? JSON.stringify(doc.analytics) : '{}',
    results_history: doc.analytics ? JSON.stringify(doc.analytics) : '{}',
    snapshot: doc.snapshot ? JSON.stringify(doc.snapshot) : undefined,
    // Serialize question_ids array back to JSON string
    question_ids: doc.question_ids ? JSON.stringify(doc.question_ids) : undefined,
  } as unknown as TestSession
}

export async function createTestSession(data: Omit<TestSession, '$id'>): Promise<TestSession> {
  const sb = createClient()
  const { data: doc, error } = await sb
    .from('test_sessions')
    .insert({
      user_id: data.user_id,
      exam_type: data.exam_type,
      year: data.year,
      paper: data.paper,
      paper_label: data.paper_label,
      mode: data.mode,
      started_at: data.started_at,
      submitted_at: data.submitted_at,
      total_time_seconds: data.total_time_seconds,
      total_questions: data.total_questions,
      attempted: data.attempted,
      correct: data.correct,
      incorrect: data.incorrect,
      skipped: data.skipped,
      score: data.score,
      analytics: parseIfString(data.analytics),
      snapshot: parseIfString(data.snapshot),
      ai_feedback: data.ai_feedback,
      question_ids: data.question_ids
        ? (typeof data.question_ids === 'string' ? JSON.parse(data.question_ids) : data.question_ids)
        : null,
    })
    .select()
    .single()
  if (error) throw error
  return mapSession(doc)
}

export async function getTestSession(sessionId: string): Promise<TestSession> {
  const sb = createClient()
  const { data, error } = await sb
    .from('test_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error) throw error
  return mapSession(data)
}

export async function listTestSessions(params: {
  userId: string
  from?: string
  to?: string
  examType?: string
  mode?: string
  sort?: 'newest' | 'oldest' | 'highest_score' | 'lowest_score'
  limit?: number
  offset?: number
}): Promise<{ documents: TestSession[]; total: number }> {
  const { userId, from, to, examType, mode, sort = 'newest', limit = 10, offset = 0 } = params
  const sb = createClient()
  let q = sb
    .from('test_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
  if (from) q = q.gte('submitted_at', from)
  if (to) q = q.lte('submitted_at', to)
  if (examType && examType !== 'all') q = q.eq('exam_type', examType)
  if (mode && mode !== 'all') q = q.eq('mode', mode)
  switch (sort) {
    case 'oldest': q = q.order('submitted_at', { ascending: true }); break
    case 'highest_score': q = q.order('score', { ascending: false }); break
    case 'lowest_score': q = q.order('score', { ascending: true }); break
    default: q = q.order('submitted_at', { ascending: false })
  }
  q = q.range(offset, offset + limit - 1)
  const { data, error, count } = await q
  if (error) throw error
  return { documents: (data ?? []).map(mapSession), total: count ?? 0 }
}

// ── REPORTED ISSUES ───────────────────────────────────────────────────────────

export async function reportIssue(data: {
  user_id: string
  question_id: string
  mode: string
  description?: string
}) {
  const sb = createClient()
  const { error } = await sb.from('reported_issues').insert({
    user_id: data.user_id,
    question_id: data.question_id,
    mode: data.mode,
    description: data.description || '',
    status: 'pending',
    reported_at: new Date().toISOString(),
  })
  if (error) throw error
}

// ── NOTES ─────────────────────────────────────────────────────────────────────

function mapNote(d: Record<string, any>): Note {
  return { ...d, $id: d.id, $createdAt: d.created_at } as unknown as Note
}

export async function createNote(data: Omit<Note, '$id' | '$createdAt'>) {
  const sb = createClient()
  const { data: doc, error } = await sb.from('notes').insert(data).select().single()
  if (error) throw error
  return mapNote(doc)
}

export async function getNotesByUser(params: {
  userId: string
  subjectFilter?: string
  limit?: number
  offset?: number
}) {
  const sb = createClient()
  let q = sb
    .from('notes')
    .select('*', { count: 'exact' })
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
  if (params.subjectFilter) q = q.eq('subject', params.subjectFilter)
  if (params.limit) {
    const off = params.offset ?? 0
    q = q.range(off, off + params.limit - 1)
  }
  const { data, error, count } = await q
  if (error) throw error
  return { documents: (data ?? []).map(mapNote), total: count ?? 0 }
}

export async function getDueNotes(userId: string, limit = 20) {
  const sb = createClient()
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return { documents: (data ?? []).map(mapNote) }
}

export async function getDueNotesCount(userId: string): Promise<number> {
  const sb = createClient()
  const now = new Date().toISOString()
  const { count, error } = await sb
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review_at', now)
  if (error) return 0
  return count ?? 0
}

export async function updateNote(noteId: string, updates: Partial<Note>) {
  const sb = createClient()
  const { data, error } = await sb
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single()
  if (error) throw error
  return mapNote(data)
}

export async function deleteNote(noteId: string) {
  const sb = createClient()
  const { error } = await sb.from('notes').delete().eq('id', noteId)
  if (error) throw error
}

export async function getNoteById(noteId: string) {
  const sb = createClient()
  const { data } = await sb.from('notes').select('*').eq('id', noteId).single()
  if (!data) return null
  return mapNote(data)
}

// ── SKILL PROFILES ────────────────────────────────────────────────────────────

export async function getSkillProfile(userId: string): Promise<SkillProfile | null> {
  const sb = createClient()
  const { data } = await sb
    .from('user_skill_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (!data) return null
  return {
    ...data,
    $id: data.id,
    // Serialize jsonb back to strings (SkillProfile type uses _json string fields)
    subject_scores_json: JSON.stringify(data.subject_scores ?? {}),
    subtopic_scores_json: JSON.stringify(data.subtopic_scores ?? {}),
    behavior_signals_json: JSON.stringify(data.behavior_signals ?? {}),
    recommendations_json: JSON.stringify(data.recommendations ?? []),
  } as unknown as SkillProfile
}

export async function upsertSkillProfile(data: Omit<SkillProfile, '$id'>) {
  const sb = createClient()
  const { error } = await sb.from('user_skill_profiles').upsert(
    {
      user_id: data.user_id,
      updated_at: data.updated_at,
      model_version: data.model_version,
      subject_scores: parseIfString(data.subject_scores_json),
      subtopic_scores: parseIfString(data.subtopic_scores_json),
      behavior_signals: parseIfString(data.behavior_signals_json),
      recommendations: parseIfString(data.recommendations_json),
      narrative_feedback: data.narrative_feedback,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function getSessionCount(userId: string): Promise<number> {
  const sb = createClient()
  const { count, error } = await sb
    .from('test_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) return 0
  return count ?? 0
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (some `unknown` cast warnings are acceptable).

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/queries.ts
git commit -m "feat(supabase): add queries module (full 1:1 replacement of appwrite/queries)"
```

---

### Task 7: Update all imports across pages and components

**Files — only import path changes, zero logic changes:**
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

- [ ] **Step 1: Bulk-replace all appwrite auth imports**

```bash
find app components -name "*.tsx" -not -path "*/node_modules/*" | xargs sed -i '' \
  "s|from '@/lib/appwrite/auth'|from '@/lib/supabase/auth'|g"
```

- [ ] **Step 2: Bulk-replace all appwrite queries imports**

```bash
find app components -name "*.tsx" -not -path "*/node_modules/*" | xargs sed -i '' \
  "s|from '@/lib/appwrite/queries'|from '@/lib/supabase/queries'|g"
```

- [ ] **Step 3: Fix profile/page.tsx — update config import**

In `app/(dashboard)/profile/page.tsx`, change:
```typescript
import { STORAGE_BUCKET_ID } from '@/lib/appwrite/config'
```
to:
```typescript
import { STORAGE_BUCKET_ID } from '@/lib/supabase/client'
```

Run this command:
```bash
sed -i '' "s|import { STORAGE_BUCKET_ID } from '@/lib/appwrite/config'|import { STORAGE_BUCKET_ID } from '@/lib/supabase/client'|g" "app/(dashboard)/profile/page.tsx"
```

- [ ] **Step 4: Verify no remaining appwrite imports in app/components**

```bash
grep -r "@/lib/appwrite" app/ components/ --include="*.tsx" --include="*.ts"
```

Expected: no output (zero remaining Appwrite imports).

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If any errors appear about `$id` not existing on `User`, check that `getCurrentUser()` in `lib/supabase/auth.ts` returns `{ ...user, $id: user.id }`.

- [ ] **Step 6: Test build**

```bash
npx next build 2>&1 | tail -15
```

Expected: build succeeds, all routes listed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(supabase): swap all appwrite imports to supabase across 21 files"
```

---

### Task 8: Write and run the data migration script

**Files:**
- Create: `scripts/migrate-appwrite-to-supabase.ts`

- [ ] **Step 1: Install ts-node and dotenv for the script**

```bash
npm install --save-dev ts-node dotenv @types/node
```

- [ ] **Step 2: Create the migration script**

```typescript
// scripts/migrate-appwrite-to-supabase.ts
import { Client, Databases, Query } from 'appwrite'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

// ── Appwrite client ───────────────────────────────────────────────────────────
const awClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
const awDbs = new Databases(awClient)
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
const SUBJECTS_COL = process.env.NEXT_PUBLIC_COLLECTION_SUBJECTS!
const QUESTIONS_COL = process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS!

// ── Supabase client (service role bypasses RLS) ───────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchAllFromAppwrite(collectionId: string): Promise<any[]> {
  const all: any[] = []
  let offset = 0
  while (true) {
    const res = await awDbs.listDocuments(DB_ID, collectionId, [
      Query.limit(100),
      Query.offset(offset),
    ])
    all.push(...res.documents)
    console.log(`  fetched ${all.length}/${res.total}`)
    if (all.length >= res.total) break
    offset += 100
    await new Promise(r => setTimeout(r, 100)) // rate limit
  }
  return all
}

async function main() {
  console.log('=== Appwrite → Supabase Migration ===\n')

  // ── 1. Migrate subjects ────────────────────────────────────────────────────
  console.log('Step 1: Fetching subjects from Appwrite...')
  const subjects = await fetchAllFromAppwrite(SUBJECTS_COL)
  console.log(`Found ${subjects.length} subjects\n`)

  // Appwrite $id → new Supabase UUID
  const subjectIdMap = new Map<string, string>()

  for (const sub of subjects) {
    const { data, error } = await sb
      .from('subjects')
      .insert({
        name: sub.Name || sub.name,
        slug: sub.slug || null,
        icon: sub.icon || null,
        color: sub.color || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ "${sub.Name || sub.name}": ${error.message}`)
    } else {
      subjectIdMap.set(sub.$id, data.id)
      console.log(`  ✓ "${sub.Name || sub.name}" → ${data.id}`)
    }
  }

  // ── 2. Migrate questions ───────────────────────────────────────────────────
  console.log(`\nStep 2: Fetching questions from Appwrite...`)
  const questions = await fetchAllFromAppwrite(QUESTIONS_COL)
  console.log(`Found ${questions.length} questions\n`)

  const BATCH = 50
  let inserted = 0
  let failed = 0

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH).map((q: any) => ({
      subject_id: subjectIdMap.get(q.subject_id) ?? null,
      exam_type: q.exam_type || null,
      year: q.year || null,
      paper: q.paper || null,
      paper_label: q.paper_label || null,
      question_text: q.question_text,
      option_a: q.option_a || null,
      option_b: q.option_b || null,
      option_c: q.option_c || null,
      option_d: q.option_d || null,
      correct_option: q.correct_option,
      explanation: q.explanation || null,
      difficulty: q.difficulty || null,
      subtopic: q.subtopic || null,
      tags: Array.isArray(q.tags) ? q.tags : [],
      is_active: q.is_active !== false,
      expected_time_seconds: q.expected_time_seconds || null,
    }))

    const { error } = await sb.from('questions').insert(batch)
    if (error) {
      console.error(`  ✗ Batch ${i}–${i + BATCH}: ${error.message}`)
      failed += batch.length
    } else {
      inserted += batch.length
      console.log(`  ✓ ${Math.min(inserted, questions.length)}/${questions.length} inserted`)
    }
    await new Promise(r => setTimeout(r, 50))
  }

  // ── 3. Verify ──────────────────────────────────────────────────────────────
  console.log('\nStep 3: Verifying...')
  const { count: sCount } = await sb.from('subjects').select('*', { count: 'exact', head: true })
  const { count: qCount } = await sb.from('questions').select('*', { count: 'exact', head: true })

  console.log(`\n${'='.repeat(40)}`)
  console.log(`Supabase: ${sCount} subjects, ${qCount} questions`)
  console.log(`Appwrite: ${subjects.length} subjects, ${questions.length} questions`)
  if (failed > 0) console.log(`Failed: ${failed} questions`)
  console.log(`${'='.repeat(40)}`)
  console.log(sCount === subjects.length && qCount === (questions.length - failed)
    ? '✅ Migration complete!'
    : '⚠️  Count mismatch — check errors above')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

- [ ] **Step 3: Run the migration**

```bash
npx ts-node --project tsconfig.json -e "require('ts-node/register'); require('./scripts/migrate-appwrite-to-supabase')"
```

Or simpler:
```bash
npx ts-node scripts/migrate-appwrite-to-supabase.ts
```

Expected output:
```
=== Appwrite → Supabase Migration ===
Step 1: Fetching subjects from Appwrite...
  fetched N/N subjects
Found N subjects
  ✓ "History" → uuid...
  ✓ "Geography" → uuid...
  ...
Step 2: Fetching questions from Appwrite...
  ...
Step 3: Verifying...
Supabase: N subjects, N questions
Appwrite: N subjects, N questions
✅ Migration complete!
```

- [ ] **Step 4: Commit the script (not the migration output)**

```bash
git add scripts/migrate-appwrite-to-supabase.ts package.json package-lock.json
git commit -m "chore: add Appwrite→Supabase data migration script"
```

---

### Task 9: Delete Appwrite lib, update Vercel env vars, final checks, push

**Files:**
- Delete: `lib/appwrite/` directory
- Modify: Vercel dashboard (env vars)

- [ ] **Step 1: Delete Appwrite lib**

```bash
rm -rf lib/appwrite/
```

- [ ] **Step 2: Verify no remaining Appwrite imports anywhere**

```bash
grep -r "appwrite" app/ components/ lib/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

Expected: no output.

- [ ] **Step 3: Final TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (no errors).

- [ ] **Step 4: Final build check**

```bash
npx next build 2>&1 | tail -20
```

Expected: build succeeds, all routes compile.

- [ ] **Step 5: Add env vars to Vercel**

In Vercel dashboard → your project → Settings → Environment Variables, add:

| Key | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wnbeuxmllrkczbbjcjyj.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full key) | Production, Preview, Development |

Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel (it's server-only for migration scripts, never needed by the app).

Remove all old `NEXT_PUBLIC_APPWRITE_*` and `NEXT_PUBLIC_COLLECTION_*` variables from Vercel.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat(supabase): complete migration — remove Appwrite, add Supabase"
git push origin main
```

Expected: Vercel triggers deployment automatically. App should boot, login page loads, sign-up creates a Supabase user.

- [ ] **Step 7: End-to-end smoke test**

After Vercel deploys:
1. Go to `/signup` → create new account → should redirect to `/onboarding`
2. Complete onboarding → profile saved → go to `/dashboard`
3. Go to `/quiz` → subjects load from Supabase → start a quiz
4. Answer questions → submit → session appears in `/tests`
5. Click a session → 4 tabs load correctly
6. Go to `/notes` → create a note → appears in grid

---

## Self-Review

**Spec coverage check:**
- ✅ File structure: `lib/supabase/{client,auth,queries}.ts` created (Tasks 3–6)
- ✅ `lib/appwrite/` deleted (Task 9)
- ✅ All 21 files import-updated (Task 7)
- ✅ `proxy.ts` updated to Supabase SSR (Task 5)
- ✅ PostgreSQL schema with all 10 tables + RLS (Task 2)
- ✅ Storage bucket `avatars` created (Task 2)
- ✅ Google OAuth enabled in Supabase (Task 2)
- ✅ `STORAGE_BUCKET_ID` exported from `lib/supabase/client.ts` (Task 3) — profile page import unchanged
- ✅ `$id` shim on all returned objects (auth.ts + queries.ts)
- ✅ `jsonb` fields serialized back to strings on read (queries.ts `mapSession`)
- ✅ `question_ids` array serialized back to JSON string on read
- ✅ Migration script: subjects → id mapping → questions (Task 8)
- ✅ Vercel env vars updated (Task 9)
- ✅ Old env vars removed from Vercel (Task 9)

**No placeholders found.**

**Type consistency:** `mapSession`, `mapNote`, `createProfile` all return `{ $id: doc.id, ... }` consistently. `getAvatarUrl` is identity function throughout.

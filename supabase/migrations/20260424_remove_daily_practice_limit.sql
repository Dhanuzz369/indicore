-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: Remove any daily-practice-limit RLS policies on questions / test_sessions
--
-- Context: An earlier setup added RLS policies that blocked question access
-- after a user completed a subject-practice session (the original "10q/day"
-- concept). The paywall is now handled purely via the UI layer — free users
-- can do unlimited 10-question sessions per day. This migration removes the
-- DB-level restriction so authenticated users can always read questions.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Drop any daily/limit/free/tier policies on questions ──────────────
-- Dynamically finds and drops all matching policies so the fix works regardless
-- of the exact names used when the policies were created.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'questions'
      AND schemaname = 'public'
      AND (
        policyname ILIKE '%daily%'
        OR policyname ILIKE '%limit%'
        OR policyname ILIKE '%free%'
        OR policyname ILIKE '%quota%'
        OR policyname ILIKE '%rate%'
        OR policyname ILIKE '%24h%'
        OR policyname ILIKE '%tier%'
        OR policyname ILIKE '%practice%'
        OR policyname ILIKE '%session%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.questions', pol.policyname);
    RAISE NOTICE 'Dropped questions policy: %', pol.policyname;
  END LOOP;
END $$;

-- ── Step 2: Ensure a permissive SELECT policy exists for authenticated users ──
-- All authenticated users can read all questions freely.
-- The application layer (quiz/page.tsx) is responsible for enforcing free-tier
-- limits (10 questions per session, All difficulty only) via useSubscription().
DROP POLICY IF EXISTS "authenticated_users_select_questions" ON public.questions;
CREATE POLICY "authenticated_users_select_questions"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (true);

-- ── Step 3: Also drop any restrictive policies on test_sessions INSERT ────────
-- Ensure free users can always save their completed sessions.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'test_sessions'
      AND schemaname = 'public'
      AND cmd = 'INSERT'
      AND (
        policyname ILIKE '%daily%'
        OR policyname ILIKE '%limit%'
        OR policyname ILIKE '%free%'
        OR policyname ILIKE '%quota%'
        OR policyname ILIKE '%rate%'
        OR policyname ILIKE '%tier%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.test_sessions', pol.policyname);
    RAISE NOTICE 'Dropped test_sessions policy: %', pol.policyname;
  END LOOP;
END $$;

-- ── Verify after running ──────────────────────────────────────────────────────
-- Run this to confirm no restrictive policies remain on questions:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'questions';
